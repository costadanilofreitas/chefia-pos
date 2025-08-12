from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any
import logging

from src.peripherals.services.keyboard_manager import (
    get_keyboard_manager,
    KeyboardManager,
)
from src.peripherals.models.peripheral_models import CommandType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/peripherals/keyboards", tags=["peripherals"])


@router.get("/")
async def list_keyboards(
    keyboard_manager: KeyboardManager = Depends(get_keyboard_manager),
):
    """
    Lista todos os teclados disponíveis.

    Returns:
        List: Lista de teclados
    """
    try:
        devices = keyboard_manager.get_devices()
        return {"devices": devices}
    except Exception as e:
        logger.error(f"Erro ao listar teclados: {e}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao listar teclados: {str(e)}"
        )


@router.get("/{device_id}")
async def get_keyboard_config(
    device_id: str, keyboard_manager: KeyboardManager = Depends(get_keyboard_manager)
):
    """
    Obtém a configuração de um teclado.

    Args:
        device_id: ID do dispositivo

    Returns:
        Dict: Configuração do teclado
    """
    try:
        config = keyboard_manager.get_device_config(device_id)

        if not config:
            raise HTTPException(
                status_code=404, detail=f"Teclado {device_id} não encontrado"
            )

        return config
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter configuração do teclado {device_id}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter configuração do teclado: {str(e)}"
        )


@router.put("/{device_id}")
async def update_keyboard_config(
    device_id: str,
    config: Dict[str, Any] = Body(...),
    keyboard_manager: KeyboardManager = Depends(get_keyboard_manager),
):
    """
    Atualiza a configuração de um teclado.

    Args:
        device_id: ID do dispositivo
        config: Nova configuração

    Returns:
        Dict: Mensagem de sucesso
    """
    try:
        success = keyboard_manager.update_device_config(device_id, config)

        if not success:
            raise HTTPException(
                status_code=400,
                detail=f"Não foi possível atualizar a configuração do teclado {device_id}",
            )

        return {
            "message": f"Configuração do teclado {device_id} atualizada com sucesso"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar configuração do teclado {device_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao atualizar configuração do teclado: {str(e)}",
        )


@router.post("/{device_id}/activate")
async def activate_keyboard(
    device_id: str, keyboard_manager: KeyboardManager = Depends(get_keyboard_manager)
):
    """
    Ativa um teclado.

    Args:
        device_id: ID do dispositivo

    Returns:
        Dict: Mensagem de sucesso
    """
    try:
        config = keyboard_manager.get_device_config(device_id)

        if not config:
            raise HTTPException(
                status_code=404, detail=f"Teclado {device_id} não encontrado"
            )

        success = keyboard_manager.update_device_config(device_id, {"active": True})

        if not success:
            raise HTTPException(
                status_code=400, detail=f"Não foi possível ativar o teclado {device_id}"
            )

        return {"message": f"Teclado {device_id} ativado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao ativar teclado {device_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao ativar teclado: {str(e)}")


@router.post("/{device_id}/deactivate")
async def deactivate_keyboard(
    device_id: str, keyboard_manager: KeyboardManager = Depends(get_keyboard_manager)
):
    """
    Desativa um teclado.

    Args:
        device_id: ID do dispositivo

    Returns:
        Dict: Mensagem de sucesso
    """
    try:
        config = keyboard_manager.get_device_config(device_id)

        if not config:
            raise HTTPException(
                status_code=404, detail=f"Teclado {device_id} não encontrado"
            )

        success = keyboard_manager.update_device_config(device_id, {"active": False})

        if not success:
            raise HTTPException(
                status_code=400,
                detail=f"Não foi possível desativar o teclado {device_id}",
            )

        return {"message": f"Teclado {device_id} desativado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao desativar teclado {device_id}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao desativar teclado: {str(e)}"
        )


@router.get("/commands/available")
async def list_available_commands():
    """
    Lista todos os comandos disponíveis para mapeamento.

    Returns:
        Dict: Lista de comandos disponíveis
    """
    try:
        commands = [{"code": cmd.value, "description": cmd.name} for cmd in CommandType]
        return {"commands": commands}
    except Exception as e:
        logger.error(f"Erro ao listar comandos disponíveis: {e}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao listar comandos disponíveis: {str(e)}"
        )


@router.post("/discover")
async def discover_keyboards(
    keyboard_manager: KeyboardManager = Depends(get_keyboard_manager),
):
    """
    Descobre teclados disponíveis.

    Returns:
        Dict: Mensagem de sucesso e lista de dispositivos
    """
    try:
        # Parar monitoramento atual
        keyboard_manager.stop()

        # Redescobrir dispositivos
        keyboard_manager._discover_devices()

        # Reiniciar monitoramento
        keyboard_manager.start()

        devices = keyboard_manager.get_devices()

        return {"message": f"{len(devices)} teclados descobertos", "devices": devices}
    except Exception as e:
        logger.error(f"Erro ao descobrir teclados: {e}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao descobrir teclados: {str(e)}"
        )
