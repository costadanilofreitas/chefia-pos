from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import json
import os
from datetime import datetime
import uuid

router = APIRouter(
    prefix="/api/v1/campaigns",
    tags=["Campaigns"]
)

DATA_FILE = "/home/ubuntu/chefia-pos/data/campaigns.json"

def load_campaigns():
    """Carrega campanhas do arquivo JSON."""
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def save_campaigns(campaigns):
    """Salva campanhas no arquivo JSON."""
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(campaigns, f, ensure_ascii=False, indent=2)

@router.get("/")
async def get_campaigns():
    """Lista todas as campanhas."""
    return load_campaigns()

@router.post("/")
async def create_campaign(campaign_data: Dict[str, Any]):
    """Cria uma nova campanha."""
    campaigns = load_campaigns()
    
    new_campaign = {
        "id": str(uuid.uuid4()),
        "name": campaign_data.get("name", ""),
        "type": campaign_data.get("type", "WhatsApp"),
        "segment": campaign_data.get("segment", "Todos"),
        "message": campaign_data.get("message", ""),
        "start_date": campaign_data.get("start_date", ""),
        "end_date": campaign_data.get("end_date", ""),
        "status": "Ativa",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    campaigns.append(new_campaign)
    save_campaigns(campaigns)
    
    return new_campaign

