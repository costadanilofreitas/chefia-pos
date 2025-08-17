from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class TimeGranularity(str, Enum):
    """Granularidade temporal para previsão."""

    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class ForecastDimension(str, Enum):
    """Dimensões para previsão."""

    RESTAURANT = "restaurant"
    ITEM = "item"
    CATEGORY = "category"
    CHANNEL = "channel"


class ModelType(str, Enum):
    """Tipo de modelo para previsão."""

    AUTO = "auto"
    ARIMA = "arima"
    ETS = "ets"
    PROPHET = "prophet"
    DEEPAR = "deepar"


class ForecastPoint(BaseModel):
    """Ponto de previsão."""

    timestamp: datetime
    value: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    dimension_values: Dict[str, str] = {}


class ForecastRequest(BaseModel):
    """Solicitação de previsão."""

    restaurant_id: str
    dimensions: List[ForecastDimension]
    start_date: datetime
    end_date: datetime
    granularity: TimeGranularity = TimeGranularity.DAILY
    model_type: ModelType = ModelType.AUTO
    include_weather: bool = True
    include_events: bool = True
    include_holidays: bool = True
    include_promotions: bool = True


class ForecastResult(BaseModel):
    """Resultado de previsão."""

    request_id: str
    restaurant_id: str
    created_at: datetime
    start_date: datetime
    end_date: datetime
    granularity: TimeGranularity
    model_type: ModelType
    dimensions: List[ForecastDimension]
    points: List[ForecastPoint]
    metrics: Dict[str, float] = {}
    data_sources_used: List[str] = []
    metadata: Optional[Dict[str, Any]] = None


class AlertLevel(str, Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class DemandAlert(BaseModel):
    """Alert for demand issues."""
    alert_id: str
    timestamp: datetime
    level: AlertLevel
    message: str
    product_id: Optional[str] = None
    location_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class StockRecommendation(BaseModel):
    """Stock recommendation."""
    recommendation_id: str
    product_id: str
    current_stock: int
    recommended_stock: int
    action: str  # "order", "reduce", "maintain"
    confidence: float
    reason: str
    metadata: Optional[Dict[str, Any]] = None
