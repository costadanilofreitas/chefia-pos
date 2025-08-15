from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

from pydantic import BaseModel


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
    ONLINE = "online"
    OFFLINE = "offline"
    ERROR = "error"
    BUSY = "busy"
    IDLE = "idle"
    WARNING = "warning"
    UNKNOWN = "unknown"


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


class PeripheralConfig(BaseModel):
    """Configuração de periférico."""

    id: str
    type: str
    driver: str
    name: str
    device_path: Optional[str] = None
    address: Optional[str] = None
    options: Dict[str, Any] = {}


class PrinterConfig(BaseModel):
    """Configuração específica para impressoras."""

    id: str
    type: str
    driver: str
    name: str
    device_path: Optional[str] = None
    address: Optional[str] = None
    options: Dict[str, Any] = {}


class Printer(BaseModel):
    """Modelo para impressoras."""

    id: str
    name: str
    type: PeripheralType
    status: PeripheralStatus
    config: Dict[str, Any]
    last_connected: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    async def print(
        self, content: str, options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Método de impressão."""
        return {"success": True, "message": "Print completed"}

    async def initialize(self) -> bool:
        """Inicializa a impressora."""
        return True

    async def shutdown(self) -> bool:
        """Finaliza a impressora."""
        return True

    async def get_status(self) -> Dict[str, Any]:
        """Retorna o status da impressora."""
        return {
            "status": self.status,
            "type": self.type,
            "name": self.name,
            "config": self.config,
        }


class BasePeripheralDriver:
    """Classe base para drivers de periféricos."""

    def __init__(self, config: PeripheralConfig):
        self.config = config
        self.id = config.id
        self.name = config.name
        self.type = config.type
        self.driver = config.driver
        self.status = PeripheralStatus.DISCONNECTED
        self.connected = False
        self.last_error: Optional[str] = None
        self.status_callback: Optional[Callable] = None

    async def initialize(self) -> bool:
        """Inicializa o periférico."""
        raise NotImplementedError

    async def shutdown(self) -> bool:
        """Finaliza o periférico."""
        raise NotImplementedError

    async def get_status(self) -> Dict[str, Any]:
        """Retorna o status atual do periférico."""
        return {
            "status": self.status,
            "connected": self.connected,
            "last_error": self.last_error,
            "type": self.type,
            "driver": self.driver,
        }

    def register_status_callback(self, callback: Callable) -> None:
        """Registra um callback para mudanças de status."""
        self.status_callback = callback

    async def update_status(
        self, status: PeripheralStatus, error_message: Optional[str] = None
    ) -> None:
        """Atualiza o status do periférico."""
        self.status = status
        if error_message:
            self.last_error = error_message

        # Chamar callback se registrado
        if self.status_callback:
            try:
                await self.status_callback(self.id, status, error_message)
            except Exception:
                pass  # Ignorar erros no callback

    # Métodos específicos de periféricos - implementações padrão
    async def print(
        self, content: str, options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Imprime conteúdo (para impressoras)."""
        raise NotImplementedError(f"Método print não implementado para {self.type}")

    async def open(self, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Abre gaveta (para gavetas de dinheiro)."""
        raise NotImplementedError(f"Método open não implementado para {self.type}")

    async def process_payment(
        self, amount: float, options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Processa pagamento (para terminais de pagamento)."""
        raise NotImplementedError(
            f"Método process_payment não implementado para {self.type}"
        )

    async def cancel_transaction(
        self, options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Cancela transação (para terminais de pagamento)."""
        raise NotImplementedError(
            f"Método cancel_transaction não implementado para {self.type}"
        )

    async def read(self, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Lê dados (para leitores de código de barras, etc)."""
        raise NotImplementedError(f"Método read não implementado para {self.type}")


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

    # Add methods that drivers expect
    async def initialize(self) -> bool:
        """Inicializa o periférico."""
        return True

    async def shutdown(self) -> bool:
        """Finaliza o periférico."""
        return True

    async def get_status(self) -> Dict[str, Any]:
        """Retorna o status atual do periférico."""
        return {
            "status": self.status,
            "type": self.type,
            "name": self.name,
            "config": self.config,
        }

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return self.dict()

    async def print(
        self, content: str, options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Método de impressão para compatibilidade."""
        return {"success": True, "message": "Print method not implemented"}

    @property
    def name_attr(self) -> str:
        """Propriedade de compatibilidade para name."""
        return self.name


# PIX Reader Models
class PixReaderConfig(BaseModel):
    """Configuração para leitor PIX."""

    id: str
    name: str
    device_path: Optional[str] = None
    baudrate: int = 9600
    timeout: float = 1.0
    options: Dict[str, Any] = {}


class PixReader(BaseModel):
    """Modelo para leitor PIX."""

    id: str
    name: str
    type: PeripheralType = PeripheralType.CARD_READER
    status: PeripheralStatus
    config: PixReaderConfig
    last_connected: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# Payment Terminal Models
class PaymentTerminalConfig(BaseModel):
    """Configuração para terminal de pagamento."""

    id: str
    name: str
    host: str
    port: int
    timeout: float = 30.0
    options: Dict[str, Any] = {}


class PaymentTerminal(BaseModel):
    """Modelo para terminal de pagamento."""

    id: str
    name: str
    type: PeripheralType = PeripheralType.CARD_READER
    status: PeripheralStatus
    config: PaymentTerminalConfig
    last_connected: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# CUPS Printer Models
class ConventionalPrinterConfig(BaseModel):
    """Configuração para impressora convencional."""

    id: str
    name: str
    printer_name: str
    options: Dict[str, Any] = {}


class ConventionalPrinter(BaseModel):
    """Modelo para impressora convencional."""

    id: str
    name: str
    type: PeripheralType = PeripheralType.PRINTER
    status: PeripheralStatus
    config: ConventionalPrinterConfig
    last_connected: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# Cash Drawer Models
class CashDrawerConfig(BaseModel):
    """Configuração para gaveta de dinheiro."""

    id: str
    name: str
    device_path: Optional[str] = None
    open_command: str = "\\x1B\\x70\\x00\\x19\\xFA"
    options: Dict[str, Any] = {}


class CashDrawer(BaseModel):
    """Modelo para gaveta de dinheiro."""

    id: str
    name: str
    type: PeripheralType = PeripheralType.CASH_DRAWER
    status: PeripheralStatus
    config: CashDrawerConfig
    last_connected: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# Customer Display Models
class CustomerDisplayConfig(BaseModel):
    """Configuração para display do cliente."""

    id: str
    name: str
    device_path: Optional[str] = None
    baudrate: int = 9600
    lines: int = 2
    columns: int = 20
    options: Dict[str, Any] = {}


class CustomerDisplay(BaseModel):
    """Modelo para display do cliente."""

    id: str
    name: str
    type: PeripheralType = PeripheralType.CUSTOMER_DISPLAY
    status: PeripheralStatus
    config: CustomerDisplayConfig
    last_connected: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# Scale Models
class ScaleConfig(BaseModel):
    """Configuração para balança."""

    id: str
    name: str
    device_path: Optional[str] = None
    baudrate: int = 9600
    protocol: str = "toledo"
    options: Dict[str, Any] = {}


class Scale(BaseModel):
    """Modelo para balança."""

    id: str
    name: str
    type: PeripheralType = PeripheralType.SCALE
    status: PeripheralStatus
    config: ScaleConfig
    last_connected: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# Thermal Printer Models
class ThermalPrinterConfig(BaseModel):
    """Configuração para impressora térmica."""

    id: str
    name: str
    device_path: Optional[str] = None
    baudrate: int = 9600
    char_set: str = "cp850"
    cut_paper: bool = True
    options: Dict[str, Any] = {}


class ThermalPrinter(BaseModel):
    """Modelo para impressora térmica."""

    id: str
    name: str
    type: PeripheralType = PeripheralType.PRINTER
    status: PeripheralStatus
    config: ThermalPrinterConfig
    last_connected: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# Barcode Scanner Models
class BarcodeScannerConfig(BaseModel):
    """Configuração para leitor de código de barras."""

    id: str
    name: str
    device_path: Optional[str] = None
    baudrate: int = 9600
    scan_mode: str = "continuous"
    options: Dict[str, Any] = {}


class BarcodeScanner(BaseModel):
    """Modelo para leitor de código de barras."""

    id: str
    name: str
    type: PeripheralType = PeripheralType.BARCODE_SCANNER
    status: PeripheralStatus
    config: BarcodeScannerConfig
    last_connected: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# Exception Classes
class PeripheralException(Exception):
    """Exceção base para periféricos."""

    pass


class PrinterException(PeripheralException):
    """Exceção específica para impressoras."""

    pass


class ConfigurationException(PeripheralException):
    """Exceção para erros de configuração."""

    pass


# Receipt Template
class ReceiptTemplate(BaseModel):
    """Template para recibo."""

    id: str
    name: str
    content: str
    variables: List[str] = []
    options: Dict[str, Any] = {}


# Peripheral Factory Helper
class PeripheralFactory:
    """Factory para converter configurações específicas para PeripheralConfig."""

    @staticmethod
    def create_peripheral_config(
        config, peripheral_type: str, driver_name: str
    ) -> PeripheralConfig:
        """Cria PeripheralConfig a partir de uma configuração específica."""
        return PeripheralConfig(
            id=config.id,
            type=peripheral_type,
            driver=driver_name,
            name=config.name,
            device_path=getattr(config, "device_path", None),
            address=getattr(config, "host", None)
            and getattr(config, "port", None)
            and f"{config.host}:{config.port}",
            options=getattr(config, "options", {}),
        )


# Simulated Printer
class SimulatedPrinter(BasePeripheralDriver):
    """Impressora simulada para testes."""

    def __init__(self, config: PeripheralConfig):
        super().__init__(config)
        self.connected = True
        self.status = PeripheralStatus.ONLINE

    async def initialize(self) -> bool:
        """Inicializa a impressora simulada."""
        return True

    async def shutdown(self) -> bool:
        """Finaliza a impressora simulada."""
        return True

    async def print(
        self, content: str, options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Simula impressão."""
        return {"success": True, "message": "Documento impresso com sucesso"}

    async def get_status(self) -> Dict[str, Any]:
        """Retorna o status da impressora simulada."""
        return {"status": self.status, "connected": self.connected, "type": self.type}
