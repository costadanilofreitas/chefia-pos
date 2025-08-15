"""
Repository for product operations.
"""

from decimal import Decimal
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import and_, delete, or_, select, update
from src.core.database.connection import DatabaseManager

from ..models.db_models import (
    Product as DBProduct,
)
from ..models.db_models import (
    ProductCategory as DBProductCategory,
)
from ..models.product import (
    CategoryCreate,
    PricingStrategy,
    Product,
    ProductCategory,
    ProductCreate,
    ProductStatus,
    ProductSummary,
    ProductType,
    ProductUpdate,
)


class ProductRepository:
    """Repository for product operations."""

    def __init__(self):
        self.db_manager = DatabaseManager()

    # Product operations
    async def create_product(self, product_data: ProductCreate) -> Product:
        """Create a new product."""
        async with self.db_manager.get_session() as session:
            db_product = DBProduct(
                product_id=uuid4(),
                client_id="default",
                store_id="default",
                code=f"PROD-{uuid4().hex[:8].upper()}",
                barcode=product_data.barcode,
                name=product_data.name,
                description=product_data.description,
                price=Decimal(str(product_data.price)),
                cost=(
                    Decimal(str(product_data.cost))
                    if hasattr(product_data, "cost") and product_data.cost
                    else None
                ),
                category_id=(
                    UUID(product_data.category_id) if product_data.category_id else None
                ),
                image_url=None,
                sku=product_data.sku,
                status=(
                    product_data.status.value
                    if product_data.status
                    else ProductStatus.ACTIVE.value
                ),
                type=(
                    product_data.type.value
                    if product_data.type
                    else ProductType.SIMPLE.value
                ),
                is_featured=product_data.is_featured,
                weight_based=product_data.weight_based,
                pricing_strategy=(
                    product_data.pricing_strategy.value
                    if product_data.pricing_strategy
                    else PricingStrategy.FIXED.value
                ),
                is_active=True,
            )

            session.add(db_product)
            await session.commit()
            await session.refresh(db_product)

            return self._db_product_to_model(db_product)

    async def get_product_by_id(self, product_id: UUID) -> Optional[Product]:
        """Get product by ID."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(
                select(DBProduct).where(DBProduct.product_id == product_id)
            )
            db_product = result.scalar_one_or_none()

            if db_product:
                return self._db_product_to_model(db_product)
            return None

    async def get_product_by_code(self, code: str) -> Optional[Product]:
        """Get product by code."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(
                select(DBProduct).where(
                    and_(
                        DBProduct.code == code,
                        DBProduct.client_id == "default",
                        DBProduct.store_id == "default",
                    )
                )
            )
            db_product = result.scalar_one_or_none()

            if db_product:
                return self._db_product_to_model(db_product)
            return None

    async def get_product_by_barcode(self, barcode: str) -> Optional[Product]:
        """Get product by barcode."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(
                select(DBProduct).where(
                    and_(
                        DBProduct.barcode == barcode,
                        DBProduct.client_id == "default",
                        DBProduct.store_id == "default",
                    )
                )
            )
            db_product = result.scalar_one_or_none()

            if db_product:
                return self._db_product_to_model(db_product)
            return None

    async def update_product(
        self, product_id: UUID, product_data: ProductUpdate
    ) -> Optional[Product]:
        """Update product."""
        async with self.db_manager.get_session() as session:
            update_data = {
                k: v
                for k, v in product_data.dict(exclude_unset=True).items()
                if v is not None
            }

            # Convert enum values
            if "status" in update_data:
                update_data["status"] = update_data["status"].value
            if "type" in update_data:
                update_data["type"] = update_data["type"].value
            if "pricing_strategy" in update_data:
                update_data["pricing_strategy"] = update_data["pricing_strategy"].value
            if "category_id" in update_data:
                update_data["category_id"] = (
                    UUID(update_data["category_id"])
                    if update_data["category_id"]
                    else None
                )
            if "price" in update_data:
                update_data["price"] = Decimal(str(update_data["price"]))

            if update_data:
                await session.execute(
                    update(DBProduct)
                    .where(DBProduct.product_id == product_id)
                    .values(**update_data)
                )
                await session.commit()

            return await self.get_product_by_id(product_id)

    async def delete_product(self, product_id: UUID) -> bool:
        """Delete product."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(
                delete(DBProduct).where(DBProduct.product_id == product_id)
            )
            await session.commit()
            return result.rowcount > 0

    async def list_products(
        self,
        category_id: Optional[UUID] = None,
        status: Optional[ProductStatus] = None,
        is_featured: Optional[bool] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[ProductSummary]:
        """List products with filters."""
        async with self.db_manager.get_session() as session:
            query = select(DBProduct).where(
                and_(
                    DBProduct.client_id == "default",
                    DBProduct.store_id == "default",
                    DBProduct.is_active,
                )
            )

            if category_id:
                query = query.where(DBProduct.category_id == category_id)
            if status:
                query = query.where(DBProduct.status == status.value)
            if is_featured is not None:
                query = query.where(DBProduct.is_featured == is_featured)
            if search:
                query = query.where(
                    or_(
                        DBProduct.name.ilike(f"%{search}%"),
                        DBProduct.description.ilike(f"%{search}%"),
                        DBProduct.code.ilike(f"%{search}%"),
                    )
                )

            query = query.order_by(DBProduct.name).limit(limit).offset(offset)

            result = await session.execute(query)
            db_products = result.scalars().all()

            return [
                self._db_product_to_summary(db_product) for db_product in db_products
            ]

    # Category operations
    async def create_category(self, category_data: CategoryCreate) -> ProductCategory:
        """Create a new product category."""
        async with self.db_manager.get_session() as session:
            db_category = DBProductCategory(
                category_id=uuid4(),
                client_id="default",
                store_id="default",
                name=category_data.name,
                description=category_data.description,
                is_active=True,
            )

            session.add(db_category)
            await session.commit()
            await session.refresh(db_category)

            return self._db_category_to_model(db_category)

    async def get_category_by_id(self, category_id: UUID) -> Optional[ProductCategory]:
        """Get category by ID."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(
                select(DBProductCategory).where(
                    DBProductCategory.category_id == category_id
                )
            )
            db_category = result.scalar_one_or_none()

            if db_category:
                return self._db_category_to_model(db_category)
            return None

    async def list_categories(
        self, is_active: Optional[bool] = None, limit: int = 100, offset: int = 0
    ) -> List[ProductCategory]:
        """List product categories."""
        async with self.db_manager.get_session() as session:
            query = select(DBProductCategory).where(
                and_(
                    DBProductCategory.client_id == "default",
                    DBProductCategory.store_id == "default",
                )
            )

            if is_active is not None:
                query = query.where(DBProductCategory.is_active == is_active)

            query = query.order_by(DBProductCategory.name).limit(limit).offset(offset)

            result = await session.execute(query)
            db_categories = result.scalars().all()

            return [
                self._db_category_to_model(db_category) for db_category in db_categories
            ]

    # Helper methods
    def _db_product_to_model(self, db_product: DBProduct) -> Product:
        """Convert database product to Pydantic model."""
        return Product(
            id=str(db_product.product_id),
            name=db_product.name,
            description=db_product.description,
            price=float(db_product.price),
            category_id=str(db_product.category_id) if db_product.category_id else None,
            sku=db_product.sku,
            barcode=db_product.barcode,
            status=ProductStatus(db_product.status),
            type=ProductType(db_product.type),
            is_featured=db_product.is_featured,
            weight_based=db_product.weight_based,
            pricing_strategy=PricingStrategy(db_product.pricing_strategy),
            created_at=db_product.created_at,
            updated_at=db_product.updated_at,
            images=[],  # Will be populated separately if needed
            ingredients=[],  # Will be populated separately if needed
            combo_items=[],  # Will be populated separately if needed
        )

    def _db_product_to_summary(self, db_product: DBProduct) -> ProductSummary:
        """Convert database product to summary model."""
        return ProductSummary(
            id=str(db_product.product_id),
            name=db_product.name,
            price=float(db_product.price),
            category_id=str(db_product.category_id) if db_product.category_id else None,
            status=ProductStatus(db_product.status),
            type=ProductType(db_product.type),
            is_featured=db_product.is_featured,
            image_url=db_product.image_url,
        )

    def _db_category_to_model(self, db_category: DBProductCategory) -> ProductCategory:
        """Convert database category to Pydantic model."""
        return ProductCategory(
            id=str(db_category.category_id),
            name=db_category.name,
            description=db_category.description,
            is_active=db_category.is_active,
            created_at=db_category.created_at,
            updated_at=db_category.updated_at,
        )
