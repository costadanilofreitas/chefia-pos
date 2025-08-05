"""
Modelos de dados para o marketplace de integrações
"""

from enum import Enum
from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, HttpUrl


class PartnerStatus(str, Enum):
    """Status de um parceiro no marketplace"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class IntegrationType(str, Enum):
    """Tipo de integração"""
    DELIVERY = "delivery"
    PAYMENT = "payment"
    CRM = "crm"
    OTHER = "other"


class IntegrationStatus(str, Enum):
    """Status de uma integração"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DEPRECATED = "deprecated"


class ConfigurationStatus(str, Enum):
    """Status de uma configuração de integração"""
    ACTIVE = "active"
    INACTIVE = "inactive"


class WebhookStatus(str, Enum):
    """Status de um webhook"""
    ACTIVE = "active"
    INACTIVE = "inactive"


class DeliveryOrderStatus(str, Enum):
    """Status de um pedido de delivery"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY = "ready"
    DELIVERING = "delivering"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class PaymentStatus(str, Enum):
    """Status de um pagamento"""
    PENDING = "pending"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"
    FAILED = "failed"


class PaymentMethod(str, Enum):
    """Método de pagamento"""
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PIX = "pix"
    BANK_SLIP = "bank_slip"
    WALLET = "wallet"
    OTHER = "other"


class Partner(BaseModel):
    """Modelo de dados para um parceiro no marketplace"""
    id: str = Field(..., description="ID único do parceiro")
    name: str = Field(..., description="Nome do parceiro")
    description: str = Field(..., description="Descrição do parceiro")
    website: HttpUrl = Field(..., description="Site do parceiro")
    logo_url: Optional[HttpUrl] = Field(None, description="URL do logo do parceiro")
    contact_email: str = Field(..., description="Email de contato do parceiro")
    contact_phone: Optional[str] = Field(None, description="Telefone de contato do parceiro")
    status: PartnerStatus = Field(default=PartnerStatus.PENDING, description="Status do parceiro")
    approval_date: Optional[datetime] = Field(None, description="Data de aprovação do parceiro")
    created_at: datetime = Field(default_factory=datetime.now, description="Data de criação")
    updated_at: datetime = Field(default_factory=datetime.now, description="Data de atualização")

    class Config:
        schema_extra = {
            "example": {
                "id": "partner-123",
                "name": "iFood",
                "description": "Plataforma de delivery de comida",
                "website": "https://www.ifood.com.br",
                "logo_url": "https://www.ifood.com.br/logo.png",
                "contact_email": "parceiros@ifood.com.br",
                "contact_phone": "+551199999999",
                "status": "approved",
                "approval_date": "2025-01-01T00:00:00Z",
                "created_at": "2025-01-01T00:00:00Z",
                "updated_at": "2025-01-01T00:00:00Z"
            }
        }


class Integration(BaseModel):
    """Modelo de dados para uma integração"""
    id: str = Field(..., description="ID único da integração")
    partner_id: str = Field(..., description="ID do parceiro")
    type: IntegrationType = Field(..., description="Tipo de integração")
    name: str = Field(..., description="Nome da integração")
    description: str = Field(..., description="Descrição da integração")
    logo_url: Optional[HttpUrl] = Field(None, description="URL do logo da integração")
    configuration_schema: Dict[str, Any] = Field(..., description="Schema JSON para configuração")
    webhook_events: List[str] = Field(default_factory=list, description="Eventos suportados para webhooks")
    status: IntegrationStatus = Field(default=IntegrationStatus.ACTIVE, description="Status da integração")
    version: str = Field(..., description="Versão da integração")
    created_at: datetime = Field(default_factory=datetime.now, description="Data de criação")
    updated_at: datetime = Field(default_factory=datetime.now, description="Data de atualização")

    class Config:
        schema_extra = {
            "example": {
                "id": "integration-123",
                "partner_id": "partner-123",
                "type": "delivery",
                "name": "iFood Delivery",
                "description": "Integração com a plataforma de delivery iFood",
                "logo_url": "https://www.ifood.com.br/logo.png",
                "configuration_schema": {
                    "type": "object",
                    "properties": {
                        "api_key": {"type": "string"},
                        "merchant_id": {"type": "string"}
                    },
                    "required": ["api_key", "merchant_id"]
                },
                "webhook_events": ["order.created", "order.updated", "order.cancelled"],
                "status": "active",
                "version": "1.0.0",
                "created_at": "2025-01-01T00:00:00Z",
                "updated_at": "2025-01-01T00:00:00Z"
            }
        }


class IntegrationConfiguration(BaseModel):
    """Modelo de dados para configuração de uma integração"""
    id: str = Field(..., description="ID único da configuração")
    integration_id: str = Field(..., description="ID da integração")
    restaurant_id: str = Field(..., description="ID do restaurante")
    configuration: Dict[str, Any] = Field(..., description="Configuração da integração")
    status: ConfigurationStatus = Field(default=ConfigurationStatus.ACTIVE, description="Status da configuração")
    created_at: datetime = Field(default_factory=datetime.now, description="Data de criação")
    updated_at: datetime = Field(default_factory=datetime.now, description="Data de atualização")

    class Config:
        schema_extra = {
            "example": {
                "id": "config-123",
                "integration_id": "integration-123",
                "restaurant_id": "restaurant-123",
                "configuration": {
                    "api_key": "abc123",
                    "merchant_id": "merchant-123"
                },
                "status": "active",
                "created_at": "2025-01-01T00:00:00Z",
                "updated_at": "2025-01-01T00:00:00Z"
            }
        }


class Webhook(BaseModel):
    """Modelo de dados para um webhook"""
    id: str = Field(..., description="ID único do webhook")
    integration_id: str = Field(..., description="ID da integração")
    restaurant_id: str = Field(..., description="ID do restaurante")
    event_types: List[str] = Field(..., description="Tipos de eventos para notificação")
    url: HttpUrl = Field(..., description="URL para envio de notificações")
    secret: str = Field(..., description="Segredo para assinatura das notificações")
    status: WebhookStatus = Field(default=WebhookStatus.ACTIVE, description="Status do webhook")
    created_at: datetime = Field(default_factory=datetime.now, description="Data de criação")
    updated_at: datetime = Field(default_factory=datetime.now, description="Data de atualização")

    class Config:
        schema_extra = {
            "example": {
                "id": "webhook-123",
                "integration_id": "integration-123",
                "restaurant_id": "restaurant-123",
                "event_types": ["order.created", "order.updated"],
                "url": "https://example.com/webhook",
                "secret": "webhook-secret-123",
                "status": "active",
                "created_at": "2025-01-01T00:00:00Z",
                "updated_at": "2025-01-01T00:00:00Z"
            }
        }


class WebhookDelivery(BaseModel):
    """Modelo de dados para entrega de webhook"""
    id: str = Field(..., description="ID único da entrega")
    webhook_id: str = Field(..., description="ID do webhook")
    event_type: str = Field(..., description="Tipo de evento")
    payload: Dict[str, Any] = Field(..., description="Payload do evento")
    status: str = Field(..., description="Status da entrega")
    response_code: Optional[int] = Field(None, description="Código de resposta HTTP")
    response_body: Optional[str] = Field(None, description="Corpo da resposta")
    attempt_count: int = Field(default=0, description="Número de tentativas")
    next_attempt: Optional[datetime] = Field(None, description="Data da próxima tentativa")
    created_at: datetime = Field(default_factory=datetime.now, description="Data de criação")
    updated_at: datetime = Field(default_factory=datetime.now, description="Data de atualização")


class DeliveryOrder(BaseModel):
    """Modelo de dados para um pedido de delivery"""
    id: str = Field(..., description="ID único do pedido")
    external_id: str = Field(..., description="ID do pedido na plataforma externa")
    integration_id: str = Field(..., description="ID da integração")
    restaurant_id: str = Field(..., description="ID do restaurante")
    customer: Dict[str, Any] = Field(..., description="Dados do cliente")
    items: List[Dict[str, Any]] = Field(..., description="Itens do pedido")
    delivery_address: Dict[str, Any] = Field(..., description="Endereço de entrega")
    payment: Dict[str, Any] = Field(..., description="Dados de pagamento")
    total_value: float = Field(..., description="Valor total do pedido")
    delivery_fee: float = Field(..., description="Taxa de entrega")
    status: DeliveryOrderStatus = Field(..., description="Status do pedido")
    scheduled_time: Optional[datetime] = Field(None, description="Horário agendado para entrega")
    created_at: datetime = Field(default_factory=datetime.now, description="Data de criação")
    updated_at: datetime = Field(default_factory=datetime.now, description="Data de atualização")

    class Config:
        schema_extra = {
            "example": {
                "id": "order-123",
                "external_id": "ifood-order-123",
                "integration_id": "integration-123",
                "restaurant_id": "restaurant-123",
                "customer": {
                    "name": "João Silva",
                    "phone": "+551199999999",
                    "email": "joao@example.com"
                },
                "items": [
                    {
                        "id": "item-123",
                        "name": "X-Burger",
                        "quantity": 2,
                        "unit_price": 15.90,
                        "total_price": 31.80,
                        "notes": "Sem cebola"
                    }
                ],
                "delivery_address": {
                    "street": "Rua Exemplo",
                    "number": "123",
                    "complement": "Apto 101",
                    "neighborhood": "Centro",
                    "city": "São Paulo",
                    "state": "SP",
                    "postal_code": "01001-000"
                },
                "payment": {
                    "method": "CREDIT_CARD",
                    "status": "PAID",
                    "total": 41.80
                },
                "total_value": 31.80,
                "delivery_fee": 10.00,
                "status": "confirmed",
                "created_at": "2025-01-01T00:00:00Z",
                "updated_at": "2025-01-01T00:00:00Z"
            }
        }


class PaymentTransaction(BaseModel):
    """Modelo de dados para uma transação de pagamento"""
    id: str = Field(..., description="ID único da transação")
    integration_id: str = Field(..., description="ID da integração")
    restaurant_id: str = Field(..., description="ID do restaurante")
    external_id: Optional[str] = Field(None, description="ID da transação na plataforma externa")
    order_id: str = Field(..., description="ID do pedido relacionado")
    amount: float = Field(..., description="Valor da transação")
    currency: str = Field(default="BRL", description="Moeda da transação")
    method: PaymentMethod = Field(..., description="Método de pagamento")
    status: PaymentStatus = Field(..., description="Status da transação")
    payment_data: Dict[str, Any] = Field(..., description="Dados específicos do pagamento")
    customer: Dict[str, Any] = Field(..., description="Dados do cliente")
    created_at: datetime = Field(default_factory=datetime.now, description="Data de criação")
    updated_at: datetime = Field(default_factory=datetime.now, description="Data de atualização")

    class Config:
        schema_extra = {
            "example": {
                "id": "transaction-123",
                "integration_id": "integration-123",
                "restaurant_id": "restaurant-123",
                "external_id": "gateway-transaction-123",
                "order_id": "order-123",
                "amount": 41.80,
                "currency": "BRL",
                "method": "credit_card",
                "status": "captured",
                "payment_data": {
                    "card_brand": "Visa",
                    "last_digits": "1234",
                    "installments": 1
                },
                "customer": {
                    "name": "João Silva",
                    "email": "joao@example.com"
                },
                "created_at": "2025-01-01T00:00:00Z",
                "updated_at": "2025-01-01T00:00:00Z"
            }
        }


class CRMCustomer(BaseModel):
    """Modelo de dados para um cliente no CRM"""
    id: str = Field(..., description="ID único do cliente")
    integration_id: str = Field(..., description="ID da integração")
    restaurant_id: str = Field(..., description="ID do restaurante")
    external_id: Optional[str] = Field(None, description="ID do cliente na plataforma externa")
    name: str = Field(..., description="Nome do cliente")
    email: Optional[str] = Field(None, description="Email do cliente")
    phone: Optional[str] = Field(None, description="Telefone do cliente")
    addresses: List[Dict[str, Any]] = Field(default_factory=list, description="Endereços do cliente")
    preferences: Dict[str, Any] = Field(default_factory=dict, description="Preferências do cliente")
    loyalty_points: int = Field(default=0, description="Pontos de fidelidade")
    last_order_date: Optional[datetime] = Field(None, description="Data do último pedido")
    total_orders: int = Field(default=0, description="Total de pedidos")
    total_spent: float = Field(default=0.0, description="Total gasto")
    created_at: datetime = Field(default_factory=datetime.now, description="Data de criação")
    updated_at: datetime = Field(default_factory=datetime.now, description="Data de atualização")

    class Config:
        schema_extra = {
            "example": {
                "id": "customer-123",
                "integration_id": "integration-123",
                "restaurant_id": "restaurant-123",
                "external_id": "crm-customer-123",
                "name": "João Silva",
                "email": "joao@example.com",
                "phone": "+551199999999",
                "addresses": [
                    {
                        "street": "Rua Exemplo",
                        "number": "123",
                        "complement": "Apto 101",
                        "neighborhood": "Centro",
                        "city": "São Paulo",
                        "state": "SP",
                        "postal_code": "01001-000",
                        "is_default": True
                    }
                ],
                "preferences": {
                    "favorite_items": ["X-Burger", "Batata Frita"],
                    "allergies": ["Glúten"],
                    "dietary_restrictions": ["Vegetariano"]
                },
                "loyalty_points": 100,
                "last_order_date": "2025-01-01T00:00:00Z",
                "total_orders": 10,
                "total_spent": 500.00,
                "created_at": "2025-01-01T00:00:00Z",
                "updated_at": "2025-01-01T00:00:00Z"
            }
        }


class APIKey(BaseModel):
    """Modelo de dados para uma chave de API"""
    id: str = Field(..., description="ID único da chave")
    partner_id: str = Field(..., description="ID do parceiro")
    key: str = Field(..., description="Chave de API")
    name: str = Field(..., description="Nome da chave")
    scopes: List[str] = Field(..., description="Escopos de acesso")
    expires_at: Optional[datetime] = Field(None, description="Data de expiração")
    is_active: bool = Field(default=True, description="Se a chave está ativa")
    created_at: datetime = Field(default_factory=datetime.now, description="Data de criação")
    updated_at: datetime = Field(default_factory=datetime.now, description="Data de atualização")

    class Config:
        schema_extra = {
            "example": {
                "id": "apikey-123",
                "partner_id": "partner-123",
                "key": "sk_test_abc123",
                "name": "Chave de Teste",
                "scopes": ["delivery:read", "delivery:write"],
                "expires_at": "2026-01-01T00:00:00Z",
                "is_active": True,
                "created_at": "2025-01-01T00:00:00Z",
                "updated_at": "2025-01-01T00:00:00Z"
            }
        }


class APIUsage(BaseModel):
    """Modelo de dados para uso de API"""
    id: str = Field(..., description="ID único do registro")
    partner_id: str = Field(..., description="ID do parceiro")
    api_key_id: str = Field(..., description="ID da chave de API")
    endpoint: str = Field(..., description="Endpoint acessado")
    method: str = Field(..., description="Método HTTP")
    status_code: int = Field(..., description="Código de status HTTP")
    response_time: int = Field(..., description="Tempo de resposta em ms")
    request_size: int = Field(..., description="Tamanho da requisição em bytes")
    response_size: int = Field(..., description="Tamanho da resposta em bytes")
    ip_address: str = Field(..., description="Endereço IP do cliente")
    user_agent: str = Field(..., description="User Agent do cliente")
    timestamp: datetime = Field(default_factory=datetime.now, description="Data e hora do acesso")

    class Config:
        schema_extra = {
            "example": {
                "id": "usage-123",
                "partner_id": "partner-123",
                "api_key_id": "apikey-123",
                "endpoint": "/v1/delivery/orders",
                "method": "POST",
                "status_code": 201,
                "response_time": 150,
                "request_size": 1024,
                "response_size": 2048,
                "ip_address": "192.168.1.1",
                "user_agent": "Mozilla/5.0",
                "timestamp": "2025-01-01T00:00:00Z"
            }
        }
