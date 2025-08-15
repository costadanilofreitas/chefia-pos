import logging
from datetime import datetime
from typing import List, Optional

from src.core.events.event_bus import Event, EventBus, EventType
from src.kds.models.kds_models import ItemStatus, KDSOrder
from src.peripherals.models.peripheral_models import CommandType

logger = logging.getLogger(__name__)


class KDSKeyboardHandler:
    """Manipulador de eventos de teclado para o KDS."""

    def __init__(self, event_bus: EventBus):
        """
        Inicializa o manipulador de eventos de teclado.

        Args:
            event_bus: Barramento de eventos do sistema
        """
        self.event_bus = event_bus
        self.current_order_index = 0
        self.current_item_index = 0
        self.orders: List[KDSOrder] = []  # Lista de pedidos ativos no KDS

        # Registrar handlers de eventos
        self.event_bus.subscribe(
            EventType.PERIPHERAL_KEYBOARD_COMMAND, self._handle_keyboard_command
        )
        self.event_bus.subscribe(
            EventType.KDS_ORDERS_UPDATED, self._handle_orders_updated
        )

    async def _handle_keyboard_command(self, event: Event):
        """
        Manipula eventos de comando de teclado.

        Args:
            event: Evento de comando de teclado
        """
        try:
            data = event.data
            command = data.get("command", "")
            device_id = data.get("device_id", "")

            logger.info(
                f"Comando de teclado recebido: {command} do dispositivo {device_id}"
            )

            # Processar comando com base no tipo
            if command == CommandType.NEXT_ORDER:
                await self._next_order()
            elif command == CommandType.PREVIOUS_ORDER:
                await self._previous_order()
            elif command == CommandType.NEXT_ITEM:
                await self._next_item()
            elif command == CommandType.PREVIOUS_ITEM:
                await self._previous_item()
            elif command == CommandType.ADVANCE_STATUS:
                await self._advance_status()
            elif command == CommandType.MARK_READY:
                await self._mark_ready()
            elif command == CommandType.MARK_ALL_READY:
                await self._mark_all_ready()
            elif command == CommandType.CANCEL_ITEM:
                await self._cancel_item()
            elif command == CommandType.PRINT_ORDER:
                await self._print_order()
            else:
                logger.warning(f"Comando desconhecido: {command}")

        except Exception as e:
            logger.error(f"Erro ao manipular comando de teclado: {e}")

    async def _handle_orders_updated(self, event: Event):
        """
        Manipula eventos de atualização de pedidos no KDS.

        Args:
            event: Evento de atualização de pedidos
        """
        try:
            data = event.data
            orders = data.get("orders", [])

            self.orders = orders

            # Ajustar índices se necessário
            if self.orders and self.current_order_index >= len(self.orders):
                self.current_order_index = len(self.orders) - 1

            if self.orders and self.current_order_index >= 0:
                current_order = self.orders[self.current_order_index]
                items = current_order.items if hasattr(current_order, "items") else []

                if items and self.current_item_index >= len(items):
                    self.current_item_index = len(items) - 1

            logger.debug(f"Lista de pedidos atualizada: {len(self.orders)} pedidos")

        except Exception as e:
            logger.error(f"Erro ao manipular atualização de pedidos: {e}")

    async def _next_order(self):
        """Navega para o próximo pedido."""
        if not self.orders:
            logger.info("Não há pedidos para navegar")
            return

        self.current_order_index = (self.current_order_index + 1) % len(self.orders)
        self.current_item_index = 0

        await self._highlight_current_selection()

        logger.info(
            f"Navegado para o pedido {self.current_order_index + 1} de {len(self.orders)}"
        )

    async def _previous_order(self):
        """Navega para o pedido anterior."""
        if not self.orders:
            logger.info("Não há pedidos para navegar")
            return

        self.current_order_index = (self.current_order_index - 1) % len(self.orders)
        self.current_item_index = 0

        await self._highlight_current_selection()

        logger.info(
            f"Navegado para o pedido {self.current_order_index + 1} de {len(self.orders)}"
        )

    async def _next_item(self):
        """Navega para o próximo item do pedido atual."""
        if not self.orders or self.current_order_index >= len(self.orders):
            logger.info("Não há pedido selecionado")
            return

        current_order = self.orders[self.current_order_index]
        items = current_order.get("items", [])

        if not items:
            logger.info("Não há itens no pedido atual")
            return

        self.current_item_index = (self.current_item_index + 1) % len(items)

        await self._highlight_current_selection()

        logger.info(
            f"Navegado para o item {self.current_item_index + 1} de {len(items)}"
        )

    async def _previous_item(self):
        """Navega para o item anterior do pedido atual."""
        if not self.orders or self.current_order_index >= len(self.orders):
            logger.info("Não há pedido selecionado")
            return

        current_order = self.orders[self.current_order_index]
        items = current_order.get("items", [])

        if not items:
            logger.info("Não há itens no pedido atual")
            return

        self.current_item_index = (self.current_item_index - 1) % len(items)

        await self._highlight_current_selection()

        logger.info(
            f"Navegado para o item {self.current_item_index + 1} de {len(items)}"
        )

    async def _advance_status(self):
        """Avança o status do item atual."""
        if not self.orders or self.current_order_index >= len(self.orders):
            logger.info("Não há pedido selecionado")
            return

        current_order = self.orders[self.current_order_index]
        items = current_order.get("items", [])

        if not items or self.current_item_index >= len(items):
            logger.info("Não há item selecionado")
            return

        current_item = items[self.current_item_index]
        item_id = current_item.get("id")
        current_status = current_item.get("status")

        # Determinar próximo status
        next_status = self._get_next_status(current_status)

        if next_status:
            # Publicar evento de atualização de status
            await self.event_bus.publish(
                "kds.item_status_changed",
                Event(
                    data={
                        "order_id": current_order.get("id"),
                        "item_id": item_id,
                        "status": next_status,
                        "previous_status": current_status,
                        "updated_by": "keyboard",
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
            )

            logger.info(
                f"Status do item {item_id} atualizado: {current_status} -> {next_status}"
            )
        else:
            logger.info(
                f"Não é possível avançar o status do item {item_id} (status atual: {current_status})"
            )

    async def _mark_ready(self):
        """Marca o item atual como pronto."""
        if not self.orders or self.current_order_index >= len(self.orders):
            logger.info("Não há pedido selecionado")
            return

        current_order = self.orders[self.current_order_index]
        items = current_order.get("items", [])

        if not items or self.current_item_index >= len(items):
            logger.info("Não há item selecionado")
            return

        current_item = items[self.current_item_index]
        item_id = current_item.get("id")
        current_status = current_item.get("status")

        # Publicar evento de atualização de status
        await self.event_bus.publish(
            "kds.item_status_changed",
            Event(
                data={
                    "order_id": current_order.get("id"),
                    "item_id": item_id,
                    "status": ItemStatus.READY,
                    "previous_status": current_status,
                    "updated_by": "keyboard",
                    "timestamp": datetime.now().isoformat(),
                }
            ),
        )

        logger.info(f"Item {item_id} marcado como pronto")

    async def _mark_all_ready(self):
        """Marca todos os itens do pedido atual como prontos."""
        if not self.orders or self.current_order_index >= len(self.orders):
            logger.info("Não há pedido selecionado")
            return

        current_order = self.orders[self.current_order_index]
        items = current_order.get("items", [])

        if not items:
            logger.info("Não há itens no pedido atual")
            return

        # Publicar eventos de atualização de status para todos os itens
        for item in items:
            item_id = item.get("id")
            current_status = item.get("status")

            # Apenas atualizar itens que não estão prontos ou entregues
            if current_status not in [ItemStatus.READY, ItemStatus.DELIVERED]:
                await self.event_bus.publish(
                    "kds.item_status_changed",
                    Event(
                        data={
                            "order_id": current_order.get("id"),
                            "item_id": item_id,
                            "status": ItemStatus.READY,
                            "previous_status": current_status,
                            "updated_by": "keyboard",
                            "timestamp": datetime.now().isoformat(),
                        }
                    ),
                )

        logger.info(
            f"Todos os itens do pedido {current_order.get('id')} marcados como prontos"
        )

    async def _cancel_item(self):
        """Cancela o item atual."""
        if not self.orders or self.current_order_index >= len(self.orders):
            logger.info("Não há pedido selecionado")
            return

        current_order = self.orders[self.current_order_index]
        items = current_order.get("items", [])

        if not items or self.current_item_index >= len(items):
            logger.info("Não há item selecionado")
            return

        current_item = items[self.current_item_index]
        item_id = current_item.get("id")
        current_status = current_item.get("status")

        # Publicar evento de atualização de status
        await self.event_bus.publish(
            "kds.item_status_changed",
            Event(
                data={
                    "order_id": current_order.get("id"),
                    "item_id": item_id,
                    "status": ItemStatus.CANCELLED,
                    "previous_status": current_status,
                    "updated_by": "keyboard",
                    "timestamp": datetime.now().isoformat(),
                }
            ),
        )

        logger.info(f"Item {item_id} cancelado")

    async def _print_order(self):
        """Imprime o pedido atual."""
        if not self.orders or self.current_order_index >= len(self.orders):
            logger.info("Não há pedido selecionado")
            return

        current_order = self.orders[self.current_order_index]
        order_id = current_order.get("id")

        # Publicar evento de impressão
        await self.event_bus.publish(
            "kds.print_order",
            Event(data={"order_id": order_id, "timestamp": datetime.now().isoformat()}),
        )

        logger.info(f"Pedido {order_id} enviado para impressão")

    async def _highlight_current_selection(self):
        """Destaca a seleção atual na interface do KDS."""
        if not self.orders or self.current_order_index >= len(self.orders):
            return

        current_order = self.orders[self.current_order_index]
        order_id = current_order.get("id")

        item_id = None
        if current_order.get("items") and self.current_item_index < len(
            current_order.get("items")
        ):
            item_id = current_order.get("items")[self.current_item_index].get("id")

        # Publicar evento de destaque
        await self.event_bus.publish(
            "kds.highlight_selection",
            Event(
                data={
                    "order_id": order_id,
                    "item_id": item_id,
                    "timestamp": datetime.now().isoformat(),
                }
            ),
        )

    def _get_next_status(self, current_status: str) -> Optional[str]:
        """
        Determina o próximo status com base no status atual.

        Args:
            current_status: Status atual

        Returns:
            str: Próximo status ou None se não houver próximo status
        """
        status_flow = {
            ItemStatus.PENDING.value: ItemStatus.PREPARING.value,
            ItemStatus.PREPARING.value: ItemStatus.READY.value,
            ItemStatus.READY.value: ItemStatus.DELIVERED.value,
        }

        return status_flow.get(current_status)


# Singleton para o manipulador de eventos de teclado do KDS
_kds_keyboard_handler = None


def get_kds_keyboard_handler(event_bus=None) -> KDSKeyboardHandler:
    """
    Obtém a instância do manipulador de eventos de teclado do KDS.

    Args:
        event_bus: Barramento de eventos (opcional)

    Returns:
        KDSKeyboardHandler: Instância do manipulador de eventos de teclado do KDS
    """
    global _kds_keyboard_handler

    if _kds_keyboard_handler is None:
        from src.core.events.event_bus import get_event_bus

        _event_bus = event_bus or get_event_bus()
        _kds_keyboard_handler = KDSKeyboardHandler(_event_bus)

    return _kds_keyboard_handler
