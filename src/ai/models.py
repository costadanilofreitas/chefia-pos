"""Models stub for AI module."""

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum


class TimeGranularity(str, Enum):
    """Time granularity for forecasts."""
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class ModelType(str, Enum):
    """Type of forecasting model."""
    LINEAR = "linear"
    ARIMA = "arima"
    PROPHET = "prophet"
    NEURAL = "neural"


class ForecastDimension(str, Enum):
    """Dimensions for forecasting."""
    TIME = "time"
    PRODUCT = "product"
    LOCATION = "location"
    CUSTOMER = "customer"


@dataclass
class ForecastResult:
    """Result of a forecast."""
    forecast_id: str
    timestamp: datetime
    forecast_values: List[float]
    confidence_intervals: Optional[List[tuple[float, float]]]
    granularity: TimeGranularity
    model_type: ModelType
    dimensions: List[ForecastDimension]
    metadata: Optional[Dict[str, Any]] = None