"""
Serviços para o marketplace de integrações
"""

import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

import requests

from src.marketplace.models.marketplace_models import (
    APIKey,
    APIUsage,
    ConfigurationStatus,
    CRMCustomer,
    DeliveryOrder,
    DeliveryOrderStatus,
    Integration,
    IntegrationConfiguration,
    IntegrationStatus,
    IntegrationType,
    Partner,
    PartnerStatus,
    PaymentMethod,
    PaymentStatus,
    PaymentTransaction,
    Webhook,
    WebhookStatus,
)

# Configuração de logging
logger = logging.getLogger(__name__)


class MarketplaceService:
    """
    Serviço principal para o marketplace de integrações
    """

    def __init__(self, db_service, config_service):
        """
        Inicializa o serviço de marketplace

        Args:
            db_service: Serviço de banco de dados
            config_service: Serviço de configuração
        """
        self.db_service = db_service
        self.config_service = config_service

        # Inicializa serviços específicos
        self.partner_service = PartnerService(db_service, config_service)
        self.integration_service = IntegrationService(db_service, config_service)
        self.webhook_service = WebhookService(db_service, config_service)
        self.api_key_service = APIKeyService(db_service, config_service)

        # Inicializa adaptadores de integração
        self.delivery_adapter = DeliveryAdapter(
            db_service, config_service, self.webhook_service
        )
        self.payment_adapter = PaymentAdapter(
            db_service, config_service, self.webhook_service
        )
        self.crm_adapter = CRMAdapter(db_service, config_service, self.webhook_service)

    def get_adapter_for_integration(self, integration_type: IntegrationType):
        """
        Obtém o adaptador apropriado para o tipo de integração

        Args:
            integration_type: Tipo de integração

        Returns:
            Adaptador de integração apropriado

        Raises:
            ValueError: Se o tipo de integração não for suportado
        """
        if integration_type == IntegrationType.DELIVERY:
            return self.delivery_adapter
        elif integration_type == IntegrationType.PAYMENT:
            return self.payment_adapter
        elif integration_type == IntegrationType.CRM:
            return self.crm_adapter
        else:
            raise ValueError(f"Tipo de integração não suportado: {integration_type}")

    def register_integration_usage(
        self,
        partner_id: str,
        api_key_id: str,
        endpoint: str,
        method: str,
        status_code: int,
        response_time: int,
        request_size: int,
        response_size: int,
        ip_address: str,
        user_agent: str,
    ) -> APIUsage:
        """
        Registra o uso da API

        Args:
            partner_id: ID do parceiro
            api_key_id: ID da chave de API
            endpoint: Endpoint acessado
            method: Método HTTP
            status_code: Código de status HTTP
            response_time: Tempo de resposta em ms
            request_size: Tamanho da requisição em bytes
            response_size: Tamanho da resposta em bytes
            ip_address: Endereço IP do cliente
            user_agent: User Agent do cliente

        Returns:
            Registro de uso da API
        """
        usage_id = str(uuid4())

        usage_data = {
            "id": usage_id,
            "partner_id": partner_id,
            "api_key_id": api_key_id,
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "response_time": response_time,
            "request_size": request_size,
            "response_size": response_size,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "timestamp": datetime.now(),
        }

        # Salva o registro no banco de dados
        self.db_service.insert_one("marketplace_api_usage", usage_data)

        return APIUsage.parse_obj(usage_data)

    def get_api_usage_metrics(
        self,
        partner_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Obtém métricas de uso da API

        Args:
            partner_id: ID do parceiro (opcional)
            start_date: Data inicial (opcional)
            end_date: Data final (opcional)

        Returns:
            Métricas de uso da API
        """
        # Constrói os filtros
        filters: Dict[str, Any] = {}

        if partner_id:
            filters["partner_id"] = partner_id

        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date

            if date_filter:
                filters["timestamp"] = date_filter

        # Busca os registros
        usage_records = self.db_service.find("marketplace_api_usage", filters)

        # Calcula as métricas
        total_requests = len(usage_records)

        if total_requests == 0:
            return {
                "total_requests": 0,
                "average_response_time": 0,
                "success_rate": 0,
                "endpoints": {},
                "status_codes": {},
            }

        # Calcula o tempo médio de resposta
        total_response_time = sum(
            record.get("response_time", 0) for record in usage_records
        )
        average_response_time = total_response_time / total_requests

        # Calcula a taxa de sucesso
        successful_requests = sum(
            1 for record in usage_records if record.get("status_code", 0) < 400
        )
        success_rate = (successful_requests / total_requests) * 100

        # Agrupa por endpoint
        endpoints = {}
        for record in usage_records:
            endpoint = record.get("endpoint", "unknown")
            if endpoint not in endpoints:
                endpoints[endpoint] = 0
            endpoints[endpoint] += 1

        # Agrupa por código de status
        status_codes = {}
        for record in usage_records:
            status_code = str(record.get("status_code", "unknown"))
            if status_code not in status_codes:
                status_codes[status_code] = 0
            status_codes[status_code] += 1

        return {
            "total_requests": total_requests,
            "average_response_time": average_response_time,
            "success_rate": success_rate,
            "endpoints": endpoints,
            "status_codes": status_codes,
        }


class PartnerService:
    """
    Serviço para gerenciamento de parceiros
    """

    def __init__(self, db_service, config_service):
        """
        Inicializa o serviço de parceiros

        Args:
            db_service: Serviço de banco de dados
            config_service: Serviço de configuração
        """
        self.db_service = db_service
        self.config_service = config_service

    def register_partner(self, partner_data: Dict[str, Any]) -> Partner:
        """
        Registra um novo parceiro

        Args:
            partner_data: Dados do parceiro

        Returns:
            Parceiro registrado

        Raises:
            ValueError: Se os dados do parceiro forem inválidos
        """
        # Gera um ID único para o parceiro
        partner_id = str(uuid4())

        # Define valores padrão
        partner_data["id"] = partner_id
        partner_data["status"] = PartnerStatus.PENDING
        partner_data["created_at"] = datetime.now()
        partner_data["updated_at"] = datetime.now()

        # Valida os dados do parceiro
        self._validate_partner_data(partner_data)

        # Salva o parceiro no banco de dados
        self.db_service.insert_one("marketplace_partners", partner_data)

        # Retorna o parceiro registrado
        return Partner(**partner_data)

    def _validate_partner_data(self, partner_data: Dict[str, Any]) -> None:
        """
        Valida os dados do parceiro

        Args:
            partner_data: Dados do parceiro

        Raises:
            ValueError: Se os dados forem inválidos
        """
        required_fields = ["name", "description", "website", "contact_email"]

        # Verifica campos obrigatórios
        for field in required_fields:
            if field not in partner_data:
                raise ValueError(f"Campo obrigatório ausente: {field}")

        # Verifica se o nome é único
        existing = self.db_service.find_one(
            "marketplace_partners", {"name": partner_data["name"]}
        )

        if existing:
            raise ValueError(f"Já existe um parceiro com o nome {partner_data['name']}")

    def get_partner(self, partner_id: str) -> Optional[Partner]:
        """
        Obtém um parceiro pelo ID

        Args:
            partner_id: ID do parceiro

        Returns:
            Parceiro ou None se não encontrado
        """
        partner_data = self.db_service.find_one(
            "marketplace_partners", {"id": partner_id}
        )

        if not partner_data:
            return None

        return Partner(**partner_data)

    def update_partner(
        self, partner_id: str, update_data: Dict[str, Any]
    ) -> Optional[Partner]:
        """
        Atualiza um parceiro

        Args:
            partner_id: ID do parceiro
            update_data: Dados a serem atualizados

        Returns:
            Parceiro atualizado ou None se não encontrado

        Raises:
            ValueError: Se os dados de atualização forem inválidos
        """
        # Obtém o parceiro atual
        partner_data = self.db_service.find_one(
            "marketplace_partners", {"id": partner_id}
        )

        if not partner_data:
            return None

        # Verifica se o nome está sendo alterado e se já existe
        if "name" in update_data and update_data["name"] != partner_data["name"]:
            existing = self.db_service.find_one(
                "marketplace_partners", {"name": update_data["name"]}
            )

            if existing:
                raise ValueError(
                    f"Já existe um parceiro com o nome {update_data['name']}"
                )

        # Atualiza os dados
        update_data["updated_at"] = datetime.now()

        # Mescla os dados atuais com os novos dados
        partner_data.update(update_data)

        # Atualiza no banco de dados
        self.db_service.update_one(
            "marketplace_partners", {"id": partner_id}, {"$set": update_data}
        )

        # Retorna o parceiro atualizado
        return Partner(**partner_data)

    def approve_partner(self, partner_id: str) -> Optional[Partner]:
        """
        Aprova um parceiro

        Args:
            partner_id: ID do parceiro

        Returns:
            Parceiro aprovado ou None se não encontrado
        """
        # Obtém o parceiro atual
        partner_data = self.db_service.find_one(
            "marketplace_partners", {"id": partner_id}
        )

        if not partner_data:
            return None

        # Verifica se o parceiro já está aprovado
        if partner_data["status"] == PartnerStatus.APPROVED:
            return Partner(**partner_data)

        # Atualiza o status
        update_data = {
            "status": PartnerStatus.APPROVED,
            "approval_date": datetime.now(),
            "updated_at": datetime.now(),
        }

        # Atualiza no banco de dados
        self.db_service.update_one(
            "marketplace_partners", {"id": partner_id}, {"$set": update_data}
        )

        # Mescla os dados atuais com os novos dados
        partner_data.update(update_data)

        # Retorna o parceiro atualizado
        return Partner(**partner_data)

    def reject_partner(self, partner_id: str) -> Optional[Partner]:
        """
        Rejeita um parceiro

        Args:
            partner_id: ID do parceiro

        Returns:
            Parceiro rejeitado ou None se não encontrado
        """
        # Obtém o parceiro atual
        partner_data = self.db_service.find_one(
            "marketplace_partners", {"id": partner_id}
        )

        if not partner_data:
            return None

        # Atualiza o status
        update_data = {"status": PartnerStatus.REJECTED, "updated_at": datetime.now()}

        # Atualiza no banco de dados
        self.db_service.update_one(
            "marketplace_partners", {"id": partner_id}, {"$set": update_data}
        )

        # Mescla os dados atuais com os novos dados
        partner_data.update(update_data)

        # Retorna o parceiro atualizado
        return Partner(**partner_data)

    def suspend_partner(self, partner_id: str) -> Optional[Partner]:
        """
        Suspende um parceiro

        Args:
            partner_id: ID do parceiro

        Returns:
            Parceiro suspenso ou None se não encontrado
        """
        # Obtém o parceiro atual
        partner_data = self.db_service.find_one(
            "marketplace_partners", {"id": partner_id}
        )

        if not partner_data:
            return None

        # Atualiza o status
        update_data = {"status": PartnerStatus.SUSPENDED, "updated_at": datetime.now()}

        # Atualiza no banco de dados
        self.db_service.update_one(
            "marketplace_partners", {"id": partner_id}, {"$set": update_data}
        )

        # Mescla os dados atuais com os novos dados
        partner_data.update(update_data)

        # Retorna o parceiro atualizado
        return Partner(**partner_data)

    def list_partners(
        self, filters: Dict[str, Any], page: int = 1, page_size: int = 20
    ) -> Tuple[List[Partner], int]:
        """
        Lista parceiros com filtros e paginação

        Args:
            filters: Filtros a serem aplicados
            page: Número da página
            page_size: Tamanho da página

        Returns:
            Tupla com (lista de parceiros, total de parceiros)
        """
        # Calcula o offset para paginação
        skip = (page - 1) * page_size

        # Busca os parceiros no banco de dados
        partners = self.db_service.find(
            "marketplace_partners",
            filters,
            skip=skip,
            limit=page_size,
            sort=[("created_at", -1)],
        )

        # Conta o total de parceiros
        total = self.db_service.count("marketplace_partners", filters)

        # Converte para objetos Partner
        partner_objects = [Partner(**partner) for partner in partners]

        return partner_objects, total


class IntegrationService:
    """
    Serviço para gerenciamento de integrações
    """

    def __init__(self, db_service, config_service):
        """
        Inicializa o serviço de integrações

        Args:
            db_service: Serviço de banco de dados
            config_service: Serviço de configuração
        """
        self.db_service = db_service
        self.config_service = config_service

    def register_integration(self, integration_data: Dict[str, Any]) -> Integration:
        """
        Registra uma nova integração

        Args:
            integration_data: Dados da integração

        Returns:
            Integração registrada

        Raises:
            ValueError: Se os dados da integração forem inválidos
        """
        # Gera um ID único para a integração
        integration_id = str(uuid4())

        # Define valores padrão
        integration_data["id"] = integration_id
        integration_data["status"] = IntegrationStatus.ACTIVE
        integration_data["created_at"] = datetime.now()
        integration_data["updated_at"] = datetime.now()

        # Valida os dados da integração
        self._validate_integration_data(integration_data)

        # Salva a integração no banco de dados
        self.db_service.insert_one("marketplace_integrations", integration_data)

        # Retorna a integração registrada
        return Integration(**integration_data)

    def _validate_integration_data(self, integration_data: Dict[str, Any]) -> None:
        """
        Valida os dados da integração

        Args:
            integration_data: Dados da integração

        Raises:
            ValueError: Se os dados forem inválidos
        """
        required_fields = [
            "partner_id",
            "type",
            "name",
            "description",
            "configuration_schema",
            "version",
        ]

        # Verifica campos obrigatórios
        for field in required_fields:
            if field not in integration_data:
                raise ValueError(f"Campo obrigatório ausente: {field}")

        # Verifica se o parceiro existe
        partner = self.db_service.find_one(
            "marketplace_partners", {"id": integration_data["partner_id"]}
        )

        if not partner:
            raise ValueError(
                f"Parceiro não encontrado: {integration_data['partner_id']}"
            )

        # Verifica se o tipo de integração é válido
        if integration_data["type"] not in [t.value for t in IntegrationType]:
            raise ValueError(f"Tipo de integração inválido: {integration_data['type']}")

        # Verifica se o schema de configuração é válido
        if not isinstance(integration_data["configuration_schema"], dict):
            raise ValueError("Schema de configuração deve ser um objeto JSON")

    def get_integration(self, integration_id: str) -> Optional[Integration]:
        """
        Obtém uma integração pelo ID

        Args:
            integration_id: ID da integração

        Returns:
            Integração ou None se não encontrada
        """
        integration_data = self.db_service.find_one(
            "marketplace_integrations", {"id": integration_id}
        )

        if not integration_data:
            return None

        return Integration(**integration_data)

    def update_integration(
        self, integration_id: str, update_data: Dict[str, Any]
    ) -> Optional[Integration]:
        """
        Atualiza uma integração

        Args:
            integration_id: ID da integração
            update_data: Dados a serem atualizados

        Returns:
            Integração atualizada ou None se não encontrada

        Raises:
            ValueError: Se os dados de atualização forem inválidos
        """
        # Obtém a integração atual
        integration_data = self.db_service.find_one(
            "marketplace_integrations", {"id": integration_id}
        )

        if not integration_data:
            return None

        # Verifica se o tipo de integração está sendo alterado
        if "type" in update_data and update_data["type"] not in [
            t.value for t in IntegrationType
        ]:
            raise ValueError(f"Tipo de integração inválido: {update_data['type']}")

        # Verifica se o schema de configuração está sendo alterado
        if "configuration_schema" in update_data and not isinstance(
            update_data["configuration_schema"], dict
        ):
            raise ValueError("Schema de configuração deve ser um objeto JSON")

        # Atualiza os dados
        update_data["updated_at"] = datetime.now()

        # Mescla os dados atuais com os novos dados
        integration_data.update(update_data)

        # Atualiza no banco de dados
        self.db_service.update_one(
            "marketplace_integrations", {"id": integration_id}, {"$set": update_data}
        )

        # Retorna a integração atualizada
        return Integration(**integration_data)

    def list_integrations(
        self, filters: Dict[str, Any], page: int = 1, page_size: int = 20
    ) -> Tuple[List[Integration], int]:
        """
        Lista integrações com filtros e paginação

        Args:
            filters: Filtros a serem aplicados
            page: Número da página
            page_size: Tamanho da página

        Returns:
            Tupla com (lista de integrações, total de integrações)
        """
        # Calcula o offset para paginação
        skip = (page - 1) * page_size

        # Busca as integrações no banco de dados
        integrations = self.db_service.find(
            "marketplace_integrations",
            filters,
            skip=skip,
            limit=page_size,
            sort=[("created_at", -1)],
        )

        # Conta o total de integrações
        total = self.db_service.count("marketplace_integrations", filters)

        # Converte para objetos Integration
        integration_objects = [
            Integration(**integration) for integration in integrations
        ]

        return integration_objects, total

    def configure_integration(
        self, integration_id: str, restaurant_id: str, configuration: Dict[str, Any]
    ) -> IntegrationConfiguration:
        """
        Configura uma integração para um restaurante

        Args:
            integration_id: ID da integração
            restaurant_id: ID do restaurante
            configuration: Configuração da integração

        Returns:
            Configuração da integração

        Raises:
            ValueError: Se a integração não existir ou a configuração for inválida
        """
        # Verifica se a integração existe
        integration = self.get_integration(integration_id)

        if not integration:
            raise ValueError(f"Integração não encontrada: {integration_id}")

        # Valida a configuração com o schema
        self._validate_configuration(integration.configuration_schema, configuration)

        # Verifica se já existe uma configuração para esta integração e restaurante
        existing_config = self.db_service.find_one(
            "marketplace_integration_configurations",
            {"integration_id": integration_id, "restaurant_id": restaurant_id},
        )

        if existing_config:
            # Atualiza a configuração existente
            update_data = {
                "configuration": configuration,
                "status": ConfigurationStatus.ACTIVE,
                "updated_at": datetime.now(),
            }

            self.db_service.update_one(
                "marketplace_integration_configurations",
                {"id": existing_config["id"]},
                {"$set": update_data},
            )

            # Mescla os dados atuais com os novos dados
            existing_config.update(update_data)

            return IntegrationConfiguration(**existing_config)
        else:
            # Cria uma nova configuração
            config_id = str(uuid4())

            config_data = {
                "id": config_id,
                "integration_id": integration_id,
                "restaurant_id": restaurant_id,
                "configuration": configuration,
                "status": ConfigurationStatus.ACTIVE,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
            }

            # Salva a configuração no banco de dados
            self.db_service.insert_one(
                "marketplace_integration_configurations", config_data
            )

            return IntegrationConfiguration.parse_obj(config_data)

    def _validate_configuration(
        self, schema: Dict[str, Any], configuration: Dict[str, Any]
    ) -> None:
        """
        Valida uma configuração com um schema JSON

        Args:
            schema: Schema JSON
            configuration: Configuração a ser validada

        Raises:
            ValueError: Se a configuração for inválida
        """
        # Em um ambiente real, isso seria uma validação completa de JSON Schema
        # Aqui estamos apenas verificando campos obrigatórios básicos

        if "properties" in schema and "required" in schema:
            required_fields = schema["required"]

            for field in required_fields:
                if field not in configuration:
                    raise ValueError(
                        f"Campo obrigatório ausente na configuração: {field}"
                    )

    def get_integration_configuration(
        self, integration_id: str, restaurant_id: str
    ) -> Optional[IntegrationConfiguration]:
        """
        Obtém a configuração de uma integração para um restaurante

        Args:
            integration_id: ID da integração
            restaurant_id: ID do restaurante

        Returns:
            Configuração da integração ou None se não encontrada
        """
        config_data = self.db_service.find_one(
            "marketplace_integration_configurations",
            {"integration_id": integration_id, "restaurant_id": restaurant_id},
        )

        if not config_data:
            return None

        return IntegrationConfiguration(**config_data)

    def list_restaurant_integrations(self, restaurant_id: str) -> List[Dict[str, Any]]:
        """
        Lista todas as integrações configuradas para um restaurante

        Args:
            restaurant_id: ID do restaurante

        Returns:
            Lista de integrações com suas configurações
        """
        # Busca todas as configurações para o restaurante
        configs = self.db_service.find(
            "marketplace_integration_configurations", {"restaurant_id": restaurant_id}
        )

        result = []

        for config in configs:
            # Obtém a integração
            integration = self.get_integration(config["integration_id"])

            if integration:
                # Combina os dados da integração com a configuração
                result.append(
                    {"integration": integration.dict(), "configuration": config}
                )

        return result


class WebhookService:
    """
    Serviço para gerenciamento de webhooks
    """

    def __init__(self, db_service, config_service):
        """
        Inicializa o serviço de webhooks

        Args:
            db_service: Serviço de banco de dados
            config_service: Serviço de configuração
        """
        self.db_service = db_service
        self.config_service = config_service

    def register_webhook(self, webhook_data: Dict[str, Any]) -> Webhook:
        """
        Registra um novo webhook

        Args:
            webhook_data: Dados do webhook

        Returns:
            Webhook registrado

        Raises:
            ValueError: Se os dados do webhook forem inválidos
        """
        # Gera um ID único para o webhook
        webhook_id = str(uuid4())

        # Gera um segredo para assinatura das notificações
        webhook_secret = self._generate_webhook_secret()

        # Define valores padrão
        webhook_data["id"] = webhook_id
        webhook_data["secret"] = webhook_secret
        webhook_data["status"] = WebhookStatus.ACTIVE
        webhook_data["created_at"] = datetime.now()
        webhook_data["updated_at"] = datetime.now()

        # Valida os dados do webhook
        self._validate_webhook_data(webhook_data)

        # Salva o webhook no banco de dados
        self.db_service.insert_one("marketplace_webhooks", webhook_data)

        # Retorna o webhook registrado
        return Webhook(**webhook_data)

    def _generate_webhook_secret(self) -> str:
        """
        Gera um segredo para assinatura de webhooks

        Returns:
            Segredo gerado
        """
        return str(uuid.uuid4())

    def _validate_webhook_data(self, webhook_data: Dict[str, Any]) -> None:
        """
        Valida os dados do webhook

        Args:
            webhook_data: Dados do webhook

        Raises:
            ValueError: Se os dados forem inválidos
        """
        required_fields = ["integration_id", "restaurant_id", "event_types", "url"]

        # Verifica campos obrigatórios
        for field in required_fields:
            if field not in webhook_data:
                raise ValueError(f"Campo obrigatório ausente: {field}")

        # Verifica se a integração existe
        integration = self.db_service.find_one(
            "marketplace_integrations", {"id": webhook_data["integration_id"]}
        )

        if not integration:
            raise ValueError(
                f"Integração não encontrada: {webhook_data['integration_id']}"
            )

        # Verifica se os tipos de evento são válidos
        if (
            not isinstance(webhook_data["event_types"], list)
            or not webhook_data["event_types"]
        ):
            raise ValueError("Tipos de evento devem ser uma lista não vazia")

        # Verifica se a URL é válida
        # Em um ambiente real, isso seria uma validação mais completa
        if not webhook_data["url"].startswith(("http://", "https://")):
            raise ValueError("URL deve começar com http:// ou https://")

    def get_webhook(self, webhook_id: str) -> Optional[Webhook]:
        """
        Obtém um webhook pelo ID

        Args:
            webhook_id: ID do webhook

        Returns:
            Webhook ou None se não encontrado
        """
        webhook_data = self.db_service.find_one(
            "marketplace_webhooks", {"id": webhook_id}
        )

        if not webhook_data:
            return None

        return Webhook(**webhook_data)

    def update_webhook(
        self, webhook_id: str, update_data: Dict[str, Any]
    ) -> Optional[Webhook]:
        """
        Atualiza um webhook

        Args:
            webhook_id: ID do webhook
            update_data: Dados a serem atualizados

        Returns:
            Webhook atualizado ou None se não encontrado

        Raises:
            ValueError: Se os dados de atualização forem inválidos
        """
        # Obtém o webhook atual
        webhook_data = self.db_service.find_one(
            "marketplace_webhooks", {"id": webhook_id}
        )

        if not webhook_data:
            return None

        # Verifica se os tipos de evento estão sendo alterados
        if "event_types" in update_data:
            if (
                not isinstance(update_data["event_types"], list)
                or not update_data["event_types"]
            ):
                raise ValueError("Tipos de evento devem ser uma lista não vazia")

        # Verifica se a URL está sendo alterada
        if "url" in update_data:
            if not update_data["url"].startswith(("http://", "https://")):
                raise ValueError("URL deve começar com http:// ou https://")

        # Atualiza os dados
        update_data["updated_at"] = datetime.now()

        # Mescla os dados atuais com os novos dados
        webhook_data.update(update_data)

        # Atualiza no banco de dados
        self.db_service.update_one(
            "marketplace_webhooks", {"id": webhook_id}, {"$set": update_data}
        )

        # Retorna o webhook atualizado
        return Webhook(**webhook_data)

    def delete_webhook(self, webhook_id: str) -> bool:
        """
        Remove um webhook

        Args:
            webhook_id: ID do webhook

        Returns:
            True se o webhook foi removido, False caso contrário
        """
        # Verifica se o webhook existe
        webhook = self.get_webhook(webhook_id)

        if not webhook:
            return False

        # Remove o webhook do banco de dados
        self.db_service.delete_one("marketplace_webhooks", {"id": webhook_id})

        return True

    def list_webhooks(
        self, filters: Dict[str, Any], page: int = 1, page_size: int = 20
    ) -> Tuple[List[Webhook], int]:
        """
        Lista webhooks com filtros e paginação

        Args:
            filters: Filtros a serem aplicados
            page: Número da página
            page_size: Tamanho da página

        Returns:
            Tupla com (lista de webhooks, total de webhooks)
        """
        # Calcula o offset para paginação
        skip = (page - 1) * page_size

        # Busca os webhooks no banco de dados
        webhooks = self.db_service.find(
            "marketplace_webhooks",
            filters,
            skip=skip,
            limit=page_size,
            sort=[("created_at", -1)],
        )

        # Conta o total de webhooks
        total = self.db_service.count("marketplace_webhooks", filters)

        # Converte para objetos Webhook
        webhook_objects = [Webhook(**webhook) for webhook in webhooks]

        return webhook_objects, total

    def test_webhook(self, webhook_id: str) -> Tuple[bool, str]:
        """
        Testa um webhook enviando um evento de teste

        Args:
            webhook_id: ID do webhook

        Returns:
            Tupla com (sucesso, mensagem)
        """
        # Obtém o webhook
        webhook = self.get_webhook(webhook_id)

        if not webhook:
            return False, "Webhook não encontrado"

        # Cria um payload de teste
        payload = {
            "event": "test",
            "timestamp": datetime.now().isoformat(),
            "webhook_id": webhook_id,
            "test": True,
        }

        # Envia o webhook
        success, message = self._send_webhook(webhook, "test", payload)

        return success, message

    def trigger_webhook(
        self,
        integration_id: str,
        restaurant_id: str,
        event_type: str,
        payload: Dict[str, Any],
    ) -> List[Tuple[str, bool, str]]:
        """
        Dispara webhooks para um evento

        Args:
            integration_id: ID da integração
            restaurant_id: ID do restaurante
            event_type: Tipo de evento
            payload: Payload do evento

        Returns:
            Lista de tuplas com (webhook_id, sucesso, mensagem)
        """
        # Busca webhooks que correspondem aos critérios
        webhooks = self.db_service.find(
            "marketplace_webhooks",
            {
                "integration_id": integration_id,
                "restaurant_id": restaurant_id,
                "event_types": {"$in": [event_type]},
                "status": WebhookStatus.ACTIVE,
            },
        )

        results = []

        for webhook_data in webhooks:
            webhook = Webhook(**webhook_data)

            # Envia o webhook
            success, message = self._send_webhook(webhook, event_type, payload)

            # Registra a entrega
            self._register_webhook_delivery(
                webhook.id, event_type, payload, success, message
            )

            results.append((webhook.id, success, message))

        return results

    def _send_webhook(
        self, webhook: Webhook, event_type: str, payload: Dict[str, Any]
    ) -> Tuple[bool, str]:
        """
        Envia um webhook

        Args:
            webhook: Webhook a ser enviado
            event_type: Tipo de evento
            payload: Payload do evento

        Returns:
            Tupla com (sucesso, mensagem)
        """
        try:
            # Adiciona metadados ao payload
            full_payload = {
                "event_type": event_type,
                "webhook_id": webhook.id,
                "timestamp": datetime.now().isoformat(),
                "data": payload,
            }

            # Calcula a assinatura
            signature = self._calculate_signature(webhook.secret, full_payload)

            # Define os headers
            headers = {
                "Content-Type": "application/json",
                "X-Webhook-Signature": signature,
                "X-Webhook-Event": event_type,
                "X-Webhook-ID": webhook.id,
            }

            # Envia a requisição
            response = requests.post(
                str(webhook.url),  # Converter HttpUrl para string
                json=full_payload,
                headers=headers,
                timeout=10,  # Timeout de 10 segundos
            )

            # Verifica se a requisição foi bem-sucedida
            if response.status_code >= 200 and response.status_code < 300:
                return (
                    True,
                    f"Webhook enviado com sucesso. Código de status: {response.status_code}",
                )
            else:
                return (
                    False,
                    f"Falha ao enviar webhook. Código de status: {response.status_code}. Resposta: {response.text}",
                )

        except Exception as e:
            logger.error(f"Erro ao enviar webhook {webhook.id}: {str(e)}")
            return False, f"Erro ao enviar webhook: {str(e)}"

    def _calculate_signature(self, secret: str, payload: Dict[str, Any]) -> str:
        """
        Calcula a assinatura para um payload

        Args:
            secret: Segredo do webhook
            payload: Payload do evento

        Returns:
            Assinatura calculada
        """
        import hashlib
        import hmac

        # Converte o payload para string JSON
        payload_str = json.dumps(payload, sort_keys=True)

        # Calcula o HMAC-SHA256
        signature = hmac.new(
            secret.encode(), payload_str.encode(), hashlib.sha256
        ).hexdigest()

        return signature

    def _register_webhook_delivery(
        self,
        webhook_id: str,
        event_type: str,
        payload: Dict[str, Any],
        success: bool,
        message: str,
        response_code: Optional[int] = None,
        response_body: Optional[str] = None,
    ) -> str:
        """
        Registra uma entrega de webhook

        Args:
            webhook_id: ID do webhook
            event_type: Tipo de evento
            payload: Payload do evento
            success: Se a entrega foi bem-sucedida
            message: Mensagem de resultado
            response_code: Código de resposta HTTP
            response_body: Corpo da resposta

        Returns:
            ID da entrega registrada
        """
        delivery_id = str(uuid4())

        delivery_data = {
            "id": delivery_id,
            "webhook_id": webhook_id,
            "event_type": event_type,
            "payload": payload,
            "status": "success" if success else "failed",
            "response_code": response_code,
            "response_body": response_body,
            "attempt_count": 1,
            "next_attempt": None if success else datetime.now() + timedelta(minutes=5),
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }

        # Salva a entrega no banco de dados
        self.db_service.insert_one("marketplace_webhook_deliveries", delivery_data)

        return delivery_id

    def retry_failed_deliveries(self) -> List[Tuple[str, bool, str]]:
        """
        Reprocessa entregas de webhook que falharam

        Returns:
            Lista de tuplas com (delivery_id, sucesso, mensagem)
        """
        # Busca entregas que falharam e estão prontas para nova tentativa
        deliveries = self.db_service.find(
            "marketplace_webhook_deliveries",
            {
                "status": "failed",
                "next_attempt": {"$lte": datetime.now()},
                "attempt_count": {"$lt": 5},  # Máximo de 5 tentativas
            },
        )

        results = []

        for delivery in deliveries:
            delivery_id = delivery["id"]
            webhook_id = delivery["webhook_id"]
            event_type = delivery["event_type"]
            payload = delivery["payload"]

            # Obtém o webhook
            webhook = self.get_webhook(webhook_id)

            if not webhook:
                # Webhook não existe mais, marca como falha permanente
                self.db_service.update_one(
                    "marketplace_webhook_deliveries",
                    {"id": delivery_id},
                    {
                        "$set": {
                            "status": "permanent_failure",
                            "next_attempt": None,
                            "updated_at": datetime.now(),
                        }
                    },
                )

                results.append((delivery_id, False, "Webhook não existe mais"))
                continue

            # Envia o webhook
            success, message = self._send_webhook(webhook, event_type, payload)

            # Atualiza a entrega
            if success:
                self.db_service.update_one(
                    "marketplace_webhook_deliveries",
                    {"id": delivery_id},
                    {
                        "$set": {
                            "status": "success",
                            "next_attempt": None,
                            "updated_at": datetime.now(),
                        }
                    },
                )
            else:
                # Calcula a próxima tentativa com backoff exponencial
                attempt_count = delivery["attempt_count"] + 1
                next_attempt = datetime.now() + timedelta(
                    minutes=5 * (2 ** (attempt_count - 1))
                )

                self.db_service.update_one(
                    "marketplace_webhook_deliveries",
                    {"id": delivery_id},
                    {
                        "$set": {
                            "status": "failed",
                            "attempt_count": attempt_count,
                            "next_attempt": next_attempt,
                            "updated_at": datetime.now(),
                        }
                    },
                )

            results.append((delivery_id, success, message))

        return results


class APIKeyService:
    """
    Serviço para gerenciamento de chaves de API
    """

    def __init__(self, db_service, config_service):
        """
        Inicializa o serviço de chaves de API

        Args:
            db_service: Serviço de banco de dados
            config_service: Serviço de configuração
        """
        self.db_service = db_service
        self.config_service = config_service

    def create_api_key(
        self,
        partner_id: str,
        name: str,
        scopes: List[str],
        expires_at: Optional[datetime] = None,
    ) -> APIKey:
        """
        Cria uma nova chave de API

        Args:
            partner_id: ID do parceiro
            name: Nome da chave
            scopes: Escopos de acesso
            expires_at: Data de expiração (opcional)

        Returns:
            Chave de API criada

        Raises:
            ValueError: Se o parceiro não existir ou os dados forem inválidos
        """
        # Verifica se o parceiro existe
        partner = self.db_service.find_one("marketplace_partners", {"id": partner_id})

        if not partner:
            raise ValueError(f"Parceiro não encontrado: {partner_id}")

        # Verifica se o parceiro está aprovado
        if partner["status"] != PartnerStatus.APPROVED:
            raise ValueError(f"Parceiro não está aprovado: {partner_id}")

        # Gera um ID único para a chave
        key_id = str(uuid4())

        # Gera a chave de API
        api_key = self._generate_api_key()

        # Define valores padrão
        key_data = {
            "id": key_id,
            "partner_id": partner_id,
            "key": api_key,
            "name": name,
            "scopes": scopes,
            "expires_at": expires_at,
            "is_active": True,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }

        # Salva a chave no banco de dados
        self.db_service.insert_one("marketplace_api_keys", key_data)

        # Retorna a chave criada
        return APIKey.parse_obj(key_data)

    def _generate_api_key(self) -> str:
        """
        Gera uma chave de API

        Returns:
            Chave de API gerada
        """
        import secrets

        # Gera um token seguro
        token = secrets.token_hex(16)

        # Formata como uma chave de API
        return f"sk_{token}"

    def get_api_key(self, key_id: str) -> Optional[APIKey]:
        """
        Obtém uma chave de API pelo ID

        Args:
            key_id: ID da chave

        Returns:
            Chave de API ou None se não encontrada
        """
        key_data = self.db_service.find_one("marketplace_api_keys", {"id": key_id})

        if not key_data:
            return None

        return APIKey.parse_obj(key_data)

    def validate_api_key(self, api_key: str) -> Optional[APIKey]:
        """
        Valida uma chave de API

        Args:
            api_key: Chave de API

        Returns:
            Chave de API válida ou None se inválida
        """
        key_data = self.db_service.find_one("marketplace_api_keys", {"key": api_key})

        if not key_data:
            return None

        # Verifica se a chave está ativa
        if not key_data["is_active"]:
            return None

        # Verifica se a chave expirou
        if key_data["expires_at"] and key_data["expires_at"] < datetime.now():
            return None

        return APIKey.parse_obj(key_data)

    def revoke_api_key(self, key_id: str) -> bool:
        """
        Revoga uma chave de API

        Args:
            key_id: ID da chave

        Returns:
            True se a chave foi revogada, False caso contrário
        """
        # Verifica se a chave existe
        key = self.get_api_key(key_id)

        if not key:
            return False

        # Atualiza a chave
        self.db_service.update_one(
            "marketplace_api_keys",
            {"id": key_id},
            {"$set": {"is_active": False, "updated_at": datetime.now()}},
        )

        return True

    def list_api_keys(self, partner_id: str) -> List[APIKey]:
        """
        Lista todas as chaves de API de um parceiro

        Args:
            partner_id: ID do parceiro

        Returns:
            Lista de chaves de API
        """
        keys = self.db_service.find("marketplace_api_keys", {"partner_id": partner_id})

        return [APIKey(**key) for key in keys]

    def check_scope(self, api_key: APIKey, required_scope: str) -> bool:
        """
        Verifica se uma chave de API tem um escopo específico

        Args:
            api_key: Chave de API
            required_scope: Escopo requerido

        Returns:
            True se a chave tem o escopo, False caso contrário
        """
        # Verifica se a chave tem o escopo específico
        if required_scope in api_key.scopes:
            return True

        # Verifica se a chave tem um escopo coringa que inclui o escopo requerido
        for scope in api_key.scopes:
            if scope.endswith(":*"):
                prefix = scope[:-2]
                if required_scope.startswith(prefix):
                    return True

        return False


class DeliveryAdapter:
    """
    Adaptador para integrações de delivery
    """

    def __init__(self, db_service, config_service, webhook_service):
        """
        Inicializa o adaptador de delivery

        Args:
            db_service: Serviço de banco de dados
            config_service: Serviço de configuração
            webhook_service: Serviço de webhooks
        """
        self.db_service = db_service
        self.config_service = config_service
        self.webhook_service = webhook_service

    def receive_order(
        self, integration_id: str, restaurant_id: str, order_data: Dict[str, Any]
    ) -> DeliveryOrder:
        """
        Recebe um novo pedido de uma plataforma de delivery

        Args:
            integration_id: ID da integração
            restaurant_id: ID do restaurante
            order_data: Dados do pedido

        Returns:
            Pedido criado

        Raises:
            ValueError: Se os dados do pedido forem inválidos
        """
        # Valida os dados do pedido
        self._validate_order_data(order_data)

        # Gera um ID único para o pedido
        order_id = str(uuid4())

        # Define valores padrão
        order_data["id"] = order_id
        order_data["integration_id"] = integration_id
        order_data["restaurant_id"] = restaurant_id
        order_data["status"] = DeliveryOrderStatus.PENDING
        order_data["created_at"] = datetime.now()
        order_data["updated_at"] = datetime.now()

        # Salva o pedido no banco de dados
        self.db_service.insert_one("marketplace_delivery_orders", order_data)

        # Cria o objeto de pedido
        order = DeliveryOrder(**order_data)

        # Dispara webhook para notificar sobre o novo pedido
        self.webhook_service.trigger_webhook(
            integration_id, restaurant_id, "order.created", order.dict()
        )

        return order

    def _validate_order_data(self, order_data: Dict[str, Any]) -> None:
        """
        Valida os dados de um pedido

        Args:
            order_data: Dados do pedido

        Raises:
            ValueError: Se os dados forem inválidos
        """
        required_fields = [
            "external_id",
            "customer",
            "items",
            "delivery_address",
            "payment",
            "total_value",
            "delivery_fee",
        ]

        # Verifica campos obrigatórios
        for field in required_fields:
            if field not in order_data:
                raise ValueError(f"Campo obrigatório ausente: {field}")

        # Verifica se o pedido já existe
        if "external_id" in order_data:
            existing = self.db_service.find_one(
                "marketplace_delivery_orders",
                {"external_id": order_data["external_id"]},
            )

            if existing:
                raise ValueError(f"Pedido já existe: {order_data['external_id']}")

    def get_order(self, order_id: str) -> Optional[DeliveryOrder]:
        """
        Obtém um pedido pelo ID

        Args:
            order_id: ID do pedido

        Returns:
            Pedido ou None se não encontrado
        """
        order_data = self.db_service.find_one(
            "marketplace_delivery_orders", {"id": order_id}
        )

        if not order_data:
            return None

        return DeliveryOrder(**order_data)

    def update_order_status(
        self, order_id: str, status: DeliveryOrderStatus
    ) -> Optional[DeliveryOrder]:
        """
        Atualiza o status de um pedido

        Args:
            order_id: ID do pedido
            status: Novo status

        Returns:
            Pedido atualizado ou None se não encontrado
        """
        # Obtém o pedido atual
        order = self.get_order(order_id)

        if not order:
            return None

        # Atualiza o status
        update_data = {"status": status, "updated_at": datetime.now()}

        # Atualiza no banco de dados
        self.db_service.update_one(
            "marketplace_delivery_orders", {"id": order_id}, {"$set": update_data}
        )

        # Atualiza o objeto de pedido
        order_dict = order.dict()
        order_dict.update(update_data)
        updated_order = DeliveryOrder(**order_dict)

        # Dispara webhook para notificar sobre a atualização do pedido
        self.webhook_service.trigger_webhook(
            order.integration_id,
            order.restaurant_id,
            "order.updated",
            updated_order.dict(),
        )

        return updated_order

    def list_orders(
        self, filters: Dict[str, Any], page: int = 1, page_size: int = 20
    ) -> Tuple[List[DeliveryOrder], int]:
        """
        Lista pedidos com filtros e paginação

        Args:
            filters: Filtros a serem aplicados
            page: Número da página
            page_size: Tamanho da página

        Returns:
            Tupla com (lista de pedidos, total de pedidos)
        """
        # Calcula o offset para paginação
        skip = (page - 1) * page_size

        # Busca os pedidos no banco de dados
        orders = self.db_service.find(
            "marketplace_delivery_orders",
            filters,
            skip=skip,
            limit=page_size,
            sort=[("created_at", -1)],
        )

        # Conta o total de pedidos
        total = self.db_service.count("marketplace_delivery_orders", filters)

        # Converte para objetos DeliveryOrder
        order_objects = [DeliveryOrder(**order) for order in orders]

        return order_objects, total

    def sync_menu(
        self, integration_id: str, restaurant_id: str, menu_data: Dict[str, Any]
    ) -> bool:
        """
        Sincroniza o cardápio com uma plataforma de delivery

        Args:
            integration_id: ID da integração
            restaurant_id: ID do restaurante
            menu_data: Dados do cardápio

        Returns:
            True se a sincronização foi bem-sucedida, False caso contrário
        """
        # Em um ambiente real, isso seria uma implementação completa de sincronização
        # Aqui estamos apenas simulando o processo

        try:
            # Obtém a configuração da integração
            config = self.db_service.find_one(
                "marketplace_integration_configurations",
                {"integration_id": integration_id, "restaurant_id": restaurant_id},
            )

            if not config:
                logger.error(
                    f"Configuração não encontrada para integração {integration_id} e restaurante {restaurant_id}"
                )
                return False

            # Simula a sincronização
            logger.info(
                f"Sincronizando cardápio para integração {integration_id} e restaurante {restaurant_id}"
            )

            # Dispara webhook para notificar sobre a sincronização do cardápio
            self.webhook_service.trigger_webhook(
                integration_id,
                restaurant_id,
                "menu.synced",
                {
                    "integration_id": integration_id,
                    "restaurant_id": restaurant_id,
                    "menu": menu_data,
                    "timestamp": datetime.now().isoformat(),
                },
            )

            return True

        except Exception as e:
            logger.error(f"Erro ao sincronizar cardápio: {str(e)}")
            return False


class PaymentAdapter:
    """
    Adaptador para integrações de pagamento
    """

    def __init__(self, db_service, config_service, webhook_service):
        """
        Inicializa o adaptador de pagamento

        Args:
            db_service: Serviço de banco de dados
            config_service: Serviço de configuração
            webhook_service: Serviço de webhooks
        """
        self.db_service = db_service
        self.config_service = config_service
        self.webhook_service = webhook_service

    def create_transaction(
        self, integration_id: str, restaurant_id: str, transaction_data: Dict[str, Any]
    ) -> PaymentTransaction:
        """
        Cria uma nova transação de pagamento

        Args:
            integration_id: ID da integração
            restaurant_id: ID do restaurante
            transaction_data: Dados da transação

        Returns:
            Transação criada

        Raises:
            ValueError: Se os dados da transação forem inválidos
        """
        # Valida os dados da transação
        self._validate_transaction_data(transaction_data)

        # Gera um ID único para a transação
        transaction_id = str(uuid4())

        # Define valores padrão
        transaction_data["id"] = transaction_id
        transaction_data["integration_id"] = integration_id
        transaction_data["restaurant_id"] = restaurant_id
        transaction_data["created_at"] = datetime.now()
        transaction_data["updated_at"] = datetime.now()

        # Salva a transação no banco de dados
        self.db_service.insert_one("marketplace_payment_transactions", transaction_data)

        # Cria o objeto de transação
        transaction = PaymentTransaction(**transaction_data)

        # Dispara webhook para notificar sobre a nova transação
        self.webhook_service.trigger_webhook(
            integration_id, restaurant_id, "payment.created", transaction.dict()
        )

        return transaction

    def _validate_transaction_data(self, transaction_data: Dict[str, Any]) -> None:
        """
        Valida os dados de uma transação

        Args:
            transaction_data: Dados da transação

        Raises:
            ValueError: Se os dados forem inválidos
        """
        required_fields = [
            "order_id",
            "amount",
            "method",
            "status",
            "payment_data",
            "customer",
        ]

        # Verifica campos obrigatórios
        for field in required_fields:
            if field not in transaction_data:
                raise ValueError(f"Campo obrigatório ausente: {field}")

        # Verifica se o método de pagamento é válido
        if transaction_data["method"] not in [m.value for m in PaymentMethod]:
            raise ValueError(
                f"Método de pagamento inválido: {transaction_data['method']}"
            )

        # Verifica se o status é válido
        if transaction_data["status"] not in [s.value for s in PaymentStatus]:
            raise ValueError(
                f"Status de pagamento inválido: {transaction_data['status']}"
            )

    def get_transaction(self, transaction_id: str) -> Optional[PaymentTransaction]:
        """
        Obtém uma transação pelo ID

        Args:
            transaction_id: ID da transação

        Returns:
            Transação ou None se não encontrada
        """
        transaction_data = self.db_service.find_one(
            "marketplace_payment_transactions", {"id": transaction_id}
        )

        if not transaction_data:
            return None

        return PaymentTransaction(**transaction_data)

    def update_transaction_status(
        self, transaction_id: str, status: PaymentStatus
    ) -> Optional[PaymentTransaction]:
        """
        Atualiza o status de uma transação

        Args:
            transaction_id: ID da transação
            status: Novo status

        Returns:
            Transação atualizada ou None se não encontrada
        """
        # Obtém a transação atual
        transaction = self.get_transaction(transaction_id)

        if not transaction:
            return None

        # Atualiza o status
        update_data = {"status": status, "updated_at": datetime.now()}

        # Atualiza no banco de dados
        self.db_service.update_one(
            "marketplace_payment_transactions",
            {"id": transaction_id},
            {"$set": update_data},
        )

        # Atualiza o objeto de transação
        transaction_dict = transaction.dict()
        transaction_dict.update(update_data)
        updated_transaction = PaymentTransaction(**transaction_dict)

        # Dispara webhook para notificar sobre a atualização da transação
        self.webhook_service.trigger_webhook(
            transaction.integration_id,
            transaction.restaurant_id,
            "payment.updated",
            updated_transaction.dict(),
        )

        return updated_transaction

    def refund_transaction(
        self, transaction_id: str, amount: Optional[float] = None
    ) -> Optional[PaymentTransaction]:
        """
        Estorna uma transação

        Args:
            transaction_id: ID da transação
            amount: Valor a ser estornado (opcional, se não informado estorna o valor total)

        Returns:
            Transação atualizada ou None se não encontrada
        """
        # Obtém a transação atual
        transaction = self.get_transaction(transaction_id)

        if not transaction:
            return None

        # Verifica se a transação pode ser estornada
        if transaction.status not in [PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED]:
            raise ValueError(
                f"Transação com status {transaction.status} não pode ser estornada"
            )

        # Define o valor do estorno
        refund_amount = amount if amount is not None else transaction.amount

        # Atualiza o status
        update_data = {
            "status": PaymentStatus.REFUNDED,
            "updated_at": datetime.now(),
            "refund_amount": refund_amount,
            "refund_date": datetime.now(),
        }

        # Atualiza no banco de dados
        self.db_service.update_one(
            "marketplace_payment_transactions",
            {"id": transaction_id},
            {"$set": update_data},
        )

        # Atualiza o objeto de transação
        transaction_dict = transaction.dict()
        transaction_dict.update(update_data)
        updated_transaction = PaymentTransaction(**transaction_dict)

        # Dispara webhook para notificar sobre o estorno da transação
        self.webhook_service.trigger_webhook(
            transaction.integration_id,
            transaction.restaurant_id,
            "payment.refunded",
            updated_transaction.dict(),
        )

        return updated_transaction

    def list_transactions(
        self, filters: Dict[str, Any], page: int = 1, page_size: int = 20
    ) -> Tuple[List[PaymentTransaction], int]:
        """
        Lista transações com filtros e paginação

        Args:
            filters: Filtros a serem aplicados
            page: Número da página
            page_size: Tamanho da página

        Returns:
            Tupla com (lista de transações, total de transações)
        """
        # Calcula o offset para paginação
        skip = (page - 1) * page_size

        # Busca as transações no banco de dados
        transactions = self.db_service.find(
            "marketplace_payment_transactions",
            filters,
            skip=skip,
            limit=page_size,
            sort=[("created_at", -1)],
        )

        # Conta o total de transações
        total = self.db_service.count("marketplace_payment_transactions", filters)

        # Converte para objetos PaymentTransaction
        transaction_objects = [
            PaymentTransaction(**transaction) for transaction in transactions
        ]

        return transaction_objects, total

    def get_payment_methods(
        self, integration_id: str, restaurant_id: str
    ) -> List[Dict[str, Any]]:
        """
        Obtém os métodos de pagamento disponíveis

        Args:
            integration_id: ID da integração
            restaurant_id: ID do restaurante

        Returns:
            Lista de métodos de pagamento
        """
        # Em um ambiente real, isso seria uma implementação completa
        # Aqui estamos apenas retornando métodos padrão

        return [
            {
                "id": "credit_card",
                "name": "Cartão de Crédito",
                "enabled": True,
                "installments_enabled": True,
                "max_installments": 12,
            },
            {
                "id": "debit_card",
                "name": "Cartão de Débito",
                "enabled": True,
                "installments_enabled": False,
            },
            {
                "id": "pix",
                "name": "PIX",
                "enabled": True,
                "installments_enabled": False,
            },
        ]


class CRMAdapter:
    """
    Adaptador para integrações de CRM
    """

    def __init__(self, db_service, config_service, webhook_service):
        """
        Inicializa o adaptador de CRM

        Args:
            db_service: Serviço de banco de dados
            config_service: Serviço de configuração
            webhook_service: Serviço de webhooks
        """
        self.db_service = db_service
        self.config_service = config_service
        self.webhook_service = webhook_service

    def register_customer(
        self, integration_id: str, restaurant_id: str, customer_data: Dict[str, Any]
    ) -> CRMCustomer:
        """
        Registra um novo cliente

        Args:
            integration_id: ID da integração
            restaurant_id: ID do restaurante
            customer_data: Dados do cliente

        Returns:
            Cliente registrado

        Raises:
            ValueError: Se os dados do cliente forem inválidos
        """
        # Valida os dados do cliente
        self._validate_customer_data(customer_data)

        # Verifica se o cliente já existe
        existing_customer = None

        if "email" in customer_data and customer_data["email"]:
            existing_customer = self.db_service.find_one(
                "marketplace_crm_customers",
                {
                    "integration_id": integration_id,
                    "restaurant_id": restaurant_id,
                    "email": customer_data["email"],
                },
            )

        if (
            not existing_customer
            and "phone" in customer_data
            and customer_data["phone"]
        ):
            existing_customer = self.db_service.find_one(
                "marketplace_crm_customers",
                {
                    "integration_id": integration_id,
                    "restaurant_id": restaurant_id,
                    "phone": customer_data["phone"],
                },
            )

        if existing_customer:
            # Atualiza o cliente existente
            update_data = customer_data.copy()
            update_data["updated_at"] = datetime.now()

            self.db_service.update_one(
                "marketplace_crm_customers",
                {"id": existing_customer["id"]},
                {"$set": update_data},
            )

            # Mescla os dados atuais com os novos dados
            existing_customer.update(update_data)

            # Dispara webhook para notificar sobre a atualização do cliente
            customer = CRMCustomer(**existing_customer)
            self.webhook_service.trigger_webhook(
                integration_id, restaurant_id, "customer.updated", customer.dict()
            )

            return customer
        else:
            # Gera um ID único para o cliente
            customer_id = str(uuid4())

            # Define valores padrão
            customer_data["id"] = customer_id
            customer_data["integration_id"] = integration_id
            customer_data["restaurant_id"] = restaurant_id
            customer_data["created_at"] = datetime.now()
            customer_data["updated_at"] = datetime.now()

            # Salva o cliente no banco de dados
            self.db_service.insert_one("marketplace_crm_customers", customer_data)

            # Cria o objeto de cliente
            customer = CRMCustomer(**customer_data)

            # Dispara webhook para notificar sobre o novo cliente
            self.webhook_service.trigger_webhook(
                integration_id, restaurant_id, "customer.created", customer.dict()
            )

            return customer

    def _validate_customer_data(self, customer_data: Dict[str, Any]) -> None:
        """
        Valida os dados de um cliente

        Args:
            customer_data: Dados do cliente

        Raises:
            ValueError: Se os dados forem inválidos
        """
        # Verifica se pelo menos um dos campos de identificação está presente
        if not any(field in customer_data for field in ["email", "phone"]):
            raise ValueError(
                "Pelo menos um dos campos 'email' ou 'phone' deve ser informado"
            )

        # Verifica se o nome está presente
        if "name" not in customer_data:
            raise ValueError("Campo obrigatório ausente: name")

    def get_customer(self, customer_id: str) -> Optional[CRMCustomer]:
        """
        Obtém um cliente pelo ID

        Args:
            customer_id: ID do cliente

        Returns:
            Cliente ou None se não encontrado
        """
        customer_data = self.db_service.find_one(
            "marketplace_crm_customers", {"id": customer_id}
        )

        if not customer_data:
            return None

        return CRMCustomer(**customer_data)

    def update_customer(
        self, customer_id: str, update_data: Dict[str, Any]
    ) -> Optional[CRMCustomer]:
        """
        Atualiza um cliente

        Args:
            customer_id: ID do cliente
            update_data: Dados a serem atualizados

        Returns:
            Cliente atualizado ou None se não encontrado
        """
        # Obtém o cliente atual
        customer = self.get_customer(customer_id)

        if not customer:
            return None

        # Atualiza os dados
        update_data["updated_at"] = datetime.now()

        # Atualiza no banco de dados
        self.db_service.update_one(
            "marketplace_crm_customers", {"id": customer_id}, {"$set": update_data}
        )

        # Atualiza o objeto de cliente
        customer_dict = customer.dict()
        customer_dict.update(update_data)
        updated_customer = CRMCustomer(**customer_dict)

        # Dispara webhook para notificar sobre a atualização do cliente
        self.webhook_service.trigger_webhook(
            customer.integration_id,
            customer.restaurant_id,
            "customer.updated",
            updated_customer.dict(),
        )

        return updated_customer

    def list_customers(
        self, filters: Dict[str, Any], page: int = 1, page_size: int = 20
    ) -> Tuple[List[CRMCustomer], int]:
        """
        Lista clientes com filtros e paginação

        Args:
            filters: Filtros a serem aplicados
            page: Número da página
            page_size: Tamanho da página

        Returns:
            Tupla com (lista de clientes, total de clientes)
        """
        # Calcula o offset para paginação
        skip = (page - 1) * page_size

        # Busca os clientes no banco de dados
        customers = self.db_service.find(
            "marketplace_crm_customers",
            filters,
            skip=skip,
            limit=page_size,
            sort=[("created_at", -1)],
        )

        # Conta o total de clientes
        total = self.db_service.count("marketplace_crm_customers", filters)

        # Converte para objetos CRMCustomer
        customer_objects = [CRMCustomer(**customer) for customer in customers]

        return customer_objects, total

    def get_customer_orders(
        self, customer_id: str, page: int = 1, page_size: int = 20
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Obtém os pedidos de um cliente

        Args:
            customer_id: ID do cliente
            page: Número da página
            page_size: Tamanho da página

        Returns:
            Tupla com (lista de pedidos, total de pedidos)
        """
        # Obtém o cliente
        customer = self.get_customer(customer_id)

        if not customer:
            return [], 0

        # Busca os pedidos do cliente
        # Em um ambiente real, isso seria uma busca em várias fontes de dados
        # Aqui estamos apenas simulando

        # Busca pedidos de delivery
        delivery_orders = self.db_service.find(
            "marketplace_delivery_orders",
            {
                "restaurant_id": customer.restaurant_id,
                "$or": [
                    {"customer.email": customer.email},
                    {"customer.phone": customer.phone},
                ],
            },
            skip=(page - 1) * page_size,
            limit=page_size,
            sort=[("created_at", -1)],
        )

        # Conta o total de pedidos
        total = self.db_service.count(
            "marketplace_delivery_orders",
            {
                "restaurant_id": customer.restaurant_id,
                "$or": [
                    {"customer.email": customer.email},
                    {"customer.phone": customer.phone},
                ],
            },
        )

        return delivery_orders, total

    def update_loyalty_points(
        self, customer_id: str, points_delta: int
    ) -> Optional[CRMCustomer]:
        """
        Atualiza os pontos de fidelidade de um cliente

        Args:
            customer_id: ID do cliente
            points_delta: Variação de pontos (positivo para adicionar, negativo para remover)

        Returns:
            Cliente atualizado ou None se não encontrado
        """
        # Obtém o cliente atual
        customer = self.get_customer(customer_id)

        if not customer:
            return None

        # Calcula os novos pontos
        new_points = max(0, customer.loyalty_points + points_delta)

        # Atualiza os pontos
        update_data = {"loyalty_points": new_points, "updated_at": datetime.now()}

        # Atualiza no banco de dados
        self.db_service.update_one(
            "marketplace_crm_customers", {"id": customer_id}, {"$set": update_data}
        )

        # Atualiza o objeto de cliente
        customer_dict = customer.dict()
        customer_dict.update(update_data)
        updated_customer = CRMCustomer(**customer_dict)

        # Dispara webhook para notificar sobre a atualização dos pontos
        self.webhook_service.trigger_webhook(
            customer.integration_id,
            customer.restaurant_id,
            "customer.points_updated",
            {
                "customer": updated_customer.dict(),
                "points_delta": points_delta,
                "previous_points": customer.loyalty_points,
                "new_points": new_points,
            },
        )

        return updated_customer
