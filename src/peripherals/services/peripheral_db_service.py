import os
from typing import Any, Dict, List, Optional

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from ..models.db_models import PeripheralDB
from ..models.peripheral_models import (
    ConfigurationException,
    Peripheral,
    PeripheralException,
    PeripheralStatus,
    PeripheralType,
    Printer,
    PrinterConfig,
)
from ..repositories.peripheral_repository import PeripheralRepository

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql://{os.getenv('DB_USER', 'posmodern')}:{os.getenv('DB_PASSWORD', 'posmodern123')}@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5432')}/{os.getenv('DB_NAME', 'posmodern')}",
)

# Create engine and session factory
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class PeripheralDBFactory:
    """Factory for creating peripheral instances from database data."""

    @staticmethod
    async def create_peripheral_from_db(db_peripheral: PeripheralDB) -> Printer:
        """Creates a peripheral instance from database record."""
        config: Dict[str, Any] = (
            dict(db_peripheral.config) if db_peripheral.config else {}
        )
        config.update(
            {
                "id": str(db_peripheral.id),
                "name": str(db_peripheral.name),
                "type": str(db_peripheral.type) if db_peripheral.type else None,
                "status": str(db_peripheral.status) if db_peripheral.status else None,
                "brand": str(db_peripheral.brand) if db_peripheral.brand else None,
                "model": str(db_peripheral.model) if db_peripheral.model else None,
                "connection_type": (
                    str(db_peripheral.connection_type)
                    if db_peripheral.connection_type
                    else None
                ),
            }
        )

        if db_peripheral.connection_params:
            config.update(dict(db_peripheral.connection_params))

        if db_peripheral.type == PeripheralType.PRINTER:
            return await PeripheralDBFactory.create_printer(config)
        else:
            raise ConfigurationException(
                f"Tipo de periférico não suportado: {db_peripheral.type}"
            )

    @staticmethod
    async def create_printer(config: Dict[str, Any]) -> Printer:
        """Creates a printer instance based on configuration."""
        brand = config.get("brand", "").lower()

        if brand == "epson":
            from ..drivers.epson.epson_printer import EpsonPrinter

            printer_config = PrinterConfig(**config)
            return EpsonPrinter(printer_config)  # type: ignore
        elif brand == "simulated":
            from ..drivers.simulated_printer import SimulatedPrinter
            from ..models.peripheral_models import PeripheralFactory

            printer_config = PrinterConfig(**config)
            peripheral_config = PeripheralFactory.create_peripheral_config(
                printer_config, "printer", "simulated"
            )
            return SimulatedPrinter(peripheral_config)  # type: ignore
        # Add support for other brands in the future

        raise ConfigurationException(f"Marca de impressora não suportada: {brand}")


class PeripheralDBService:
    """Database-backed peripheral management service."""

    def __init__(self, db: Session = Depends(get_db)):
        self.repository = PeripheralRepository(db)
        self.active_peripherals: Dict[str, Printer] = {}

    async def initialize_peripherals(self) -> None:
        """Initialize all enabled peripherals from database."""
        db_peripherals = self.repository.list_peripherals(enabled_only=True)

        for db_peripheral in db_peripherals:
            try:
                await self.add_peripheral_from_db(db_peripheral)
            except Exception as e:
                await self._log_error(
                    str(db_peripheral.id), f"Erro ao inicializar periférico: {str(e)}"
                )

    async def add_peripheral_from_db(self, db_peripheral: PeripheralDB) -> None:
        """Add a peripheral from database record."""
        peripheral_id = str(db_peripheral.id)
        if peripheral_id in self.active_peripherals:
            raise ConfigurationException(f"Periférico com ID {peripheral_id} já existe")

        try:
            # Create the peripheral instance
            peripheral = await PeripheralDBFactory.create_peripheral_from_db(
                db_peripheral
            )

            # Initialize the peripheral
            success = await peripheral.initialize()
            if not success:
                raise PeripheralException(
                    f"Falha ao inicializar periférico: {peripheral_id}"
                )

            # Store the peripheral
            self.active_peripherals[peripheral_id] = peripheral

            # Update status in database
            self.repository.update_peripheral_status(
                peripheral_id, PeripheralStatus.CONNECTED
            )

            await self._log_event(
                peripheral_id,
                "connection",
                f"Periférico {db_peripheral.name} conectado com sucesso",
            )

        except Exception as e:
            # Update status in database
            self.repository.update_peripheral_status(
                peripheral_id, PeripheralStatus.ERROR, str(e)
            )

            await self._log_error(peripheral_id, str(e))
            raise PeripheralException(
                f"Erro ao adicionar periférico {peripheral_id}: {str(e)}"
            ) from e

    async def create_peripheral(
        self,
        peripheral_id: str,
        name: str,
        peripheral_type: str,
        config: Dict[str, Any],
        brand: Optional[str] = None,
        model: Optional[str] = None,
        connection_type: Optional[str] = None,
        connection_params: Optional[Dict[str, Any]] = None,
    ) -> PeripheralDB:
        """Create a new peripheral in the database."""

        # Create in database
        db_peripheral = self.repository.create_peripheral(
            peripheral_id=peripheral_id,
            name=name,
            peripheral_type=peripheral_type,
            config=config,
            brand=brand,
            model=model,
            connection_type=connection_type,
            connection_params=connection_params,
        )

        # Try to initialize if enabled
        if config.get("enabled", True):
            try:
                await self.add_peripheral_from_db(db_peripheral)
            except Exception as e:
                # Log error but don't fail the creation
                await self._log_error(
                    peripheral_id, f"Falha ao inicializar após criação: {str(e)}"
                )

        return db_peripheral

    async def get_peripheral(self, peripheral_id: str) -> Optional[Peripheral]:
        """Get an active peripheral by ID."""
        return self.active_peripherals.get(peripheral_id)  # type: ignore

    async def get_peripheral_from_db(
        self, peripheral_id: str
    ) -> Optional[PeripheralDB]:
        """Get peripheral data from database."""
        return self.repository.get_peripheral_by_id(peripheral_id)

    async def get_printer(self, printer_id: str) -> Optional[Printer]:
        """Get a printer by ID."""
        peripheral = await self.get_peripheral(printer_id)
        if peripheral and isinstance(peripheral, Printer):
            return peripheral
        return None

    async def list_peripherals(
        self,
        peripheral_type: Optional[PeripheralType] = None,
        include_inactive: bool = False,
    ) -> List[Dict[str, Any]]:
        """List peripherals from database."""
        db_peripherals = self.repository.list_peripherals(
            peripheral_type=peripheral_type, enabled_only=not include_inactive
        )

        result = []
        for db_peripheral in db_peripherals:
            peripheral_dict = {
                "id": db_peripheral.id,
                "name": db_peripheral.name,
                "type": db_peripheral.type,
                "status": db_peripheral.status,
                "brand": db_peripheral.brand,
                "model": db_peripheral.model,
                "connection_type": db_peripheral.connection_type,
                "enabled": db_peripheral.enabled,
                "last_connected": (
                    db_peripheral.last_connected.isoformat()
                    if db_peripheral.last_connected
                    else None
                ),
                "last_error": db_peripheral.last_error,
                "created_at": db_peripheral.created_at.isoformat(),
                "updated_at": db_peripheral.updated_at.isoformat(),
                "active": db_peripheral.id in self.active_peripherals,
            }
            result.append(peripheral_dict)

        return result

    async def update_peripheral(
        self, peripheral_id: str, updates: Dict[str, Any]
    ) -> Optional[PeripheralDB]:
        """Update a peripheral configuration."""

        # Remove from active peripherals if running
        if peripheral_id in self.active_peripherals:
            await self.remove_peripheral(peripheral_id)

        # Update in database
        db_peripheral = self.repository.update_peripheral(peripheral_id, updates)
        if not db_peripheral:
            return None

        # Re-initialize if enabled
        if db_peripheral.enabled:
            try:
                await self.add_peripheral_from_db(db_peripheral)
            except Exception as e:
                await self._log_error(
                    peripheral_id, f"Falha ao reinicializar após atualização: {str(e)}"
                )

        return db_peripheral

    async def remove_peripheral(self, peripheral_id: str) -> bool:
        """Remove a peripheral from active list."""
        peripheral = self.active_peripherals.get(peripheral_id)
        if not peripheral:
            return False

        try:
            await peripheral.shutdown()
            await self._log_event(
                peripheral_id,
                "disconnection",
                f"Periférico {peripheral.config.get('name', peripheral_id)} desconectado",
            )
        except Exception as e:
            await self._log_error(
                peripheral_id, f"Erro ao finalizar periférico: {str(e)}"
            )

        del self.active_peripherals[peripheral_id]

        # Update status in database
        self.repository.update_peripheral_status(
            peripheral_id, PeripheralStatus.DISCONNECTED
        )

        return True

    async def delete_peripheral(self, peripheral_id: str) -> bool:
        """Delete a peripheral completely."""

        # Remove from active if running
        if peripheral_id in self.active_peripherals:
            await self.remove_peripheral(peripheral_id)

        # Delete from database
        return self.repository.delete_peripheral(peripheral_id)

    async def check_peripherals_status(self) -> Dict[str, Any]:
        """Check status of all active peripherals."""
        result = {}

        for peripheral_id, peripheral in self.active_peripherals.items():
            try:
                status = await peripheral.get_status()
                result[peripheral_id] = status

                # Update status in database if different
                if status.get("status") != peripheral.status:
                    self.repository.update_peripheral_status(
                        peripheral_id, status.get("status", PeripheralStatus.UNKNOWN)
                    )

            except Exception as e:
                error_status = {
                    "status": PeripheralStatus.ERROR,
                    "error": str(e),
                }
                result[peripheral_id] = error_status

                # Update status in database
                self.repository.update_peripheral_status(
                    peripheral_id, PeripheralStatus.ERROR, str(e)
                )

        return result

    async def shutdown(self) -> None:
        """Shutdown all peripherals."""
        for peripheral_id in list(self.active_peripherals.keys()):
            await self.remove_peripheral(peripheral_id)

    # Keyboard configuration methods
    async def get_keyboard_configs(self) -> List[Dict[str, Any]]:
        """Get all keyboard configurations."""
        db_configs = self.repository.list_keyboard_configs()

        result = []
        for config in db_configs:
            # Convert key mappings to dict format
            key_mappings = {}
            for mapping in config.key_mappings:
                if mapping.active:
                    key_mappings[mapping.key_code] = mapping.command

            config_dict = {
                "id": config.id,
                "peripheral_id": config.peripheral_id,
                "name": config.name,
                "description": config.description,
                "device_type": config.device_type,
                "device_path": config.device_path,
                "capabilities": config.capabilities,
                "key_mappings": key_mappings,
                "active": config.active,
                "created_at": config.created_at.isoformat(),
                "updated_at": config.updated_at.isoformat(),
            }
            result.append(config_dict)

        return result

    async def get_keyboard_config(self, config_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific keyboard configuration."""
        config = self.repository.get_keyboard_config(config_id)
        if not config:
            return None

        # Convert key mappings to dict format
        key_mappings = {}
        for mapping in config.key_mappings:
            if mapping.active:
                key_mappings[mapping.key_code] = mapping.command

        return {
            "id": config.id,
            "peripheral_id": config.peripheral_id,
            "name": config.name,
            "description": config.description,
            "device_type": config.device_type,
            "device_path": config.device_path,
            "capabilities": config.capabilities,
            "key_mappings": key_mappings,
            "active": config.active,
            "created_at": config.created_at.isoformat(),
            "updated_at": config.updated_at.isoformat(),
        }

    async def update_keyboard_config(
        self, config_id: str, updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update keyboard configuration."""

        # Extract key mappings if provided
        key_mappings = updates.pop("key_mappings", None)

        # Update config
        db_config = self.repository.update_keyboard_config(config_id, updates)
        if not db_config:
            return None

        # Update key mappings if provided
        if key_mappings is not None:
            self.repository.update_key_mappings(config_id, key_mappings)

        return await self.get_keyboard_config(config_id)

    async def _log_event(
        self, peripheral_id: str, event_type: str, message: str
    ) -> None:
        """Log a peripheral event."""
        self.repository.log_peripheral_event(
            peripheral_id=peripheral_id,
            event_type=event_type,
            message=message,
            level="info",
        )

    async def _log_error(self, peripheral_id: str, message: str) -> None:
        """Log a peripheral error."""
        self.repository.log_peripheral_event(
            peripheral_id=peripheral_id,
            event_type="error",
            message=message,
            level="error",
        )


# Dependency function to get the service
def get_peripheral_service(db: Session = Depends(get_db)) -> PeripheralDBService:
    """Get PeripheralDBService instance with database session."""
    return PeripheralDBService(db)
