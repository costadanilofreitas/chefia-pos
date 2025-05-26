from typing import Dict, List, Optional, Any, Union
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from datetime import datetime
import uuid

from ..models.fiscal_models import (
    ConfiguracaoRegional,
    GrupoFiscal,
    RegimeTributario,
    TipoImposto,
    TipoItem,
    OrigemProduto,
    RegraNcm,
    BeneficioFiscal,
    ImpostoCalculado,
    ItemCalculoFiscal,
    ResultadoCalculoFiscal,
    ProductFiscalInfo,
    FiscalLog,
    CalculoFiscalRequest
)
from ..services.fiscal_service import fiscal_service
from ...core.dependencies import get_product_service

router = APIRouter(
    prefix="/fiscal",
    tags=["fiscal"],
    responses={404: {"description": "Not found"}},
)

@router.get("/regions", response_model=List[ConfiguracaoRegional])
async def get_all_regions():
    """Obtém todas as configurações regionais."""
    return list(fiscal_service.regional_configs.values())

@router.get("/regions/{region_id}", response_model=ConfiguracaoRegional)
async def get_region(region_id: str):
    """Obtém uma configuração regional específica."""
    if region_id not in fiscal_service.regional_configs:
        raise HTTPException(status_code=404, detail="Configuração regional não encontrada")
    return fiscal_service.regional_configs[region_id]

@router.get("/regions/by-location", response_model=Optional[ConfiguracaoRegional])
async def get_region_by_location(uf: str, municipio: Optional[str] = None):
    """Obtém uma configuração regional por UF e município."""
    config = fiscal_service.get_regional_config(uf, municipio)
    if not config:
        raise HTTPException(status_code=404, detail=f"Configuração regional não encontrada para UF={uf}, Município={municipio}")
    return config

@router.post("/regions", response_model=ConfiguracaoRegional)
async def create_region(config: ConfiguracaoRegional):
    """Cria uma nova configuração regional."""
    fiscal_service.save_regional_config(config)
    return config

@router.put("/regions/{region_id}", response_model=ConfiguracaoRegional)
async def update_region(region_id: str, config: ConfiguracaoRegional):
    """Atualiza uma configuração regional existente."""
    if region_id != config.id:
        raise HTTPException(status_code=400, detail="ID da configuração não corresponde ao ID na URL")
    fiscal_service.save_regional_config(config)
    return config

@router.delete("/regions/{region_id}", response_model=bool)
async def delete_region(region_id: str):
    """Remove uma configuração regional."""
    success = fiscal_service.delete_regional_config(region_id)
    if not success:
        raise HTTPException(status_code=404, detail="Configuração regional não encontrada")
    return True

@router.get("/groups", response_model=List[GrupoFiscal])
async def get_all_groups():
    """Obtém todos os grupos fiscais."""
    return list(fiscal_service.fiscal_groups.values())

@router.get("/groups/{group_id}", response_model=GrupoFiscal)
async def get_group(group_id: str):
    """Obtém um grupo fiscal específico."""
    group = fiscal_service.get_fiscal_group(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo fiscal não encontrado")
    return group

@router.post("/groups", response_model=GrupoFiscal)
async def create_group(group: GrupoFiscal):
    """Cria um novo grupo fiscal."""
    fiscal_service.save_fiscal_group(group)
    return group

@router.put("/groups/{group_id}", response_model=GrupoFiscal)
async def update_group(group_id: str, group: GrupoFiscal):
    """Atualiza um grupo fiscal existente."""
    if group_id != group.id:
        raise HTTPException(status_code=400, detail="ID do grupo não corresponde ao ID na URL")
    fiscal_service.save_fiscal_group(group)
    return group

@router.delete("/groups/{group_id}", response_model=bool)
async def delete_group(group_id: str):
    """Remove um grupo fiscal."""
    success = fiscal_service.delete_fiscal_group(group_id)
    if not success:
        raise HTTPException(status_code=404, detail="Grupo fiscal não encontrado")
    return True

@router.post("/calculate", response_model=ResultadoCalculoFiscal)
async def calculate_taxes(
    request: CalculoFiscalRequest,
    product_service = Depends(get_product_service)
):
    """Calcula os impostos para um pedido."""
    from ...order.services.order_service import order_service
    
    # Obtém o pedido
    order = await order_service.get_order(request.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    # Obtém a configuração regional
    regional_config = None
    if request.region_id:
        regional_config = fiscal_service.regional_configs.get(request.region_id)
    elif request.uf:
        regional_config = fiscal_service.get_regional_config(request.uf, request.municipio)
    
    if not regional_config:
        raise HTTPException(status_code=404, detail="Configuração regional não encontrada")
    
    # Calcula os impostos
    result = await fiscal_service.calculate_order_taxes(
        order=order.dict(),
        regional_config=regional_config,
        product_service=product_service
    )
    
    return result

@router.post("/reload-config")
async def reload_config():
    """Recarrega todas as configurações fiscais."""
    fiscal_service.reload_configurations()
    return {"status": "success", "message": "Configurações fiscais recarregadas com sucesso"}
