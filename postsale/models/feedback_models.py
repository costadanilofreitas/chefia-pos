from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional, Any, Union
from enum import Enum
from datetime import datetime
import uuid
import random
import string

class FeedbackRating(int, Enum):
    """Escala de avaliação de 1 a 5 estrelas."""
    VERY_POOR = 1
    POOR = 2
    AVERAGE = 3
    GOOD = 4
    EXCELLENT = 5

class FeedbackCategory(str, Enum):
    """Categorias de feedback."""
    FOOD_QUALITY = "food_quality"
    SERVICE = "service"
    AMBIENCE = "ambience"
    PRICE = "price"
    CLEANLINESS = "cleanliness"
    GENERAL = "general"

class FeedbackRequestStatus(str, Enum):
    """Status da solicitação de feedback."""
    PENDING = "pending"
    COMPLETED = "completed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class BenefitType(str, Enum):
    """Tipos de benefícios."""
    DISCOUNT = "discount"
    FREE_ITEM = "free_item"
    LOYALTY_POINTS = "loyalty_points"
    COUPON = "coupon"
    GIFT_CARD = "gift_card"

class BenefitTrigger(str, Enum):
    """Gatilhos para concessão de benefícios."""
    ANY_FEEDBACK = "any_feedback"
    POSITIVE_FEEDBACK = "positive_feedback"
    NEGATIVE_FEEDBACK = "negative_feedback"
    FIRST_FEEDBACK = "first_feedback"
    REPEAT_CUSTOMER = "repeat_customer"

class CustomerBenefitStatus(str, Enum):
    """Status do benefício do cliente."""
    ISSUED = "issued"
    NOTIFIED = "notified"
    CLAIMED = "claimed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class Feedback(BaseModel):
    """Modelo para armazenar feedback do cliente."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    overall_rating: FeedbackRating
    category_ratings: Dict[FeedbackCategory, FeedbackRating] = {}
    comment: Optional[str] = None
    photos: List[str] = []
    restaurant_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    benefit_id: Optional[str] = None
    benefit_claimed: bool = False
    benefit_claimed_at: Optional[datetime] = None
    source: str = "direct"  # direct, email, qr, sms
    
    @validator('overall_rating')
    def validate_overall_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Overall rating must be between 1 and 5')
        return v
    
    @validator('category_ratings')
    def validate_category_ratings(cls, v):
        for category, rating in v.items():
            if rating < 1 or rating > 5:
                raise ValueError(f'Rating for {category} must be between 1 and 5')
        return v

class FeedbackRequest(BaseModel):
    """Modelo para solicitações de feedback."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    access_token: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: FeedbackRequestStatus = FeedbackRequestStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    reminder_sent: bool = False
    reminder_sent_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    feedback_id: Optional[str] = None
    
    @validator('expires_at')
    def validate_expires_at(cls, v, values):
        if 'created_at' in values and v <= values['created_at']:
            raise ValueError('Expiration date must be after creation date')
        return v

class Benefit(BaseModel):
    """Modelo para definição de benefícios."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    type: BenefitType
    value: float  # Valor do benefício (desconto, pontos, etc.)
    trigger: BenefitTrigger
    min_rating: Optional[int] = None  # Avaliação mínima para trigger baseado em rating
    active: bool = True
    valid_from: datetime = Field(default_factory=datetime.utcnow)
    valid_until: Optional[datetime] = None
    restaurant_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    usage_limit: Optional[int] = None  # Limite de uso total
    usage_count: int = 0
    item_id: Optional[str] = None  # Para benefícios do tipo FREE_ITEM
    
    @validator('value')
    def validate_value(cls, v, values):
        if v < 0:
            raise ValueError('Benefit value cannot be negative')
        return v
    
    @validator('min_rating')
    def validate_min_rating(cls, v, values):
        if v is not None and (v < 1 or v > 5):
            raise ValueError('Minimum rating must be between 1 and 5')
        return v
    
    @validator('valid_until')
    def validate_valid_until(cls, v, values):
        if v is not None and 'valid_from' in values and v <= values['valid_from']:
            raise ValueError('Valid until date must be after valid from date')
        return v

class CustomerBenefit(BaseModel):
    """Modelo para benefícios concedidos a clientes."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    benefit_id: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    feedback_id: str
    order_id: str
    code: str = Field(default_factory=lambda: ''.join(random.choices(string.ascii_uppercase + string.digits, k=8)))
    status: CustomerBenefitStatus = CustomerBenefitStatus.ISSUED
    created_at: datetime = Field(default_factory=datetime.utcnow)
    notified_at: Optional[datetime] = None
    claimed_at: Optional[datetime] = None
    expires_at: datetime
    claimed_order_id: Optional[str] = None
    
    @validator('expires_at')
    def validate_expires_at(cls, v, values):
        if 'created_at' in values and v <= values['created_at']:
            raise ValueError('Expiration date must be after creation date')
        return v

# DTOs para API
class FeedbackCreate(BaseModel):
    """DTO para criação de feedback."""
    order_id: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    overall_rating: int
    category_ratings: Dict[str, int] = {}
    comment: Optional[str] = None
    restaurant_id: str
    source: str = "direct"

class FeedbackRequestCreate(BaseModel):
    """DTO para criação de solicitação de feedback."""
    order_id: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    expiration_days: int = 7  # Dias até expirar

class BenefitCreate(BaseModel):
    """DTO para criação de benefício."""
    name: str
    description: str
    type: str
    value: float
    trigger: str
    min_rating: Optional[int] = None
    valid_from: datetime = Field(default_factory=datetime.utcnow)
    valid_until: Optional[datetime] = None
    restaurant_id: str
    usage_limit: Optional[int] = None
    item_id: Optional[str] = None

class CustomerBenefitCreate(BaseModel):
    """DTO para criação de benefício para cliente."""
    benefit_id: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    feedback_id: str
    order_id: str
    expiration_days: int = 30  # Dias até expirar

class FeedbackAnalytics(BaseModel):
    """Modelo para análise de feedback."""
    total_count: int
    average_rating: float
    rating_distribution: Dict[int, int]  # Contagem por rating (1-5)
    category_averages: Dict[str, float]  # Média por categoria
    recent_trend: float  # Tendência recente (positiva ou negativa)
    nps_score: float  # Net Promoter Score
    period_start: datetime
    period_end: datetime
    restaurant_id: str
