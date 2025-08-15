"""
API Router para o módulo de otimização operacional.

Este router expõe endpoints para:
1. Gerar recomendações de escala de funcionários
2. Otimizar operações de delivery
3. Otimizar distribuição de mesas
4. Otimizar experiência de totem
5. Gerar e agendar campanhas de WhatsApp
6. Gerar todas as recomendações de otimização
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..models import (
    DeliveryOptimization,
    KioskOptimization,
    OperationalOptimizationConfig,
    StaffingRecommendation,
    TableDistributionRecommendation,
    WhatsAppCampaign,
)
from ..services.delivery_service import DeliveryOptimizationService
from ..services.kiosk_service import KioskOptimizationService
from ..services.optimization_service import OperationalOptimizationService
from ..services.staff_service import StaffOptimizationService
from ..services.table_service import TableOptimizationService
from ..services.whatsapp_service import WhatsAppCampaignService

# Configurar logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Criar router
router = APIRouter(
    prefix="/api/ai/optimize",
    tags=["AI - Operational Optimization"],
    responses={404: {"description": "Not found"}},
)


# Dependências para injetar serviços
async def get_optimization_service():
    service = OperationalOptimizationService()
    return service


async def get_staff_service():
    service = StaffOptimizationService()
    return service


async def get_delivery_service():
    service = DeliveryOptimizationService()
    return service


async def get_table_service():
    service = TableOptimizationService()
    return service


async def get_kiosk_service():
    service = KioskOptimizationService()
    return service


async def get_whatsapp_service():
    service = WhatsAppCampaignService()
    return service


@router.post("/staff/recommendations", response_model=List[StaffingRecommendation])
async def generate_staff_recommendations(
    restaurant_id: str,
    start_date: datetime,
    end_date: datetime,
    roles: Optional[List[str]] = Query(None),
    service: StaffOptimizationService = Depends(get_staff_service),
):
    """
    Gera recomendações de escala de funcionários.
    """
    try:
        logger.info(f"Generating staff recommendations for restaurant {restaurant_id}")
        recommendations = await service.generate_staff_recommendations(
            restaurant_id=restaurant_id,
            start_date=start_date,
            end_date=end_date,
            roles=roles,
        )
        return recommendations
    except Exception as e:
        logger.error(f"Error generating staff recommendations: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error generating staff recommendations: {str(e)}"
        ) from e


@router.post("/delivery/optimize", response_model=List[DeliveryOptimization])
async def optimize_delivery_operations(
    restaurant_id: str,
    date: datetime,
    time_windows: Optional[List[str]] = Query(None),
    service: DeliveryOptimizationService = Depends(get_delivery_service),
):
    """
    Otimiza operações de delivery.
    """
    try:
        logger.info(f"Optimizing delivery operations for restaurant {restaurant_id}")
        optimizations = await service.optimize_delivery_operations(
            restaurant_id=restaurant_id, date=date, time_windows=time_windows
        )
        return optimizations
    except Exception as e:
        logger.error(f"Error optimizing delivery operations: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error optimizing delivery operations: {str(e)}"
        ) from e


@router.post("/tables/optimize", response_model=List[TableDistributionRecommendation])
async def optimize_table_distribution(
    restaurant_id: str,
    date: datetime,
    time_windows: Optional[List[str]] = Query(None),
    service: TableOptimizationService = Depends(get_table_service),
):
    """
    Otimiza distribuição de mesas.
    """
    try:
        logger.info(f"Optimizing table distribution for restaurant {restaurant_id}")
        recommendations = await service.optimize_table_distribution(
            restaurant_id=restaurant_id, date=date, time_windows=time_windows
        )
        return recommendations
    except Exception as e:
        logger.error(f"Error optimizing table distribution: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error optimizing table distribution: {str(e)}"
        ) from e


@router.post("/kiosk/optimize", response_model=List[KioskOptimization])
async def optimize_kiosk_experience(
    restaurant_id: str,
    kiosk_id: Optional[str] = Query(None),
    service: KioskOptimizationService = Depends(get_kiosk_service),
):
    """
    Otimiza experiência do totem.
    """
    try:
        logger.info(f"Optimizing kiosk experience for restaurant {restaurant_id}")
        optimizations = await service.optimize_kiosk_experience(
            restaurant_id=restaurant_id, kiosk_id=kiosk_id
        )
        return optimizations
    except Exception as e:
        logger.error(f"Error optimizing kiosk experience: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error optimizing kiosk experience: {str(e)}"
        ) from e


@router.post("/whatsapp/campaigns/recommend", response_model=List[WhatsAppCampaign])
async def recommend_whatsapp_campaigns(
    restaurant_id: str,
    campaign_type: str,
    target_segment: Optional[Dict[str, Any]] = None,
    service: WhatsAppCampaignService = Depends(get_whatsapp_service),
):
    """
    Recomenda campanhas de WhatsApp.
    """
    try:
        logger.info(f"Recommending WhatsApp campaigns for restaurant {restaurant_id}")
        campaigns = await service.generate_campaign_recommendations(
            restaurant_id=restaurant_id,
            campaign_type=campaign_type,
            target_segment=target_segment,
        )
        return campaigns
    except Exception as e:
        logger.error(f"Error recommending WhatsApp campaigns: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error recommending WhatsApp campaigns: {str(e)}"
        ) from e


@router.post(
    "/whatsapp/campaigns/{campaign_id}/schedule", response_model=WhatsAppCampaign
)
async def schedule_whatsapp_campaign(
    campaign_id: str,
    scheduled_time: datetime,
    service: WhatsAppCampaignService = Depends(get_whatsapp_service),
):
    """
    Agenda uma campanha de WhatsApp.
    """
    try:
        logger.info(f"Scheduling WhatsApp campaign {campaign_id}")
        campaign = await service.schedule_campaign(
            campaign_id=campaign_id, scheduled_time=scheduled_time
        )
        return campaign
    except Exception as e:
        logger.error(f"Error scheduling WhatsApp campaign: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error scheduling WhatsApp campaign: {str(e)}"
        ) from e


@router.post("/all", response_model=Dict[str, Any])
async def generate_all_recommendations(
    restaurant_id: str,
    start_date: datetime,
    end_date: datetime,
    config: Optional[OperationalOptimizationConfig] = None,
    service: OperationalOptimizationService = Depends(get_optimization_service),
):
    """
    Gera todas as recomendações de otimização operacional.
    """
    try:
        logger.info(
            f"Generating all optimization recommendations for restaurant {restaurant_id}"
        )
        recommendations = await service.generate_all_recommendations(
            restaurant_id=restaurant_id,
            start_date=start_date,
            end_date=end_date,
            config=config,
        )
        return recommendations
    except Exception as e:
        logger.error(
            f"Error generating all optimization recommendations: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Error generating all optimization recommendations: {str(e)}",
        ) from e
