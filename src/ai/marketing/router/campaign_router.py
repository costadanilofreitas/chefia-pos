from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from datetime import datetime
import logging

from ..marketing.services.campaign_service import MarketingCampaignService

# Configurar logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Criar router
router = APIRouter(
    prefix="/api/ai/marketing",
    tags=["AI - Marketing Campaigns"],
    responses={404: {"description": "Not found"}},
)

# Dependência para injetar o serviço
async def get_campaign_service():
    service = MarketingCampaignService()
    return service

@router.post("/campaigns", response_model=Dict[str, Any])
async def create_campaign(
    campaign_data: Dict[str, Any] = Body(...),
    service: MarketingCampaignService = Depends(get_campaign_service)
):
    """
    Cria uma nova campanha de marketing automatizada.
    """
    try:
        logger.info(f"Creating campaign for restaurant {campaign_data.get('restaurant_id')}")
        result = await service.create_campaign(campaign_data)
        return result
    except Exception as e:
        logger.error(f"Error creating campaign: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error creating campaign: {str(e)}")

@router.get("/campaigns/{campaign_id}", response_model=Dict[str, Any])
async def get_campaign(
    campaign_id: str,
    service: MarketingCampaignService = Depends(get_campaign_service)
):
    """
    Recupera uma campanha existente pelo ID.
    """
    try:
        logger.info(f"Getting campaign {campaign_id}")
        result = await service.get_campaign(campaign_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting campaign: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error getting campaign: {str(e)}")

@router.get("/campaigns", response_model=List[Dict[str, Any]])
async def list_campaigns(
    restaurant_id: str,
    status: Optional[str] = None,
    service: MarketingCampaignService = Depends(get_campaign_service)
):
    """
    Lista campanhas para um restaurante específico, opcionalmente filtradas por status.
    """
    try:
        logger.info(f"Listing campaigns for restaurant {restaurant_id}")
        result = await service.list_campaigns(restaurant_id, status)
        return result
    except Exception as e:
        logger.error(f"Error listing campaigns: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error listing campaigns: {str(e)}")

@router.post("/campaigns/{campaign_id}/process", response_model=Dict[str, Any])
async def process_campaign(
    campaign_id: str,
    service: MarketingCampaignService = Depends(get_campaign_service)
):
    """
    Processa uma campanha, gerando e enviando mensagens para o público-alvo.
    """
    try:
        logger.info(f"Processing campaign {campaign_id}")
        result = await service.process_campaign(campaign_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing campaign: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing campaign: {str(e)}")

@router.patch("/campaigns/{campaign_id}/status", response_model=Dict[str, Any])
async def update_campaign_status(
    campaign_id: str,
    status_data: Dict[str, str] = Body(...),
    service: MarketingCampaignService = Depends(get_campaign_service)
):
    """
    Atualiza o status de uma campanha.
    """
    try:
        status = status_data.get("status")
        if not status:
            raise HTTPException(status_code=400, detail="Status is required")
            
        logger.info(f"Updating campaign status: {campaign_id} -> {status}")
        result = await service.update_campaign_status(campaign_id, status)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating campaign status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error updating campaign status: {str(e)}")

@router.post("/templates", response_model=Dict[str, Any])
async def create_template(
    template_data: Dict[str, Any] = Body(...),
    service: MarketingCampaignService = Depends(get_campaign_service)
):
    """
    Cria um novo template de mensagem.
    """
    try:
        logger.info(f"Creating template for restaurant {template_data.get('restaurant_id')}")
        result = await service.create_message_template(template_data)
        return result
    except Exception as e:
        logger.error(f"Error creating template: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error creating template: {str(e)}")

@router.get("/templates", response_model=List[Dict[str, Any]])
async def list_templates(
    restaurant_id: str,
    template_type: Optional[str] = None,
    service: MarketingCampaignService = Depends(get_campaign_service)
):
    """
    Lista templates para um restaurante específico, opcionalmente filtrados por tipo.
    """
    try:
        logger.info(f"Listing templates for restaurant {restaurant_id}")
        result = await service.list_templates(restaurant_id, template_type)
        return result
    except Exception as e:
        logger.error(f"Error listing templates: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error listing templates: {str(e)}")

@router.post("/messages/send", response_model=Dict[str, Any])
async def send_message(
    message_data: Dict[str, Any] = Body(...),
    service: MarketingCampaignService = Depends(get_campaign_service)
):
    """
    Envia uma mensagem para um cliente através do canal especificado (WhatsApp/Telegram).
    """
    try:
        customer_id = message_data.get("customer_id")
        message = message_data.get("message")
        channel = message_data.get("channel", "whatsapp")
        metadata = message_data.get("metadata", {})
        
        if not customer_id or not message:
            raise HTTPException(status_code=400, detail="customer_id and message are required")
            
        logger.info(f"Sending message to customer {customer_id} via {channel}")
        result = await service.send_message(customer_id, message, channel, metadata)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error sending message: {str(e)}")

@router.post("/messages/generate", response_model=Dict[str, str])
async def generate_message(
    generation_data: Dict[str, Any] = Body(...),
    service: MarketingCampaignService = Depends(get_campaign_service)
):
    """
    Gera uma mensagem personalizada usando IA com base em um template, dados do cliente e da campanha.
    """
    try:
        template_id = generation_data.get("template_id")
        customer_data = generation_data.get("customer_data", {})
        campaign_data = generation_data.get("campaign_data", {})
        
        if not template_id:
            raise HTTPException(status_code=400, detail="template_id is required")
            
        logger.info(f"Generating personalized message using template {template_id}")
        message = await service.generate_personalized_message(template_id, customer_data, campaign_data)
        return {"message": message}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating message: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating message: {str(e)}")
