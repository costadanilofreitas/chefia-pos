from enum import Enum
from datetime import datetime
from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel, Field

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
