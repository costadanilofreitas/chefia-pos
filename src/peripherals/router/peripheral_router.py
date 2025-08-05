from typing import Dict, Any
import logging
from fastapi import APIRouter, Depends, HTTPException, Body, Path

from src.peripherals.services.peripheral_manager import peripheral_manager, PeripheralFactory
from src.peripherals.models.peripheral_models import PeripheralConfig
from src.core.dependencies import get_current_user
from src.auth.models import User

router = APIRouter(
    prefix="/peripherals",
    tags=["peripherals"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/")
async def get_all_peripherals(current_user: User = Depends(get_current_user)):
    """Retorna todos os periféricos configurados."""
    try:
        peripherals = peripheral_manager.get_all_peripherals()
        result = {}
        
        for peripheral_id, peripheral in peripherals.items():
            status = await peripheral.get_status()
            result[peripheral_id] = {
                "id": peripheral_id,
                "name": peripheral.config.name,
                "type": peripheral.config.type,
                "driver": peripheral.config.driver,
                "status": status
            }
        
        return {"peripherals": result}
    except Exception as e:
        logging.error(f"Erro ao obter periféricos: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao obter periféricos: {str(e)}")

@router.get("/types")
async def get_peripheral_types(current_user: User = Depends(get_current_user)):
    """Retorna os tipos de periféricos disponíveis e seus drivers."""
    try:
        available_drivers = PeripheralFactory.get_available_drivers()
        return {"types": available_drivers}
    except Exception as e:
        logging.error(f"Erro ao obter tipos de periféricos: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao obter tipos de periféricos: {str(e)}")

@router.get("/{peripheral_id}")
async def get_peripheral(
    peripheral_id: str = Path(..., description="ID do periférico"),
    current_user: User = Depends(get_current_user)
):
    """Retorna informações detalhadas sobre um periférico específico."""
    try:
        peripheral = peripheral_manager.get_peripheral(peripheral_id)
        
        if not peripheral:
            raise HTTPException(status_code=404, detail=f"Periférico não encontrado: {peripheral_id}")
        
        status = await peripheral.get_status()
        
        return {
            "id": peripheral_id,
            "name": peripheral.config.name,
            "type": peripheral.config.type,
            "driver": peripheral.config.driver,
            "device_path": peripheral.config.device_path,
            "address": peripheral.config.address,
            "options": peripheral.config.options,
            "status": status
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro ao obter periférico {peripheral_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao obter periférico: {str(e)}")

@router.post("/")
async def add_peripheral(
    config: Dict[str, Any] = Body(..., description="Configuração do periférico"),
    current_user: User = Depends(get_current_user)
):
    """Adiciona um novo periférico."""
    try:
        # Validar configuração
        if "id" not in config:
            raise HTTPException(status_code=400, detail="ID do periférico é obrigatório")
        
        if "type" not in config:
            raise HTTPException(status_code=400, detail="Tipo do periférico é obrigatório")
        
        if "driver" not in config:
            raise HTTPException(status_code=400, detail="Driver do periférico é obrigatório")
        
        # Verificar se o tipo e driver são suportados
        available_drivers = PeripheralFactory.get_available_drivers()
        if config["type"] not in available_drivers:
            raise HTTPException(status_code=400, detail=f"Tipo de periférico não suportado: {config['type']}")
        
        if config["driver"] not in available_drivers[config["type"]]:
            raise HTTPException(status_code=400, detail=f"Driver não suportado para {config['type']}: {config['driver']}")
        
        # Criar configuração
        peripheral_config = PeripheralConfig(
            id=config["id"],
            type=config["type"],
            driver=config["driver"],
            name=config.get("name", f"{config['type']}_{config['id']}"),
            device_path=config.get("device_path"),
            address=config.get("address"),
            options=config.get("options", {})
        )
        
        # Adicionar periférico
        success = peripheral_manager.add_peripheral(peripheral_config)
        
        if not success:
            raise HTTPException(status_code=500, detail="Falha ao adicionar periférico")
        
        return {"message": f"Periférico {config['id']} adicionado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro ao adicionar periférico: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao adicionar periférico: {str(e)}")

@router.delete("/{peripheral_id}")
async def remove_peripheral(
    peripheral_id: str = Path(..., description="ID do periférico"),
    current_user: User = Depends(get_current_user)
):
    """Remove um periférico."""
    try:
        # Verificar se o periférico existe
        peripheral = peripheral_manager.get_peripheral(peripheral_id)
        
        if not peripheral:
            raise HTTPException(status_code=404, detail=f"Periférico não encontrado: {peripheral_id}")
        
        # Finalizar periférico antes de remover
        await peripheral.shutdown()
        
        # Remover periférico
        success = peripheral_manager.remove_peripheral(peripheral_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Falha ao remover periférico")
        
        return {"message": f"Periférico {peripheral_id} removido com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro ao remover periférico {peripheral_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao remover periférico: {str(e)}")

@router.post("/{peripheral_id}/initialize")
async def initialize_peripheral(
    peripheral_id: str = Path(..., description="ID do periférico"),
    current_user: User = Depends(get_current_user)
):
    """Inicializa um periférico."""
    try:
        peripheral = peripheral_manager.get_peripheral(peripheral_id)
        
        if not peripheral:
            raise HTTPException(status_code=404, detail=f"Periférico não encontrado: {peripheral_id}")
        
        success = await peripheral.initialize()
        
        if not success:
            raise HTTPException(status_code=500, detail="Falha ao inicializar periférico")
        
        return {"message": f"Periférico {peripheral_id} inicializado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro ao inicializar periférico {peripheral_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao inicializar periférico: {str(e)}")

@router.post("/{peripheral_id}/shutdown")
async def shutdown_peripheral(
    peripheral_id: str = Path(..., description="ID do periférico"),
    current_user: User = Depends(get_current_user)
):
    """Finaliza um periférico."""
    try:
        peripheral = peripheral_manager.get_peripheral(peripheral_id)
        
        if not peripheral:
            raise HTTPException(status_code=404, detail=f"Periférico não encontrado: {peripheral_id}")
        
        success = await peripheral.shutdown()
        
        if not success:
            raise HTTPException(status_code=500, detail="Falha ao finalizar periférico")
        
        return {"message": f"Periférico {peripheral_id} finalizado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro ao finalizar periférico {peripheral_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao finalizar periférico: {str(e)}")

@router.post("/{peripheral_id}/print")
async def print_document(
    peripheral_id: str = Path(..., description="ID do periférico"),
    data: Dict[str, Any] = Body(..., description="Dados para impressão"),
    current_user: User = Depends(get_current_user)
):
    """Imprime um documento em uma impressora."""
    try:
        peripheral = peripheral_manager.get_peripheral(peripheral_id)
        
        if not peripheral:
            raise HTTPException(status_code=404, detail=f"Periférico não encontrado: {peripheral_id}")
        
        # Verificar se é uma impressora
        if peripheral.config.type not in ["thermal_printer", "conventional_printer"]:
            raise HTTPException(status_code=400, detail=f"Periférico {peripheral_id} não é uma impressora")
        
        # Verificar dados necessários
        if "content" not in data:
            raise HTTPException(status_code=400, detail="Conteúdo para impressão é obrigatório")
        
        # Imprimir documento
        success = await peripheral.print(data["content"], data.get("options", {}))
        
        if not success:
            raise HTTPException(status_code=500, detail="Falha ao imprimir documento")
        
        return {"message": "Documento enviado para impressão com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro ao imprimir em {peripheral_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao imprimir: {str(e)}")

@router.post("/{peripheral_id}/open_drawer")
async def open_cash_drawer(
    peripheral_id: str = Path(..., description="ID do periférico"),
    current_user: User = Depends(get_current_user)
):
    """Abre uma gaveta de dinheiro."""
    try:
        peripheral = peripheral_manager.get_peripheral(peripheral_id)
        
        if not peripheral:
            raise HTTPException(status_code=404, detail=f"Periférico não encontrado: {peripheral_id}")
        
        # Verificar se é uma gaveta de dinheiro
        if peripheral.config.type != "cash_drawer":
            raise HTTPException(status_code=400, detail=f"Periférico {peripheral_id} não é uma gaveta de dinheiro")
        
        # Abrir gaveta
        success = await peripheral.open()
        
        if not success:
            raise HTTPException(status_code=500, detail="Falha ao abrir gaveta")
        
        return {"message": "Gaveta aberta com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro ao abrir gaveta {peripheral_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao abrir gaveta: {str(e)}")

@router.post("/{peripheral_id}/process_payment")
async def process_payment(
    peripheral_id: str = Path(..., description="ID do periférico"),
    payment_data: Dict[str, Any] = Body(..., description="Dados do pagamento"),
    current_user: User = Depends(get_current_user)
):
    """Processa um pagamento em um terminal TEF/SiTef."""
    try:
        peripheral = peripheral_manager.get_peripheral(peripheral_id)
        
        if not peripheral:
            raise HTTPException(status_code=404, detail=f"Periférico não encontrado: {peripheral_id}")
        
        # Verificar se é um terminal de pagamento
        if peripheral.config.type != "payment_terminal":
            raise HTTPException(status_code=400, detail=f"Periférico {peripheral_id} não é um terminal de pagamento")
        
        # Verificar dados necessários
        if "amount" not in payment_data:
            raise HTTPException(status_code=400, detail="Valor do pagamento é obrigatório")
        
        # Processar pagamento
        result = await peripheral.process_payment(payment_data)
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro ao processar pagamento em {peripheral_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar pagamento: {str(e)}")

@router.post("/{peripheral_id}/cancel_payment")
async def cancel_payment(
    peripheral_id: str = Path(..., description="ID do periférico"),
    data: Dict[str, Any] = Body(..., description="Dados do cancelamento"),
    current_user: User = Depends(get_current_user)
):
    """Cancela um pagamento em um terminal TEF/SiTef."""
    try:
        peripheral = peripheral_manager.get_peripheral(peripheral_id)
        
        if not peripheral:
            raise HTTPException(status_code=404, detail=f"Periférico não encontrado: {peripheral_id}")
        
        # Verificar se é um terminal de pagamento
        if peripheral.config.type != "payment_terminal":
            raise HTTPException(status_code=400, detail=f"Periférico {peripheral_id} não é um terminal de pagamento")
        
        # Cancelar pagamento
        result = await peripheral.cancel_transaction(data.get("transaction_id"))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro ao cancelar pagamento em {peripheral_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao cancelar pagamento: {str(e)}")

@router.post("/{peripheral_id}/read_barcode")
async def read_barcode(
    peripheral_id: str = Path(..., description="ID do periférico"),
    options: Dict[str, Any] = Body({}, description="Opções de leitura"),
    current_user: User = Depends(get_current_user)
):
    """Inicia a leitura de código de barras."""
    try:
        peripheral = peripheral_manager.get_peripheral(peripheral_id)
        
        if not peripheral:
            raise HTTPException(status_code=404, detail=f"Periférico não encontrado: {peripheral_id}")
        
        # Verificar se é um leitor de código de barras
        if peripheral.config.type != "barcode_reader":
            raise HTTPException(status_code=400, detail=f"Periférico {peripheral_id} não é um leitor de código de barras")
        
        # Iniciar leitura
        timeout = options.get("timeout", 30)  # segundos
        result = await peripheral.read(timeout)
        
        if not result:
            raise HTTPException(status_code=408, detail="Tempo esgotado sem leitura")
        
        return {"barcode": result}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro ao ler código de barras em {peripheral_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao ler código de barras: {str(e)}")

@router.post("/{peripheral_id}/read_pix")
async def read_pix(
    peripheral_id: str = Path(..., description="ID do periférico"),
    options: Dict[str, Any] = Body({}, description="Opções de leitura"),
    current_user: User = Depends(get_current_user)
):
    """Inicia a leitura de QR Code PIX."""
    try:
        peripheral = peripheral_manager.get_peripheral(peripheral_id)
        
        if not peripheral:
            raise HTTPException(status_code=404, detail=f"Periférico não encontrado: {peripheral_id}")
        
        # Verificar se é um leitor de PIX
        if peripheral.config.type != "pix_reader":
            raise HTTPException(status_code=400, detail=f"Periférico {peripheral_id} não é um leitor de PIX")
        
        # Iniciar leitura
        timeout = options.get("timeout", 60)  # segundos
        result = await peripheral.read(timeout)
        
        if not result:
            raise HTTPException(status_code=408, detail="Tempo esgotado sem leitura")
        
        return {"pix_data": result}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro ao ler PIX em {peripheral_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao ler PIX: {str(e)}")

@router.post("/initialize_all")
async def initialize_all_peripherals(current_user: User = Depends(get_current_user)):
    """Inicializa todos os periféricos configurados."""
    try:
        results = await peripheral_manager.initialize_all()
        return {"results": results}
    except Exception as e:
        logging.error(f"Erro ao inicializar periféricos: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao inicializar periféricos: {str(e)}")

@router.post("/shutdown_all")
async def shutdown_all_peripherals(current_user: User = Depends(get_current_user)):
    """Finaliza todos os periféricos configurados."""
    try:
        results = await peripheral_manager.shutdown_all()
        return {"results": results}
    except Exception as e:
        logging.error(f"Erro ao finalizar periféricos: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao finalizar periféricos: {str(e)}")
