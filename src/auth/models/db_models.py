"""
SQLAlchemy models for auth module - PostgreSQL integration.
"""

from uuid import uuid4

from sqlalchemy import JSON, Boolean, Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class User(Base):
    """SQLAlchemy model for users table."""

    __tablename__ = "users"
    __table_args__ = {"schema": "pos_modern"}

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    client_id = Column(String(50), nullable=False)
    store_id = Column(String(50), nullable=True)
    username = Column(String(50), nullable=False)
    password = Column(String(100), nullable=False)  # hashed password
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=True)
    role = Column(String(20), nullable=False)
    permissions = Column(JSON, nullable=True)  # Lista de permissões
    is_active = Column(Boolean, default=True, nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class NumericCredential(Base):
    """SQLAlchemy model for numeric credentials (operator passwords)."""

    __tablename__ = "numeric_credentials"
    __table_args__ = {"schema": "pos_modern"}

    credential_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    operator_code = Column(String(20), nullable=False, unique=True)
    password_hash = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    last_used = Column(DateTime(timezone=True), nullable=True)
    failed_attempts = Column(String(10), default="0", nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class UserSession(Base):
    """SQLAlchemy model for user sessions."""

    __tablename__ = "user_sessions"
    __table_args__ = {"schema": "pos_modern"}

    session_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    token_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    device_info = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
