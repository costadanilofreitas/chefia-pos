from fastapi import APIRouter, Depends, HTTPException, Header, Request, Response
from typing import Dict, List, Optional, Any
import json

from src.api_gateway.gateway import get_api_gateway, ApiGateway, RequestMethod

router = APIRouter(prefix="/api/external", tags=["external"])

@router.post("/auth/token", response_model=Dict[str, Any])
async def get_token(credentials: Dict[str, str]):
    """Obtém um token de acesso para a API externa."""
    try:
        api_gateway = get_api_gateway()
        token = await api_gateway.create_token(
            client_id=credentials.get("client_id", ""),
            client_secret=credentials.get("client_secret", "")
        )
        return {"access_token": token, "token_type": "bearer"}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.get("/products", response_model=List[Dict[str, Any]])
async def get_products(
    request: Request,
    category: Optional[str] = None,
    search: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """Obtém produtos disponíveis."""
    api_gateway = get_api_gateway()
    
    # Preparar headers
    headers = dict(request.headers)
    
    # Preparar query params
    query_params = {}
    if category:
        query_params["category"] = category
    if search:
        query_params["search"] = search
    
    # Chamar gateway
    result = await api_gateway.handle_request(
        path="/api/external/products",
        method="GET",
        headers=headers,
        query_params=query_params
    )
    
    # Verificar resposta
    if result["status_code"] != 200:
        raise HTTPException(
            status_code=result["status_code"],
            detail=result["body"].get("error", "Erro ao obter produtos")
        )
    
    return result["body"]

@router.get("/products/{product_id}", response_model=Dict[str, Any])
async def get_product(
    product_id: str,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Obtém detalhes de um produto."""
    api_gateway = get_api_gateway()
    
    # Preparar headers
    headers = dict(request.headers)
    
    # Chamar gateway
    result = await api_gateway.handle_request(
        path=f"/api/external/products/{product_id}",
        method="GET",
        headers=headers,
        query_params={}
    )
    
    # Verificar resposta
    if result["status_code"] != 200:
        raise HTTPException(
            status_code=result["status_code"],
            detail=result["body"].get("error", "Erro ao obter produto")
        )
    
    return result["body"]

@router.post("/orders", response_model=Dict[str, Any])
async def create_order(
    order_data: Dict[str, Any],
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Cria um novo pedido."""
    api_gateway = get_api_gateway()
    
    # Preparar headers
    headers = dict(request.headers)
    
    # Chamar gateway
    result = await api_gateway.handle_request(
        path="/api/external/orders",
        method="POST",
        headers=headers,
        query_params={},
        body=order_data
    )
    
    # Verificar resposta
    if result["status_code"] not in [200, 201]:
        raise HTTPException(
            status_code=result["status_code"],
            detail=result["body"].get("error", "Erro ao criar pedido")
        )
    
    return result["body"]

@router.get("/orders/{order_id}", response_model=Dict[str, Any])
async def get_order(
    order_id: str,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Obtém detalhes de um pedido."""
    api_gateway = get_api_gateway()
    
    # Preparar headers
    headers = dict(request.headers)
    
    # Chamar gateway
    result = await api_gateway.handle_request(
        path=f"/api/external/orders/{order_id}",
        method="GET",
        headers=headers,
        query_params={}
    )
    
    # Verificar resposta
    if result["status_code"] != 200:
        raise HTTPException(
            status_code=result["status_code"],
            detail=result["body"].get("error", "Erro ao obter pedido")
        )
    
    return result["body"]

@router.get("/orders", response_model=List[Dict[str, Any]])
async def list_orders(
    request: Request,
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """Lista pedidos com filtros."""
    api_gateway = get_api_gateway()
    
    # Preparar headers
    headers = dict(request.headers)
    
    # Preparar query params
    query_params = {}
    if status:
        query_params["status"] = status
    if from_date:
        query_params["from_date"] = from_date
    if to_date:
        query_params["to_date"] = to_date
    
    # Chamar gateway
    result = await api_gateway.handle_request(
        path="/api/external/orders",
        method="GET",
        headers=headers,
        query_params=query_params
    )
    
    # Verificar resposta
    if result["status_code"] != 200:
        raise HTTPException(
            status_code=result["status_code"],
            detail=result["body"].get("error", "Erro ao listar pedidos")
        )
    
    return result["body"]

@router.post("/delivery/track", response_model=Dict[str, Any])
async def track_delivery(
    tracking_data: Dict[str, str],
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Rastreia uma entrega."""
    api_gateway = get_api_gateway()
    
    # Preparar headers
    headers = dict(request.headers)
    
    # Chamar gateway
    result = await api_gateway.handle_request(
        path="/api/external/delivery/track",
        method="POST",
        headers=headers,
        query_params={},
        body=tracking_data
    )
    
    # Verificar resposta
    if result["status_code"] != 200:
        raise HTTPException(
            status_code=result["status_code"],
            detail=result["body"].get("error", "Erro ao rastrear entrega")
        )
    
    return result["body"]

@router.post("/webhooks/order", response_model=Dict[str, str])
async def order_webhook(
    webhook_data: Dict[str, Any],
    request: Request,
    signature: Optional[str] = Header(None)
):
    """Webhook para recebimento de eventos de pedidos."""
    # Verificar assinatura (em um sistema real, isso seria mais robusto)
    if not signature:
        raise HTTPException(status_code=401, detail="Assinatura não fornecida")
    
    # Processar webhook
    try:
        # Em um sistema real, isso seria processado de forma assíncrona
        # e possivelmente publicado no barramento de eventos
        
        # Simular processamento bem-sucedido
        return {"status": "accepted", "message": "Webhook processado com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar webhook: {str(e)}")
