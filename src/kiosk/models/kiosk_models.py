# /home/ubuntu/pos-modern/src/kiosk/models/kiosk_models.py

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

class KioskConfig(BaseModel):
    """Configuration model for a self-service kiosk."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    location: str
    theme: Optional[str] = "default"
    language: str = "pt-BR"
    timeout_seconds: int = 60  # Timeout for user inactivity
    show_promotions: bool = True
    enable_payment: bool = True
    payment_methods: List[str] = ["credit", "debit"]
    categories_to_show: Optional[List[str]] = None  # If None, show all categories
    enable_combos: bool = True
    enable_customization: bool = True
    logo_url: Optional[str] = None
    welcome_message: Optional[str] = "Bem-vindo! Toque para começar seu pedido."
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        schema_extra = {
            "example": {
                "name": "Kiosk 01",
                "location": "Entrada Principal",
                "theme": "dark",
                "language": "pt-BR",
                "timeout_seconds": 60,
                "show_promotions": True,
                "enable_payment": True,
                "payment_methods": ["credit", "debit"],
                "categories_to_show": ["Lanches", "Bebidas", "Sobremesas"],
                "enable_combos": True,
                "enable_customization": True,
                "logo_url": "/assets/logo.png",
                "welcome_message": "Bem-vindo! Toque para começar seu pedido."
            }
        }

class KioskSession(BaseModel):
    """Model for tracking a customer session on the kiosk."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    kiosk_id: str
    started_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    order_id: Optional[str] = None  # ID of the order created in this session
    session_completed: bool = False  # Whether the session resulted in a completed order
    interaction_data: Dict[str, Any] = {}  # For analytics (pages viewed, time spent, etc.)
    
    class Config:
        schema_extra = {
            "example": {
                "kiosk_id": "550e8400-e29b-41d4-a716-446655440000",
                "started_at": "2025-05-24T12:34:56",
                "last_activity_at": "2025-05-24T12:40:23",
                "ended_at": "2025-05-24T12:45:30",
                "order_id": "123e4567-e89b-12d3-a456-426614174000",
                "session_completed": True,
                "interaction_data": {
                    "pages_viewed": ["welcome", "menu", "cart", "payment"],
                    "time_spent_seconds": 650,
                    "items_viewed": 12,
                    "search_terms": ["hamburguer", "batata"]
                }
            }
        }

class KioskOrderItem(BaseModel):
    """Model for an item in a kiosk order (simplified for UI)."""
    product_id: str
    product_name: str
    quantity: int = 1
    unit_price: float
    total_price: float
    customizations: List[Dict[str, Any]] = []
    notes: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "product_id": "123e4567-e89b-12d3-a456-426614174000",
                "product_name": "Hambúrguer Clássico",
                "quantity": 2,
                "unit_price": 15.90,
                "total_price": 31.80,
                "customizations": [
                    {"name": "Sem cebola", "price_adjustment": 0.0},
                    {"name": "Queijo extra", "price_adjustment": 2.50}
                ],
                "notes": "Bem passado, por favor"
            }
        }

class KioskOrder(BaseModel):
    """Model for a kiosk order (simplified for UI)."""
    id: Optional[str] = None
    items: List[KioskOrderItem] = []
    subtotal: float = 0.0
    tax: float = 0.0
    discount: float = 0.0
    total: float = 0.0
    
    class Config:
        schema_extra = {
            "example": {
                "items": [
                    {
                        "product_id": "123e4567-e89b-12d3-a456-426614174000",
                        "product_name": "Hambúrguer Clássico",
                        "quantity": 2,
                        "unit_price": 15.90,
                        "total_price": 31.80,
                        "customizations": [
                            {"name": "Sem cebola", "price_adjustment": 0.0},
                            {"name": "Queijo extra", "price_adjustment": 2.50}
                        ]
                    },
                    {
                        "product_id": "223e4567-e89b-12d3-a456-426614174001",
                        "product_name": "Batata Frita Grande",
                        "quantity": 1,
                        "unit_price": 12.90,
                        "total_price": 12.90,
                        "customizations": []
                    }
                ],
                "subtotal": 44.70,
                "tax": 4.47,
                "discount": 0.0,
                "total": 49.17
            }
        }

class KioskAnalytics(BaseModel):
    """Model for kiosk usage analytics."""
    kiosk_id: str
    date: datetime = Field(default_factory=lambda: datetime.utcnow().date())
    total_sessions: int = 0
    completed_orders: int = 0
    abandoned_sessions: int = 0
    average_session_time_seconds: float = 0.0
    peak_hour: Optional[int] = None
    most_viewed_category: Optional[str] = None
    most_ordered_product: Optional[str] = None
    total_revenue: float = 0.0
    
    class Config:
        schema_extra = {
            "example": {
                "kiosk_id": "550e8400-e29b-41d4-a716-446655440000",
                "date": "2025-05-24",
                "total_sessions": 120,
                "completed_orders": 87,
                "abandoned_sessions": 33,
                "average_session_time_seconds": 245.5,
                "peak_hour": 12,
                "most_viewed_category": "Lanches",
                "most_ordered_product": "Hambúrguer Clássico",
                "total_revenue": 3245.67
            }
        }
