# Peripheral repository for database operations

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, desc
from sqlalchemy.orm import Session, joinedload

from ..models.db_models import (
    KeyboardConfigDB,
    KeyMappingDB,
    PeripheralDB,
    PeripheralEventLogDB,
    PrinterConfigDB,
)
from ..models.peripheral_models import PeripheralStatus


class PeripheralRepository:
    """Repository for peripheral database operations."""

    def __init__(self, db: Session):
        self.db = db

    def create_peripheral(
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

        db_peripheral = PeripheralDB(
            id=peripheral_id,
            name=name,
            type=peripheral_type,
            status=PeripheralStatus.DISCONNECTED,
            config=config,
            brand=brand,
            model=model,
            connection_type=connection_type,
            connection_params=connection_params or {},
        )

        self.db.add(db_peripheral)
        self.db.commit()
        self.db.refresh(db_peripheral)
        return db_peripheral

    def get_peripheral_by_id(self, peripheral_id: str) -> Optional[PeripheralDB]:
        """Get a peripheral by ID with all related data."""
        return (
            self.db.query(PeripheralDB)
            .options(
                joinedload(PeripheralDB.keyboard_configs).joinedload(
                    KeyboardConfigDB.key_mappings
                )
            )
            .filter(PeripheralDB.id == peripheral_id)
            .first()
        )

    def list_peripherals(
        self, peripheral_type: Optional[str] = None, enabled_only: bool = True
    ) -> List[PeripheralDB]:
        """List peripherals with optional filters."""
        query = self.db.query(PeripheralDB).options(
            joinedload(PeripheralDB.keyboard_configs)
        )

        if peripheral_type:
            query = query.filter(PeripheralDB.type == peripheral_type)

        if enabled_only:
            query = query.filter(PeripheralDB.enabled)

        return query.order_by(PeripheralDB.name).all()

    def update_peripheral(
        self, peripheral_id: str, updates: Dict[str, Any]
    ) -> Optional[PeripheralDB]:
        """Update a peripheral."""
        db_peripheral = (
            self.db.query(PeripheralDB).filter(PeripheralDB.id == peripheral_id).first()
        )

        if not db_peripheral:
            return None

        for field, value in updates.items():
            if hasattr(db_peripheral, field):
                setattr(db_peripheral, field, value)

        db_peripheral.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_peripheral)
        return db_peripheral

    def update_peripheral_status(
        self, peripheral_id: str, status: str, error_message: Optional[str] = None
    ) -> Optional[PeripheralDB]:
        """Update peripheral status."""
        db_peripheral = (
            self.db.query(PeripheralDB).filter(PeripheralDB.id == peripheral_id).first()
        )

        if not db_peripheral:
            return None

        db_peripheral.status = status
        if status == PeripheralStatus.CONNECTED:
            db_peripheral.last_connected = datetime.utcnow()
            db_peripheral.last_error = None
        elif status == PeripheralStatus.ERROR and error_message:
            db_peripheral.last_error = error_message

        db_peripheral.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_peripheral)
        return db_peripheral

    def delete_peripheral(self, peripheral_id: str) -> bool:
        """Delete a peripheral and all related data."""
        db_peripheral = (
            self.db.query(PeripheralDB).filter(PeripheralDB.id == peripheral_id).first()
        )

        if not db_peripheral:
            return False

        self.db.delete(db_peripheral)
        self.db.commit()
        return True

    # Keyboard configuration operations
    def create_keyboard_config(
        self,
        config_id: str,
        peripheral_id: str,
        name: str,
        description: str,
        device_type: str,
        device_path: Optional[str] = None,
        capabilities: Optional[List[str]] = None,
    ) -> KeyboardConfigDB:
        """Create a keyboard configuration."""

        keyboard_config = KeyboardConfigDB(
            id=config_id,
            peripheral_id=peripheral_id,
            name=name,
            description=description,
            device_type=device_type,
            device_path=device_path,
            capabilities=capabilities or [],
        )

        self.db.add(keyboard_config)
        self.db.commit()
        self.db.refresh(keyboard_config)
        return keyboard_config

    def get_keyboard_config(self, config_id: str) -> Optional[KeyboardConfigDB]:
        """Get keyboard configuration by ID."""
        return (
            self.db.query(KeyboardConfigDB)
            .options(joinedload(KeyboardConfigDB.key_mappings))
            .filter(KeyboardConfigDB.id == config_id)
            .first()
        )

    def list_keyboard_configs(
        self, peripheral_id: Optional[str] = None, active_only: bool = True
    ) -> List[KeyboardConfigDB]:
        """List keyboard configurations."""
        query = self.db.query(KeyboardConfigDB).options(
            joinedload(KeyboardConfigDB.key_mappings)
        )

        if peripheral_id:
            query = query.filter(KeyboardConfigDB.peripheral_id == peripheral_id)

        if active_only:
            query = query.filter(KeyboardConfigDB.active)

        return query.order_by(KeyboardConfigDB.name).all()

    def update_keyboard_config(
        self, config_id: str, updates: Dict[str, Any]
    ) -> Optional[KeyboardConfigDB]:
        """Update keyboard configuration."""
        db_config = (
            self.db.query(KeyboardConfigDB)
            .filter(KeyboardConfigDB.id == config_id)
            .first()
        )

        if not db_config:
            return None

        for field, value in updates.items():
            if hasattr(db_config, field):
                setattr(db_config, field, value)

        db_config.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_config)
        return db_config

    def delete_keyboard_config(self, config_id: str) -> bool:
        """Delete keyboard configuration."""
        db_config = (
            self.db.query(KeyboardConfigDB)
            .filter(KeyboardConfigDB.id == config_id)
            .first()
        )

        if not db_config:
            return False

        self.db.delete(db_config)
        self.db.commit()
        return True

    # Key mapping operations
    def create_key_mapping(
        self,
        keyboard_config_id: str,
        key_code: str,
        command: str,
        params: Optional[Dict[str, Any]] = None,
        description: Optional[str] = None,
    ) -> KeyMappingDB:
        """Create a key mapping."""

        key_mapping = KeyMappingDB(
            keyboard_config_id=keyboard_config_id,
            key_code=key_code,
            command=command,
            params=params,
            description=description,
        )

        self.db.add(key_mapping)
        self.db.commit()
        self.db.refresh(key_mapping)
        return key_mapping

    def get_key_mappings(self, keyboard_config_id: str) -> List[KeyMappingDB]:
        """Get all key mappings for a keyboard configuration."""
        return (
            self.db.query(KeyMappingDB)
            .filter(
                and_(
                    KeyMappingDB.keyboard_config_id == keyboard_config_id,
                    KeyMappingDB.active,
                )
            )
            .order_by(KeyMappingDB.key_code)
            .all()
        )

    def update_key_mappings(
        self, keyboard_config_id: str, key_mappings: Dict[str, str]
    ) -> List[KeyMappingDB]:
        """Update all key mappings for a keyboard configuration."""

        # Delete existing mappings
        self.db.query(KeyMappingDB).filter(
            KeyMappingDB.keyboard_config_id == keyboard_config_id
        ).delete()

        # Create new mappings
        mappings = []
        for key_code, command in key_mappings.items():
            mapping = KeyMappingDB(
                keyboard_config_id=keyboard_config_id,
                key_code=key_code,
                command=command,
            )
            self.db.add(mapping)
            mappings.append(mapping)

        self.db.commit()
        for mapping in mappings:
            self.db.refresh(mapping)

        return mappings

    def delete_key_mapping(self, mapping_id: str) -> bool:
        """Delete a key mapping."""
        db_mapping = (
            self.db.query(KeyMappingDB).filter(KeyMappingDB.id == mapping_id).first()
        )

        if not db_mapping:
            return False

        self.db.delete(db_mapping)
        self.db.commit()
        return True

    # Printer configuration operations
    def create_printer_config(
        self, config_id: str, peripheral_id: str, **config_params
    ) -> PrinterConfigDB:
        """Create printer configuration."""

        printer_config = PrinterConfigDB(
            id=config_id, peripheral_id=peripheral_id, **config_params
        )

        self.db.add(printer_config)
        self.db.commit()
        self.db.refresh(printer_config)
        return printer_config

    def get_printer_config(self, peripheral_id: str) -> Optional[PrinterConfigDB]:
        """Get printer configuration by peripheral ID."""
        return (
            self.db.query(PrinterConfigDB)
            .filter(PrinterConfigDB.peripheral_id == peripheral_id)
            .first()
        )

    def update_printer_config(
        self, config_id: str, updates: Dict[str, Any]
    ) -> Optional[PrinterConfigDB]:
        """Update printer configuration."""
        db_config = (
            self.db.query(PrinterConfigDB)
            .filter(PrinterConfigDB.id == config_id)
            .first()
        )

        if not db_config:
            return None

        for field, value in updates.items():
            if hasattr(db_config, field):
                setattr(db_config, field, value)

        db_config.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_config)
        return db_config

    # Event logging operations
    def log_peripheral_event(
        self,
        peripheral_id: str,
        event_type: str,
        message: str,
        event_data: Optional[Dict[str, Any]] = None,
        level: str = "info",
    ) -> PeripheralEventLogDB:
        """Log a peripheral event."""

        event_log = PeripheralEventLogDB(
            peripheral_id=peripheral_id,
            event_type=event_type,
            event_data=event_data or {},
            message=message,
            level=level,
        )

        self.db.add(event_log)
        self.db.commit()
        self.db.refresh(event_log)
        return event_log

    def get_peripheral_events(
        self, peripheral_id: str, limit: int = 100, event_type: Optional[str] = None
    ) -> List[PeripheralEventLogDB]:
        """Get recent events for a peripheral."""
        query = self.db.query(PeripheralEventLogDB).filter(
            PeripheralEventLogDB.peripheral_id == peripheral_id
        )

        if event_type:
            query = query.filter(PeripheralEventLogDB.event_type == event_type)

        return query.order_by(desc(PeripheralEventLogDB.timestamp)).limit(limit).all()
