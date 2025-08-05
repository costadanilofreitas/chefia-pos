from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, WebSocket, WebSocketDisconnect
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
import logging
import asyncio

from ..events.event_bus import Event, EventType, get_event_bus
from ..events.event_monitor import get_event_monitor

# Modelos Pydantic para API
class EventData(BaseModel):
    """Modelo para dados de um evento."""
    event_type: str = Field(..., description="Tipo do evento (deve ser um dos tipos definidos em EventType)")
    data: Dict[str, Any] = Field(default_factory=dict, description="Dados do evento")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadados do evento")

class EventResponse(BaseModel):
    """Modelo para resposta de criação de evento."""
    id: str = Field(..., description="ID único do evento")
    timestamp: str = Field(..., description="Timestamp de criação do evento")
    event_type: str = Field(..., description="Tipo do evento")
    status: str = Field(..., description="Status do processamento")

class EventSequence(BaseModel):
    """Modelo para sequência de eventos."""
    events: List[EventData] = Field(..., description="Lista de eventos a serem enviados")
    interval_ms: int = Field(default=1000, description="Intervalo entre eventos em milissegundos")
    name: Optional[str] = Field(default=None, description="Nome da sequência")

class EventSequenceResponse(BaseModel):
    """Modelo para resposta de criação de sequência."""
    id: str = Field(..., description="ID único da sequência")
    name: Optional[str] = Field(default=None, description="Nome da sequência")
    event_count: int = Field(..., description="Número de eventos na sequência")
    status: str = Field(..., description="Status do processamento")

class EventTypeInfo(BaseModel):
    """Modelo para informações sobre tipos de eventos."""
    name: str = Field(..., description="Nome do tipo de evento")
    description: Optional[str] = Field(default=None, description="Descrição do tipo de evento")

# Router para API de teste
router = APIRouter(
    prefix="/api/test",
    tags=["test"],
    responses={404: {"description": "Not found"}},
)

# Logger
logger = logging.getLogger(__name__)

# Sequências de eventos em execução
active_sequences = {}

async def validate_event_type(event_type: str) -> str:
    """
    Valida se o tipo de evento é válido.
    
    Args:
        event_type: Tipo do evento a ser validado
        
    Returns:
        str: Tipo do evento validado
        
    Raises:
        HTTPException: Se o tipo de evento for inválido
    """
    try:
        # Verificar se o tipo está definido em EventType
        valid_types = [e.value for e in EventType]
        if event_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de evento inválido. Tipos válidos: {', '.join(valid_types)}"
            )
        return event_type
    except Exception as e:
        logger.error(f"Erro ao validar tipo de evento: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Erro ao validar tipo de evento: {str(e)}"
        )

async def publish_event(event_data: EventData) -> EventResponse:
    """
    Publica um evento no barramento.
    
    Args:
        event_data: Dados do evento a ser publicado
        
    Returns:
        EventResponse: Resposta com informações do evento publicado
    """
    try:
        # Validar tipo de evento
        event_type = await validate_event_type(event_data.event_type)
        
        # Criar evento
        event = Event(event_data.data, event_data.metadata)
        
        # Publicar no barramento
        event_bus = get_event_bus()
        await event_bus.publish(event_type, event)
        
        return EventResponse(
            id=event.id,
            timestamp=event.timestamp,
            event_type=event_type,
            status="published"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao publicar evento: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao publicar evento: {str(e)}"
        )

async def run_event_sequence(sequence_id: str, events: List[EventData], interval_ms: int):
    """
    Executa uma sequência de eventos.
    
    Args:
        sequence_id: ID da sequência
        events: Lista de eventos a serem publicados
        interval_ms: Intervalo entre eventos em milissegundos
    """
    try:
        active_sequences[sequence_id] = {
            "status": "running",
            "total": len(events),
            "current": 0,
            "results": []
        }
        
        for i, event_data in enumerate(events):
            # Verificar se a sequência foi cancelada
            if sequence_id not in active_sequences or active_sequences[sequence_id]["status"] == "cancelled":
                logger.info(f"Sequência {sequence_id} cancelada")
                break
                
            # Publicar evento
            try:
                result = await publish_event(event_data)
                active_sequences[sequence_id]["results"].append(result.dict())
            except Exception as e:
                logger.error(f"Erro ao publicar evento na sequência {sequence_id}: {str(e)}")
                active_sequences[sequence_id]["results"].append({
                    "error": str(e),
                    "event_type": event_data.event_type
                })
                
            # Atualizar progresso
            active_sequences[sequence_id]["current"] = i + 1
            
            # Aguardar intervalo (exceto para o último evento)
            if i < len(events) - 1:
                await asyncio.sleep(interval_ms / 1000)
                
        # Marcar como concluída
        if sequence_id in active_sequences:
            active_sequences[sequence_id]["status"] = "completed"
            
    except Exception as e:
        logger.error(f"Erro ao executar sequência {sequence_id}: {str(e)}")
        if sequence_id in active_sequences:
            active_sequences[sequence_id]["status"] = "error"
            active_sequences[sequence_id]["error"] = str(e)

@router.post("/events", response_model=EventResponse)
async def create_event(event_data: EventData):
    """
    Envia um evento para o barramento.
    
    Args:
        event_data: Dados do evento a ser enviado
        
    Returns:
        EventResponse: Resposta com informações do evento enviado
    """
    return await publish_event(event_data)

@router.get("/events", response_model=List[Dict[str, Any]])
async def list_events(
    limit: int = Query(100, description="Limite de eventos a retornar"),
    event_type: Optional[str] = Query(None, description="Filtrar por tipo de evento"),
    start_time: Optional[str] = Query(None, description="Timestamp inicial (formato ISO)"),
    end_time: Optional[str] = Query(None, description="Timestamp final (formato ISO)")
):
    """
    Lista eventos capturados pelo monitor.
    
    Args:
        limit: Limite de eventos a retornar
        event_type: Filtrar por tipo de evento
        start_time: Timestamp inicial (formato ISO)
        end_time: Timestamp final (formato ISO)
        
    Returns:
        List[Dict[str, Any]]: Lista de eventos
    """
    try:
        # Obter monitor de eventos
        monitor = get_event_monitor()
        
        # Validar tipo de evento se fornecido
        if event_type:
            await validate_event_type(event_type)
            
        # Obter eventos
        events = monitor.get_event_history(
            limit=limit,
            event_type=event_type,
            start_time=start_time,
            end_time=end_time
        )
        
        # Converter para dicionários
        return [event.to_dict() for event in events]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao listar eventos: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao listar eventos: {str(e)}"
        )

@router.get("/events/{event_id}", response_model=Dict[str, Any])
async def get_event(event_id: str):
    """
    Obtém detalhes de um evento específico.
    
    Args:
        event_id: ID do evento
        
    Returns:
        Dict[str, Any]: Evento completo
    """
    try:
        # Obter monitor de eventos
        monitor = get_event_monitor()
        
        # Buscar evento
        event = monitor.get_event_by_id(event_id)
        
        if not event:
            raise HTTPException(
                status_code=404,
                detail=f"Evento com ID {event_id} não encontrado"
            )
            
        return event.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter evento: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao obter evento: {str(e)}"
        )

@router.get("/event-types", response_model=List[EventTypeInfo])
async def list_event_types():
    """
    Lista todos os tipos de eventos disponíveis.
    
    Returns:
        List[EventTypeInfo]: Lista de tipos de eventos
    """
    try:
        result = []
        for event_type in EventType:
            # Extrair descrição do nome do evento
            name_parts = event_type.name.split('_')
            description = ' '.join(name_parts).title()
            
            result.append(EventTypeInfo(
                name=event_type.value,
                description=description
            ))
        return result
    except Exception as e:
        logger.error(f"Erro ao listar tipos de eventos: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao listar tipos de eventos: {str(e)}"
        )

@router.post("/sequences", response_model=EventSequenceResponse)
async def create_sequence(sequence: EventSequence, background_tasks: BackgroundTasks):
    """
    Cria e executa uma sequência de eventos para teste.
    
    Args:
        sequence: Sequência de eventos a ser executada
        background_tasks: Tarefas em segundo plano
        
    Returns:
        EventSequenceResponse: Resposta com informações da sequência
    """
    try:
        # Validar tipos de eventos
        for event_data in sequence.events:
            await validate_event_type(event_data.event_type)
            
        # Gerar ID para a sequência
        import uuid
        sequence_id = str(uuid.uuid4())
        
        # Iniciar execução em segundo plano
        background_tasks.add_task(
            run_event_sequence,
            sequence_id,
            sequence.events,
            sequence.interval_ms
        )
        
        return EventSequenceResponse(
            id=sequence_id,
            name=sequence.name,
            event_count=len(sequence.events),
            status="started"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar sequência: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar sequência: {str(e)}"
        )

@router.get("/sequences/{sequence_id}", response_model=Dict[str, Any])
async def get_sequence_status(sequence_id: str):
    """
    Obtém o status de uma sequência de eventos.
    
    Args:
        sequence_id: ID da sequência
        
    Returns:
        Dict[str, Any]: Status da sequência
    """
    if sequence_id not in active_sequences:
        raise HTTPException(
            status_code=404,
            detail=f"Sequência com ID {sequence_id} não encontrada"
        )
        
    return active_sequences[sequence_id]

@router.delete("/sequences/{sequence_id}", response_model=Dict[str, str])
async def cancel_sequence(sequence_id: str):
    """
    Cancela uma sequência de eventos em execução.
    
    Args:
        sequence_id: ID da sequência
        
    Returns:
        Dict[str, str]: Confirmação de cancelamento
    """
    if sequence_id not in active_sequences:
        raise HTTPException(
            status_code=404,
            detail=f"Sequência com ID {sequence_id} não encontrada"
        )
        
    active_sequences[sequence_id]["status"] = "cancelled"
    
    return {"status": "cancelled", "message": f"Sequência {sequence_id} cancelada"}

@router.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    """
    WebSocket para stream em tempo real de eventos.
    
    Args:
        websocket: Conexão WebSocket
    """
    await websocket.accept()
    
    # Obter monitor de eventos
    monitor = get_event_monitor()
    
    # Fila para eventos
    queue = asyncio.Queue()
    
    # Callback para receber eventos
    async def on_event(event):
        await queue.put(event)
    
    try:
        # Receber parâmetros de filtro
        params = await websocket.receive_json()
        event_type_filter = params.get("event_type")
        
        # Validar tipo de evento se fornecido
        if event_type_filter:
            await validate_event_type(event_type_filter)
        
        # Assinar eventos
        monitor.subscribe(on_event)
        
        # Enviar eventos em tempo real
        while True:
            # Aguardar próximo evento
            event = await queue.get()
            
            # Aplicar filtro se necessário
            if event_type_filter and event.metadata.get("event_type") != event_type_filter:
                continue
                
            # Enviar evento
            await websocket.send_json(event.to_dict())
            
    except WebSocketDisconnect:
        logger.info("Cliente WebSocket desconectado")
    except Exception as e:
        logger.error(f"Erro em conexão WebSocket: {str(e)}")
        await websocket.close(code=1011, reason=str(e))
    finally:
        # Cancelar assinatura
        monitor.unsubscribe(on_event)

@router.post("/monitor/start", response_model=Dict[str, str])
async def start_monitor():
    """
    Inicia o monitoramento de eventos.
    
    Returns:
        Dict[str, str]: Confirmação de início
    """
    try:
        monitor = get_event_monitor()
        await monitor.start_monitoring()
        return {"status": "started", "message": "Monitoramento de eventos iniciado"}
    except Exception as e:
        logger.error(f"Erro ao iniciar monitoramento: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao iniciar monitoramento: {str(e)}"
        )

@router.post("/monitor/stop", response_model=Dict[str, str])
async def stop_monitor():
    """
    Para o monitoramento de eventos.
    
    Returns:
        Dict[str, str]: Confirmação de parada
    """
    try:
        monitor = get_event_monitor()
        await monitor.stop_monitoring()
        return {"status": "stopped", "message": "Monitoramento de eventos parado"}
    except Exception as e:
        logger.error(f"Erro ao parar monitoramento: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao parar monitoramento: {str(e)}"
        )

@router.post("/monitor/clear", response_model=Dict[str, str])
async def clear_monitor():
    """
    Limpa o histórico de eventos do monitor.
    
    Returns:
        Dict[str, str]: Confirmação de limpeza
    """
    try:
        monitor = get_event_monitor()
        monitor.clear_history()
        return {"status": "cleared", "message": "Histórico de eventos limpo"}
    except Exception as e:
        logger.error(f"Erro ao limpar histórico: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao limpar histórico: {str(e)}"
        )

@router.get("/monitor/stats", response_model=Dict[str, Any])
async def get_monitor_stats():
    """
    Obtém estatísticas do monitor de eventos.
    
    Returns:
        Dict[str, Any]: Estatísticas do monitor
    """
    try:
        monitor = get_event_monitor()
        
        # Obter contagem por tipo
        counts = monitor.get_event_types_count()
        
        # Calcular total
        total = sum(counts.values())
        
        return {
            "total_events": total,
            "counts_by_type": counts,
            "is_monitoring": monitor.is_monitoring
        }
    except Exception as e:
        logger.error(f"Erro ao obter estatísticas: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao obter estatísticas: {str(e)}"
        )
