import logging
import threading
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import Depends

from ...core.events.event_bus import Event, EventBus
from ..events.peripheral_events import (
    KeyboardEventData,
)
from ..models.peripheral_models import CommandType, PeripheralType
from ..services.peripheral_db_service import PeripheralDBService, get_peripheral_service

logger = logging.getLogger(__name__)


class KeyboardDBManager:
    """Database-backed keyboard manager for the POS system."""

    def __init__(self, event_bus: EventBus, peripheral_service: PeripheralDBService):
        """
        Initialize the keyboard manager.

        Args:
            event_bus: System event bus
            peripheral_service: Database peripheral service
        """
        self.event_bus = event_bus
        self.peripheral_service = peripheral_service
        self.active_keyboards: Dict[str, Any] = (
            {}
        )  # Will be populated with detected keyboards
        self.running = False
        self.threads: List[Any] = []

        # Register event handlers
        from ...core.events.event_bus import EventType

        self.event_bus.subscribe(
            EventType.ORDER_STATUS_CHANGED, self._handle_order_status_changed
        )

    async def initialize(self):
        """Initialize keyboard configurations from database."""
        try:
            # Load keyboard configurations from database
            keyboard_configs = await self.peripheral_service.get_keyboard_configs()

            logger.info(
                f"Configurações de teclado carregadas: {len(keyboard_configs)} dispositivos"
            )

            # Initialize active keyboards
            for config in keyboard_configs:
                if config.get("active", False):
                    self.active_keyboards[config["id"]] = config

        except Exception as e:
            logger.error(f"Erro ao carregar configurações de teclado: {e}")

    async def create_default_keyboards(self):
        """Create default keyboard configurations if none exist."""
        try:
            # Check if any keyboard configs exist
            existing_configs = await self.peripheral_service.get_keyboard_configs()
            if existing_configs:
                logger.info("Configurações de teclado já existem, não criando padrões")
                return

            # Create standard keyboard peripheral
            standard_peripheral = await self.peripheral_service.create_peripheral(
                peripheral_id="keyboard_standard_1",
                name="Standard Keyboard",
                peripheral_type=PeripheralType.KEYBOARD,
                config={
                    "enabled": True,
                    "device_path": "/dev/input/event0",
                    "capabilities": ["KEY"],
                },
                connection_type="usb",
                connection_params={"device_path": "/dev/input/event0"},
            )

            # Create keyboard configuration
            keyboard_config = self.peripheral_service.repository.create_keyboard_config(
                config_id="keyboard_standard_1",
                peripheral_id=str(standard_peripheral.id),
                name="Standard Keyboard",
                description="Teclado padrão para operações do KDS",
                device_type="standard_keyboard",
                device_path="/dev/input/event0",
                capabilities=["KEY"],
            )

            # Create default key mappings
            default_mappings = self._get_default_key_mappings()
            self.peripheral_service.repository.update_key_mappings(
                str(keyboard_config.id), default_mappings
            )

            # Create numeric keypad peripheral
            numeric_peripheral = await self.peripheral_service.create_peripheral(
                peripheral_id="keyboard_numeric_1",
                name="Numeric Keypad",
                peripheral_type=PeripheralType.KEYBOARD,
                config={
                    "enabled": True,
                    "device_path": "/dev/input/event1",
                    "capabilities": ["KEY"],
                },
                connection_type="usb",
                connection_params={"device_path": "/dev/input/event1"},
            )

            # Create numeric keyboard configuration
            numeric_config = self.peripheral_service.repository.create_keyboard_config(
                config_id="keyboard_numeric_1",
                peripheral_id=str(numeric_peripheral.id),
                name="Numeric Keypad",
                description="Teclado numérico para operações rápidas do KDS",
                device_type="numeric_keypad",
                device_path="/dev/input/event1",
                capabilities=["KEY"],
            )

            # Create numeric key mappings
            numeric_mappings = self._get_numeric_key_mappings()
            self.peripheral_service.repository.update_key_mappings(
                str(numeric_config.id), numeric_mappings
            )

            logger.info("Configurações padrão de teclado criadas")

        except Exception as e:
            logger.error(f"Erro ao criar configurações padrão de teclado: {e}")

    def start(self):
        """Start keyboard monitoring."""
        if self.running:
            logger.info("Gerenciador de teclados já está em execução")
            return

        self.running = True

        # Start monitoring threads for active keyboards
        for keyboard_id, config in self.active_keyboards.items():
            thread = threading.Thread(
                target=self._monitor_keyboard, args=(keyboard_id, config), daemon=True
            )
            thread.start()
            self.threads.append(thread)

        logger.info(
            f"Monitoramento de teclados iniciado. {len(self.active_keyboards)} dispositivos ativos."
        )

    def stop(self):
        """Stop keyboard monitoring."""
        if not self.running:
            logger.info("Gerenciador de teclados já está parado")
            return

        self.running = False

        # Wait for threads to terminate
        for thread in self.threads:
            thread.join(timeout=1.0)

        self.threads = []
        logger.info("Monitoramento de teclados parado.")

    def _get_default_key_mappings(self) -> Dict[str, str]:
        """Return default key mappings for commands."""
        return {
            "KEY_F1": CommandType.NEXT_ORDER,
            "KEY_F2": CommandType.PREVIOUS_ORDER,
            "KEY_F3": CommandType.NEXT_ITEM,
            "KEY_F4": CommandType.PREVIOUS_ITEM,
            "KEY_F5": CommandType.ADVANCE_STATUS,
            "KEY_F6": CommandType.MARK_READY,
            "KEY_F7": CommandType.MARK_ALL_READY,
            "KEY_F8": CommandType.CANCEL_ITEM,
            "KEY_F9": CommandType.PRINT_ORDER,
            "KEY_SPACE": CommandType.ADVANCE_STATUS,
        }

    def _get_numeric_key_mappings(self) -> Dict[str, str]:
        """Return numeric keypad key mappings."""
        return {
            "KEY_1": CommandType.NEXT_ORDER,
            "KEY_2": CommandType.PREVIOUS_ORDER,
            "KEY_3": CommandType.NEXT_ITEM,
            "KEY_4": CommandType.PREVIOUS_ITEM,
            "KEY_5": CommandType.ADVANCE_STATUS,
            "KEY_6": CommandType.MARK_READY,
            "KEY_7": CommandType.MARK_ALL_READY,
            "KEY_8": CommandType.CANCEL_ITEM,
            "KEY_9": CommandType.PRINT_ORDER,
            "KEY_0": CommandType.ADVANCE_STATUS,
            "KEY_ENTER": CommandType.MARK_READY,
        }

    def _monitor_keyboard(self, keyboard_id: str, config: Dict[str, Any]):
        """
        Monitor events from a keyboard device.

        Args:
            keyboard_id: Keyboard ID
            config: Keyboard configuration
        """
        logger.info(
            f"Iniciando monitoramento do teclado: {config['name']} ({keyboard_id})"
        )

        try:
            # Get key mappings
            key_mappings = config.get("key_mappings", {})

            # In a real environment, we would monitor device events
            # For this example, we'll simulate periodic events
            while self.running:
                # Simulate event every 10 seconds for demonstration
                time.sleep(10)

                # Choose a random command to simulate
                import random

                key_codes = list(key_mappings.keys())
                if key_codes:
                    key_code = random.choice(key_codes)
                    command = key_mappings[key_code]

                    logger.debug(f"Simulando evento de tecla: {key_code} -> {command}")
                    self._process_command(command, keyboard_id)

        except Exception as e:
            logger.error(f"Erro ao monitorar teclado {keyboard_id}: {e}")
            # Try to reconnect
            self._reconnect_keyboard(keyboard_id)

    def _reconnect_keyboard(self, keyboard_id: str):
        """
        Try to reconnect a keyboard device.

        Args:
            keyboard_id: Keyboard ID
        """
        try:
            logger.info(f"Tentando reconectar teclado {keyboard_id}")

            # Reload configuration from database
            keyboard_config = None
            try:
                # Run async function in sync context (not ideal, but works for this case)
                import asyncio

                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                keyboard_config = loop.run_until_complete(
                    self.peripheral_service.get_keyboard_config(keyboard_id)
                )
                loop.close()
            except Exception as e:
                logger.error(f"Erro ao recarregar configuração: {e}")
                return

            if keyboard_config and keyboard_config.get("active", False):
                # Update active keyboards
                self.active_keyboards[keyboard_id] = keyboard_config

                # Restart monitoring
                thread = threading.Thread(
                    target=self._monitor_keyboard,
                    args=(keyboard_id, keyboard_config),
                    daemon=True,
                )
                thread.start()
                self.threads.append(thread)

                logger.info(f"Teclado {keyboard_id} reconectado com sucesso.")
            else:
                logger.warning(
                    f"Teclado {keyboard_id} não está mais ativo ou não foi encontrado."
                )

        except Exception as e:
            logger.error(f"Erro ao reconectar teclado {keyboard_id}: {e}")

    def _process_command(self, command: str, keyboard_id: str):
        """
        Process a keyboard command.

        Args:
            command: Command to process
            keyboard_id: Keyboard that generated the command
        """
        logger.info(f"Processando comando: {command} do teclado {keyboard_id}")

        try:
            # Create event data
            event_data = KeyboardEventData(
                command=command,
                device_id=keyboard_id,
                timestamp=datetime.now().isoformat(),
            )

            # Publish event to bus
            import asyncio

            from ...core.events.event_bus import Event, EventType

            asyncio.create_task(
                self.event_bus.publish(
                    Event(
                        event_type=EventType.PERIPHERAL_KEYBOARD_COMMAND,
                        data=event_data.to_dict(),
                    )
                )
            )

            # Log event to database
            import asyncio

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(
                self.peripheral_service._log_event(
                    keyboard_id, "keyboard_command", f"Comando executado: {command}"
                )
            )
            loop.close()

            logger.info(f"Comando {command} processado com sucesso.")
        except Exception as e:
            logger.error(f"Erro ao processar comando {command}: {e}")

    def _handle_order_status_changed(self, event: Event):
        """
        Handle order status change events.

        Args:
            event: Status change event
        """
        try:
            data = event.data
            order_id = data.get("order_id")
            status = data.get("status")

            logger.debug(
                f"Evento de mudança de status recebido: Pedido {order_id} -> {status}"
            )

            # Here we could implement specific logic for visual or audio feedback
            # when an order status changes

        except Exception as e:
            logger.error(f"Erro ao manipular evento de mudança de status: {e}")

    async def get_keyboards(self) -> List[Dict[str, Any]]:
        """
        Return list of available keyboards.

        Returns:
            List: List of keyboards
        """
        return await self.peripheral_service.get_keyboard_configs()

    async def get_keyboard_config(self, keyboard_id: str) -> Optional[Dict[str, Any]]:
        """
        Return configuration of a keyboard.

        Args:
            keyboard_id: Keyboard ID

        Returns:
            Dict: Keyboard configuration or None if not found
        """
        return await self.peripheral_service.get_keyboard_config(keyboard_id)

    async def update_keyboard_config(
        self, keyboard_id: str, config: Dict[str, Any]
    ) -> bool:
        """
        Update keyboard configuration.

        Args:
            keyboard_id: Keyboard ID
            config: New configuration

        Returns:
            bool: True if update was successful
        """
        try:
            updated_config = await self.peripheral_service.update_keyboard_config(
                keyboard_id, config
            )

            if updated_config:
                # Update active keyboards if this one is active
                if keyboard_id in self.active_keyboards:
                    self.active_keyboards[keyboard_id] = updated_config

                return True
            return False

        except Exception as e:
            logger.error(
                f"Erro ao atualizar configuração do teclado {keyboard_id}: {e}"
            )
            return False


# Dependency function to get keyboard manager
_keyboard_manager = None


def get_keyboard_manager(
    event_bus=None,
    peripheral_service: PeripheralDBService = Depends(get_peripheral_service),
) -> KeyboardDBManager:
    """
    Get keyboard manager instance.

    Args:
        event_bus: Event bus (optional)
        peripheral_service: Peripheral service

    Returns:
        KeyboardDBManager: Keyboard manager instance
    """
    global _keyboard_manager

    if _keyboard_manager is None:
        from ...core.events.event_bus import get_event_bus

        _event_bus = event_bus or get_event_bus()
        _keyboard_manager = KeyboardDBManager(_event_bus, peripheral_service)

    return _keyboard_manager
