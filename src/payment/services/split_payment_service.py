from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import os
import logging

from src.payment.models.payment_models import (
    PaymentProvider, PaymentStatus, ProviderConfig, ProviderConfigCreate, ProviderConfigUpdate,
    Payment, PaymentCreate
)
from src.payment.models.split_models import (
    SplitConfig, SplitConfigCreate, SplitConfigUpdate,
    SplitRecipient, RetentionConfig, SplitPaymentRecord
)
from src.payment.adapters.asaas_adapter_enhanced import AsaasAdapter
from src.core.events.event_bus import get_event_bus, Event, EventType
from src.product.models.product import OrderUpdate, PaymentStatus as OrderPaymentStatus

# Configuração de logging
logger = logging.getLogger(__name__)

# Simulação de banco de dados com arquivo JSON
DATA_DIR = os.path.join("/home/ubuntu/pos-modern/data")
PAYMENTS_FILE = os.path.join(DATA_DIR, "payments.json")
PROVIDER_CONFIGS_FILE = os.path.join(DATA_DIR, "payment_provider_configs.json")
SPLIT_CONFIGS_FILE = os.path.join(DATA_DIR, "split_configs.json")
SPLIT_PAYMENTS_FILE = os.path.join(DATA_DIR, "split_payments.json")

# Garantir que os diretórios existem
os.makedirs(DATA_DIR, exist_ok=True)

# Inicializar arquivos de dados se não existirem
for file_path in [PAYMENTS_FILE, PROVIDER_CONFIGS_FILE, SPLIT_CONFIGS_FILE, SPLIT_PAYMENTS_FILE]:
    if not os.path.exists(file_path):
        with open(file_path, 'w') as f:
            json.dump([], f)

class SplitPaymentService:
    """Serviço para gerenciamento de configurações de rateio e pagamentos com split."""
    
    def __init__(self):
        self.asaas_adapter = AsaasAdapter()
        self._load_provider_configs()
    
    def _load_data(self, file_path: str) -> List[Dict[str, Any]]:
        """Carrega dados de um arquivo JSON."""
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _save_data(self, file_path: str, data: List[Dict[str, Any]]) -> None:
        """Salva dados em um arquivo JSON."""
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=4)

    def _load_split_configs(self) -> List[Dict[str, Any]]:
        return self._load_data(SPLIT_CONFIGS_FILE)

    def _save_split_configs(self, configs: List[Dict[str, Any]]) -> None:
        self._save_data(SPLIT_CONFIGS_FILE, configs)

    def _load_split_payments(self) -> List[Dict[str, Any]]:
        return self._load_data(SPLIT_PAYMENTS_FILE)

    def _save_split_payments(self, payments: List[Dict[str, Any]]) -> None:
        self._save_data(SPLIT_PAYMENTS_FILE, payments)

    def _load_provider_configs(self) -> None:
        """Carrega configurações de provedores e configura o adaptador Asaas."""
        configs_data = self._load_data(PROVIDER_CONFIGS_FILE)
        for config in configs_data:
            if config.get("provider") == PaymentProvider.ASAAS:
                self.asaas_adapter.configure(ProviderConfig(**config))
                break
    
    async def create_split_config(self, config_data: SplitConfigCreate) -> SplitConfig:
        """
        Cria uma nova configuração de rateio.
        
        Args:
            config_data: Dados da configuração
            
        Returns:
            SplitConfig: Configuração criada
        """
        # Converter DTOs para modelos
        recipients = []
        for recipient_data in config_data.recipients:
            recipient = SplitRecipient(
                name=recipient_data.name,
                wallet_id=recipient_data.wallet_id,
                type=recipient_data.type,
                value=recipient_data.value,
                description=recipient_data.description
            )
            
            # Validar carteira no Asaas
            if not await self.asaas_adapter.validate_wallet(recipient.wallet_id):
                raise ValueError(f"Carteira inválida: {recipient.wallet_id}")
            
            recipients.append(recipient)
        
        retention_config = None
        if config_data.retention_config:
            retention_data = config_data.retention_config
            retention_config = RetentionConfig(
                type=retention_data.type,
                value=retention_data.value,
                wallet_id=retention_data.wallet_id,
                description=retention_data.description
            )
            
            # Validar carteira de retenção no Asaas
            if not await self.asaas_adapter.validate_wallet(retention_config.wallet_id):
                raise ValueError(f"Carteira de retenção inválida: {retention_config.wallet_id}")
        
        # Criar configuração
        split_config = SplitConfig(
            restaurant_id=config_data.restaurant_id,
            store_id=config_data.store_id,
            name=config_data.name,
            description=config_data.description,
            recipients=recipients,
            retention_config=retention_config,
            valid_from=config_data.valid_from,
            valid_until=config_data.valid_until
        )
        
        # Salvar configuração
        configs = self._load_split_configs()
        configs.append(split_config.dict())
        self._save_split_configs(configs)
        
        # Publicar evento
        event_bus = get_event_bus()
        await event_bus.publish(Event(
            event_type=EventType.SPLIT_CONFIG_CREATED,
            data=split_config.dict()
        ))
        
        return split_config
    
    async def update_split_config(self, config_id: str, config_data: SplitConfigUpdate) -> Optional[SplitConfig]:
        """
        Atualiza uma configuração de rateio.
        
        Args:
            config_id: ID da configuração
            config_data: Dados para atualização
            
        Returns:
            SplitConfig: Configuração atualizada ou None se não encontrada
        """
        configs = self._load_split_configs()
        config_index = next((i for i, c in enumerate(configs) if c.get("id") == config_id), None)
        
        if config_index is None:
            return None
        
        # Carregar configuração existente
        existing_config = SplitConfig(**configs[config_index])
        
        # Atualizar campos simples
        update_dict = config_data.dict(exclude_unset=True)
        for key, value in update_dict.items():
            if key not in ["recipients", "retention_config"]:
                setattr(existing_config, key, value)
        
        # Atualizar destinatários se fornecidos
        if config_data.recipients is not None:
            recipients = []
            for recipient_data in config_data.recipients:
                recipient = SplitRecipient(
                    name=recipient_data.name,
                    wallet_id=recipient_data.wallet_id,
                    type=recipient_data.type,
                    value=recipient_data.value,
                    description=recipient_data.description
                )
                
                # Validar carteira no Asaas
                if not await self.asaas_adapter.validate_wallet(recipient.wallet_id):
                    raise ValueError(f"Carteira inválida: {recipient.wallet_id}")
                
                recipients.append(recipient)
            
            existing_config.recipients = recipients
        
        # Atualizar configuração de retenção se fornecida
        if config_data.retention_config is not None:
            if config_data.retention_config:
                retention_data = config_data.retention_config
                retention_config = RetentionConfig(
                    type=retention_data.type,
                    value=retention_data.value,
                    wallet_id=retention_data.wallet_id,
                    description=retention_data.description
                )
                
                # Validar carteira de retenção no Asaas
                if not await self.asaas_adapter.validate_wallet(retention_config.wallet_id):
                    raise ValueError(f"Carteira de retenção inválida: {retention_config.wallet_id}")
                
                existing_config.retention_config = retention_config
            else:
                existing_config.retention_config = None
        
        # Atualizar data de modificação
        existing_config.updated_at = datetime.utcnow()
        
        # Salvar configuração atualizada
        configs[config_index] = existing_config.dict()
        self._save_split_configs(configs)
        
        # Publicar evento
        event_bus = get_event_bus()
        await event_bus.publish(Event(
            event_type=EventType.SPLIT_CONFIG_UPDATED,
            data=existing_config.dict()
        ))
        
        return existing_config
    
    async def get_split_config(self, config_id: str) -> Optional[SplitConfig]:
        """
        Obtém uma configuração de rateio pelo ID.
        
        Args:
            config_id: ID da configuração
            
        Returns:
            SplitConfig: Configuração ou None se não encontrada
        """
        configs = self._load_split_configs()
        config_dict = next((c for c in configs if c.get("id") == config_id), None)
        
        if not config_dict:
            return None
        
        return SplitConfig(**config_dict)
    
    async def get_split_configs_by_restaurant(self, restaurant_id: str, store_id: Optional[str] = None) -> List[SplitConfig]:
        """
        Obtém configurações de rateio por restaurante e loja.
        
        Args:
            restaurant_id: ID do restaurante
            store_id: ID da loja (opcional)
            
        Returns:
            List[SplitConfig]: Lista de configurações
        """
        configs = self._load_split_configs()
        
        if store_id:
            config_dicts = [c for c in configs if c.get("restaurant_id") == restaurant_id and c.get("store_id") == store_id]
        else:
            config_dicts = [c for c in configs if c.get("restaurant_id") == restaurant_id]
        
        return [SplitConfig(**c) for c in config_dicts]
    
    async def delete_split_config(self, config_id: str) -> bool:
        """
        Exclui uma configuração de rateio.
        
        Args:
            config_id: ID da configuração
            
        Returns:
            bool: True se excluída com sucesso, False se não encontrada
        """
        configs = self._load_split_configs()
        config_index = next((i for i, c in enumerate(configs) if c.get("id") == config_id), None)
        
        if config_index is None:
            return False
        
        # Obter configuração para evento
        config = configs.pop(config_index)
        
        # Salvar configurações atualizadas
        self._save_split_configs(configs)
        
        # Publicar evento
        event_bus = get_event_bus()
        await event_bus.publish(Event(
            event_type=EventType.SPLIT_CONFIG_DELETED,
            data={"config_id": config_id}
        ))
        
        return True
    
    async def create_payment_with_split(self, payment_data: PaymentCreate, split_config_id: str) -> Dict[str, Any]:
        """
        Cria um pagamento com rateio.
        
        Args:
            payment_data: Dados do pagamento
            split_config_id: ID da configuração de rateio
            
        Returns:
            Dict: Dados do pagamento criado e registro de split
        """
        # Obter configuração de rateio
        split_config = await self.get_split_config(split_config_id)
        if not split_config:
            raise ValueError(f"Configuração de rateio não encontrada: {split_config_id}")
        
        # Verificar se a configuração está ativa
        if not split_config.is_active:
            raise ValueError(f"Configuração de rateio inativa: {split_config_id}")
        
        # Verificar validade da configuração
        now = datetime.utcnow()
        if split_config.valid_from and split_config.valid_from > now:
            raise ValueError(f"Configuração de rateio ainda não válida: {split_config_id}")
        if split_config.valid_until and split_config.valid_until < now:
            raise ValueError(f"Configuração de rateio expirada: {split_config_id}")
        
        # Criar pagamento no serviço de pagamento
        payment_service = PaymentService()
        payment = await payment_service.create_payment_with_split(payment_data, split_config)
        
        # Criar registro de pagamento com split
        split_payment_record = await self.asaas_adapter.create_split_payment_record(
            payment_id=payment.id,
            provider_payment_id=payment.provider_payment_id,
            split_config=split_config,
            total_value=payment.amount
        )
        
        # Salvar registro de split
        split_payments = self._load_split_payments()
        split_payments.append(split_payment_record.dict())
        self._save_split_payments(split_payments)
        
        # Publicar evento
        event_bus = get_event_bus()
        await event_bus.publish(Event(
            event_type=EventType.SPLIT_PAYMENT_CREATED,
            data={
                "payment_id": payment.id,
                "split_config_id": split_config_id,
                "split_payment_record": split_payment_record.dict()
            }
        ))
        
        return {
            "payment": payment.dict(),
            "split_payment_record": split_payment_record.dict()
        }
    
    async def get_split_payment_record(self, payment_id: str) -> Optional[SplitPaymentRecord]:
        """
        Obtém o registro de split de um pagamento.
        
        Args:
            payment_id: ID do pagamento
            
        Returns:
            SplitPaymentRecord: Registro de split ou None se não encontrado
        """
        split_payments = self._load_split_payments()
        record_dict = next((p for p in split_payments if p.get("payment_id") == payment_id), None)
        
        if not record_dict:
            return None
        
        return SplitPaymentRecord(**record_dict)
    
    async def update_split_payment_status(self, payment_id: str) -> Optional[SplitPaymentRecord]:
        """
        Atualiza o status das transferências de um pagamento com split.
        
        Args:
            payment_id: ID do pagamento
            
        Returns:
            SplitPaymentRecord: Registro atualizado ou None se não encontrado
        """
        # Obter registro de split
        split_payment_record = await self.get_split_payment_record(payment_id)
        if not split_payment_record:
            return None
        
        # Atualizar status das transferências
        updated_record = await self.asaas_adapter.update_split_transactions_status(split_payment_record)
        
        # Salvar registro atualizado
        split_payments = self._load_split_payments()
        record_index = next((i for i, p in enumerate(split_payments) if p.get("payment_id") == payment_id), None)
        
        if record_index is not None:
            split_payments[record_index] = updated_record.dict()
            self._save_split_payments(split_payments)
        
        # Publicar evento
        event_bus = get_event_bus()
        await event_bus.publish(Event(
            event_type=EventType.SPLIT_PAYMENT_STATUS_UPDATED,
            data=updated_record.dict()
        ))
        
        return updated_record
    
    async def get_split_payments_by_config(self, split_config_id: str) -> List[SplitPaymentRecord]:
        """
        Obtém pagamentos com split por configuração.
        
        Args:
            split_config_id: ID da configuração de rateio
            
        Returns:
            List[SplitPaymentRecord]: Lista de registros de pagamentos com split
        """
        split_payments = self._load_split_payments()
        record_dicts = [p for p in split_payments if p.get("split_config_id") == split_config_id]
        
        return [SplitPaymentRecord(**p) for p in record_dicts]

class PaymentService:
    """Serviço para gerenciamento de pagamentos."""
    
    def __init__(self):
        self.adapters = {
            PaymentProvider.ASAAS: AsaasAdapter()
        }
        self._load_provider_configs()
    
    def _load_data(self, file_path: str) -> List[Dict[str, Any]]:
        """Carrega dados de um arquivo JSON."""
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _save_data(self, file_path: str, data: List[Dict[str, Any]]) -> None:
        """Salva dados em um arquivo JSON."""
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=4)

    def _load_payments(self) -> List[Dict[str, Any]]:
        return self._load_data(PAYMENTS_FILE)

    def _save_payments(self, payments: List[Dict[str, Any]]) -> None:
        self._save_data(PAYMENTS_FILE, payments)

    def _load_provider_configs(self) -> List[ProviderConfig]:
        """Carrega configurações de provedores."""
        configs_data = self._load_data(PROVIDER_CONFIGS_FILE)
        configs = []
        for config in configs_data:
            provider_config = ProviderConfig(**config)
            configs.append(provider_config)
            
            # Configurar adaptador
            if provider_config.provider in self.adapters:
                self.adapters[provider_config.provider].configure(provider_config)
        
        return configs
    
    def _save_provider_config(self, config: ProviderConfig) -> None:
        """Salva uma configuração de provedor."""
        configs = self._load_data(PROVIDER_CONFIGS_FILE)
        
        # Verificar se já existe uma configuração para este provedor
        config_index = next((i for i, c in enumerate(configs) if c.get("provider") == config.provider), None)
        
        if config_index is not None:
            configs[config_index] = config.dict()
        else:
            configs.append(config.dict())
        
        self._save_data(PROVIDER_CONFIGS_FILE, configs)
    
    def _get_provider_config(self, provider: PaymentProvider) -> Optional[ProviderConfig]:
        """Obtém a configuração de um provedor específico."""
        configs = self._load_provider_configs()
        return next((c for c in configs if c.provider == provider), None)
    
    def _save_payment(self, payment: Payment) -> None:
        """Salva um pagamento."""
        payments = self._load_payments()
        
        # Verificar se o pagamento já existe
        payment_index = next((i for i, p in enumerate(payments) if p.get("id") == payment.id), None)
        
        if payment_index is not None:
            payments[payment_index] = payment.dict()
        else:
            payments.append(payment.dict())
        
        self._save_payments(payments)
    
    async def create_provider_config(self, config_data: ProviderConfigCreate) -> ProviderConfig:
        """Cria uma nova configuração de provedor."""
        config = ProviderConfig(
            provider=config_data.provider,
            api_key=config_data.api_key,
            sandbox=config_data.sandbox,
            webhook_url=config_data.webhook_url,
            default_notification=config_data.default_notification
        )
        
        self._save_provider_config(config)
        
        # Configurar adaptador
        if config.provider in self.adapters:
            self.adapters[config.provider].configure(config)
        
        return config
    
    async def update_provider_config(self, provider: PaymentProvider, 
                                    config_data: ProviderConfigUpdate) -> Optional[ProviderConfig]:
        """Atualiza uma configuração de provedor."""
        config = self._get_provider_config(provider)
        if not config:
            return None
        
        update_dict = config_data.dict(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(config, key, value)
        
        config.updated_at = datetime.utcnow()
        self._save_provider_config(config)
        
        # Atualizar adaptador
        if config.provider in self.adapters:
            self.adapters[config.provider].configure(config)
        
        return config
    
    async def get_provider_config(self, provider: PaymentProvider) -> Optional[ProviderConfig]:
        """Obtém uma configuração de provedor."""
        return self._get_provider_config(provider)
    
    async def create_payment(self, payment_data: PaymentCreate) -> Payment:
        """Cria um novo pagamento."""
        # Obter configuração do provedor
        provider = PaymentProvider.ASAAS  # Por enquanto, apenas Asaas
        config = self._get_provider_config(provider)
        if not config:
            raise Exception(f"Configuração para o provedor {provider} não encontrada")
        
        # Criar pagamento no provedor
        adapter = self.adapters[provider]
        provider_payment = await adapter.create_payment(payment_data.dict(), None)
        
        # Criar pagamento local
        payment = Payment(
            order_id=payment_data.order_id,
            provider=provider,
            provider_payment_id=provider_payment["id"],
            method=payment_data.method,
            amount=payment_data.amount,
            status=PaymentStatus.PENDING,
            pix_key=provider_payment.get("pix_key"),
            pix_qrcode=provider_payment.get("pix_qrcode"),
            pix_qrcode_image=provider_payment.get("pix_qrcode_image"),
            pix_expiration_date=provider_payment.get("pix_expiration_date"),
            payment_url=provider_payment.get("payment_url"),
            notification_type=payment_data.notification_type or config.default_notification,
            customer_email=payment_data.customer_email,
            customer_phone=payment_data.customer_phone,
            customer_name=payment_data.customer_name,
            customer_document=payment_data.customer_document,
            description=payment_data.description,
            external_reference=payment_data.external_reference,
            metadata=payment_data.metadata
        )
        
        # Salvar pagamento
        self._save_payment(payment)
        
        # Publicar evento
        event_bus = get_event_bus()
        await event_bus.publish(Event(
            event_type=EventType.PAYMENT_CREATED,
            data=payment.dict()
        ))
        
        return payment
    
    async def create_payment_with_split(self, payment_data: PaymentCreate, split_config: SplitConfig) -> Payment:
        """
        Cria um novo pagamento com configuração de split.
        
        Args:
            payment_data: Dados do pagamento
            split_config: Configuração de split
            
        Returns:
            Payment: Pagamento criado
        """
        # Obter configuração do provedor
        provider = PaymentProvider.ASAAS  # Por enquanto, apenas Asaas
        config = self._get_provider_config(provider)
        if not config:
            raise Exception(f"Configuração para o provedor {provider} não encontrada")
        
        # Criar pagamento no provedor com split
        adapter = self.adapters[provider]
        provider_payment = await adapter.create_payment(payment_data.dict(), split_config)
        
        # Criar pagamento local
        payment = Payment(
            order_id=payment_data.order_id,
            provider=provider,
            provider_payment_id=provider_payment["id"],
            method=payment_data.method,
            amount=payment_data.amount,
            status=PaymentStatus.PENDING,
            pix_key=provider_payment.get("pix_key"),
            pix_qrcode=provider_payment.get("pix_qrcode"),
            pix_qrcode_image=provider_payment.get("pix_qrcode_image"),
            pix_expiration_date=provider_payment.get("pix_expiration_date"),
            payment_url=provider_payment.get("payment_url"),
            notification_type=payment_data.notification_type or config.default_notification,
            customer_email=payment_data.customer_email,
            customer_phone=payment_data.customer_phone,
            customer_name=payment_data.customer_name,
            customer_document=payment_data.customer_document,
            description=payment_data.description,
            external_reference=payment_data.external_reference,
            metadata={
                **payment_data.metadata,
                "split_config_id": split_config.id
            }
        )
        
        # Salvar pagamento
        self._save_payment(payment)
        
        # Publicar evento
        event_bus = get_event_bus()
        await event_bus.publish(Event(
            event_type=EventType.PAYMENT_CREATED,
            data=payment.dict()
        ))
        
        return payment
    
    async def get_payment(self, payment_id: str) -> Optional[Payment]:
        """Busca um pagamento pelo ID."""
        payments = self._load_payments()
        payment_dict = next((p for p in payments if p["id"] == payment_id), None)
        if not payment_dict:
            return None
        return Payment(**payment_dict)
    
    async def get_payment_by_provider_id(self, provider_payment_id: str) -> Optional[Payment]:
        """Busca um pagamento pelo ID do provedor."""
        payments = self._load_payments()
        payment_dict = next((p for p in payments if p["provider_payment_id"] == provider_payment_id), None)
        if not payment_dict:
            return None
        return Payment(**payment_dict)
    
    async def get_payments_by_order(self, order_id: str) -> List[Payment]:
        """Busca pagamentos por ID de pedido."""
        payments = self._load_payments()
        payment_dicts = [p for p in payments if p["order_id"] == order_id]
        return [Payment(**p) for p in payment_dicts]
    
    async def update_payment_status(self, payment_id: str, status: PaymentStatus, 
                                   paid_at: Optional[datetime] = None) -> Optional[Payment]:
        """Atualiza o status de um pagamento."""
        payment = await self.get_payment(payment_id)
        if not payment:
            return None
        
        # Atualizar status
        payment.status = status
        if status == PaymentStatus.CONFIRMED and paid_at:
            payment.paid_at = paid_at
        payment.updated_at = datetime.utcnow()
        
        # Salvar pagamento
        self._save_payment(payment)
        
        # Atualizar status do pedido
        if status in [PaymentStatus.CONFIRMED, PaymentStatus.RECEIVED]:
            from src.order.services.order_service import OrderService
            order_service = OrderService()
            await order_service.update_order(payment.order_id, OrderUpdate(
                payment_status=OrderPaymentStatus.PAID,
                payment_method=payment.method.value
            ))
        
        # Atualizar status de split se aplicável
        if "split_config_id" in payment.metadata:
            split_service = SplitPaymentService()
            await split_service.update_split_payment_status(payment_id)
        
        # Publicar evento
        event_bus = get_event_bus()
        await event_bus.publish(Event(
            event_type=EventType.PAYMENT_STATUS_CHANGED,
            data={
                "payment_id": payment_id,
                "status": status.value,
                "order_id": payment.order_id
            }
        ))
        
        return payment
    
    async def process_webhook(self, provider: PaymentProvider, data: Dict[str, Any]) -> Optional[Payment]:
        """Processa webhook do provedor de pagamento."""
        adapter = self.adapters.get(provider)
        if not adapter:
            return None
        
        webhook_data = await adapter.process_webhook(data)
        if not webhook_data:
            return None
        
        # Buscar pagamento pelo ID do provedor
        payment = await self.get_payment_by_provider_id(webhook_data.provider_payment_id)
        if not payment:
            return None
        
        # Atualizar status
        return await self.update_payment_status(
            payment.id, 
            PaymentStatus(webhook_data.status),
            webhook_data.payment_date
        )
    
    async def check_payment_status(self, payment_id: str) -> Optional[Payment]:
        """Verifica o status de um pagamento diretamente no provedor."""
        payment = await self.get_payment(payment_id)
        if not payment:
            return None
        
        config = self._get_provider_config(payment.provider)
        if not config:
            return None
        
        adapter = self.adapters.get(payment.provider)
        if not adapter:
            return None
        
        # Obter status atualizado do provedor
        status_data = await adapter.get_payment_status(payment.provider_payment_id, config)
        
        # Atualizar status se necessário
        if status_data["status"] != payment.status:
            return await self.update_payment_status(
                payment.id,
                status_data["status"],
                status_data.get("payment_date")
            )
        
        return payment

# Singletons
_payment_service = None
_split_payment_service = None

def get_payment_service() -> PaymentService:
    """Obtém a instância do serviço de pagamento."""
    global _payment_service
    if _payment_service is None:
        _payment_service = PaymentService()
    return _payment_service

def get_split_payment_service() -> SplitPaymentService:
    """Obtém a instância do serviço de pagamento com split."""
    global _split_payment_service
    if _split_payment_service is None:
        _split_payment_service = SplitPaymentService()
    return _split_payment_service
