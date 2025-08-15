import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from ...core.events.event_bus import EventBus
from ...core.exceptions.base_exceptions import ResourceNotFoundException
from ..models.terminal_models import (
    OfflineOrder,
    TerminalConfig,
    TerminalSession,
    TerminalStatus,
)


class TerminalService:
    """Serviço para gerenciamento de terminais de pagamento."""

    def __init__(self):
        self.event_bus = EventBus()
        # Em um ambiente real, usaríamos um banco de dados
        # Por enquanto, usamos dicionários em memória para simplificar
        self._configs = {}
        self._sessions = {}
        self._offline_orders = {}

    async def get_terminal_configs(
        self, restaurant_id: str, store_id: str
    ) -> List[TerminalConfig]:
        """Obtém todas as configurações de terminais para um restaurante/loja."""
        return [
            config
            for config in self._configs.values()
            if config.restaurant_id == restaurant_id and config.store_id == store_id
        ]

    async def get_terminal_config(self, terminal_id: str) -> Optional[TerminalConfig]:
        """Obtém a configuração de um terminal específico."""
        return self._configs.get(terminal_id)

    async def create_terminal_config(self, config: TerminalConfig) -> TerminalConfig:
        """Cria uma nova configuração de terminal."""
        if not config.id:
            config.id = str(uuid.uuid4())

        config.created_at = datetime.now()
        config.updated_at = datetime.now()

        self._configs[config.id] = config

        # Publicar evento de criação
        await self.event_bus.publish(
            "terminal.config.created",
            {
                "terminal_id": config.id,
                "terminal_type": config.type,
                "restaurant_id": config.restaurant_id,
                "store_id": config.store_id,
            },
        )

        return config

    async def update_terminal_config(
        self, config: TerminalConfig
    ) -> Optional[TerminalConfig]:
        """Atualiza a configuração de um terminal."""
        if config.id not in self._configs:
            return None

        # Preservar a data de criação original
        config.created_at = self._configs[config.id].created_at
        config.updated_at = datetime.now()

        self._configs[config.id] = config

        # Publicar evento de atualização
        await self.event_bus.publish(
            "terminal.config.updated",
            {"terminal_id": config.id, "terminal_type": config.type},
        )

        return config

    async def delete_terminal_config(self, terminal_id: str) -> bool:
        """Remove a configuração de um terminal."""
        if terminal_id not in self._configs:
            return False

        del self._configs[terminal_id]

        # Publicar evento de remoção
        await self.event_bus.publish(
            "terminal.config.deleted", {"terminal_id": terminal_id}
        )

        return True

    async def create_terminal_session(
        self, terminal_id: str, waiter_id: str
    ) -> Optional[TerminalSession]:
        """Inicia uma nova sessão em um terminal."""
        if terminal_id not in self._configs:
            raise ResourceNotFoundException("Terminal", terminal_id)

        session_id = str(uuid.uuid4())
        now = datetime.now()

        session = TerminalSession(
            id=session_id,
            terminal_id=terminal_id,
            waiter_id=waiter_id,
            status=TerminalStatus.ONLINE,
            started_at=now,
            last_activity=now,
            last_sync=now,
            pending_orders=[],
            battery_level=None,
            signal_strength=None,
            metadata={},
        )

        self._sessions[session_id] = session

        # Publicar evento de início de sessão
        await self.event_bus.publish(
            "terminal.session.started",
            {
                "session_id": session_id,
                "terminal_id": terminal_id,
                "waiter_id": waiter_id,
            },
        )

        return session

    async def get_terminal_session(self, session_id: str) -> Optional[TerminalSession]:
        """Obtém os detalhes de uma sessão de terminal."""
        return self._sessions.get(session_id)

    async def update_terminal_status(
        self,
        session_id: str,
        status: TerminalStatus,
        battery_level: Optional[int] = None,
        signal_strength: Optional[int] = None,
    ) -> Optional[TerminalSession]:
        """Atualiza o status de um terminal."""
        if session_id not in self._sessions:
            return None

        session = self._sessions[session_id]
        session.status = status
        session.last_activity = datetime.now()

        if battery_level is not None:
            session.battery_level = battery_level

        if signal_strength is not None:
            session.signal_strength = signal_strength

        # Publicar evento de atualização de status
        await self.event_bus.publish(
            "terminal.status.updated",
            {
                "session_id": session_id,
                "terminal_id": session.terminal_id,
                "status": status.value,
                "battery_level": battery_level,
                "signal_strength": signal_strength,
            },
        )

        return session

    async def create_offline_order(self, order: OfflineOrder) -> OfflineOrder:
        """Registra um pedido criado em modo offline."""
        if not order.id:
            order.id = str(uuid.uuid4())

        order.created_at = datetime.now()

        self._offline_orders[order.id] = order

        # Adicionar à lista de pedidos pendentes da sessão
        for session in self._sessions.values():
            if session.terminal_id == order.terminal_id:
                session.pending_orders.append(order.id)
                break

        # Publicar evento de pedido offline
        await self.event_bus.publish(
            "terminal.offline_order.created",
            {
                "order_id": order.id,
                "terminal_id": order.terminal_id,
                "waiter_id": order.waiter_id,
                "table_id": order.table_id,
                "total": order.total,
            },
        )

        return order

    async def get_offline_orders(
        self, terminal_id: str, synced: Optional[bool] = None
    ) -> List[OfflineOrder]:
        """Obtém pedidos offline de um terminal."""
        orders = [
            order
            for order in self._offline_orders.values()
            if order.terminal_id == terminal_id
        ]

        if synced is not None:
            orders = [order for order in orders if order.synced == synced]

        return orders

    async def sync_terminal_data(
        self, terminal_id: str, session_id: str
    ) -> Dict[str, Any]:
        """Sincroniza dados entre o terminal e o servidor."""
        if terminal_id not in self._configs:
            raise ResourceNotFoundException("Terminal", terminal_id)

        if session_id not in self._sessions:
            raise ResourceNotFoundException("Sessão", session_id)

        session = self._sessions[session_id]

        # Atualizar timestamp de sincronização
        session.last_sync = datetime.now()

        # Processar pedidos offline pendentes
        synced_orders = []
        for order_id in session.pending_orders:
            if order_id in self._offline_orders:
                order = self._offline_orders[order_id]
                if not order.synced:
                    # Simular sincronização com o servidor
                    # Em um ambiente real, enviaríamos para o serviço de pedidos
                    order.synced = True
                    order.synced_at = datetime.now()
                    order.server_order_id = f"SERVER-{uuid.uuid4()}"
                    synced_orders.append(order)

        # Limpar pedidos sincronizados da lista de pendentes
        session.pending_orders = [
            order_id
            for order_id in session.pending_orders
            if order_id in self._offline_orders
            and not self._offline_orders[order_id].synced
        ]

        # Publicar evento de sincronização
        await self.event_bus.publish(
            "terminal.data.synced",
            {
                "session_id": session_id,
                "terminal_id": terminal_id,
                "synced_orders_count": len(synced_orders),
            },
        )

        # Retornar resultado da sincronização
        return {
            "success": True,
            "synced_at": session.last_sync.isoformat(),
            "synced_orders": len(synced_orders),
            "pending_orders": len(session.pending_orders),
            "terminal_status": session.status.value,
        }
