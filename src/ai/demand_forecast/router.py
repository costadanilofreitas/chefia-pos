from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
import logging

from ..demand_forecast.models import (
    ForecastRequest, ForecastResult, DemandAlert, 
    StockRecommendation, TimeGranularity, ForecastDimension, ModelType
)
from ..demand_forecast.service import DemandForecastService

# Configurar logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Criar router
router = APIRouter(
    prefix="/api/ai/forecast",
    tags=["AI - Demand Forecast"],
    responses={404: {"description": "Not found"}},
)

# Dependência para injetar o serviço
async def get_forecast_service():
    service = DemandForecastService()
    return service

@router.post("/create", response_model=ForecastResult)
async def create_forecast(
    request: ForecastRequest,
    service: DemandForecastService = Depends(get_forecast_service)
):
    """
    Cria uma nova previsão de demanda com base nos parâmetros fornecidos.
    """
    try:
        logger.info(f"Creating forecast for restaurant {request.restaurant_id}")
        result = await service.create_forecast(request)
        return result
    except Exception as e:
        logger.error(f"Error creating forecast: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error creating forecast: {str(e)}")

@router.get("/{forecast_id}", response_model=ForecastResult)
async def get_forecast(
    forecast_id: str,
    service: DemandForecastService = Depends(get_forecast_service)
):
    """
    Recupera uma previsão existente pelo ID.
    """
    try:
        logger.info(f"Getting forecast {forecast_id}")
        result = await service.get_forecast(forecast_id)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting forecast: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error getting forecast: {str(e)}")

@router.get("/alerts/{restaurant_id}", response_model=List[DemandAlert])
async def get_alerts(
    restaurant_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    alert_type: Optional[str] = None,
    dimension_type: Optional[ForecastDimension] = None,
    service: DemandForecastService = Depends(get_forecast_service)
):
    """
    Recupera alertas de demanda para um restaurante específico.
    """
    try:
        logger.info(f"Getting alerts for restaurant {restaurant_id}")
        alerts = await service.get_alerts(
            restaurant_id=restaurant_id,
            start_date=start_date,
            end_date=end_date,
            alert_type=alert_type,
            dimension_type=dimension_type
        )
        return alerts
    except Exception as e:
        logger.error(f"Error getting alerts: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error getting alerts: {str(e)}")

@router.get("/recommendations/{restaurant_id}", response_model=List[StockRecommendation])
async def get_recommendations(
    restaurant_id: str,
    product_ids: Optional[List[str]] = Query(None),
    service: DemandForecastService = Depends(get_forecast_service)
):
    """
    Recupera recomendações de estoque para um restaurante específico.
    """
    try:
        logger.info(f"Getting recommendations for restaurant {restaurant_id}")
        recommendations = await service.get_recommendations(
            restaurant_id=restaurant_id,
            product_ids=product_ids
        )
        return recommendations
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error getting recommendations: {str(e)}")

@router.post("/quick-forecast/{restaurant_id}", response_model=ForecastResult)
async def create_quick_forecast(
    restaurant_id: str,
    days: int = Query(14, ge=1, le=60),
    granularity: TimeGranularity = TimeGranularity.DAILY,
    include_weather: bool = True,
    include_events: bool = True,
    include_holidays: bool = True,
    include_promotions: bool = True,
    service: DemandForecastService = Depends(get_forecast_service)
):
    """
    Cria uma previsão rápida com configurações padrão para um restaurante específico.
    """
    try:
        logger.info(f"Creating quick forecast for restaurant {restaurant_id}")
        
        # Criar solicitação com valores padrão
        start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=days)
        
        request = ForecastRequest(
            restaurant_id=restaurant_id,
            dimensions=[ForecastDimension.RESTAURANT],
            start_date=start_date,
            end_date=end_date,
            granularity=granularity,
            model_type=ModelType.AUTO,
            include_weather=include_weather,
            include_events=include_events,
            include_holidays=include_holidays,
            include_promotions=include_promotions
        )
        
        result = await service.create_forecast(request)
        return result
    except Exception as e:
        logger.error(f"Error creating quick forecast: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error creating quick forecast: {str(e)}")
