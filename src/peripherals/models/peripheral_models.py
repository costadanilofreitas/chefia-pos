from enum import Enum
from typing import Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

class PeripheralType(str, Enum):
    """Tipos de periféricos suportados pelo sistema."""
    KEYBOARD = "keyboard"
    BARCODE_SCANNER = "barcode_scanner"
    PRINTER = "printer"
    CASH_DRAWER = "cash_drawer"
    CARD_READER = "card_reader"
    CUSTOMER_DISPLAY = "customer_display"
    SCALE = "scale"
    CUSTOM = "custom"

class PeripheralStatus(str, Enum):
    """Status possíveis para um periférico."""
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    BUSY = "busy"
    IDLE = "idle"

class KeyboardConfig(BaseModel):
    """Configuração para teclados físicos."""
    id: str
    name: str
    description: str
    device_type: str  # "standard_keyboard", "numeric_keypad", "custom_device"
    key_mappings: Dict[str, str]  # Mapeamento de teclas para comandos
    active: bool
    created_at: datetime
    updated_at: datetime

class KeyMapping(BaseModel):
    """Mapeamento de teclas para comandos."""
    key_code: str  # Código da tecla (ex: "F1", "NUMPAD_1")
    command: str  # Comando associado (ex: "next_order", "advance_status")
    params: Optional[Dict[str, Any]] = None  # Parâmetros adicionais para o comando

class CommandType(str, Enum):
    """Tipos de comandos disponíveis para mapeamento de teclas."""
    NEXT_ORDER = "next_order"
    PREVIOUS_ORDER = "previous_order"
    NEXT_ITEM = "next_item"
    PREVIOUS_ITEM = "previous_item"
    ADVANCE_STATUS = "advance_status"
    MARK_READY = "mark_ready"
    MARK_ALL_READY = "mark_all_ready"
    CANCEL_ITEM = "cancel_item"
    PRINT_ORDER = "print_order"

class Peripheral(BaseModel):
    """Modelo base para periféricos."""
    id: str
    name: str
    type: PeripheralType
    status: PeripheralStatus
    config: Dict[str, Any]
    last_connected: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
