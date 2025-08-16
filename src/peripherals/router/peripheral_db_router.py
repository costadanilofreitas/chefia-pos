import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query

from ...auth.models import User
from ...auth.security import get_current_user
from ..models.peripheral_models import PeripheralType
from ..services.keyboard_db_manager import KeyboardDBManager, get_keyboard_manager
from ..services.peripheral_db_service import PeripheralDBService, get_peripheral_service

router = APIRouter(
    prefix="/api/v1/peripherals",
    tags=["Peripherals"],
)

logger = logging.getLogger(__name__)


@router.get("/", response_model=List[Dict[str, Any]])
async def list_peripherals(
    peripheral_type: Optional[str] = Query(
        None, description="Filter by peripheral type"
    ),
    include_inactive: bool = Query(False, description="Include inactive peripherals"),
    current_user: User = Depends(get_current_user),
    service: PeripheralDBService = Depends(get_peripheral_service),
):
    """List all peripherals."""
    try:
        from src.peripherals.models.peripheral_models import PeripheralType

        peripheral_type_enum = (
            PeripheralType(peripheral_type) if peripheral_type else None
        )
        peripherals = await service.list_peripherals(
            peripheral_type=peripheral_type_enum, include_inactive=include_inactive
        )
        return peripherals
    except Exception as e:
        logger.error(f"Erro ao listar periféricos: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao listar periféricos: {str(e)}"
        ) from e


@router.get("/{peripheral_id}", response_model=Dict[str, Any])
async def get_peripheral(
    peripheral_id: str = Path(..., description="ID do periférico"),
    current_user: User = Depends(get_current_user),
    service: PeripheralDBService = Depends(get_peripheral_service),
):
    """Get detailed information about a specific peripheral."""
    try:
        db_peripheral = await service.get_peripheral_from_db(peripheral_id)

        if not db_peripheral:
            raise HTTPException(
                status_code=404, detail=f"Periférico não encontrado: {peripheral_id}"
            )

        # Get runtime status if peripheral is active
        active_peripheral = await service.get_peripheral(peripheral_id)
        runtime_status = None
        if active_peripheral:
            runtime_status = await active_peripheral.get_status()

        return {
            "id": db_peripheral.id,
            "name": db_peripheral.name,
            "type": db_peripheral.type,
            "status": db_peripheral.status,
            "brand": db_peripheral.brand,
            "model": db_peripheral.model,
            "connection_type": db_peripheral.connection_type,
            "connection_params": db_peripheral.connection_params,
            "config": db_peripheral.config,
            "enabled": db_peripheral.enabled,
            "last_connected": (
                db_peripheral.last_connected.isoformat()
                if db_peripheral.last_connected
                else None
            ),
            "last_error": db_peripheral.last_error,
            "created_at": db_peripheral.created_at.isoformat(),
            "updated_at": db_peripheral.updated_at.isoformat(),
            "runtime_status": runtime_status,
            "active": active_peripheral is not None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter periférico {peripheral_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter periférico: {str(e)}"
        ) from e


@router.post("/", response_model=Dict[str, Any])
async def create_peripheral(
    peripheral_data: Dict[str, Any] = Body(..., description="Dados do periférico"),
    current_user: User = Depends(get_current_user),
    service: PeripheralDBService = Depends(get_peripheral_service),
):
    """Create a new peripheral."""
    try:
        # Validate required fields
        required_fields = ["id", "name", "type"]
        for field in required_fields:
            if field not in peripheral_data:
                raise HTTPException(
                    status_code=400, detail=f"Campo obrigatório: {field}"
                )

        # Validate peripheral type
        if peripheral_data["type"] not in [pt.value for pt in PeripheralType]:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de periférico inválido: {peripheral_data['type']}",
            )

        db_peripheral = await service.create_peripheral(
            peripheral_id=peripheral_data["id"],
            name=peripheral_data["name"],
            peripheral_type=peripheral_data["type"],
            config=peripheral_data.get("config", {}),
            brand=peripheral_data.get("brand"),
            model=peripheral_data.get("model"),
            connection_type=peripheral_data.get("connection_type"),
            connection_params=peripheral_data.get("connection_params"),
        )

        return {
            "id": db_peripheral.id,
            "name": db_peripheral.name,
            "type": db_peripheral.type,
            "status": db_peripheral.status,
            "created_at": db_peripheral.created_at.isoformat(),
            "message": f"Periférico {db_peripheral.id} criado com sucesso",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar periférico: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar periférico: {str(e)}"
        ) from e


@router.put("/{peripheral_id}", response_model=Dict[str, Any])
async def update_peripheral(
    peripheral_id: str = Path(..., description="ID do periférico"),
    updates: Dict[str, Any] = Body(..., description="Atualizações do periférico"),
    current_user: User = Depends(get_current_user),
    service: PeripheralDBService = Depends(get_peripheral_service),
):
    """Update a peripheral configuration."""
    try:
        db_peripheral = await service.update_peripheral(peripheral_id, updates)

        if not db_peripheral:
            raise HTTPException(
                status_code=404, detail=f"Periférico não encontrado: {peripheral_id}"
            )

        return {
            "id": db_peripheral.id,
            "name": db_peripheral.name,
            "type": db_peripheral.type,
            "status": db_peripheral.status,
            "updated_at": db_peripheral.updated_at.isoformat(),
            "message": f"Periférico {peripheral_id} atualizado com sucesso",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar periférico {peripheral_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar periférico: {str(e)}"
        ) from e


@router.delete("/{peripheral_id}")
async def delete_peripheral(
    peripheral_id: str = Path(..., description="ID do periférico"),
    current_user: User = Depends(get_current_user),
    service: PeripheralDBService = Depends(get_peripheral_service),
):
    """Delete a peripheral completely."""
    try:
        success = await service.delete_peripheral(peripheral_id)

        if not success:
            raise HTTPException(
                status_code=404, detail=f"Periférico não encontrado: {peripheral_id}"
            )

        return {"message": f"Periférico {peripheral_id} removido com sucesso"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao remover periférico {peripheral_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao remover periférico: {str(e)}"
        ) from e


@router.post("/{peripheral_id}/initialize")
async def initialize_peripheral(
    peripheral_id: str = Path(..., description="ID do periférico"),
    current_user: User = Depends(get_current_user),
    service: PeripheralDBService = Depends(get_peripheral_service),
):
    """Initialize a peripheral."""
    try:
        db_peripheral = await service.get_peripheral_from_db(peripheral_id)

        if not db_peripheral:
            raise HTTPException(
                status_code=404, detail=f"Periférico não encontrado: {peripheral_id}"
            )

        await service.add_peripheral_from_db(db_peripheral)

        return {"message": f"Periférico {peripheral_id} inicializado com sucesso"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao inicializar periférico {peripheral_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao inicializar periférico: {str(e)}"
        ) from e


@router.post("/{peripheral_id}/shutdown")
async def shutdown_peripheral(
    peripheral_id: str = Path(..., description="ID do periférico"),
    current_user: User = Depends(get_current_user),
    service: PeripheralDBService = Depends(get_peripheral_service),
):
    """Shutdown a peripheral."""
    try:
        success = await service.remove_peripheral(peripheral_id)

        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"Periférico não encontrado ou não ativo: {peripheral_id}",
            )

        return {"message": f"Periférico {peripheral_id} finalizado com sucesso"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao finalizar periférico {peripheral_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao finalizar periférico: {str(e)}"
        ) from e


@router.get("/status/all", response_model=Dict[str, Any])
async def check_all_peripherals_status(
    current_user: User = Depends(get_current_user),
    service: PeripheralDBService = Depends(get_peripheral_service),
):
    """Check status of all active peripherals."""
    try:
        status = await service.check_peripherals_status()
        return {"peripherals_status": status}
    except Exception as e:
        logger.error(f"Erro ao verificar status dos periféricos: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao verificar status: {str(e)}"
        ) from e


@router.post("/initialize/all")
async def initialize_all_peripherals(
    current_user: User = Depends(get_current_user),
    service: PeripheralDBService = Depends(get_peripheral_service),
):
    """Initialize all enabled peripherals."""
    try:
        await service.initialize_peripherals()
        return {"message": "Inicialização de periféricos concluída"}
    except Exception as e:
        logger.error(f"Erro ao inicializar periféricos: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao inicializar periféricos: {str(e)}"
        ) from e


@router.post("/shutdown/all")
async def shutdown_all_peripherals(
    current_user: User = Depends(get_current_user),
    service: PeripheralDBService = Depends(get_peripheral_service),
):
    """Shutdown all active peripherals."""
    try:
        await service.shutdown()
        return {"message": "Finalização de periféricos concluída"}
    except Exception as e:
        logger.error(f"Erro ao finalizar periféricos: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao finalizar periféricos: {str(e)}"
        ) from e


# Keyboard-specific endpoints
@router.get("/keyboards/", response_model=List[Dict[str, Any]])
async def list_keyboards(
    current_user: User = Depends(get_current_user),
    keyboard_manager: KeyboardDBManager = Depends(get_keyboard_manager),
):
    """List all keyboard configurations."""
    try:
        keyboards = await keyboard_manager.get_keyboards()
        return keyboards
    except Exception as e:
        logger.error(f"Erro ao listar teclados: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao listar teclados: {str(e)}"
        ) from e


@router.get("/keyboards/{keyboard_id}", response_model=Dict[str, Any])
async def get_keyboard_config(
    keyboard_id: str = Path(..., description="ID do teclado"),
    current_user: User = Depends(get_current_user),
    keyboard_manager: KeyboardDBManager = Depends(get_keyboard_manager),
):
    """Get keyboard configuration."""
    try:
        config = await keyboard_manager.get_keyboard_config(keyboard_id)

        if not config:
            raise HTTPException(
                status_code=404,
                detail=f"Configuração de teclado não encontrada: {keyboard_id}",
            )

        return config
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter configuração do teclado {keyboard_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter configuração: {str(e)}"
        ) from e


@router.put("/keyboards/{keyboard_id}", response_model=Dict[str, Any])
async def update_keyboard_config(
    keyboard_id: str = Path(..., description="ID do teclado"),
    config: Dict[str, Any] = Body(..., description="Nova configuração"),
    current_user: User = Depends(get_current_user),
    keyboard_manager: KeyboardDBManager = Depends(get_keyboard_manager),
):
    """Update keyboard configuration."""
    try:
        success = await keyboard_manager.update_keyboard_config(keyboard_id, config)

        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"Configuração de teclado não encontrada: {keyboard_id}",
            )

        updated_config = await keyboard_manager.get_keyboard_config(keyboard_id)
        return {
            **(updated_config or {}),  # type: ignore
            "message": f"Configuração do teclado {keyboard_id} atualizada com sucesso",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Erro ao atualizar configuração do teclado {keyboard_id}: {str(e)}"
        )
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar configuração: {str(e)}"
        ) from e


# Printer-specific endpoints
@router.post("/{peripheral_id}/print")
async def print_document(
    peripheral_id: str = Path(..., description="ID da impressora"),
    print_data: Dict[str, Any] = Body(..., description="Dados para impressão"),
    current_user: User = Depends(get_current_user),
    service: PeripheralDBService = Depends(get_peripheral_service),
):
    """Print a document."""
    try:
        printer = await service.get_printer(peripheral_id)

        if not printer:
            raise HTTPException(
                status_code=404,
                detail=f"Impressora não encontrada ou não ativa: {peripheral_id}",
            )

        if "content" not in print_data:
            raise HTTPException(
                status_code=400, detail="Conteúdo para impressão é obrigatório"
            )

        success = await printer.print(
            print_data["content"], print_data.get("options", {})
        )

        if not success:
            raise HTTPException(status_code=500, detail="Falha ao imprimir documento")

        return {"message": "Documento enviado para impressão com sucesso"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao imprimir em {peripheral_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao imprimir: {str(e)}"
        ) from e
