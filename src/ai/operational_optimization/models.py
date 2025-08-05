from datetime import datetime
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class StaffingRecommendation(BaseModel):
    """Recomendação de escala de funcionários."""
    recommendation_id: str
    restaurant_id: str
    created_at: datetime
    date: datetime
    time_window: str
    role: str
    recommended_staff_count: int
    current_staff_count: Optional[int] = None
    expected_customer_volume: int
    confidence: float
    reason: str
    forecast_id: Optional[str] = None

class DeliveryOptimization(BaseModel):
    """Otimização de operações de delivery."""
    optimization_id: str
    restaurant_id: str
    created_at: datetime
    date: datetime
    time_window: str
    recommended_driver_count: int
    recommended_preparation_time: int
    expected_order_volume: int
    confidence: float
    reason: str
    forecast_id: Optional[str] = None

class TableDistributionRecommendation(BaseModel):
    """Recomendação de distribuição de mesas."""
    recommendation_id: str
    restaurant_id: str
    created_at: datetime
    date: datetime
    time_window: str
    table_recommendations: List[Dict[str, Any]]
    expected_customer_volume: int
    confidence: float
    reason: str
    forecast_id: Optional[str] = None

class KioskOptimization(BaseModel):
    """Otimização de totem de autoatendimento."""
    optimization_id: str
    restaurant_id: str
    created_at: datetime
    kiosk_id: str
    recommended_items: List[Dict[str, Any]]
    recommended_promotions: List[Dict[str, Any]]
    expected_conversion_lift: float
    confidence: float
    reason: str

class WhatsAppCampaign(BaseModel):
    """Campanha de marketing via WhatsApp."""
    campaign_id: str
    restaurant_id: str
    name: str
    description: str
    campaign_type: str
    target_segment: Dict[str, Any]
    message_template: str
    message_variables: Dict[str, Any]
    personalization_variables: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    scheduled_time: Optional[datetime] = None
    status: str
    expected_response_rate: float
    expected_roi: float
    confidence: float = 0.85
    reason: str

class OperationalOptimizationConfig(BaseModel):
    """Configuração para otimização operacional."""
    restaurant_id: str
    staffing_optimization_enabled: bool = True
    delivery_optimization_enabled: bool = True
    table_optimization_enabled: bool = True
    kiosk_optimization_enabled: bool = True
    whatsapp_optimization_enabled: bool = True
