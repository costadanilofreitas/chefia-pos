from fastapi import FastAPI

from ..database.mongodb import get_database
from ..events.event_bus import EventBus, EventType
from .event_logger import EventLogger
from .trace_api import router as trace_router
from .transaction_tracker import TransactionTracker

# Inicializar componentes
event_bus = EventBus()
event_logger = EventLogger(event_bus=event_bus)
transaction_tracker = TransactionTracker(event_logger=event_logger)


def register_tracing(app: FastAPI):
    """
    Registra os componentes de rastreamento de transações na aplicação.
    """
    # Incluir rotas da API de rastreamento
    app.include_router(trace_router)

    # Adicionar middleware para injeção de dependências
    @app.middleware("http")
    async def add_transaction_tracker(request, call_next):
        request.state.transaction_tracker = transaction_tracker
        response = await call_next(request)
        return response

    # Registrar handlers para eventos do sistema
    async def handle_transaction_event(event):
        message = event.data
        db = await get_database()
        from .trace_repository import TraceRepository

        repository = TraceRepository(db)
        await repository.save_event(message)

    # Subscribe to transaction events
    # Note: Using SYSTEM_CONFIG_CHANGED as a placeholder since transaction events aren't defined
    event_bus.subscribe(EventType.SYSTEM_CONFIG_CHANGED, handle_transaction_event)

    return app
