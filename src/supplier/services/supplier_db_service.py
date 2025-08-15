"""Database-backed supplier service."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...core.database.connection import get_db_session
from ..models.db_models import PurchaseOrderStatusEnum
from ..models.supplier_models import (
    PurchaseOrder,
    PurchaseOrderCreate,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    PurchaseOrderUpdate,
    Supplier,
    SupplierCreate,
    SupplierProduct,
    SupplierQuery,
    SupplierUpdate,
)
from ..repositories.supplier_repository import SupplierRepository


class SupplierDBService:
    """Database-backed supplier service."""

    def __init__(self, db: Session = Depends(get_db_session)):
        self.repository = SupplierRepository(db)

    def _convert_db_to_pydantic_supplier(self, db_supplier) -> Supplier:
        """Convert database supplier model to Pydantic model."""
        return Supplier(
            id=db_supplier.id,
            name=db_supplier.name,
            trading_name=db_supplier.trading_name,
            document=db_supplier.document,
            document_type=db_supplier.document_type,
            address=db_supplier.address,
            contacts=db_supplier.contacts,
            payment_terms=db_supplier.payment_terms,
            website=db_supplier.website,
            category=db_supplier.category,
            rating=db_supplier.rating,
            is_active=db_supplier.is_active,
            notes=db_supplier.notes,
            created_at=db_supplier.created_at,
            updated_at=db_supplier.updated_at,
        )

    def _convert_db_to_pydantic_supplier_product(
        self, db_supplier_product
    ) -> SupplierProduct:
        """Convert database supplier product model to Pydantic model."""
        return SupplierProduct(
            product_id=db_supplier_product.product_id,
            product_name=db_supplier_product.product_name,
            supplier_code=db_supplier_product.supplier_code,
            unit_price=db_supplier_product.unit_price,
            min_order_quantity=db_supplier_product.min_order_quantity,
            lead_time_days=db_supplier_product.lead_time_days,
            is_preferred=db_supplier_product.is_preferred,
            last_purchase_date=db_supplier_product.last_purchase_date,
            last_purchase_price=db_supplier_product.last_purchase_price,
        )

    def _convert_db_to_pydantic_purchase_order(
        self, db_purchase_order
    ) -> PurchaseOrder:
        """Convert database purchase order model to Pydantic model."""
        return PurchaseOrder(
            id=db_purchase_order.id,
            supplier_id=db_purchase_order.supplier_id,
            supplier_name=db_purchase_order.supplier_name,
            order_number=db_purchase_order.order_number,
            status=PurchaseOrderStatus(db_purchase_order.status.value),
            items=[PurchaseOrderItem(**item) for item in db_purchase_order.items],
            total_amount=db_purchase_order.total_amount,
            expected_delivery_date=db_purchase_order.expected_delivery_date,
            payment_term_days=db_purchase_order.payment_term_days,
            notes=db_purchase_order.notes,
            created_by=db_purchase_order.created_by,
            created_at=db_purchase_order.created_at,
            updated_at=db_purchase_order.updated_at,
            sent_at=db_purchase_order.sent_at,
            confirmed_at=db_purchase_order.confirmed_at,
            received_at=db_purchase_order.received_at,
            cancelled_at=db_purchase_order.cancelled_at,
        )

    # Supplier operations
    async def create_supplier(self, supplier_create: SupplierCreate) -> Supplier:
        """Create a new supplier."""
        # Check if supplier with same document already exists
        existing_supplier = self.repository.get_supplier_by_document(
            supplier_create.document
        )
        if existing_supplier:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Supplier with document '{supplier_create.document}' already exists",
            )

        db_supplier = self.repository.create_supplier(
            name=supplier_create.name,
            trading_name=supplier_create.trading_name,
            document=supplier_create.document,
            document_type=supplier_create.document_type,
            address=supplier_create.address.dict(),
            contacts=[contact.dict() for contact in supplier_create.contacts],
            payment_terms=[term.dict() for term in supplier_create.payment_terms],
            website=supplier_create.website,
            category=supplier_create.category,
            rating=supplier_create.rating,
            is_active=supplier_create.is_active,
            notes=supplier_create.notes,
        )

        return self._convert_db_to_pydantic_supplier(db_supplier)

    async def get_supplier(self, supplier_id: str) -> Optional[Supplier]:
        """Get supplier by ID."""
        db_supplier = self.repository.get_supplier_by_id(supplier_id)
        if not db_supplier:
            return None
        return self._convert_db_to_pydantic_supplier(db_supplier)

    async def get_supplier_by_document(self, document: str) -> Optional[Supplier]:
        """Get supplier by document."""
        db_supplier = self.repository.get_supplier_by_document(document)
        if not db_supplier:
            return None
        return self._convert_db_to_pydantic_supplier(db_supplier)

    async def list_suppliers(self, query: SupplierQuery) -> List[Supplier]:
        """List suppliers with filters."""
        db_suppliers = self.repository.list_suppliers(
            name=query.name,
            document=query.document,
            category=query.category,
            is_active=query.is_active,
            min_rating=query.min_rating,
            city=query.city,
            state=query.state,
            limit=query.limit,
            offset=query.offset,
        )

        return [
            self._convert_db_to_pydantic_supplier(supplier) for supplier in db_suppliers
        ]

    async def update_supplier(
        self, supplier_id: str, supplier_update: SupplierUpdate
    ) -> Optional[Supplier]:
        """Update supplier."""
        # Convert update data
        update_data = supplier_update.dict(exclude_unset=True)

        # Convert nested models to dicts
        if "address" in update_data and update_data["address"]:
            update_data["address"] = update_data["address"].dict()

        if "contacts" in update_data and update_data["contacts"]:
            update_data["contacts"] = [
                contact.dict() for contact in update_data["contacts"]
            ]

        if "payment_terms" in update_data and update_data["payment_terms"]:
            update_data["payment_terms"] = [
                term.dict() for term in update_data["payment_terms"]
            ]

        db_supplier = self.repository.update_supplier(supplier_id, **update_data)
        if not db_supplier:
            return None

        return self._convert_db_to_pydantic_supplier(db_supplier)

    async def delete_supplier(self, supplier_id: str) -> bool:
        """Delete supplier (soft delete)."""
        return self.repository.delete_supplier(supplier_id)

    # Supplier Product operations
    async def add_supplier_product(
        self,
        supplier_id: str,
        product_id: str,
        product_name: str,
        unit_price: float,
        supplier_code: Optional[str] = None,
        min_order_quantity: int = 1,
        lead_time_days: int = 7,
        is_preferred: bool = False,
    ) -> SupplierProduct:
        """Add a product to a supplier."""
        # Check if supplier exists
        supplier = await self.get_supplier(supplier_id)
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found",
            )

        # Check if relationship already exists
        existing_products = self.repository.get_supplier_products(
            supplier_id, product_id
        )
        if existing_products:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product already associated with this supplier",
            )

        db_supplier_product = self.repository.create_supplier_product(
            supplier_id=supplier_id,
            product_id=product_id,
            product_name=product_name,
            supplier_code=supplier_code,
            unit_price=unit_price,
            min_order_quantity=min_order_quantity,
            lead_time_days=lead_time_days,
            is_preferred=is_preferred,
        )

        return self._convert_db_to_pydantic_supplier_product(db_supplier_product)

    async def get_supplier_products(self, supplier_id: str) -> List[SupplierProduct]:
        """Get products for a supplier."""
        db_supplier_products = self.repository.get_supplier_products(supplier_id)
        return [
            self._convert_db_to_pydantic_supplier_product(sp)
            for sp in db_supplier_products
        ]

    async def get_product_suppliers(self, product_id: str) -> List[SupplierProduct]:
        """Get suppliers for a product."""
        db_supplier_products = self.repository.get_product_suppliers(product_id)
        return [
            self._convert_db_to_pydantic_supplier_product(sp)
            for sp in db_supplier_products
        ]

    async def update_supplier_product(
        self,
        supplier_id: str,
        product_id: str,
        unit_price: Optional[float] = None,
        supplier_code: Optional[str] = None,
        min_order_quantity: Optional[int] = None,
        lead_time_days: Optional[int] = None,
        is_preferred: Optional[bool] = None,
    ) -> Optional[SupplierProduct]:
        """Update supplier product relationship."""
        update_data: Dict[str, Any] = {}
        if unit_price is not None:
            update_data["unit_price"] = unit_price
        if supplier_code is not None:
            update_data["supplier_code"] = supplier_code
        if min_order_quantity is not None:
            update_data["min_order_quantity"] = min_order_quantity
        if lead_time_days is not None:
            update_data["lead_time_days"] = lead_time_days
        if is_preferred is not None:
            update_data["is_preferred"] = is_preferred

        db_supplier_product = self.repository.update_supplier_product(
            supplier_id, product_id, **update_data
        )
        if not db_supplier_product:
            return None

        return self._convert_db_to_pydantic_supplier_product(db_supplier_product)

    async def remove_supplier_product(self, supplier_id: str, product_id: str) -> bool:
        """Remove product from supplier."""
        return self.repository.delete_supplier_product(supplier_id, product_id)

    # Purchase Order operations
    async def create_purchase_order(
        self, purchase_order_create: PurchaseOrderCreate, created_by: str
    ) -> PurchaseOrder:
        """Create a new purchase order."""
        # Get supplier
        supplier = await self.get_supplier(purchase_order_create.supplier_id)
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found",
            )

        # Calculate total amount
        total_amount = sum(item.total_price for item in purchase_order_create.items)

        # Generate order number
        order_number = self.repository.get_next_order_number()

        db_purchase_order = self.repository.create_purchase_order(
            supplier_id=purchase_order_create.supplier_id,
            supplier_name=supplier.name,
            order_number=order_number,
            items=[item.dict() for item in purchase_order_create.items],
            total_amount=total_amount,
            expected_delivery_date=purchase_order_create.expected_delivery_date,
            payment_term_days=purchase_order_create.payment_term_days,
            notes=purchase_order_create.notes,
            created_by=created_by,
        )

        return self._convert_db_to_pydantic_purchase_order(db_purchase_order)

    async def get_purchase_order(self, order_id: str) -> Optional[PurchaseOrder]:
        """Get purchase order by ID."""
        db_purchase_order = self.repository.get_purchase_order_by_id(order_id)
        if not db_purchase_order:
            return None
        return self._convert_db_to_pydantic_purchase_order(db_purchase_order)

    async def get_purchase_order_by_number(
        self, order_number: str
    ) -> Optional[PurchaseOrder]:
        """Get purchase order by order number."""
        db_purchase_order = self.repository.get_purchase_order_by_number(order_number)
        if not db_purchase_order:
            return None
        return self._convert_db_to_pydantic_purchase_order(db_purchase_order)

    async def list_purchase_orders(
        self,
        supplier_id: Optional[str] = None,
        status: Optional[PurchaseOrderStatus] = None,
        created_by: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[PurchaseOrder]:
        """List purchase orders with filters."""
        # Convert status to enum if provided
        status_enum = None
        if status:
            status_enum = PurchaseOrderStatusEnum(status.value)

        db_purchase_orders = self.repository.list_purchase_orders(
            supplier_id=supplier_id,
            status=status_enum,
            created_by=created_by,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=offset,
        )

        return [
            self._convert_db_to_pydantic_purchase_order(po) for po in db_purchase_orders
        ]

    async def update_purchase_order(
        self, order_id: str, purchase_order_update: PurchaseOrderUpdate
    ) -> Optional[PurchaseOrder]:
        """Update purchase order."""
        # Get current order
        current_order = await self.get_purchase_order(order_id)
        if not current_order:
            return None

        # Only allow updates if order is in DRAFT status
        if current_order.status != PurchaseOrderStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only update purchase orders in DRAFT status",
            )

        # Convert update data
        update_data = purchase_order_update.dict(exclude_unset=True)

        # Convert items to dict format
        if "items" in update_data and update_data["items"]:
            update_data["items"] = [item.dict() for item in update_data["items"]]
            # Recalculate total if items changed
            update_data["total_amount"] = sum(
                item["total_price"] for item in update_data["items"]
            )

        db_purchase_order = self.repository.update_purchase_order(
            order_id, **update_data
        )
        if not db_purchase_order:
            return None

        return self._convert_db_to_pydantic_purchase_order(db_purchase_order)

    async def update_purchase_order_status(
        self, order_id: str, status: PurchaseOrderStatus
    ) -> Optional[PurchaseOrder]:
        """Update purchase order status."""
        # Convert to enum
        status_enum = PurchaseOrderStatusEnum(status.value)

        db_purchase_order = self.repository.update_purchase_order_status(
            order_id, status_enum
        )
        if not db_purchase_order:
            return None

        return self._convert_db_to_pydantic_purchase_order(db_purchase_order)

    async def delete_purchase_order(self, order_id: str) -> bool:
        """Delete purchase order (only if in DRAFT status)."""
        return self.repository.delete_purchase_order(order_id)

    async def send_purchase_order(self, order_id: str) -> Optional[PurchaseOrder]:
        """Send purchase order to supplier."""
        return await self.update_purchase_order_status(
            order_id, PurchaseOrderStatus.SENT
        )

    async def confirm_purchase_order(self, order_id: str) -> Optional[PurchaseOrder]:
        """Confirm purchase order from supplier."""
        return await self.update_purchase_order_status(
            order_id, PurchaseOrderStatus.CONFIRMED
        )

    async def receive_purchase_order(self, order_id: str) -> Optional[PurchaseOrder]:
        """Mark purchase order as received."""
        return await self.update_purchase_order_status(
            order_id, PurchaseOrderStatus.RECEIVED
        )

    async def cancel_purchase_order(self, order_id: str) -> Optional[PurchaseOrder]:
        """Cancel purchase order."""
        return await self.update_purchase_order_status(
            order_id, PurchaseOrderStatus.CANCELLED
        )


# Dependency function to get the service
def get_supplier_service(db: Session = Depends(get_db_session)) -> SupplierDBService:
    """Get SupplierDBService instance with database session."""
    return SupplierDBService(db)
