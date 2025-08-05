from enum import Enum
from typing import Dict, Any, Optional


class PeripheralEventType(str, Enum):
    """Tipos de eventos relacionados a periféricos."""

    CONNECTED = "peripheral.connected"
    DISCONNECTED = "peripheral.disconnected"
    ERROR = "peripheral.error"
    STATUS_CHANGED = "peripheral.status_changed"
    KEYBOARD_COMMAND = "peripheral.keyboard.command"
    BARCODE_SCANNED = "peripheral.barcode.scanned"
    PRINTER_STATUS = "peripheral.printer.status"
    CASH_DRAWER_STATUS = "peripheral.cash_drawer.status"
    CARD_READER_STATUS = "peripheral.card_reader.status"
    CUSTOM_EVENT = "peripheral.custom"


class KeyboardEventData:
    """Dados para eventos de teclado."""

    def __init__(
        self,
        command: str,
        device_id: str,
        timestamp: str,
        params: Optional[Dict[str, Any]] = None,
    ):
        self.command = command
        self.device_id = device_id
        self.timestamp = timestamp
        self.params = params or {}

    def to_dict(self) -> Dict[str, Any]:
        """Converte o objeto para dicionário."""
        return {
            "command": self.command,
            "device_id": self.device_id,
            "timestamp": self.timestamp,
            "params": self.params,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "KeyboardEventData":
        """Cria um objeto a partir de um dicionário."""
        return cls(
            command=data.get("command", ""),
            device_id=data.get("device_id", ""),
            timestamp=data.get("timestamp", ""),
            params=data.get("params", {}),
        )
