from typing import Dict, Any, List, Optional
import logging
from enum import Enum
from datetime import datetime

class EventBusException(Exception):
    """Exceção base para erros relacionados ao barramento de eventos."""
    pass

class EventType(str, Enum):
    """Tipos de eventos do sistema."""
    # Eventos do módulo de pedidos
    ORDER_CREATED = "order.created"
    ORDER_UPDATED = "order.updated"
    ORDER_STATUS_CHANGED = "order.status_changed"
    ORDER_ITEM_ADDED = "order.item_added"
    ORDER_ITEM_REMOVED = "order.item_removed"
    ORDER_ITEM_UPDATED = "order.item_updated"
    
    # Eventos do módulo de produtos
    PRODUCT_CREATED = "product.created"
    PRODUCT_UPDATED = "product.updated"
    PRODUCT_STATUS_CHANGED = "product.status_changed"
    CATEGORY_CREATED = "category.created"
    CATEGORY_UPDATED = "category.updated"
    MENU_UPDATED = "menu.updated"
    
    # Eventos do módulo de pagamentos
    PAYMENT_CREATED = "payment.created"
    PAYMENT_UPDATED = "payment.updated"
    PAYMENT_STATUS_CHANGED = "payment.status_changed"
    PAYMENT_REFUNDED = "payment.refunded"
    
    # Eventos do módulo de pedidos remotos
    REMOTE_ORDER_RECEIVED = "remote_order.received"
    REMOTE_ORDER_STATUS_CHANGED = "remote_order.status_changed"
    REMOTE_ORDER_REFUNDED = "remote_order.refunded"
    
    # Eventos do módulo KDS
    KDS_ORDER_ADDED = "kds.order_added"
    KDS_ORDER_UPDATED = "kds.order_updated"
    KDS_ITEM_STATUS_CHANGED = "kds.item_status_changed"
    KDS_ORDERS_UPDATED = "kds.orders_updated"
    KDS_PRINT_ORDER = "kds.print_order"
    KDS_HIGHLIGHT_SELECTION = "kds.highlight_selection"
    
    # Eventos do módulo de periféricos
    PERIPHERAL_CONNECTED = "peripheral.connected"
    PERIPHERAL_DISCONNECTED = "peripheral.disconnected"
    PERIPHERAL_ERROR = "peripheral.error"
    PERIPHERAL_STATUS_CHANGED = "peripheral.status_changed"
    PERIPHERAL_KEYBOARD_COMMAND = "peripheral.keyboard.command"
    PERIPHERAL_BARCODE_SCANNED = "peripheral.barcode.scanned"
    PERIPHERAL_PRINTER_STATUS = "peripheral.printer.status"
    PERIPHERAL_CASH_DRAWER_STATUS = "peripheral.cash_drawer.status"
    PERIPHERAL_CARD_READER_STATUS = "peripheral.card_reader.status"
    PERIPHERAL_CUSTOM_EVENT = "peripheral.custom"

class Event:
    """Representa um evento no sistema."""
    
    def __init__(self, data: Dict[str, Any] = None, metadata: Dict[str, Any] = None):
        """
        Inicializa um evento.
        
        Args:
            data: Dados do evento
            metadata: Metadados do evento
        """
        self.data = data or {}
        self.metadata = metadata or {}
        self.timestamp = datetime.now().isoformat()
        self.id = self._generate_id()
    
    def _generate_id(self) -> str:
        """Gera um ID único para o evento."""
        import uuid
        return str(uuid.uuid4())
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte o evento para um dicionário."""
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "data": self.data,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Event':
        """Cria um evento a partir de um dicionário."""
        event = cls(data.get("data", {}), data.get("metadata", {}))
        event.id = data.get("id", event.id)
        event.timestamp = data.get("timestamp", event.timestamp)
        return event

class EventHandler:
    """Manipulador de eventos."""
    
    def __init__(self, callback, filters: Dict[str, Any] = None):
        """
        Inicializa um manipulador de eventos.
        
        Args:
            callback: Função a ser chamada quando o evento ocorrer
            filters: Filtros para aplicar aos eventos
        """
        self.callback = callback
        self.filters = filters or {}
    
    async def handle(self, event: Event) -> bool:
        """
        Manipula um evento.
        
        Args:
            event: Evento a ser manipulado
            
        Returns:
            bool: True se o evento foi manipulado, False caso contrário
        """
        # Verificar se o evento passa pelos filtros
        if not self._matches_filters(event):
            return False
        
        # Chamar o callback
        try:
            await self.callback(event)
            return True
        except Exception as e:
            logging.error(f"Erro ao manipular evento: {str(e)}")
            return False
    
    def _matches_filters(self, event: Event) -> bool:
        """
        Verifica se um evento passa pelos filtros.
        
        Args:
            event: Evento a ser verificado
            
        Returns:
            bool: True se o evento passa pelos filtros, False caso contrário
        """
        # Se não há filtros, o evento sempre passa
        if not self.filters:
            return True
        
        # Verificar cada filtro
        for key, value in self.filters.items():
            # Verificar se o filtro é para um campo de dados
            if key.startswith("data."):
                data_key = key[5:]  # Remover "data."
                if data_key not in event.data or event.data[data_key] != value:
                    return False
            # Verificar se o filtro é para um campo de metadados
            elif key.startswith("metadata."):
                metadata_key = key[9:]  # Remover "metadata."
                if metadata_key not in event.metadata or event.metadata[metadata_key] != value:
                    return False
            # Filtro para campos do próprio evento
            elif key == "id" and event.id != value:
                return False
            elif key == "timestamp" and event.timestamp != value:
                return False
        
        return True

class EventBus:
    """Barramento de eventos do sistema."""
    
    def __init__(self):
        """Inicializa o barramento de eventos."""
        self.subscribers = {}
        self.logger = logging.getLogger(__name__)
    
    async def publish(self, event_type: str, event: Event) -> None:
        """
        Publica um evento no barramento.
        
        Args:
            event_type: Tipo do evento
            event: Evento a ser publicado
        """
        self.logger.debug(f"Publicando evento {event_type}: {event.id}")
        
        # Adicionar tipo do evento aos metadados
        event.metadata["event_type"] = event_type
        
        # Verificar se há subscribers para este tipo de evento
        if event_type not in self.subscribers:
            self.logger.debug(f"Nenhum subscriber para o evento {event_type}")
            return
        
        # Notificar todos os subscribers
        for handler in self.subscribers[event_type]:
            try:
                await handler.handle(event)
            except Exception as e:
                self.logger.error(f"Erro ao notificar subscriber para {event_type}: {str(e)}")
    
    def subscribe(self, event_type: str, callback, filters: Dict[str, Any] = None) -> None:
        """
        Inscreve um callback para receber eventos de um determinado tipo.
        
        Args:
            event_type: Tipo do evento
            callback: Função a ser chamada quando o evento ocorrer
            filters: Filtros para aplicar aos eventos
        """
        self.logger.debug(f"Inscrevendo callback para evento {event_type}")
        
        # Criar handler
        handler = EventHandler(callback, filters)
        
        # Adicionar à lista de subscribers
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        
        self.subscribers[event_type].append(handler)
    
    def unsubscribe(self, event_type: str, callback) -> bool:
        """
        Remove a inscrição de um callback para um determinado tipo de evento.
        
        Args:
            event_type: Tipo do evento
            callback: Função inscrita
            
        Returns:
            bool: True se a inscrição foi removida, False caso contrário
        """
        self.logger.debug(f"Removendo inscrição para evento {event_type}")
        
        # Verificar se há subscribers para este tipo de evento
        if event_type not in self.subscribers:
            return False
        
        # Encontrar e remover o handler
        for i, handler in enumerate(self.subscribers[event_type]):
            if handler.callback == callback:
                self.subscribers[event_type].pop(i)
                return True
        
        return False
    
    def get_subscribers(self, event_type: str = None) -> Dict[str, List[EventHandler]]:
        """
        Obtém os subscribers do barramento.
        
        Args:
            event_type: Tipo do evento (opcional)
            
        Returns:
            Dict: Dicionário de subscribers
        """
        if event_type:
            return {event_type: self.subscribers.get(event_type, [])}
        
        return self.subscribers

# Singleton para o barramento de eventos
_event_bus = None

def get_event_bus() -> EventBus:
    """
    Obtém a instância do barramento de eventos.
    
    Returns:
        EventBus: Instância do barramento de eventos
    """
    global _event_bus
    
    if _event_bus is None:
        _event_bus = EventBus()
    
    return _event_bus
