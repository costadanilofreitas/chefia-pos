"""
Modelos SQLAlchemy para Remote Orders.
"""

from uuid import uuid4

from sqlalchemy import (
    JSON,
    UUID,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.core.database import Base


class RemoteOrder(Base):
    """Modelo para pedidos remotos."""

    __tablename__ = "remote_orders"
    __table_args__ = (
        Index("idx_remote_orders_client_store", "client_id", "store_id"),
        Index("idx_remote_orders_provider", "provider"),
        Index("idx_remote_orders_provider_order_id", "provider_order_id"),
        Index("idx_remote_orders_order_id", "order_id"),
        Index("idx_remote_orders_status", "status"),
        Index("idx_remote_orders_created_at", "created_at"),
        {"schema": "pos_modern"},
    )

    # Campos principais
    remote_order_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    client_id = Column(String(50), nullable=False, default="default")
    store_id = Column(String(50), nullable=False, default="default")
    provider = Column(String(20), nullable=False)  # ifood, rappi, ubereats
    provider_order_id = Column(String(100), nullable=False)  # ID externo
    order_id = Column(UUID(as_uuid=True), nullable=True)  # ID do pedido interno
    status = Column(String(20), nullable=False)  # pending, accepted, etc.

    # Dados do cliente
    customer_name = Column(String(100), nullable=True)
    customer_phone = Column(String(20), nullable=True)
    customer_email = Column(String(100), nullable=True)
    customer_document = Column(String(20), nullable=True)
    customer_address = Column(JSON, nullable=True)

    # Valores financeiros
    subtotal = Column(Numeric(10, 2), nullable=False, default=0)
    delivery_fee = Column(Numeric(10, 2), nullable=True, default=0)
    service_fee = Column(Numeric(10, 2), nullable=True, default=0)
    discount = Column(Numeric(10, 2), nullable=True, default=0)
    total = Column(Numeric(10, 2), nullable=False)

    # Informações de pagamento
    payment_method = Column(String(50), nullable=True)
    payment_status = Column(String(20), nullable=True)
    payment_total = Column(Numeric(10, 2), nullable=True)
    payment_prepaid = Column(Boolean, default=True)
    payment_online = Column(Boolean, default=True)

    # Observações e metadados
    notes = Column(Text, nullable=True)
    scheduled_for = Column(DateTime(timezone=True), nullable=True)
    raw_data = Column(
        JSON, nullable=False, default=dict
    )  # Dados originais da plataforma

    # Timestamps
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relacionamentos
    items = relationship(
        "RemoteOrderItem", back_populates="remote_order", cascade="all, delete-orphan"
    )


class RemoteOrderItem(Base):
    """Modelo para itens de pedidos remotos."""

    __tablename__ = "remote_order_items"
    __table_args__ = (
        Index("idx_remote_order_items_remote_order_id", "remote_order_id"),
        Index("idx_remote_order_items_provider_item_id", "provider_item_id"),
        {"schema": "pos_modern"},
    )

    # Campos principais
    item_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    remote_order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pos_modern.remote_orders.remote_order_id", ondelete="CASCADE"),
        nullable=False,
    )
    provider_item_id = Column(String(100), nullable=False)  # ID do item na plataforma

    # Dados do produto
    name = Column(String(100), nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)

    # Observações e customizações
    notes = Column(Text, nullable=True)
    customizations = Column(JSON, nullable=True, default=list)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relacionamentos
    remote_order = relationship("RemoteOrder", back_populates="items")


class RemotePlatformConfig(Base):
    """Modelo para configurações de plataformas remotas."""

    __tablename__ = "remote_platform_configs"
    __table_args__ = (
        Index("idx_remote_platform_configs_platform", "platform"),
        Index("idx_remote_platform_configs_client_store", "client_id", "store_id"),
        {"schema": "pos_modern"},
    )

    # Campos principais
    config_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    client_id = Column(String(50), nullable=False, default="default")
    store_id = Column(String(50), nullable=False, default="default")
    platform = Column(String(20), nullable=False)  # ifood, rappi, ubereats

    # Configurações básicas
    enabled = Column(Boolean, default=True)
    api_key = Column(String(255), nullable=False)
    api_secret = Column(String(255), nullable=False)
    webhook_url = Column(String(500), nullable=True)

    # Configurações de aceitação automática
    auto_accept = Column(Boolean, default=False)
    auto_accept_conditions = Column(JSON, nullable=True, default=dict)

    # Configurações operacionais
    default_preparation_time = Column(Integer, default=30)  # em minutos
    notification_email = Column(String(100), nullable=True)
    notification_phone = Column(String(20), nullable=True)
    notification_settings = Column(JSON, nullable=True, default=dict)

    # Motivos de rejeição pré-configurados
    rejection_reasons = Column(JSON, nullable=True, default=list)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


# Criar índices adicionais se necessário
def create_additional_indexes(engine):
    """Cria índices adicionais para otimização."""
    from sqlalchemy import text

    additional_indexes = [
        # Índices para consultas de performance
        "CREATE INDEX IF NOT EXISTS idx_remote_orders_status_created_at ON pos_modern.remote_orders(status, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_remote_orders_provider_status ON pos_modern.remote_orders(provider, status)",
        "CREATE INDEX IF NOT EXISTS idx_remote_orders_today ON pos_modern.remote_orders(DATE(created_at)) WHERE created_at >= CURRENT_DATE",
        # Índices para configurações
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_remote_platform_configs_unique ON pos_modern.remote_platform_configs(client_id, store_id, platform)",
    ]

    for index_sql in additional_indexes:
        try:
            engine.execute(text(index_sql))
        except Exception as e:
            print(f"Erro ao criar índice: {e}")
