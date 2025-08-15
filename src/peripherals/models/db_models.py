# Peripheral module database models for PostgreSQL

import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ...core.database.connection import Base


class PeripheralDB(Base):
    """Database model for peripheral devices."""

    __tablename__ = "peripherals"

    id = Column(String, primary_key=True, index=True)  # Using string ID as in original
    name = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)  # printer, keyboard, etc.
    status = Column(String, nullable=False, default="disconnected")
    config = Column(JSON)  # Full device configuration
    brand = Column(String)  # For printers: epson, daruma, etc.
    model = Column(String)
    connection_type = Column(String)  # usb, network, serial
    connection_params = Column(JSON)  # IP, port, device path, etc.
    enabled = Column(Boolean, default=True)
    last_connected = Column(DateTime)
    last_error = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    keyboard_configs = relationship(
        "KeyboardConfigDB", back_populates="peripheral", cascade="all, delete-orphan"
    )


class KeyboardConfigDB(Base):
    """Database model for keyboard device configurations."""

    __tablename__ = "keyboard_configs"

    id = Column(String, primary_key=True, index=True)  # Using string ID as in original
    peripheral_id = Column(String, ForeignKey("peripherals.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    device_type = Column(
        String, nullable=False
    )  # standard_keyboard, numeric_keypad, custom_device
    device_path = Column(String)  # /dev/input/eventX
    capabilities = Column(JSON)  # Device capabilities
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationship
    peripheral = relationship("PeripheralDB", back_populates="keyboard_configs")
    key_mappings = relationship(
        "KeyMappingDB", back_populates="keyboard_config", cascade="all, delete-orphan"
    )


class KeyMappingDB(Base):
    """Database model for keyboard key mappings."""

    __tablename__ = "key_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    keyboard_config_id = Column(
        String, ForeignKey("keyboard_configs.id"), nullable=False
    )
    key_code = Column(String, nullable=False)  # KEY_F1, KEY_SPACE, etc.
    command = Column(String, nullable=False)  # next_order, advance_status, etc.
    params = Column(JSON)  # Additional command parameters
    description = Column(String)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    keyboard_config = relationship("KeyboardConfigDB", back_populates="key_mappings")


class PrinterConfigDB(Base):
    """Database model for printer-specific configurations."""

    __tablename__ = "printer_configs"

    id = Column(String, primary_key=True, index=True)
    peripheral_id = Column(String, ForeignKey("peripherals.id"), nullable=False)
    paper_width = Column(Integer, default=80)  # mm
    paper_height = Column(Integer)  # mm, null for continuous paper
    margin_left = Column(Integer, default=0)
    margin_right = Column(Integer, default=0)
    margin_top = Column(Integer, default=0)
    margin_bottom = Column(Integer, default=0)
    dpi = Column(Integer, default=203)
    encoding = Column(String, default="cp1252")
    cut_mode = Column(String, default="partial")  # full, partial, none
    cash_drawer_pin = Column(Integer)  # Which pin controls cash drawer
    template_settings = Column(JSON)  # Template-specific settings
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationship
    peripheral = relationship("PeripheralDB")


class PeripheralEventLogDB(Base):
    """Database model for logging peripheral events."""

    __tablename__ = "peripheral_event_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    peripheral_id = Column(String, ForeignKey("peripherals.id"), nullable=False)
    event_type = Column(
        String, nullable=False, index=True
    )  # connection, disconnection, error, command
    event_data = Column(JSON)  # Event-specific data
    message = Column(Text)
    level = Column(String, default="info")  # debug, info, warning, error
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationship
    peripheral = relationship("PeripheralDB")
