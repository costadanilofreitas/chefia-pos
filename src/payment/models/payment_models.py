import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


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
    COMPLETED = "completed"
    OVERDUE = "overdue"
    REFUNDED = "refunded"
    REFUND_PENDING = "refund_pending"
    CANCELLED = "cancelled"
    FAILED = "failed"
    DISPUTE = "dispute"
    UNKNOWN = "unknown"


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


class AsaasConfig(BaseModel):
    """Configuração específica do Asaas."""

    api_key: str
    sandbox: bool = True
    webhook_url: Optional[str] = None
    webhook_token: Optional[str] = None
    environment: str = "sandbox"
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    scope: Optional[str] = None


class SplitConfig(BaseModel):
    """Configuração de divisão de pagamento."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: Optional[str] = None
    wallet_id: str
    percentage: Optional[float] = None
    fixed_value: Optional[float] = None
    external_reference: Optional[str] = None
    total_value: Optional[float] = None
    charge_id: Optional[str] = None
    enabled: bool = True
    recipients: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
