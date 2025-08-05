"""
Router para o marketplace de integrações
"""

from fastapi import APIRouter, Depends, HTTPException, Header, Request, Response, status
from typing import Dict, List, Optional, Any
import time
from datetime import datetime

from src.marketplace.models.marketplace_models import (
    Partner, Integration, IntegrationType, IntegrationConfiguration, Webhook, DeliveryOrder, DeliveryOrderStatus, PaymentTransaction, CRMCustomer, APIKey
)
from src.marketplace.services.marketplace_service import (
    MarketplaceService, PartnerService, IntegrationService, WebhookService,
    APIKeyService, DeliveryAdapter, PaymentAdapter, CRMAdapter
)
from src.core.auth.auth_service import get_current_user
from src.core.db.db_service import get_db_service
from src.core.config.config_service import get_config_service

# Criação do router
router = APIRouter(prefix="/v1", tags=["marketplace"])

# Dependências
def get_marketplace_service():
    db_service = get_db_service()
    config_service = get_config_service()
    return MarketplaceService(db_service, config_service)

def get_partner_service():
    db_service = get_db_service()
    config_service = get_config_service()
    return PartnerService(db_service, config_service)

def get_integration_service():
    db_service = get_db_service()
    config_service = get_config_service()
    return IntegrationService(db_service, config_service)

def get_webhook_service():
    db_service = get_db_service()
    config_service = get_config_service()
    return WebhookService(db_service, config_service)

def get_api_key_service():
    db_service = get_db_service()
    config_service = get_config_service()
    return APIKeyService(db_service, config_service)

def get_delivery_adapter():
    db_service = get_db_service()
    config_service = get_config_service()
    webhook_service = get_webhook_service()
    return DeliveryAdapter(db_service, config_service, webhook_service)

def get_payment_adapter():
    db_service = get_db_service()
    config_service = get_config_service()
    webhook_service = get_webhook_service()
    return PaymentAdapter(db_service, config_service, webhook_service)

def get_crm_adapter():
    db_service = get_db_service()
    config_service = get_config_service()
    webhook_service = get_webhook_service()
    return CRMAdapter(db_service, config_service, webhook_service)

# Middleware para registro de uso da API
@router.middleware("http")
async def api_usage_middleware(request: Request, call_next):
    # Extrai informações da requisição
    start_time = time.time()
    
    # Processa a requisição
    response = await call_next(request)
    
    # Calcula o tempo de resposta
    response_time = int((time.time() - start_time) * 1000)  # em ms
    
    # Obtém informações adicionais
    api_key = request.headers.get("X-API-Key")
    if api_key:
        # Valida a chave de API
        api_key_service = get_api_key_service()
        api_key_obj = api_key_service.validate_api_key(api_key)
        
        if api_key_obj:
            # Registra o uso da API
            marketplace_service = get_marketplace_service()
            marketplace_service.register_integration_usage(
                partner_id=api_key_obj.partner_id,
                api_key_id=api_key_obj.id,
                endpoint=str(request.url.path),
                method=request.method,
                status_code=response.status_code,
                response_time=response_time,
                request_size=len(await request.body()),
                response_size=0,  # Não temos acesso ao tamanho da resposta aqui
                ip_address=request.client.host,
                user_agent=request.headers.get("User-Agent", "")
            )
    
    return response

# Rotas para parceiros
@router.post("/partners", response_model=Partner, status_code=status.HTTP_201_CREATED)
async def create_partner(
    partner_data: Dict[str, Any],
    current_user = Depends(get_current_user),
    partner_service: PartnerService = Depends(get_partner_service)
):
    """
    Registra um novo parceiro
    """
    try:
        partner = partner_service.register_partner(partner_data)
        return partner
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/partners/{partner_id}", response_model=Partner)
async def get_partner(
    partner_id: str,
    current_user = Depends(get_current_user),
    partner_service: PartnerService = Depends(get_partner_service)
):
    """
    Obtém detalhes de um parceiro
    """
    partner = partner_service.get_partner(partner_id)
    
    if not partner:
        raise HTTPException(status_code=404, detail="Parceiro não encontrado")
    
    return partner

@router.put("/partners/{partner_id}", response_model=Partner)
async def update_partner(
    partner_id: str,
    update_data: Dict[str, Any],
    current_user = Depends(get_current_user),
    partner_service: PartnerService = Depends(get_partner_service)
):
    """
    Atualiza um parceiro
    """
    try:
        partner = partner_service.update_partner(partner_id, update_data)
        
        if not partner:
            raise HTTPException(status_code=404, detail="Parceiro não encontrado")
        
        return partner
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/partners/{partner_id}/approve", response_model=Partner)
async def approve_partner(
    partner_id: str,
    current_user = Depends(get_current_user),
    partner_service: PartnerService = Depends(get_partner_service)
):
    """
    Aprova um parceiro
    """
    partner = partner_service.approve_partner(partner_id)
    
    if not partner:
        raise HTTPException(status_code=404, detail="Parceiro não encontrado")
    
    return partner

@router.post("/partners/{partner_id}/reject", response_model=Partner)
async def reject_partner(
    partner_id: str,
    current_user = Depends(get_current_user),
    partner_service: PartnerService = Depends(get_partner_service)
):
    """
    Rejeita um parceiro
    """
    partner = partner_service.reject_partner(partner_id)
    
    if not partner:
        raise HTTPException(status_code=404, detail="Parceiro não encontrado")
    
    return partner

@router.post("/partners/{partner_id}/suspend", response_model=Partner)
async def suspend_partner(
    partner_id: str,
    current_user = Depends(get_current_user),
    partner_service: PartnerService = Depends(get_partner_service)
):
    """
    Suspende um parceiro
    """
    partner = partner_service.suspend_partner(partner_id)
    
    if not partner:
        raise HTTPException(status_code=404, detail="Parceiro não encontrado")
    
    return partner

@router.get("/partners", response_model=Dict[str, Any])
async def list_partners(
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    current_user = Depends(get_current_user),
    partner_service: PartnerService = Depends(get_partner_service)
):
    """
    Lista parceiros com filtros e paginação
    """
    # Constrói os filtros
    filters = {}
    
    if status:
        filters["status"] = status
    
    # Busca os parceiros
    partners, total = partner_service.list_partners(filters, page, page_size)
    
    # Calcula informações de paginação
    total_pages = (total + page_size - 1) // page_size
    
    return {
        "data": partners,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": total_pages
        }
    }

# Rotas para integrações
@router.post("/integrations", response_model=Integration, status_code=status.HTTP_201_CREATED)
async def create_integration(
    integration_data: Dict[str, Any],
    current_user = Depends(get_current_user),
    integration_service: IntegrationService = Depends(get_integration_service)
):
    """
    Registra uma nova integração
    """
    try:
        integration = integration_service.register_integration(integration_data)
        return integration
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/integrations/{integration_id}", response_model=Integration)
async def get_integration(
    integration_id: str,
    current_user = Depends(get_current_user),
    integration_service: IntegrationService = Depends(get_integration_service)
):
    """
    Obtém detalhes de uma integração
    """
    integration = integration_service.get_integration(integration_id)
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integração não encontrada")
    
    return integration

@router.put("/integrations/{integration_id}", response_model=Integration)
async def update_integration(
    integration_id: str,
    update_data: Dict[str, Any],
    current_user = Depends(get_current_user),
    integration_service: IntegrationService = Depends(get_integration_service)
):
    """
    Atualiza uma integração
    """
    try:
        integration = integration_service.update_integration(integration_id, update_data)
        
        if not integration:
            raise HTTPException(status_code=404, detail="Integração não encontrada")
        
        return integration
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/integrations", response_model=Dict[str, Any])
async def list_integrations(
    page: int = 1,
    page_size: int = 20,
    partner_id: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    current_user = Depends(get_current_user),
    integration_service: IntegrationService = Depends(get_integration_service)
):
    """
    Lista integrações com filtros e paginação
    """
    # Constrói os filtros
    filters = {}
    
    if partner_id:
        filters["partner_id"] = partner_id
    
    if type:
        filters["type"] = type
    
    if status:
        filters["status"] = status
    
    # Busca as integrações
    integrations, total = integration_service.list_integrations(filters, page, page_size)
    
    # Calcula informações de paginação
    total_pages = (total + page_size - 1) // page_size
    
    return {
        "data": integrations,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": total_pages
        }
    }

@router.get("/integrations/types/{type}", response_model=Dict[str, Any])
async def list_integrations_by_type(
    type: str,
    page: int = 1,
    page_size: int = 20,
    current_user = Depends(get_current_user),
    integration_service: IntegrationService = Depends(get_integration_service)
):
    """
    Lista integrações por tipo
    """
    # Verifica se o tipo é válido
    if type not in [t.value for t in IntegrationType]:
        raise HTTPException(status_code=400, detail=f"Tipo de integração inválido: {type}")
    
    # Busca as integrações
    integrations, total = integration_service.list_integrations({"type": type}, page, page_size)
    
    # Calcula informações de paginação
    total_pages = (total + page_size - 1) // page_size
    
    return {
        "data": integrations,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": total_pages
        }
    }

# Rotas para configurações de integração
@router.post("/restaurants/{restaurant_id}/integrations/{integration_id}", response_model=IntegrationConfiguration)
async def configure_integration(
    restaurant_id: str,
    integration_id: str,
    configuration: Dict[str, Any],
    current_user = Depends(get_current_user),
    integration_service: IntegrationService = Depends(get_integration_service)
):
    """
    Configura uma integração para um restaurante
    """
    try:
        config = integration_service.configure_integration(integration_id, restaurant_id, configuration)
        return config
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/restaurants/{restaurant_id}/integrations/{integration_id}", response_model=IntegrationConfiguration)
async def get_integration_configuration(
    restaurant_id: str,
    integration_id: str,
    current_user = Depends(get_current_user),
    integration_service: IntegrationService = Depends(get_integration_service)
):
    """
    Obtém a configuração de uma integração para um restaurante
    """
    config = integration_service.get_integration_configuration(integration_id, restaurant_id)
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuração não encontrada")
    
    return config

@router.get("/restaurants/{restaurant_id}/integrations", response_model=List[Dict[str, Any]])
async def list_restaurant_integrations(
    restaurant_id: str,
    current_user = Depends(get_current_user),
    integration_service: IntegrationService = Depends(get_integration_service)
):
    """
    Lista todas as integrações configuradas para um restaurante
    """
    integrations = integration_service.list_restaurant_integrations(restaurant_id)
    return integrations

# Rotas para webhooks
@router.post("/webhooks", response_model=Webhook, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    webhook_data: Dict[str, Any],
    current_user = Depends(get_current_user),
    webhook_service: WebhookService = Depends(get_webhook_service)
):
    """
    Registra um novo webhook
    """
    try:
        webhook = webhook_service.register_webhook(webhook_data)
        return webhook
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/webhooks/{webhook_id}", response_model=Webhook)
async def get_webhook(
    webhook_id: str,
    current_user = Depends(get_current_user),
    webhook_service: WebhookService = Depends(get_webhook_service)
):
    """
    Obtém detalhes de um webhook
    """
    webhook = webhook_service.get_webhook(webhook_id)
    
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    return webhook

@router.put("/webhooks/{webhook_id}", response_model=Webhook)
async def update_webhook(
    webhook_id: str,
    update_data: Dict[str, Any],
    current_user = Depends(get_current_user),
    webhook_service: WebhookService = Depends(get_webhook_service)
):
    """
    Atualiza um webhook
    """
    try:
        webhook = webhook_service.update_webhook(webhook_id, update_data)
        
        if not webhook:
            raise HTTPException(status_code=404, detail="Webhook não encontrado")
        
        return webhook
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/webhooks/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: str,
    current_user = Depends(get_current_user),
    webhook_service: WebhookService = Depends(get_webhook_service)
):
    """
    Remove um webhook
    """
    success = webhook_service.delete_webhook(webhook_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/webhooks/{webhook_id}/test", response_model=Dict[str, Any])
async def test_webhook(
    webhook_id: str,
    current_user = Depends(get_current_user),
    webhook_service: WebhookService = Depends(get_webhook_service)
):
    """
    Testa um webhook
    """
    success, message = webhook_service.test_webhook(webhook_id)
    
    if not success and message == "Webhook não encontrado":
        raise HTTPException(status_code=404, detail=message)
    
    return {
        "success": success,
        "message": message
    }

@router.get("/webhooks", response_model=Dict[str, Any])
async def list_webhooks(
    page: int = 1,
    page_size: int = 20,
    integration_id: Optional[str] = None,
    restaurant_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user = Depends(get_current_user),
    webhook_service: WebhookService = Depends(get_webhook_service)
):
    """
    Lista webhooks com filtros e paginação
    """
    # Constrói os filtros
    filters = {}
    
    if integration_id:
        filters["integration_id"] = integration_id
    
    if restaurant_id:
        filters["restaurant_id"] = restaurant_id
    
    if status:
        filters["status"] = status
    
    # Busca os webhooks
    webhooks, total = webhook_service.list_webhooks(filters, page, page_size)
    
    # Calcula informações de paginação
    total_pages = (total + page_size - 1) // page_size
    
    return {
        "data": webhooks,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": total_pages
        }
    }

# Rotas para delivery
@router.get("/delivery/menu", response_model=Dict[str, Any])
async def get_delivery_menu(
    restaurant_id: str,
    api_key: str = Header(..., alias="X-API-Key"),
    api_key_service: APIKeyService = Depends(get_api_key_service)
):
    """
    Obtém o cardápio de um restaurante
    """
    # Valida a chave de API
    api_key_obj = api_key_service.validate_api_key(api_key)
    
    if not api_key_obj:
        raise HTTPException(status_code=401, detail="Chave de API inválida")
    
    # Verifica se a chave tem o escopo necessário
    if not api_key_service.check_scope(api_key_obj, "delivery:read"):
        raise HTTPException(status_code=403, detail="Escopo insuficiente")
    
    # Em um ambiente real, isso seria uma implementação completa
    # Aqui estamos apenas retornando um cardápio de exemplo
    
    return {
        "restaurant_id": restaurant_id,
        "name": "Restaurante Exemplo",
        "categories": [
            {
                "id": "category-1",
                "name": "Hambúrgueres",
                "items": [
                    {
                        "id": "item-1",
                        "name": "X-Burger",
                        "description": "Hambúrguer com queijo",
                        "price": 15.90,
                        "image_url": "https://example.com/x-burger.jpg"
                    },
                    {
                        "id": "item-2",
                        "name": "X-Bacon",
                        "description": "Hambúrguer com queijo e bacon",
                        "price": 18.90,
                        "image_url": "https://example.com/x-bacon.jpg"
                    }
                ]
            },
            {
                "id": "category-2",
                "name": "Bebidas",
                "items": [
                    {
                        "id": "item-3",
                        "name": "Refrigerante",
                        "description": "Lata 350ml",
                        "price": 5.00,
                        "image_url": "https://example.com/refrigerante.jpg"
                    },
                    {
                        "id": "item-4",
                        "name": "Suco Natural",
                        "description": "Copo 500ml",
                        "price": 8.00,
                        "image_url": "https://example.com/suco.jpg"
                    }
                ]
            }
        ]
    }

@router.post("/delivery/orders", response_model=DeliveryOrder, status_code=status.HTTP_201_CREATED)
async def create_delivery_order(
    order_data: Dict[str, Any],
    api_key: str = Header(..., alias="X-API-Key"),
    api_key_service: APIKeyService = Depends(get_api_key_service),
    delivery_adapter: DeliveryAdapter = Depends(get_delivery_adapter)
):
    """
    Recebe um novo pedido de uma plataforma de delivery
    """
    # Valida a chave de API
    api_key_obj = api_key_service.validate_api_key(api_key)
    
    if not api_key_obj:
        raise HTTPException(status_code=401, detail="Chave de API inválida")
    
    # Verifica se a chave tem o escopo necessário
    if not api_key_service.check_scope(api_key_obj, "delivery:write"):
        raise HTTPException(status_code=403, detail="Escopo insuficiente")
    
    # Verifica se os campos obrigatórios estão presentes
    required_fields = ["integration_id", "restaurant_id", "external_id", "customer", "items", "delivery_address", "payment", "total_value", "delivery_fee"]
    
    for field in required_fields:
        if field not in order_data:
            raise HTTPException(status_code=400, detail=f"Campo obrigatório ausente: {field}")
    
    try:
        # Cria o pedido
        order = delivery_adapter.receive_order(
            order_data["integration_id"],
            order_data["restaurant_id"],
            order_data
        )
        
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/delivery/orders/{order_id}/status", response_model=DeliveryOrder)
async def update_delivery_order_status(
    order_id: str,
    status_data: Dict[str, str],
    api_key: str = Header(..., alias="X-API-Key"),
    api_key_service: APIKeyService = Depends(get_api_key_service),
    delivery_adapter: DeliveryAdapter = Depends(get_delivery_adapter)
):
    """
    Atualiza o status de um pedido
    """
    # Valida a chave de API
    api_key_obj = api_key_service.validate_api_key(api_key)
    
    if not api_key_obj:
        raise HTTPException(status_code=401, detail="Chave de API inválida")
    
    # Verifica se a chave tem o escopo necessário
    if not api_key_service.check_scope(api_key_obj, "delivery:write"):
        raise HTTPException(status_code=403, detail="Escopo insuficiente")
    
    # Verifica se o status está presente
    if "status" not in status_data:
        raise HTTPException(status_code=400, detail="Campo obrigatório ausente: status")
    
    # Verifica se o status é válido
    if status_data["status"] not in [s.value for s in DeliveryOrderStatus]:
        raise HTTPException(status_code=400, detail=f"Status inválido: {status_data['status']}")
    
    # Atualiza o status do pedido
    order = delivery_adapter.update_order_status(order_id, status_data["status"])
    
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    return order

@router.get("/delivery/orders", response_model=Dict[str, Any])
async def list_delivery_orders(
    restaurant_id: str,
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    api_key: str = Header(..., alias="X-API-Key"),
    api_key_service: APIKeyService = Depends(get_api_key_service),
    delivery_adapter: DeliveryAdapter = Depends(get_delivery_adapter)
):
    """
    Lista pedidos de delivery
    """
    # Valida a chave de API
    api_key_obj = api_key_service.validate_api_key(api_key)
    
    if not api_key_obj:
        raise HTTPException(status_code=401, detail="Chave de API inválida")
    
    # Verifica se a chave tem o escopo necessário
    if not api_key_service.check_scope(api_key_obj, "delivery:read"):
        raise HTTPException(status_code=403, detail="Escopo insuficiente")
    
    # Constrói os filtros
    filters = {"restaurant_id": restaurant_id}
    
    if status:
        filters["status"] = status
    
    # Busca os pedidos
    orders, total = delivery_adapter.list_orders(filters, page, page_size)
    
    # Calcula informações de paginação
    total_pages = (total + page_size - 1) // page_size
    
    return {
        "data": orders,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": total_pages
        }
    }

# Rotas para pagamentos
@router.post("/payments/transactions", response_model=PaymentTransaction, status_code=status.HTTP_201_CREATED)
async def create_payment_transaction(
    transaction_data: Dict[str, Any],
    api_key: str = Header(..., alias="X-API-Key"),
    api_key_service: APIKeyService = Depends(get_api_key_service),
    payment_adapter: PaymentAdapter = Depends(get_payment_adapter)
):
    """
    Cria uma nova transação de pagamento
    """
    # Valida a chave de API
    api_key_obj = api_key_service.validate_api_key(api_key)
    
    if not api_key_obj:
        raise HTTPException(status_code=401, detail="Chave de API inválida")
    
    # Verifica se a chave tem o escopo necessário
    if not api_key_service.check_scope(api_key_obj, "payment:write"):
        raise HTTPException(status_code=403, detail="Escopo insuficiente")
    
    # Verifica se os campos obrigatórios estão presentes
    required_fields = ["integration_id", "restaurant_id", "order_id", "amount", "method", "status", "payment_data", "customer"]
    
    for field in required_fields:
        if field not in transaction_data:
            raise HTTPException(status_code=400, detail=f"Campo obrigatório ausente: {field}")
    
    try:
        # Cria a transação
        transaction = payment_adapter.create_transaction(
            transaction_data["integration_id"],
            transaction_data["restaurant_id"],
            transaction_data
        )
        
        return transaction
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/payments/transactions/{transaction_id}", response_model=PaymentTransaction)
async def get_payment_transaction(
    transaction_id: str,
    api_key: str = Header(..., alias="X-API-Key"),
    api_key_service: APIKeyService = Depends(get_api_key_service),
    payment_adapter: PaymentAdapter = Depends(get_payment_adapter)
):
    """
    Obtém o status de uma transação
    """
    # Valida a chave de API
    api_key_obj = api_key_service.validate_api_key(api_key)
    
    if not api_key_obj:
        raise HTTPException(status_code=401, detail="Chave de API inválida")
    
    # Verifica se a chave tem o escopo necessário
    if not api_key_service.check_scope(api_key_obj, "payment:read"):
        raise HTTPException(status_code=403, detail="Escopo insuficiente")
    
    # Obtém a transação
    transaction = payment_adapter.get_transaction(transaction_id)
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    return transaction

@router.post("/payments/transactions/{transaction_id}/refund", response_model=PaymentTransaction)
async def refund_payment_transaction(
    transaction_id: str,
    refund_data: Dict[str, Any],
    api_key: str = Header(..., alias="X-API-Key"),
    api_key_service: APIKeyService = Depends(get_api_key_service),
    payment_adapter: PaymentAdapter = Depends(get_payment_adapter)
):
    """
    Estorna uma transação
    """
    # Valida a chave de API
    api_key_obj = api_key_service.validate_api_key(api_key)
    
    if not api_key_obj:
        raise HTTPException(status_code=401, detail="Chave de API inválida")
    
    # Verifica se a chave tem o escopo necessário
    if not api_key_service.check_scope(api_key_obj, "payment:write"):
        raise HTTPException(status_code=403, detail="Escopo insuficiente")
    
    # Obtém o valor do estorno, se informado
    amount = refund_data.get("amount")
    
    try:
        # Estorna a transação
        transaction = payment_adapter.refund_transaction(transaction_id, amount)
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transação não encontrada")
        
        return transaction
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/payments/methods", response_model=List[Dict[str, Any]])
async def list_payment_methods(
    integration_id: str,
    restaurant_id: str,
    api_key: str = Header(..., alias="X-API-Key"),
    api_key_service: APIKeyService = Depends(get_api_key_service),
    payment_adapter: PaymentAdapter = Depends(get_payment_adapter)
):
    """
    Lista métodos de pagamento disponíveis
    """
    # Valida a chave de API
    api_key_obj = api_key_service.validate_api_key(api_key)
    
    if not api_key_obj:
        raise HTTPException(status_code=401, detail="Chave de API inválida")
    
    # Verifica se a chave tem o escopo necessário
    if not api_key_service.check_scope(api_key_obj, "payment:read"):
        raise HTTPException(status_code=403, detail="Escopo insuficiente")
    
    # Obtém os métodos de pagamento
    methods = payment_adapter.get_payment_methods(integration_id, restaurant_id)
    
    return methods

# Rotas para CRM
@router.get("/crm/customers", response_model=Dict[str, Any])
async def list_crm_customers(
    restaurant_id: str,
    page: int = 1,
    page_size: int = 20,
    api_key: str = Header(..., alias="X-API-Key"),
    api_key_service: APIKeyService = Depends(get_api_key_service),
    crm_adapter: CRMAdapter = Depends(get_crm_adapter)
):
    """
    Lista clientes
    """
    # Valida a chave de API
    api_key_obj = api_key_service.validate_api_key(api_key)
    
    if not api_key_obj:
        raise HTTPException(status_code=401, detail="Chave de API inválida")
    
    # Verifica se a chave tem o escopo necessário
    if not api_key_service.check_scope(api_key_obj, "crm:read"):
        raise HTTPException(status_code=403, detail="Escopo insuficiente")
    
    # Constrói os filtros
    filters = {"restaurant_id": restaurant_id}
    
    # Busca os clientes
    customers, total = crm_adapter.list_customers(filters, page, page_size)
    
    # Calcula informações de paginação
    total_pages = (total + page_size - 1) // page_size
    
    return {
        "data": customers,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": total_pages
        }
    }

@router.get("/crm/customers/{customer_id}", response_model=CRMCustomer)
async def get_crm_customer(
    customer_id: str,
    api_key: str = Header(..., alias="X-API-Key"),
    api_key_service: APIKeyService = Depends(get_api_key_service),
    crm_adapter: CRMAdapter = Depends(get_crm_adapter)
):
    """
    Obtém detalhes de um cliente
    """
    # Valida a chave de API
    api_key_obj = api_key_service.validate_api_key(api_key)
    
    if not api_key_obj:
        raise HTTPException(status_code=401, detail="Chave de API inválida")
    
    # Verifica se a chave tem o escopo necessário
    if not api_key_service.check_scope(api_key_obj, "crm:read"):
        raise HTTPException(status_code=403, detail="Escopo insuficiente")
    
    # Obtém o cliente
    customer = crm_adapter.get_customer(customer_id)
    
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    return customer

@router.post("/crm/customers", response_model=CRMCustomer, status_code=status.HTTP_201_CREATED)
async def create_crm_customer(
    customer_data: Dict[str, Any],
    api_key: str = Header(..., alias="X-API-Key"),
    api_key_service: APIKeyService = Depends(get_api_key_service),
    crm_adapter: CRMAdapter = Depends(get_crm_adapter)
):
    """
    Registra um novo cliente
    """
    # Valida a chave de API
    api_key_obj = api_key_service.validate_api_key(api_key)
    
    if not api_key_obj:
        raise HTTPException(status_code=401, detail="Chave de API inválida")
    
    # Verifica se a chave tem o escopo necessário
    if not api_key_service.check_scope(api_key_obj, "crm:write"):
        raise HTTPException(status_code=403, detail="Escopo insuficiente")
    
    # Verifica se os campos obrigatórios estão presentes
    if "integration_id" not in customer_data:
        raise HTTPException(status_code=400, detail="Campo obrigatório ausente: integration_id")
    
    if "restaurant_id" not in customer_data:
        raise HTTPException(status_code=400, detail="Campo obrigatório ausente: restaurant_id")
    
    try:
        # Registra o cliente
        customer = crm_adapter.register_customer(
            customer_data["integration_id"],
            customer_data["restaurant_id"],
            customer_data
        )
        
        return customer
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/crm/customers/{customer_id}", response_model=CRMCustomer)
async def update_crm_customer(
    customer_id: str,
    update_data: Dict[str, Any],
    api_key: str = Header(..., alias="X-API-Key"),
    api_key_service: APIKeyService = Depends(get_api_key_service),
    crm_adapter: CRMAdapter = Depends(get_crm_adapter)
):
    """
    Atualiza um cliente
    """
    # Valida a chave de API
    api_key_obj = api_key_service.validate_api_key(api_key)
    
    if not api_key_obj:
        raise HTTPException(status_code=401, detail="Chave de API inválida")
    
    # Verifica se a chave tem o escopo necessário
    if not api_key_service.check_scope(api_key_obj, "crm:write"):
        raise HTTPException(status_code=403, detail="Escopo insuficiente")
    
    # Atualiza o cliente
    customer = crm_adapter.update_customer(customer_id, update_data)
    
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    return customer

@router.get("/crm/customers/{customer_id}/orders", response_model=Dict[str, Any])
async def get_crm_customer_orders(
    customer_id: str,
    page: int = 1,
    page_size: int = 20,
    api_key: str = Header(..., alias="X-API-Key"),
    api_key_service: APIKeyService = Depends(get_api_key_service),
    crm_adapter: CRMAdapter = Depends(get_crm_adapter)
):
    """
    Lista pedidos de um cliente
    """
    # Valida a chave de API
    api_key_obj = api_key_service.validate_api_key(api_key)
    
    if not api_key_obj:
        raise HTTPException(status_code=401, detail="Chave de API inválida")
    
    # Verifica se a chave tem o escopo necessário
    if not api_key_service.check_scope(api_key_obj, "crm:read"):
        raise HTTPException(status_code=403, detail="Escopo insuficiente")
    
    # Obtém os pedidos do cliente
    orders, total = crm_adapter.get_customer_orders(customer_id, page, page_size)
    
    # Calcula informações de paginação
    total_pages = (total + page_size - 1) // page_size
    
    return {
        "data": orders,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": total_pages
        }
    }

# Rotas para chaves de API
@router.post("/api-keys", response_model=APIKey, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    key_data: Dict[str, Any],
    current_user = Depends(get_current_user),
    api_key_service: APIKeyService = Depends(get_api_key_service)
):
    """
    Cria uma nova chave de API
    """
    # Verifica se os campos obrigatórios estão presentes
    required_fields = ["partner_id", "name", "scopes"]
    
    for field in required_fields:
        if field not in key_data:
            raise HTTPException(status_code=400, detail=f"Campo obrigatório ausente: {field}")
    
    try:
        # Cria a chave de API
        api_key = api_key_service.create_api_key(
            key_data["partner_id"],
            key_data["name"],
            key_data["scopes"],
            key_data.get("expires_at")
        )
        
        return api_key
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/api-keys/{key_id}", response_model=APIKey)
async def get_api_key(
    key_id: str,
    current_user = Depends(get_current_user),
    api_key_service: APIKeyService = Depends(get_api_key_service)
):
    """
    Obtém detalhes de uma chave de API
    """
    api_key = api_key_service.get_api_key(key_id)
    
    if not api_key:
        raise HTTPException(status_code=404, detail="Chave de API não encontrada")
    
    return api_key

@router.post("/api-keys/{key_id}/revoke", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: str,
    current_user = Depends(get_current_user),
    api_key_service: APIKeyService = Depends(get_api_key_service)
):
    """
    Revoga uma chave de API
    """
    success = api_key_service.revoke_api_key(key_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Chave de API não encontrada")
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/api-keys", response_model=List[APIKey])
async def list_api_keys(
    partner_id: str,
    current_user = Depends(get_current_user),
    api_key_service: APIKeyService = Depends(get_api_key_service)
):
    """
    Lista todas as chaves de API de um parceiro
    """
    keys = api_key_service.list_api_keys(partner_id)
    return keys

# Rotas para métricas de uso da API
@router.get("/metrics/api-usage", response_model=Dict[str, Any])
async def get_api_usage_metrics(
    partner_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user = Depends(get_current_user),
    marketplace_service: MarketplaceService = Depends(get_marketplace_service)
):
    """
    Obtém métricas de uso da API
    """
    metrics = marketplace_service.get_api_usage_metrics(partner_id, start_date, end_date)
    return metrics
