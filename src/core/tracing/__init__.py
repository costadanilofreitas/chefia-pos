from fastapi import FastAPI, Depends
from .trace_api import router as trace_router
from ..database.mongodb import get_database
from .transaction_tracker import TransactionTracker
from .event_logger import EventLogger
from ..events.event_bus import EventBus

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
    @event_bus.subscribe("transaction.events")
    async def handle_transaction_event(message, metadata):
        db = await get_database()
        from .trace_repository import TraceRepository

        repository = TraceRepository(db)
        await repository.save_event(message)

    return app
