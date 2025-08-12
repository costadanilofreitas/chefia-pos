from pydantic import BaseModel, Field, validator
from typing import List, Optional
from enum import Enum
from datetime import datetime
import uuid


class SplitType(str, Enum):
    """Tipo de divisão (percentual ou valor fixo)."""

    PERCENTAGE = "percentage"
    FIXED = "fixed"


class SplitRecipientStatus(str, Enum):
    """Status da transferência para um destinatário."""

    PENDING = "pending"
    TRANSFERRED = "transferred"
    FAILED = "failed"


class SplitRecipient(BaseModel):
    """Modelo para um destinatário de divisão de pagamento."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    wallet_id: str
    type: SplitType
    value: float
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @validator("value")
    def validate_value(cls, v, values):
        if (
            "type" in values
            and values["type"] == SplitType.PERCENTAGE
            and (v <= 0 or v > 100)
        ):
            raise ValueError("Percentage value must be between 0 and 100")
        if "type" in values and values["type"] == SplitType.FIXED and v <= 0:
            raise ValueError("Fixed value must be greater than 0")
        return v


class RetentionConfig(BaseModel):
    """Configuração de retenção de valores."""

    type: SplitType
    value: float
    wallet_id: str
    description: Optional[str] = None

    @validator("value")
    def validate_value(cls, v, values):
        if (
            "type" in values
            and values["type"] == SplitType.PERCENTAGE
            and (v <= 0 or v > 100)
        ):
            raise ValueError("Percentage value must be between 0 and 100")
        if "type" in values and values["type"] == SplitType.FIXED and v <= 0:
            raise ValueError("Fixed value must be greater than 0")
        return v


class SplitConfig(BaseModel):
    """Configuração de divisão de pagamento."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    store_id: str
    name: str
    description: Optional[str] = None
    is_active: bool = True
    recipients: List[SplitRecipient] = []
    retention_config: Optional[RetentionConfig] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @validator("recipients")
    def validate_recipients(cls, v):
        if not v:
            raise ValueError("At least one recipient is required")

        # Verificar se a soma dos percentuais não ultrapassa 100%
        total_percentage = sum(r.value for r in v if r.type == SplitType.PERCENTAGE)
        if total_percentage > 100:
            raise ValueError("Sum of percentage values cannot exceed 100%")

        return v


class SplitTransaction(BaseModel):
    """Registro de uma transação de divisão."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payment_id: str
    recipient_id: str
    wallet_id: str
    type: SplitType
    value: float
    calculated_value: float
    status: SplitRecipientStatus = SplitRecipientStatus.PENDING
    transfer_id: Optional[str] = None
    transferred_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class RetentionTransaction(BaseModel):
    """Registro de uma transação de retenção."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payment_id: str
    type: SplitType
    value: float
    calculated_value: float
    wallet_id: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SplitPaymentRecord(BaseModel):
    """Registro completo de um pagamento com divisão."""

    payment_id: str
    provider_payment_id: str
    split_config_id: str
    total_value: float
    net_value: float
    splits: List[SplitTransaction] = []
    retention: Optional[RetentionTransaction] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# DTOs para API
class SplitRecipientCreate(BaseModel):
    """DTO para criação de um destinatário."""

    name: str
    wallet_id: str
    type: SplitType
    value: float
    description: Optional[str] = None


class RetentionConfigCreate(BaseModel):
    """DTO para criação de uma configuração de retenção."""

    type: SplitType
    value: float
    wallet_id: str
    description: Optional[str] = None


class SplitConfigCreate(BaseModel):
    """DTO para criação de uma configuração de divisão."""

    restaurant_id: str
    store_id: str
    name: str
    description: Optional[str] = None
    recipients: List[SplitRecipientCreate]
    retention_config: Optional[RetentionConfigCreate] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None


class SplitConfigUpdate(BaseModel):
    """DTO para atualização de uma configuração de divisão."""

    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    recipients: Optional[List[SplitRecipientCreate]] = None
    retention_config: Optional[RetentionConfigCreate] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
