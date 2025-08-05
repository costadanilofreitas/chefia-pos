from typing import Dict, Any, List, Optional
import logging
import aiohttp

from src.payment.models.payment_models import (
    PaymentMethod,
    PaymentStatus,
    SplitConfig,
    AsaasConfig,
)

logger = logging.getLogger(__name__)


class AsaasAdapter:
    """Adaptador para integração com a API do Asaas para processamento de pagamentos."""

    def __init__(self, config: AsaasConfig):
        """
        Inicializa o adaptador Asaas.

        Args:
            config: Configuração do Asaas
        """
        self.api_key = config.api_key
        self.environment = config.environment
        self.webhook_token = config.webhook_token
        self.base_url = (
            "https://sandbox.asaas.com/api/v3"
            if config.environment == "sandbox"
            else "https://www.asaas.com/api/v3"
        )
        self.headers = {
            "access_token": self.api_key,
            "Content-Type": "application/json",
        }

    async def create_customer(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cria um novo cliente no Asaas.

        Args:
            customer_data: Dados do cliente

        Returns:
            Dict: Resposta da API
        """
        endpoint = f"{self.base_url}/customers"

        async with aiohttp.ClientSession() as session:
            async with session.post(
                endpoint, headers=self.headers, json=customer_data
            ) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(f"Erro ao criar cliente no Asaas: {response_data}")
                    raise Exception(
                        f"Erro ao criar cliente no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                return response_data

    async def get_customer(self, customer_id: str) -> Dict[str, Any]:
        """
        Obtém um cliente pelo ID.

        Args:
            customer_id: ID do cliente no Asaas

        Returns:
            Dict: Dados do cliente
        """
        endpoint = f"{self.base_url}/customers/{customer_id}"

        async with aiohttp.ClientSession() as session:
            async with session.get(endpoint, headers=self.headers) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(f"Erro ao obter cliente no Asaas: {response_data}")
                    raise Exception(
                        f"Erro ao obter cliente no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                return response_data

    async def find_customer_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Busca um cliente pelo e-mail.

        Args:
            email: E-mail do cliente

        Returns:
            Dict: Dados do cliente ou None
        """
        endpoint = f"{self.base_url}/customers?email={email}"

        async with aiohttp.ClientSession() as session:
            async with session.get(endpoint, headers=self.headers) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(f"Erro ao buscar cliente no Asaas: {response_data}")
                    raise Exception(
                        f"Erro ao buscar cliente no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                if response_data.get("data") and len(response_data["data"]) > 0:
                    return response_data["data"][0]

                return None

    async def create_payment(
        self, payment_data: Dict[str, Any], split_config: Optional[SplitConfig] = None
    ) -> Dict[str, Any]:
        """
        Cria um novo pagamento no Asaas.

        Args:
            payment_data: Dados do pagamento
            split_config: Configuração de divisão (opcional)

        Returns:
            Dict: Resposta da API
        """
        endpoint = f"{self.base_url}/payments"

        # Adicionar configuração de split se fornecida
        if split_config and split_config.recipients:
            payment_data["split"] = self._format_split_config(split_config)

        async with aiohttp.ClientSession() as session:
            async with session.post(
                endpoint, headers=self.headers, json=payment_data
            ) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(f"Erro ao criar pagamento no Asaas: {response_data}")
                    raise Exception(
                        f"Erro ao criar pagamento no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                return response_data

    async def get_payment(self, payment_id: str) -> Dict[str, Any]:
        """
        Obtém um pagamento pelo ID.

        Args:
            payment_id: ID do pagamento no Asaas

        Returns:
            Dict: Dados do pagamento
        """
        endpoint = f"{self.base_url}/payments/{payment_id}"

        async with aiohttp.ClientSession() as session:
            async with session.get(endpoint, headers=self.headers) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(f"Erro ao obter pagamento no Asaas: {response_data}")
                    raise Exception(
                        f"Erro ao obter pagamento no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                return response_data

    async def cancel_payment(self, payment_id: str) -> Dict[str, Any]:
        """
        Cancela um pagamento.

        Args:
            payment_id: ID do pagamento no Asaas

        Returns:
            Dict: Resposta da API
        """
        endpoint = f"{self.base_url}/payments/{payment_id}"

        async with aiohttp.ClientSession() as session:
            async with session.delete(endpoint, headers=self.headers) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(
                        f"Erro ao cancelar pagamento no Asaas: {response_data}"
                    )
                    raise Exception(
                        f"Erro ao cancelar pagamento no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                return response_data

    async def refund_payment(
        self, payment_id: str, value: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Reembolsa um pagamento.

        Args:
            payment_id: ID do pagamento no Asaas
            value: Valor a ser reembolsado (opcional, se não fornecido, reembolsa o valor total)

        Returns:
            Dict: Resposta da API
        """
        endpoint = f"{self.base_url}/payments/{payment_id}/refund"

        data = {}
        if value is not None:
            data["value"] = value

        async with aiohttp.ClientSession() as session:
            async with session.post(
                endpoint, headers=self.headers, json=data
            ) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(
                        f"Erro ao reembolsar pagamento no Asaas: {response_data}"
                    )
                    raise Exception(
                        f"Erro ao reembolsar pagamento no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                return response_data

    async def create_pix_payment(
        self,
        customer_id: str,
        value: float,
        description: str,
        due_date: str,
        split_config: Optional[SplitConfig] = None,
        external_reference: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Cria um pagamento via PIX.

        Args:
            customer_id: ID do cliente no Asaas
            value: Valor do pagamento
            description: Descrição do pagamento
            due_date: Data de vencimento (formato: YYYY-MM-DD)
            split_config: Configuração de divisão (opcional)
            external_reference: Referência externa (opcional)

        Returns:
            Dict: Resposta da API com dados do PIX
        """
        payment_data = {
            "customer": customer_id,
            "billingType": "PIX",
            "value": value,
            "description": description,
            "dueDate": due_date,
        }

        if external_reference:
            payment_data["externalReference"] = external_reference

        # Criar pagamento
        payment = await self.create_payment(payment_data, split_config)

        # Obter QR Code PIX
        pix_data = await self.get_pix_qrcode(payment["id"])

        # Combinar dados
        payment["pix"] = pix_data

        return payment

    async def get_pix_qrcode(self, payment_id: str) -> Dict[str, Any]:
        """
        Obtém o QR Code PIX de um pagamento.

        Args:
            payment_id: ID do pagamento no Asaas

        Returns:
            Dict: Dados do QR Code PIX
        """
        endpoint = f"{self.base_url}/payments/{payment_id}/pixQrCode"

        async with aiohttp.ClientSession() as session:
            async with session.get(endpoint, headers=self.headers) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(f"Erro ao obter QR Code PIX no Asaas: {response_data}")
                    raise Exception(
                        f"Erro ao obter QR Code PIX no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                return response_data

    async def create_credit_card_payment(
        self,
        customer_id: str,
        value: float,
        description: str,
        credit_card_data: Dict[str, Any],
        split_config: Optional[SplitConfig] = None,
        external_reference: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Cria um pagamento via cartão de crédito.

        Args:
            customer_id: ID do cliente no Asaas
            value: Valor do pagamento
            description: Descrição do pagamento
            credit_card_data: Dados do cartão de crédito
            split_config: Configuração de divisão (opcional)
            external_reference: Referência externa (opcional)

        Returns:
            Dict: Resposta da API
        """
        payment_data = {
            "customer": customer_id,
            "billingType": "CREDIT_CARD",
            "value": value,
            "description": description,
            "creditCard": credit_card_data,
        }

        if external_reference:
            payment_data["externalReference"] = external_reference

        return await self.create_payment(payment_data, split_config)

    async def create_debit_card_payment(
        self,
        customer_id: str,
        value: float,
        description: str,
        debit_card_data: Dict[str, Any],
        split_config: Optional[SplitConfig] = None,
        external_reference: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Cria um pagamento via cartão de débito.

        Args:
            customer_id: ID do cliente no Asaas
            value: Valor do pagamento
            description: Descrição do pagamento
            debit_card_data: Dados do cartão de débito
            split_config: Configuração de divisão (opcional)
            external_reference: Referência externa (opcional)

        Returns:
            Dict: Resposta da API
        """
        payment_data = {
            "customer": customer_id,
            "billingType": "DEBIT_CARD",
            "value": value,
            "description": description,
            "debitCard": debit_card_data,
        }

        if external_reference:
            payment_data["externalReference"] = external_reference

        return await self.create_payment(payment_data, split_config)

    async def create_split_config(self, split_config: SplitConfig) -> Dict[str, Any]:
        """
        Cria uma configuração de divisão (split) no Asaas.

        Args:
            split_config: Configuração de divisão

        Returns:
            Dict: Resposta da API
        """
        endpoint = f"{self.base_url}/splitConfigurations"

        data = {
            "name": split_config.name,
            "enabled": split_config.enabled,
            "fixedRecipients": self._format_split_config(split_config),
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(
                endpoint, headers=self.headers, json=data
            ) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(
                        f"Erro ao criar configuração de split no Asaas: {response_data}"
                    )
                    raise Exception(
                        f"Erro ao criar configuração de split no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                return response_data

    async def get_split_config(self, split_id: str) -> Dict[str, Any]:
        """
        Obtém uma configuração de divisão pelo ID.

        Args:
            split_id: ID da configuração de split no Asaas

        Returns:
            Dict: Dados da configuração de split
        """
        endpoint = f"{self.base_url}/splitConfigurations/{split_id}"

        async with aiohttp.ClientSession() as session:
            async with session.get(endpoint, headers=self.headers) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(
                        f"Erro ao obter configuração de split no Asaas: {response_data}"
                    )
                    raise Exception(
                        f"Erro ao obter configuração de split no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                return response_data

    async def update_split_config(
        self, split_id: str, split_config: SplitConfig
    ) -> Dict[str, Any]:
        """
        Atualiza uma configuração de divisão.

        Args:
            split_id: ID da configuração de split no Asaas
            split_config: Nova configuração de divisão

        Returns:
            Dict: Resposta da API
        """
        endpoint = f"{self.base_url}/splitConfigurations/{split_id}"

        data = {
            "name": split_config.name,
            "enabled": split_config.enabled,
            "fixedRecipients": self._format_split_config(split_config),
        }

        async with aiohttp.ClientSession() as session:
            async with session.put(
                endpoint, headers=self.headers, json=data
            ) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(
                        f"Erro ao atualizar configuração de split no Asaas: {response_data}"
                    )
                    raise Exception(
                        f"Erro ao atualizar configuração de split no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                return response_data

    async def delete_split_config(self, split_id: str) -> Dict[str, Any]:
        """
        Exclui uma configuração de divisão.

        Args:
            split_id: ID da configuração de split no Asaas

        Returns:
            Dict: Resposta da API
        """
        endpoint = f"{self.base_url}/splitConfigurations/{split_id}"

        async with aiohttp.ClientSession() as session:
            async with session.delete(endpoint, headers=self.headers) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(
                        f"Erro ao excluir configuração de split no Asaas: {response_data}"
                    )
                    raise Exception(
                        f"Erro ao excluir configuração de split no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                return response_data

    async def validate_webhook(self, token: str, event_data: Dict[str, Any]) -> bool:
        """
        Valida um webhook do Asaas.

        Args:
            token: Token recebido no webhook
            event_data: Dados do evento

        Returns:
            bool: True se o webhook for válido
        """
        return token == self.webhook_token

    def _format_split_config(self, split_config: SplitConfig) -> List[Dict[str, Any]]:
        """
        Formata a configuração de divisão para o formato esperado pela API do Asaas.

        Args:
            split_config: Configuração de divisão

        Returns:
            List[Dict]: Lista de destinatários formatada
        """
        recipients = []

        for recipient in split_config.recipients:
            recipient_data = {
                "walletId": recipient.wallet_id,
                "percentualValue": (
                    recipient.percentage if recipient.percentage else None
                ),
                "fixedValue": recipient.fixed_value if recipient.fixed_value else None,
            }

            # Remover campos None
            recipient_data = {k: v for k, v in recipient_data.items() if v is not None}

            recipients.append(recipient_data)

        return recipients

    def map_asaas_status_to_internal(self, asaas_status: str) -> PaymentStatus:
        """
        Mapeia o status do Asaas para o status interno.

        Args:
            asaas_status: Status do Asaas

        Returns:
            PaymentStatus: Status interno
        """
        status_map = {
            "PENDING": PaymentStatus.PENDING,
            "RECEIVED": PaymentStatus.COMPLETED,
            "CONFIRMED": PaymentStatus.COMPLETED,
            "OVERDUE": PaymentStatus.FAILED,
            "REFUNDED": PaymentStatus.REFUNDED,
            "RECEIVED_IN_CASH": PaymentStatus.COMPLETED,
            "REFUND_REQUESTED": PaymentStatus.REFUND_PENDING,
            "CHARGEBACK_REQUESTED": PaymentStatus.DISPUTE,
            "CHARGEBACK_DISPUTE": PaymentStatus.DISPUTE,
            "AWAITING_CHARGEBACK_REVERSAL": PaymentStatus.DISPUTE,
            "DUNNING_REQUESTED": PaymentStatus.FAILED,
            "DUNNING_RECEIVED": PaymentStatus.COMPLETED,
            "AWAITING_RISK_ANALYSIS": PaymentStatus.PENDING,
        }

        return status_map.get(asaas_status, PaymentStatus.UNKNOWN)

    def map_internal_method_to_asaas(self, method: PaymentMethod) -> str:
        """
        Mapeia o método de pagamento interno para o método do Asaas.

        Args:
            method: Método de pagamento interno

        Returns:
            str: Método de pagamento do Asaas
        """
        method_map = {
            PaymentMethod.PIX: "PIX",
            PaymentMethod.CREDIT_CARD: "CREDIT_CARD",
            PaymentMethod.DEBIT_CARD: "DEBIT_CARD",
            PaymentMethod.BOLETO: "BOLETO",
            PaymentMethod.TRANSFER: "TRANSFER",
        }

        return method_map.get(method, "UNDEFINED")
