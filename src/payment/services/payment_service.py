from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import os

from src.payment.models.payment_models import (
    PaymentProvider, PaymentStatus, ProviderConfig, ProviderConfigCreate, ProviderConfigUpdate,
    Payment, PaymentCreate
)
from src.payment.adapters.asaas_adapter import AsaasAdapter
from src.core.events.event_bus import get_event_bus, Event, EventType
from src.product.models.product import OrderUpdate, PaymentStatus as OrderPaymentStatus

# Simulação de banco de dados com arquivo JSON
DATA_DIR = os.path.join("/home/ubuntu/pos-modern/data")
PAYMENTS_FILE = os.path.join(DATA_DIR, "payments.json")
PROVIDER_CONFIGS_FILE = os.path.join(DATA_DIR, "payment_provider_configs.json")

# Garantir que os diretórios existem
os.makedirs(DATA_DIR, exist_ok=True)

# Inicializar arquivos de dados se não existirem
for file_path in [PAYMENTS_FILE, PROVIDER_CONFIGS_FILE]:
    if not os.path.exists(file_path):
        with open(file_path, 'w') as f:
            json.dump([], f)

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
        return [ProviderConfig(**config) for config in configs_data]
    
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
        provider_payment = await adapter.create_payment(payment_data, config)
        
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

# Singleton
_payment_service = None

def get_payment_service() -> PaymentService:
    """Obtém a instância do serviço de pagamento."""
    global _payment_service
    if _payment_service is None:
        _payment_service = PaymentService()
    return _payment_service
