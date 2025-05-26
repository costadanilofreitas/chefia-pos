# Módulo de Pagamento Online Asaas - Design

## Visão Geral

O Módulo de Pagamento Online Asaas é uma extensão do sistema POS Modern que permite a integração com a plataforma de pagamentos Asaas para processamento de pagamentos online. A implementação inicial focará em pagamentos via PIX, com suporte futuro para pagamentos com cartão de crédito e débito via integração com bot de WhatsApp.

## Objetivos

1. Integrar o sistema POS Modern com a API do Asaas para processamento de pagamentos PIX
2. Permitir que os clientes visualizem o status do pagamento
3. Enviar notificações por e-mail e SMS sobre o status do pagamento
4. Integrar com o fluxo de pedidos existente para atualização automática de status

## Arquitetura

O módulo seguirá a arquitetura modular do sistema POS Modern, com separação clara entre modelos, serviços, adaptadores e endpoints da API:

```
src/payment/
├── models/
│   └── payment_models.py       # Modelos de dados para pagamentos
├── services/
│   └── payment_service.py      # Serviço de gerenciamento de pagamentos
├── adapters/
│   └── asaas_adapter.py        # Adaptador específico para o Asaas
├── router/
│   └── payment_router.py       # Endpoints da API para pagamentos
├── events/
│   └── payment_events.py       # Eventos relacionados a pagamentos
└── tests/
    ├── test_asaas_adapter.py   # Testes para o adaptador Asaas
    ├── test_payment_service.py # Testes para o serviço
    └── test_payment_router.py  # Testes para os endpoints da API
```

## Componentes Principais

### Modelos de Dados

Os modelos de dados definirão a estrutura dos pagamentos e suas configurações:

```python
# payment_models.py

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from enum import Enum
from datetime import datetime
import uuid

class PaymentProvider(str, Enum):
    """Provedor de pagamento."""
    ASAAS = "asaas"
    MANUAL = "manual"
    OTHER = "other"

class PaymentMethod(str, Enum):
    """Método de pagamento."""
    PIX = "pix"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BOLETO = "boleto"
    TRANSFER = "transfer"
    CASH = "cash"
    OTHER = "other"

class PaymentStatus(str, Enum):
    """Status do pagamento."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    RECEIVED = "received"
    OVERDUE = "overdue"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"
    FAILED = "failed"

class NotificationType(str, Enum):
    """Tipo de notificação."""
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    NONE = "none"

class ProviderConfig(BaseModel):
    """Configuração do provedor de pagamento."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    provider: PaymentProvider
    api_key: str
    sandbox: bool = False
    webhook_url: Optional[str] = None
    default_notification: NotificationType = NotificationType.EMAIL
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ProviderConfigCreate(BaseModel):
    """Dados para criação de uma configuração de provedor."""
    provider: PaymentProvider
    api_key: str
    sandbox: bool = False
    webhook_url: Optional[str] = None
    default_notification: NotificationType = NotificationType.EMAIL

class ProviderConfigUpdate(BaseModel):
    """Dados para atualização de uma configuração de provedor."""
    api_key: Optional[str] = None
    sandbox: Optional[bool] = None
    webhook_url: Optional[str] = None
    default_notification: Optional[NotificationType] = None

class Payment(BaseModel):
    """Pagamento."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    provider: PaymentProvider
    provider_payment_id: Optional[str] = None
    method: PaymentMethod
    amount: float
    status: PaymentStatus = PaymentStatus.PENDING
    pix_key: Optional[str] = None
    pix_qrcode: Optional[str] = None
    pix_qrcode_image: Optional[str] = None
    pix_expiration_date: Optional[datetime] = None
    payment_url: Optional[str] = None
    notification_type: NotificationType
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_name: Optional[str] = None
    customer_document: Optional[str] = None
    description: Optional[str] = None
    external_reference: Optional[str] = None
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    paid_at: Optional[datetime] = None

class PaymentCreate(BaseModel):
    """Dados para criação de um pagamento."""
    order_id: str
    method: PaymentMethod = PaymentMethod.PIX
    amount: float
    notification_type: Optional[NotificationType] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_name: Optional[str] = None
    customer_document: Optional[str] = None
    description: Optional[str] = None
    external_reference: Optional[str] = None
    metadata: Dict[str, Any] = {}

class PaymentUpdate(BaseModel):
    """Dados para atualização de um pagamento."""
    status: Optional[PaymentStatus] = None
    provider_payment_id: Optional[str] = None
    pix_key: Optional[str] = None
    pix_qrcode: Optional[str] = None
    pix_qrcode_image: Optional[str] = None
    pix_expiration_date: Optional[datetime] = None
    payment_url: Optional[str] = None
    paid_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None

class PaymentWebhook(BaseModel):
    """Dados recebidos via webhook do provedor de pagamento."""
    event: str
    payment_id: str
    provider_payment_id: str
    status: str
    payment_date: Optional[datetime] = None
    metadata: Dict[str, Any] = {}
```

### Serviço de Pagamento

O serviço `PaymentService` será responsável por:

- Criar e gerenciar pagamentos
- Integrar com o adaptador Asaas
- Processar webhooks de atualização de status
- Publicar eventos relacionados a pagamentos
- Atualizar o status dos pedidos

```python
# payment_service.py (pseudocódigo)

class PaymentService:
    def __init__(self):
        self.adapters = {
            PaymentProvider.ASAAS: AsaasAdapter()
        }
        self._load_provider_configs()
    
    async def create_payment(self, payment_data: PaymentCreate) -> Payment:
        """Cria um novo pagamento."""
        # Obter configuração do provedor
        config = self._get_provider_config(PaymentProvider.ASAAS)
        
        # Criar pagamento no provedor
        adapter = self.adapters[PaymentProvider.ASAAS]
        provider_payment = await adapter.create_payment(payment_data, config)
        
        # Criar pagamento local
        payment = Payment(
            order_id=payment_data.order_id,
            provider=PaymentProvider.ASAAS,
            provider_payment_id=provider_payment.id,
            method=payment_data.method,
            amount=payment_data.amount,
            status=PaymentStatus.PENDING,
            pix_key=provider_payment.pix_key,
            pix_qrcode=provider_payment.pix_qrcode,
            pix_qrcode_image=provider_payment.pix_qrcode_image,
            pix_expiration_date=provider_payment.pix_expiration_date,
            payment_url=provider_payment.payment_url,
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
    
    async def get_payment_by_order(self, order_id: str) -> List[Payment]:
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
            order_service = get_order_service()
            await order_service.update_order(payment.order_id, OrderUpdate(
                payment_status=PaymentStatus.PAID,
                payment_method=PaymentMethod.PIX
            ))
        
        # Publicar evento
        event_bus = get_event_bus()
        await event_bus.publish(Event(
            event_type=EventType.PAYMENT_STATUS_CHANGED,
            data={
                "payment_id": payment_id,
                "status": status,
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
        payments = self._load_payments()
        payment_dict = next((p for p in payments if p["provider_payment_id"] == webhook_data.provider_payment_id), None)
        if not payment_dict:
            return None
        
        payment = Payment(**payment_dict)
        
        # Atualizar status
        return await self.update_payment_status(
            payment.id, 
            PaymentStatus(webhook_data.status),
            webhook_data.payment_date
        )
    
    # Métodos auxiliares para carregar/salvar dados
    def _load_provider_configs(self) -> List[ProviderConfig]:
        # Implementação para carregar configurações de provedores
        pass
    
    def _get_provider_config(self, provider: PaymentProvider) -> Optional[ProviderConfig]:
        # Implementação para obter configuração de um provedor específico
        pass
    
    def _load_payments(self) -> List[Dict[str, Any]]:
        # Implementação para carregar pagamentos
        pass
    
    def _save_payment(self, payment: Payment) -> None:
        # Implementação para salvar um pagamento
        pass
```

### Adaptador Asaas

O adaptador `AsaasAdapter` implementará a integração específica com o Asaas:

```python
# asaas_adapter.py (pseudocódigo)

class AsaasAdapter:
    async def create_payment(self, payment_data: PaymentCreate, config: ProviderConfig) -> Dict[str, Any]:
        """Cria um pagamento no Asaas."""
        # Determinar URL base com base no ambiente (sandbox ou produção)
        base_url = "https://api-sandbox.asaas.com" if config.sandbox else "https://api.asaas.com"
        
        # Preparar dados para a API do Asaas
        asaas_data = {
            "customer": await self._get_or_create_customer(payment_data, config),
            "billingType": "PIX",
            "value": payment_data.amount,
            "dueDate": (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d"),
            "description": payment_data.description or f"Pedido #{payment_data.external_reference}",
            "externalReference": payment_data.external_reference or payment_data.order_id,
            "postalService": False
        }
        
        # Adicionar notificações se necessário
        if payment_data.notification_type == NotificationType.EMAIL and payment_data.customer_email:
            asaas_data["sendEmailOnCreation"] = True
        
        if payment_data.notification_type == NotificationType.SMS and payment_data.customer_phone:
            asaas_data["sendSmsOnCreation"] = True
        
        # Fazer requisição para a API do Asaas
        headers = {
            "Content-Type": "application/json",
            "access_token": config.api_key
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{base_url}/v3/payments", json=asaas_data, headers=headers) as response:
                if response.status != 200:
                    error_data = await response.json()
                    raise Exception(f"Erro ao criar pagamento no Asaas: {error_data}")
                
                payment_response = await response.json()
        
        # Obter QR Code PIX
        pix_data = await self._get_pix_qrcode(payment_response["id"], config)
        
        # Retornar dados do pagamento
        return {
            "id": payment_response["id"],
            "status": self._map_status(payment_response["status"]),
            "pix_key": pix_data.get("payload"),
            "pix_qrcode": pix_data.get("encodedImage"),
            "pix_qrcode_image": pix_data.get("encodedImage"),
            "pix_expiration_date": datetime.strptime(payment_response["dueDate"], "%Y-%m-%d"),
            "payment_url": payment_response.get("invoiceUrl")
        }
    
    async def _get_pix_qrcode(self, payment_id: str, config: ProviderConfig) -> Dict[str, Any]:
        """Obtém o QR Code PIX de um pagamento."""
        base_url = "https://api-sandbox.asaas.com" if config.sandbox else "https://api.asaas.com"
        
        headers = {
            "Content-Type": "application/json",
            "access_token": config.api_key
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{base_url}/v3/payments/{payment_id}/pixQrCode", headers=headers) as response:
                if response.status != 200:
                    error_data = await response.json()
                    raise Exception(f"Erro ao obter QR Code PIX: {error_data}")
                
                return await response.json()
    
    async def _get_or_create_customer(self, payment_data: PaymentCreate, config: ProviderConfig) -> str:
        """Obtém ou cria um cliente no Asaas."""
        # Implementação para obter ou criar cliente no Asaas
        # Retorna o ID do cliente
        pass
    
    async def process_webhook(self, data: Dict[str, Any]) -> Optional[PaymentWebhook]:
        """Processa webhook do Asaas."""
        event = data.get("event")
        if not event:
            return None
        
        payment_id = data.get("payment", {}).get("id")
        if not payment_id:
            return None
        
        status_mapping = {
            "PAYMENT_CREATED": PaymentStatus.PENDING,
            "PAYMENT_UPDATED": None,  # Depende do status atual
            "PAYMENT_CONFIRMED": PaymentStatus.CONFIRMED,
            "PAYMENT_RECEIVED": PaymentStatus.RECEIVED,
            "PAYMENT_OVERDUE": PaymentStatus.OVERDUE,
            "PAYMENT_DELETED": PaymentStatus.CANCELLED,
            "PAYMENT_RESTORED": PaymentStatus.PENDING,
            "PAYMENT_REFUNDED": PaymentStatus.REFUNDED,
            "PAYMENT_REFUND_FAILED": PaymentStatus.FAILED
        }
        
        status = status_mapping.get(event)
        if not status and event == "PAYMENT_UPDATED":
            status = self._map_status(data.get("payment", {}).get("status"))
        
        if not status:
            return None
        
        payment_date = None
        if event in ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]:
            payment_date_str = data.get("payment", {}).get("paymentDate")
            if payment_date_str:
                payment_date = datetime.strptime(payment_date_str, "%Y-%m-%d")
        
        return PaymentWebhook(
            event=event,
            payment_id="",  # Será preenchido pelo serviço
            provider_payment_id=payment_id,
            status=status,
            payment_date=payment_date,
            metadata=data
        )
    
    def _map_status(self, asaas_status: str) -> PaymentStatus:
        """Mapeia status do Asaas para status interno."""
        status_mapping = {
            "PENDING": PaymentStatus.PENDING,
            "CONFIRMED": PaymentStatus.CONFIRMED,
            "RECEIVED": PaymentStatus.RECEIVED,
            "OVERDUE": PaymentStatus.OVERDUE,
            "REFUNDED": PaymentStatus.REFUNDED,
            "CANCELLED": PaymentStatus.CANCELLED,
            "FAILED": PaymentStatus.FAILED
        }
        return status_mapping.get(asaas_status, PaymentStatus.PENDING)
```

### Endpoints da API

O módulo expõe os seguintes endpoints:

```python
# payment_router.py (pseudocódigo)

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])

@router.post("/", response_model=Payment)
async def create_payment(payment_data: PaymentCreate, current_user = Depends(get_current_user)):
    """Cria um novo pagamento."""
    payment_service = get_payment_service()
    return await payment_service.create_payment(payment_data)

@router.get("/{payment_id}", response_model=Payment)
async def get_payment(payment_id: str, current_user = Depends(get_current_user)):
    """Obtém detalhes de um pagamento."""
    payment_service = get_payment_service()
    payment = await payment_service.get_payment(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    return payment

@router.get("/order/{order_id}", response_model=List[Payment])
async def get_payments_by_order(order_id: str, current_user = Depends(get_current_user)):
    """Obtém pagamentos por ID de pedido."""
    payment_service = get_payment_service()
    return await payment_service.get_payment_by_order(order_id)

@router.post("/webhook/asaas", status_code=200)
async def asaas_webhook(request: Request):
    """Webhook para receber notificações do Asaas."""
    data = await request.json()
    payment_service = get_payment_service()
    await payment_service.process_webhook(PaymentProvider.ASAAS, data)
    return {"success": True}

@router.post("/config", response_model=ProviderConfig)
async def create_provider_config(config_data: ProviderConfigCreate, current_user = Depends(get_current_user)):
    """Cria uma nova configuração de provedor."""
    payment_service = get_payment_service()
    return await payment_service.create_provider_config(config_data)

@router.put("/config/{provider}", response_model=ProviderConfig)
async def update_provider_config(provider: PaymentProvider, config_data: ProviderConfigUpdate, 
                                current_user = Depends(get_current_user)):
    """Atualiza uma configuração de provedor."""
    payment_service = get_payment_service()
    config = await payment_service.update_provider_config(provider, config_data)
    if not config:
        raise HTTPException(status_code=404, detail="Configuração não encontrada")
    return config
```

## Integração com o Serviço de Pedidos

O módulo de pagamento será integrado ao serviço de pedidos existente, permitindo:

1. Criar um pagamento a partir de um pedido
2. Atualizar o status do pedido quando o pagamento for confirmado
3. Visualizar o status do pagamento no pedido

```python
# Exemplo de integração no order_service.py

async def create_payment_for_order(self, order_id: str, payment_method: PaymentMethod) -> Optional[Payment]:
    """Cria um pagamento para um pedido."""
    order = await self.get_order(order_id)
    if not order:
        return None
    
    # Obter dados do cliente
    customer = None
    if order.customer_id:
        customer_service = get_customer_service()
        customer = await customer_service.get_customer(order.customer_id)
    
    # Criar dados do pagamento
    payment_data = PaymentCreate(
        order_id=order_id,
        method=payment_method,
        amount=order.total,
        notification_type=NotificationType.EMAIL if customer and customer.email else NotificationType.NONE,
        customer_email=customer.email if customer else None,
        customer_phone=customer.phone if customer else None,
        customer_name=customer.name if customer else order.customer_name,
        customer_document=customer.document if customer else None,
        description=f"Pedido #{order.order_number}",
        external_reference=order.order_number
    )
    
    # Criar pagamento
    payment_service = get_payment_service()
    payment = await payment_service.create_payment(payment_data)
    
    # Atualizar pedido com método de pagamento
    await self.update_order(order_id, OrderUpdate(
        payment_method=payment_method
    ))
    
    return payment
```

## Fluxo de Pagamento

1. **Criação do Pagamento**:
   - Um pedido é criado no sistema
   - O usuário seleciona PIX como método de pagamento
   - O sistema cria um pagamento no Asaas
   - O sistema gera um QR Code PIX e uma chave PIX

2. **Pagamento pelo Cliente**:
   - O cliente escaneia o QR Code ou copia a chave PIX
   - O cliente realiza o pagamento em seu aplicativo bancário

3. **Confirmação do Pagamento**:
   - O Asaas recebe a confirmação do pagamento
   - O Asaas envia uma notificação via webhook
   - O sistema atualiza o status do pagamento
   - O sistema atualiza o status do pedido
   - O sistema envia notificações por e-mail/SMS (via Asaas)

4. **Visualização do Status**:
   - O usuário pode verificar o status do pagamento no sistema
   - O cliente recebe notificações sobre o status do pagamento

## Eventos

O módulo publicará os seguintes eventos no barramento de eventos do sistema:

- `PAYMENT_CREATED`: Quando um novo pagamento é criado
- `PAYMENT_STATUS_CHANGED`: Quando o status de um pagamento é alterado
- `PAYMENT_CONFIRMED`: Quando um pagamento é confirmado
- `PAYMENT_FAILED`: Quando um pagamento falha

## Próximos Passos

- Implementar a integração com bot de WhatsApp para pagamentos com cartão
- Adicionar suporte a outros métodos de pagamento (boleto, transferência)
- Desenvolver relatórios de pagamentos
- Implementar funcionalidades de reembolso
