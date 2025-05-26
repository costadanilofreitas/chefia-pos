from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional, Any, Union
from enum import Enum
from datetime import datetime
import uuid
from .payment_models import Payment, PaymentStatus, PaymentMethod
from .split_models import SplitType

class PaymentSessionStatus(str, Enum):
    """Status da sessão de pagamento."""
    OPEN = "open"
    CLOSED = "closed"
    CANCELLED = "cancelled"

class BillSplitMethod(str, Enum):
    """Método de divisão de conta."""
    EQUAL = "equal"
    CUSTOM = "custom"
    BY_SEAT = "by_seat"
    BY_ITEM = "by_item"

class PaymentSession(BaseModel):
    """Sessão de pagamento para um pedido."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    total_amount: float
    paid_amount: float = 0
    remaining_amount: float
    status: PaymentSessionStatus = PaymentSessionStatus.OPEN
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    closed_at: Optional[datetime] = None
    
    @validator('remaining_amount', pre=True, always=True)
    def calculate_remaining(cls, v, values):
        if 'total_amount' in values and 'paid_amount' in values:
            return round(values['total_amount'] - values['paid_amount'], 2)
        return v

class PartialPayment(Payment):
    """Pagamento parcial, estendendo o modelo Payment."""
    session_id: str
    is_partial: bool = True
    percentage_of_total: Optional[float] = None
    
    @validator('percentage_of_total', pre=True, always=True)
    def calculate_percentage(cls, v, values):
        if 'amount' in values and 'session_id' in values:
            # Nota: na implementação real, buscaríamos o total da sessão
            # Aqui apenas definimos o campo para uso posterior
            return v
        return v

class BillSplit(BaseModel):
    """Definição de como um pedido será dividido."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    split_method: BillSplitMethod
    number_of_parts: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    @validator('number_of_parts')
    def validate_parts(cls, v):
        if v < 1:
            raise ValueError('Number of parts must be at least 1')
        return v

class BillSplitPart(BaseModel):
    """Parte de uma divisão de conta."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    split_id: str
    name: Optional[str] = None  # Nome da pessoa ou identificador
    amount: float
    is_paid: bool = False
    payment_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SeatPayment(BaseModel):
    """Associação entre pagamento e assento."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payment_id: str
    seat_id: str
    amount: float
    created_at: datetime = Field(default_factory=datetime.utcnow)

# DTOs para API
class PaymentSessionCreate(BaseModel):
    """DTO para criação de uma sessão de pagamento."""
    order_id: str
    total_amount: float

class PaymentSessionUpdate(BaseModel):
    """DTO para atualização de uma sessão de pagamento."""
    paid_amount: Optional[float] = None
    status: Optional[PaymentSessionStatus] = None

class PartialPaymentCreate(BaseModel):
    """DTO para criação de um pagamento parcial."""
    session_id: str
    method: PaymentMethod
    amount: float
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    description: Optional[str] = None
    metadata: Dict[str, Any] = {}

class BillSplitCreate(BaseModel):
    """DTO para criação de uma divisão de conta."""
    session_id: str
    split_method: BillSplitMethod
    number_of_parts: int = 1

class BillSplitPartCreate(BaseModel):
    """DTO para criação de uma parte de divisão."""
    split_id: str
    name: Optional[str] = None
    amount: float

class SeatPaymentCreate(BaseModel):
    """DTO para criação de uma associação pagamento-assento."""
    payment_id: str
    seat_id: str
    amount: float

class EqualSplitRequest(BaseModel):
    """Requisição para divisão igualitária."""
    session_id: str
    number_of_parts: int
    names: Optional[List[str]] = None

class CustomSplitRequest(BaseModel):
    """Requisição para divisão personalizada."""
    session_id: str
    parts: List[Dict[str, Union[str, float]]]
    
    @validator('parts')
    def validate_parts(cls, v):
        if not v:
            raise ValueError('At least one part is required')
        
        for part in v:
            if 'amount' not in part:
                raise ValueError('Each part must have an amount')
            if part['amount'] <= 0:
                raise ValueError('Amount must be greater than 0')
        
        return v

class SeatSplitRequest(BaseModel):
    """Requisição para divisão por assento."""
    session_id: str
    seat_assignments: Dict[str, List[str]]  # seat_id -> list of item_ids
