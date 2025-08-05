from typing import Dict, Any, List, Optional, Callable
import logging
from .event_bus import Event, get_event_bus, EventType

class EventMonitor:
    """
    Monitor para capturar e armazenar eventos do barramento.
    Permite monitorar eventos em tempo real e consultar histórico.
    """
    
    def __init__(self, max_history_size: int = 1000):
        """
        Inicializa o monitor de eventos.
        
        Args:
            max_history_size: Tamanho máximo do histórico de eventos
        """
        self.event_bus = get_event_bus()
        self.max_history_size = max_history_size
        self.event_history = []
        self.subscribers = []
        self.logger = logging.getLogger(__name__)
        self.is_monitoring = False
        
    async def start_monitoring(self) -> None:
        """
        Inicia o monitoramento de eventos.
        Assina todos os tipos de eventos definidos no EventType.
        """
        if self.is_monitoring:
            return
            
        self.logger.info("Iniciando monitoramento de eventos")
        self.is_monitoring = True
        
        # Assinar todos os tipos de eventos
        for event_type in EventType:
            self.event_bus.subscribe(event_type.value, self._handle_event)
            
        self.logger.debug(f"Monitor assinado para {len(EventType)} tipos de eventos")
        
    async def stop_monitoring(self) -> None:
        """
        Para o monitoramento de eventos.
        Remove as assinaturas do barramento.
        """
        if not self.is_monitoring:
            return
            
        self.logger.info("Parando monitoramento de eventos")
        self.is_monitoring = False
        
        # Cancelar assinaturas
        for event_type in EventType:
            self.event_bus.unsubscribe(event_type.value, self._handle_event)
            
        self.logger.debug("Monitor desassinado de todos os tipos de eventos")
        
    async def _handle_event(self, event: Event) -> None:
        """
        Manipula um evento recebido do barramento.
        Armazena no histórico e notifica subscribers.
        
        Args:
            event: Evento recebido
        """
        # Adicionar ao histórico
        self.event_history.append(event)
        
        # Limitar tamanho do histórico
        if len(self.event_history) > self.max_history_size:
            self.event_history = self.event_history[-self.max_history_size:]
            
        # Notificar subscribers
        for callback in self.subscribers:
            try:
                await callback(event)
            except Exception as e:
                self.logger.error(f"Erro ao notificar subscriber do monitor: {str(e)}")
                
    def subscribe(self, callback: Callable[[Event], None]) -> None:
        """
        Adiciona um subscriber para receber eventos em tempo real.
        
        Args:
            callback: Função a ser chamada quando um evento for capturado
        """
        if callback not in self.subscribers:
            self.subscribers.append(callback)
            self.logger.debug(f"Novo subscriber adicionado ao monitor. Total: {len(self.subscribers)}")
            
    def unsubscribe(self, callback: Callable[[Event], None]) -> bool:
        """
        Remove um subscriber.
        
        Args:
            callback: Função inscrita
            
        Returns:
            bool: True se o subscriber foi removido, False caso contrário
        """
        if callback in self.subscribers:
            self.subscribers.remove(callback)
            self.logger.debug(f"Subscriber removido do monitor. Restantes: {len(self.subscribers)}")
            return True
        return False
        
    def get_event_history(self, 
                         limit: int = None, 
                         event_type: str = None, 
                         start_time: str = None,
                         end_time: str = None,
                         filters: Dict[str, Any] = None) -> List[Event]:
        """
        Obtém o histórico de eventos com filtros opcionais.
        
        Args:
            limit: Limite de eventos a retornar
            event_type: Filtrar por tipo de evento
            start_time: Timestamp inicial (formato ISO)
            end_time: Timestamp final (formato ISO)
            filters: Filtros adicionais para dados ou metadados
            
        Returns:
            List[Event]: Lista de eventos filtrados
        """
        filtered_events = self.event_history
        
        # Filtrar por tipo de evento
        if event_type:
            filtered_events = [
                e for e in filtered_events 
                if e.metadata.get("event_type") == event_type
            ]
            
        # Filtrar por timestamp
        if start_time:
            filtered_events = [
                e for e in filtered_events 
                if e.timestamp >= start_time
            ]
            
        if end_time:
            filtered_events = [
                e for e in filtered_events 
                if e.timestamp <= end_time
            ]
            
        # Aplicar filtros adicionais
        if filters:
            for key, value in filters.items():
                if key.startswith("data."):
                    data_key = key[5:]
                    filtered_events = [
                        e for e in filtered_events 
                        if data_key in e.data and e.data[data_key] == value
                    ]
                elif key.startswith("metadata."):
                    metadata_key = key[9:]
                    filtered_events = [
                        e for e in filtered_events 
                        if metadata_key in e.metadata and e.metadata[metadata_key] == value
                    ]
                    
        # Aplicar limite
        if limit and limit > 0:
            filtered_events = filtered_events[-limit:]
            
        return filtered_events
        
    def clear_history(self) -> None:
        """Limpa o histórico de eventos."""
        self.event_history = []
        self.logger.info("Histórico de eventos limpo")
        
    def get_event_types_count(self) -> Dict[str, int]:
        """
        Obtém contagem de eventos por tipo.
        
        Returns:
            Dict[str, int]: Dicionário com contagem por tipo
        """
        counts = {}
        for event in self.event_history:
            event_type = event.metadata.get("event_type")
            if event_type:
                counts[event_type] = counts.get(event_type, 0) + 1
        return counts
        
    def get_event_by_id(self, event_id: str) -> Optional[Event]:
        """
        Busca um evento pelo ID.
        
        Args:
            event_id: ID do evento
            
        Returns:
            Optional[Event]: Evento encontrado ou None
        """
        for event in self.event_history:
            if event.id == event_id:
                return event
        return None

# Singleton para o monitor de eventos
_event_monitor = None

def get_event_monitor() -> EventMonitor:
    """
    Obtém a instância do monitor de eventos.
    
    Returns:
        EventMonitor: Instância do monitor de eventos
    """
    global _event_monitor
    
    if _event_monitor is None:
        _event_monitor = EventMonitor()
    
    return _event_monitor
