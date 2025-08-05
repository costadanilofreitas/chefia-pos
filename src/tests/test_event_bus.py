import pytest
from src.core.events.event_bus import Event, EventType, EventHandler, get_event_bus
from src.core.events.auth_events import AuthEventHandler, SystemEventHandler
from src.auth.models import User, UserRole

# Classe de teste para capturar eventos
class TestEventHandler(EventHandler):
    def __init__(self):
        self.events = []
        self.event_types_received = set()
    
    async def handle(self, event: Event) -> None:
        self.events.append(event)
        self.event_types_received.add(event.type)
    
    def clear(self):
        self.events.clear()
        self.event_types_received.clear()


@pytest.fixture
async def event_bus():
    # Obter a instância do barramento de eventos
    bus = get_event_bus()
    
    # Limpar histórico e subscribers para testes isolados
    bus._subscribers = {}
    bus.clear_history()
    
    yield bus
    
    # Limpar após os testes
    bus._subscribers = {}
    bus.clear_history()


@pytest.mark.asyncio
async def test_event_bus_publish_subscribe(event_bus):
    """Testa a publicação e assinatura básica de eventos."""
    # Criar um handler de teste
    test_handler = TestEventHandler()
    
    # Inscrever o handler para um tipo de evento
    await event_bus.subscribe(EventType.USER_LOGGED_IN, test_handler)
    
    # Publicar um evento
    test_event = Event(
        event_type=EventType.USER_LOGGED_IN,
        data={"user": {"username": "test_user", "role": "caixa"}}
    )
    await event_bus.publish(test_event)
    
    # Verificar se o handler recebeu o evento
    assert len(test_handler.events) == 1
    assert test_handler.events[0].type == EventType.USER_LOGGED_IN
    assert test_handler.events[0].data["user"]["username"] == "test_user"
    
    # Verificar se o evento está no histórico
    history = event_bus.get_history()
    assert len(history) == 1
    assert history[0].type == EventType.USER_LOGGED_IN


@pytest.mark.asyncio
async def test_event_bus_multiple_handlers(event_bus):
    """Testa múltiplos handlers para o mesmo tipo de evento."""
    # Criar dois handlers de teste
    handler1 = TestEventHandler()
    handler2 = TestEventHandler()
    
    # Inscrever ambos os handlers para o mesmo tipo de evento
    await event_bus.subscribe(EventType.SYSTEM_STARTED, handler1)
    await event_bus.subscribe(EventType.SYSTEM_STARTED, handler2)
    
    # Publicar um evento
    test_event = Event(
        event_type=EventType.SYSTEM_STARTED,
        data={"version": "1.0.0"}
    )
    await event_bus.publish(test_event)
    
    # Verificar se ambos os handlers receberam o evento
    assert len(handler1.events) == 1
    assert len(handler2.events) == 1
    assert handler1.events[0].type == EventType.SYSTEM_STARTED
    assert handler2.events[0].type == EventType.SYSTEM_STARTED


@pytest.mark.asyncio
async def test_event_bus_unsubscribe(event_bus):
    """Testa a cancelamento de assinatura de eventos."""
    # Criar um handler de teste
    test_handler = TestEventHandler()
    
    # Inscrever o handler
    await event_bus.subscribe(EventType.USER_LOGGED_OUT, test_handler)
    
    # Publicar um evento
    test_event = Event(
        event_type=EventType.USER_LOGGED_OUT,
        data={"user": {"username": "test_user"}}
    )
    await event_bus.publish(test_event)
    
    # Verificar se o handler recebeu o evento
    assert len(test_handler.events) == 1
    
    # Cancelar a assinatura
    await event_bus.unsubscribe(EventType.USER_LOGGED_OUT, test_handler)
    
    # Limpar eventos recebidos
    test_handler.clear()
    
    # Publicar outro evento do mesmo tipo
    await event_bus.publish(test_event)
    
    # Verificar que o handler não recebeu o evento após cancelar a assinatura
    assert len(test_handler.events) == 0


@pytest.mark.asyncio
async def test_auth_event_handler(event_bus):
    """Testa o handler de eventos de autenticação."""
    # Criar um handler de autenticação
    auth_handler = AuthEventHandler()
    
    # Inscrever o handler para eventos de autenticação
    await event_bus.subscribe(EventType.USER_LOGGED_IN, auth_handler)
    await event_bus.subscribe(EventType.USER_LOGGED_OUT, auth_handler)
    await event_bus.subscribe(EventType.USER_PERMISSION_CHANGED, auth_handler)
    
    # Criar um usuário de teste
    test_user = User(
        id="1",
        username="test_user",
        full_name="Test User",
        role=UserRole.CASHIER,
        permissions=["venda:criar", "venda:ler"]
    )
    
    # Publicar evento de login
    login_event = Event(
        event_type=EventType.USER_LOGGED_IN,
        data={"user": {
            "id": test_user.id,
            "username": test_user.username,
            "role": test_user.role,
            "permissions": test_user.permissions
        }}
    )
    await event_bus.publish(login_event)
    
    # Publicar evento de alteração de permissões
    permission_event = Event(
        event_type=EventType.USER_PERMISSION_CHANGED,
        data={
            "user": {
                "id": test_user.id,
                "username": test_user.username,
                "role": test_user.role
            },
            "permissions": {
                "old": ["venda:criar", "venda:ler"],
                "new": ["venda:criar", "venda:ler", "produto:ler"],
                "added": ["produto:ler"],
                "removed": []
            }
        }
    )
    await event_bus.publish(permission_event)
    
    # Verificar se os eventos estão no histórico
    history = event_bus.get_history()
    assert len(history) == 2
    assert history[0].type == EventType.USER_LOGGED_IN
    assert history[1].type == EventType.USER_PERMISSION_CHANGED


@pytest.mark.asyncio
async def test_system_event_handler(event_bus):
    """Testa o handler de eventos de sistema."""
    # Criar um handler de sistema
    system_handler = SystemEventHandler()
    
    # Inscrever o handler para eventos de sistema
    await event_bus.subscribe(EventType.SYSTEM_STARTED, system_handler)
    await event_bus.subscribe(EventType.SYSTEM_ERROR, system_handler)
    
    # Publicar evento de início do sistema
    start_event = Event(
        event_type=EventType.SYSTEM_STARTED,
        data={"version": "1.0.0", "config": {"debug": True}}
    )
    await event_bus.publish(start_event)
    
    # Publicar evento de erro do sistema
    error_event = Event(
        event_type=EventType.SYSTEM_ERROR,
        data={
            "error": {
                "message": "Falha na conexão com o banco de dados",
                "code": "DB_CONNECTION_ERROR",
                "details": {"host": "localhost", "port": 5432}
            }
        }
    )
    await event_bus.publish(error_event)
    
    # Verificar se os eventos estão no histórico
    history = event_bus.get_history()
    assert len(history) == 2
    assert history[0].type == EventType.SYSTEM_STARTED
    assert history[1].type == EventType.SYSTEM_ERROR


@pytest.mark.asyncio
async def test_event_serialization():
    """Testa a serialização e desserialização de eventos."""
    # Criar um evento
    original_event = Event(
        event_type=EventType.SALE_CREATED,
        data={
            "sale_id": "123",
            "amount": 99.99,
            "items": [
                {"product_id": "p1", "quantity": 2, "price": 29.99},
                {"product_id": "p2", "quantity": 1, "price": 40.01}
            ],
            "customer": {"id": "c1", "name": "John Doe"}
        }
    )
    
    # Serializar para JSON
    json_str = original_event.to_json()
    
    # Desserializar de JSON
    deserialized_event = Event.from_json(json_str)
    
    # Verificar se os dados foram preservados
    assert deserialized_event.id == original_event.id
    assert deserialized_event.type == original_event.type
    assert deserialized_event.timestamp == original_event.timestamp
    assert deserialized_event.data["sale_id"] == original_event.data["sale_id"]
    assert deserialized_event.data["amount"] == original_event.data["amount"]
    assert len(deserialized_event.data["items"]) == 2
    assert deserialized_event.data["customer"]["name"] == "John Doe"


@pytest.mark.asyncio
async def test_event_history_limit(event_bus):
    """Testa o limite de histórico de eventos."""
    # Definir um limite menor para o teste
    event_bus._max_history_size = 5
    
    # Publicar mais eventos que o limite
    for i in range(10):
        event = Event(
            event_type=EventType.SYSTEM_STARTED,
            data={"iteration": i}
        )
        await event_bus.publish(event)
    
    # Verificar se apenas os últimos eventos estão no histórico
    history = event_bus.get_history()
    assert len(history) == 5
    
    # Verificar se são os eventos mais recentes
    assert history[0].data["iteration"] == 5
    assert history[4].data["iteration"] == 9
