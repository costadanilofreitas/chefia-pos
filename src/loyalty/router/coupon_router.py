from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import json
import os
from datetime import datetime
import uuid

router = APIRouter(
    prefix="/api/v1/coupons",
    tags=["Coupons"]
)

DATA_FILE = "/home/ubuntu/chefia-pos/data/coupons.json"

def load_coupons():
    """Carrega cupons do arquivo JSON."""
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def save_coupons(coupons):
    """Salva cupons no arquivo JSON."""
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(coupons, f, ensure_ascii=False, indent=2)

@router.get("/")
async def get_coupons():
    """Lista todos os cupons."""
    return load_coupons()

@router.post("/")
async def create_coupon(coupon_data: Dict[str, Any]):
    """Cria um novo cupom."""
    coupons = load_coupons()
    
    new_coupon = {
        "id": str(uuid.uuid4()),
        "code": coupon_data.get("code", ""),
        "discount_type": coupon_data.get("discount_type", "percentage"),
        "discount_value": coupon_data.get("discount_value", 0),
        "minimum_purchase": coupon_data.get("minimum_purchase", 0),
        "description": coupon_data.get("description", ""),
        "valid_from": coupon_data.get("valid_from", ""),
        "valid_until": coupon_data.get("valid_until", ""),
        "usage_limit": coupon_data.get("usage_limit", 0),
        "usage_count": 0,
        "is_active": coupon_data.get("is_active", True),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    coupons.append(new_coupon)
    save_coupons(coupons)
    
    return new_coupon

@router.put("/{coupon_id}")
async def update_coupon(coupon_id: str, coupon_data: Dict[str, Any]):
    """Atualiza um cupom existente."""
    coupons = load_coupons()
    
    for i, coupon in enumerate(coupons):
        if coupon["id"] == coupon_id:
            # Atualiza apenas os campos fornecidos
            for key, value in coupon_data.items():
                if key != "id":  # Não permite alterar o ID
                    coupon[key] = value
            coupon["updated_at"] = datetime.now().isoformat()
            coupons[i] = coupon
            save_coupons(coupons)
            return coupon
    
    raise HTTPException(status_code=404, detail="Cupom não encontrado")

@router.delete("/{coupon_id}")
async def delete_coupon(coupon_id: str):
    """Deleta um cupom."""
    coupons = load_coupons()
    
    for i, coupon in enumerate(coupons):
        if coupon["id"] == coupon_id:
            coupons.pop(i)
            save_coupons(coupons)
            return {"message": "Cupom deletado com sucesso"}
    
    raise HTTPException(status_code=404, detail="Cupom não encontrado")

