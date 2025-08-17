"""
SQLAlchemy models for product module - PostgreSQL integration.
"""

from uuid import uuid4

from sqlalchemy import (
    DECIMAL,
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
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class ProductCategory(Base):
    """SQLAlchemy model for product_categories table."""

    __tablename__ = "product_categories"
    __table_args__ = {"schema": "pos_modern"}

    category_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    client_id = Column(String(50), nullable=False)
    store_id = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    parent_id = Column(UUID(as_uuid=True), nullable=True)
    image_url = Column(String(255), nullable=True)
    color = Column(String(20), nullable=True)
    icon = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Product(Base):
    """SQLAlchemy model for products table."""

    __tablename__ = "products"
    __table_args__ = {"schema": "pos_modern"}

    product_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    client_id = Column(String(50), nullable=False)
    store_id = Column(String(50), nullable=False)
    code = Column(String(50), nullable=False)
    barcode = Column(String(50), nullable=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    price: Column = Column(DECIMAL(10, 2), nullable=False)
    cost: Column = Column(DECIMAL(10, 2), nullable=True)
    category_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pos_modern.product_categories.category_id"),
        nullable=True,
    )
    image_url = Column(String(255), nullable=True)
    sku = Column(String(50), nullable=True)
    status = Column(
        String(20), default="ACTIVE", nullable=False
    )  # ACTIVE, INACTIVE, OUT_OF_STOCK
    type = Column(
        String(20), default="SIMPLE", nullable=False
    )  # SIMPLE, COMBO, COMPOSITE
    is_featured = Column(Boolean, default=False, nullable=False)
    weight_based = Column(Boolean, default=False, nullable=False)
    pricing_strategy = Column(
        String(20), default="FIXED", nullable=False
    )  # FIXED, WEIGHT_BASED, DYNAMIC
    is_active = Column(Boolean, default=True, nullable=False)
    meta_data = Column(JSON, nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class ProductImage(Base):
    """SQLAlchemy model for product images."""

    __tablename__ = "product_images"
    __table_args__ = {"schema": "pos_modern"}

    image_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pos_modern.products.product_id", ondelete="CASCADE"),
        nullable=False,
    )
    url = Column(String(500), nullable=False)
    filename = Column(String(255), nullable=False)
    is_main = Column(Boolean, default=False, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Ingredient(Base):
    """SQLAlchemy model for ingredients."""

    __tablename__ = "ingredients"
    __table_args__ = {"schema": "pos_modern"}

    ingredient_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    client_id = Column(String(50), nullable=False)
    store_id = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    unit = Column(String(20), default="unit", nullable=False)
    cost_per_unit: Column = Column(DECIMAL(10, 4), default=0.0, nullable=False)
    current_stock: Column = Column(DECIMAL(10, 3), default=0.0, nullable=False)
    minimum_stock: Column = Column(DECIMAL(10, 3), default=0.0, nullable=False)
    supplier = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class ProductIngredient(Base):
    """SQLAlchemy model for product-ingredient relationships."""

    __tablename__ = "product_ingredients"
    __table_args__ = {"schema": "pos_modern"}

    product_ingredient_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pos_modern.products.product_id", ondelete="CASCADE"),
        nullable=False,
    )
    ingredient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pos_modern.ingredients.ingredient_id"),
        nullable=False,
    )
    quantity: Column = Column(DECIMAL(10, 3), nullable=False)
    is_optional = Column(Boolean, default=False, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ComboItem(Base):
    """SQLAlchemy model for combo items."""

    __tablename__ = "combo_items"
    __table_args__ = {"schema": "pos_modern"}

    combo_item_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    combo_product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pos_modern.products.product_id", ondelete="CASCADE"),
        nullable=False,
    )
    item_product_id = Column(
        UUID(as_uuid=True), ForeignKey("pos_modern.products.product_id"), nullable=False
    )
    quantity = Column(Integer, default=1, nullable=False)
    is_optional = Column(Boolean, default=False, nullable=False)
    price_adjustment: Column = Column(DECIMAL(10, 2), default=0.0, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class OptionGroup(Base):
    """SQLAlchemy model for option groups."""

    __tablename__ = "option_groups"
    __table_args__ = {"schema": "pos_modern"}

    option_group_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pos_modern.products.product_id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_required = Column(Boolean, default=False, nullable=False)
    max_selections = Column(Integer, default=1, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Option(Base):
    """SQLAlchemy model for options."""

    __tablename__ = "options"
    __table_args__ = {"schema": "pos_modern"}

    option_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    option_group_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pos_modern.option_groups.option_group_id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(100), nullable=False)
    price_adjustment: Column = Column(DECIMAL(10, 2), default=0.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
