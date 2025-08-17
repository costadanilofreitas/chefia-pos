"""Repository for supplier database operations."""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from ..models.db_models import (
    PurchaseOrderDB,
    PurchaseOrderStatusEnum,
    SupplierDB,
    SupplierProductDB,
)


class SupplierRepository:
    """Repository for supplier database operations."""

    def __init__(self, db: Session):
        self.db = db

    # Supplier CRUD operations
    def create_supplier(
        self,
        name: str,
        document: str,
        document_type: str,
        address: Dict[str, Any],
        trading_name: Optional[str] = None,
        contacts: Optional[List[Dict[str, Any]]] = None,
        payment_terms: Optional[List[Dict[str, Any]]] = None,
        website: Optional[str] = None,
        category: Optional[str] = None,
        rating: Optional[int] = None,
        is_active: bool = True,
        notes: Optional[str] = None,
    ) -> SupplierDB:
        """Create a new supplier."""
        supplier = SupplierDB(
            id=str(uuid.uuid4()),
            name=name,
            trading_name=trading_name,
            document=document,
            document_type=document_type,
            address=address,
            contacts=contacts or [],
            payment_terms=payment_terms or [],
            website=website,
            category=category,
            rating=rating,
            is_active=is_active,
            notes=notes,
        )

        self.db.add(supplier)
        self.db.commit()
        self.db.refresh(supplier)
        return supplier

    def get_supplier_by_id(self, supplier_id: str) -> Optional[SupplierDB]:
        """Get supplier by ID."""
        return self.db.query(SupplierDB).filter(SupplierDB.id == supplier_id).first()

    def get_supplier_by_document(self, document: str) -> Optional[SupplierDB]:
        """Get supplier by document (CNPJ/CPF)."""
        return self.db.query(SupplierDB).filter(SupplierDB.document == document).first()

    def list_suppliers(
        self,
        name: Optional[str] = None,
        document: Optional[str] = None,
        category: Optional[str] = None,
        is_active: Optional[bool] = None,
        min_rating: Optional[int] = None,
        city: Optional[str] = None,
        state: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[SupplierDB]:
        """List suppliers with filters."""
        query = self.db.query(SupplierDB)

        # Apply filters
        if name:
            query = query.filter(
                or_(
                    SupplierDB.name.ilike(f"%{name}%"),
                    SupplierDB.trading_name.ilike(f"%{name}%"),
                )
            )

        if document:
            query = query.filter(SupplierDB.document.ilike(f"%{document}%"))

        if category:
            query = query.filter(SupplierDB.category.ilike(f"%{category}%"))

        if is_active is not None:
            query = query.filter(SupplierDB.is_active == is_active)

        if min_rating is not None:
            query = query.filter(SupplierDB.rating >= min_rating)

        if city:
            query = query.filter(SupplierDB.address["city"].astext.ilike(f"%{city}%"))

        if state:
            query = query.filter(SupplierDB.address["state"].astext.ilike(f"%{state}%"))

        # Order by name and apply pagination
        return query.order_by(SupplierDB.name).offset(offset).limit(limit).all()

    def update_supplier(self, supplier_id: str, **kwargs) -> Optional[SupplierDB]:
        """Update supplier."""
        supplier = self.get_supplier_by_id(supplier_id)
        if not supplier:
            return None

        # Update fields
        for field, value in kwargs.items():
            if hasattr(supplier, field) and value is not None:
                setattr(supplier, field, value)

        setattr(supplier, 'updated_at', datetime.utcnow())
        self.db.commit()
        self.db.refresh(supplier)
        return supplier

    def delete_supplier(self, supplier_id: str) -> bool:
        """Delete supplier (soft delete by setting is_active to False)."""
        supplier = self.get_supplier_by_id(supplier_id)
        if not supplier:
            return False

        setattr(supplier, 'is_active', False)
        setattr(supplier, 'updated_at', datetime.utcnow())
        self.db.commit()
        return True

    # Supplier Product operations
    def create_supplier_product(
        self,
        supplier_id: str,
        product_id: str,
        product_name: str,
        unit_price: float,
        supplier_code: Optional[str] = None,
        min_order_quantity: int = 1,
        lead_time_days: int = 7,
        is_preferred: bool = False,
    ) -> SupplierProductDB:
        """Create a supplier product relationship."""
        supplier_product = SupplierProductDB(
            id=str(uuid.uuid4()),
            supplier_id=supplier_id,
            product_id=product_id,
            product_name=product_name,
            supplier_code=supplier_code,
            unit_price=unit_price,
            min_order_quantity=min_order_quantity,
            lead_time_days=lead_time_days,
            is_preferred=is_preferred,
        )

        self.db.add(supplier_product)
        self.db.commit()
        self.db.refresh(supplier_product)
        return supplier_product

    def get_supplier_products(
        self, supplier_id: str, product_id: Optional[str] = None
    ) -> List[SupplierProductDB]:
        """Get products for a supplier."""
        query = self.db.query(SupplierProductDB).filter(
            SupplierProductDB.supplier_id == supplier_id
        )

        if product_id:
            query = query.filter(SupplierProductDB.product_id == product_id)

        return query.all()

    def get_product_suppliers(self, product_id: str) -> List[SupplierProductDB]:
        """Get suppliers for a product."""
        return (
            self.db.query(SupplierProductDB)
            .filter(SupplierProductDB.product_id == product_id)
            .all()
        )

    def update_supplier_product(
        self, supplier_id: str, product_id: str, **kwargs
    ) -> Optional[SupplierProductDB]:
        """Update supplier product relationship."""
        supplier_product = (
            self.db.query(SupplierProductDB)
            .filter(
                and_(
                    SupplierProductDB.supplier_id == supplier_id,
                    SupplierProductDB.product_id == product_id,
                )
            )
            .first()
        )

        if not supplier_product:
            return None

        # Update fields
        for field, value in kwargs.items():
            if hasattr(supplier_product, field) and value is not None:
                setattr(supplier_product, field, value)

        setattr(supplier_product, 'updated_at', datetime.utcnow())
        self.db.commit()
        self.db.refresh(supplier_product)
        return supplier_product

    def delete_supplier_product(self, supplier_id: str, product_id: str) -> bool:
        """Delete supplier product relationship."""
        supplier_product = (
            self.db.query(SupplierProductDB)
            .filter(
                and_(
                    SupplierProductDB.supplier_id == supplier_id,
                    SupplierProductDB.product_id == product_id,
                )
            )
            .first()
        )

        if not supplier_product:
            return False

        self.db.delete(supplier_product)
        self.db.commit()
        return True

    # Purchase Order operations
    def create_purchase_order(
        self,
        supplier_id: str,
        supplier_name: str,
        order_number: str,
        items: List[Dict[str, Any]],
        total_amount: float,
        created_by: str,
        expected_delivery_date: Optional[datetime] = None,
        payment_term_days: int = 30,
        notes: Optional[str] = None,
    ) -> PurchaseOrderDB:
        """Create a new purchase order."""
        purchase_order = PurchaseOrderDB(
            id=str(uuid.uuid4()),
            supplier_id=supplier_id,
            supplier_name=supplier_name,
            order_number=order_number,
            items=items,
            total_amount=total_amount,
            expected_delivery_date=expected_delivery_date,
            payment_term_days=payment_term_days,
            notes=notes,
            created_by=created_by,
        )

        self.db.add(purchase_order)
        self.db.commit()
        self.db.refresh(purchase_order)
        return purchase_order

    def get_purchase_order_by_id(self, order_id: str) -> Optional[PurchaseOrderDB]:
        """Get purchase order by ID."""
        return (
            self.db.query(PurchaseOrderDB)
            .filter(PurchaseOrderDB.id == order_id)
            .first()
        )

    def get_purchase_order_by_number(
        self, order_number: str
    ) -> Optional[PurchaseOrderDB]:
        """Get purchase order by order number."""
        return (
            self.db.query(PurchaseOrderDB)
            .filter(PurchaseOrderDB.order_number == order_number)
            .first()
        )

    def list_purchase_orders(
        self,
        supplier_id: Optional[str] = None,
        status: Optional[PurchaseOrderStatusEnum] = None,
        created_by: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[PurchaseOrderDB]:
        """List purchase orders with filters."""
        query = self.db.query(PurchaseOrderDB)

        # Apply filters
        if supplier_id:
            query = query.filter(PurchaseOrderDB.supplier_id == supplier_id)

        if status:
            query = query.filter(PurchaseOrderDB.status == status)

        if created_by:
            query = query.filter(PurchaseOrderDB.created_by == created_by)

        if start_date:
            query = query.filter(PurchaseOrderDB.created_at >= start_date)

        if end_date:
            query = query.filter(PurchaseOrderDB.created_at <= end_date)

        # Order by creation date (newest first) and apply pagination
        return (
            query.order_by(PurchaseOrderDB.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def update_purchase_order(
        self, order_id: str, **kwargs
    ) -> Optional[PurchaseOrderDB]:
        """Update purchase order."""
        purchase_order = self.get_purchase_order_by_id(order_id)
        if not purchase_order:
            return None

        # Update fields
        for field, value in kwargs.items():
            if hasattr(purchase_order, field) and value is not None:
                setattr(purchase_order, field, value)

        setattr(purchase_order, 'updated_at', datetime.utcnow())
        self.db.commit()
        self.db.refresh(purchase_order)
        return purchase_order

    def update_purchase_order_status(
        self, order_id: str, status: PurchaseOrderStatusEnum
    ) -> Optional[PurchaseOrderDB]:
        """Update purchase order status with timestamp."""
        purchase_order = self.get_purchase_order_by_id(order_id)
        if not purchase_order:
            return None

        setattr(purchase_order, 'status', status)
        setattr(purchase_order, 'updated_at', datetime.utcnow())

        # Set status-specific timestamps
        now = datetime.utcnow()
        if status == PurchaseOrderStatusEnum.SENT:
            setattr(purchase_order, 'sent_at', now)
        elif status == PurchaseOrderStatusEnum.CONFIRMED:
            setattr(purchase_order, 'confirmed_at', now)
        elif status == PurchaseOrderStatusEnum.RECEIVED:
            setattr(purchase_order, 'received_at', now)
        elif status == PurchaseOrderStatusEnum.CANCELLED:
            setattr(purchase_order, 'cancelled_at', now)

        self.db.commit()
        self.db.refresh(purchase_order)
        return purchase_order

    def delete_purchase_order(self, order_id: str) -> bool:
        """Delete purchase order (only if in DRAFT status)."""
        purchase_order = self.get_purchase_order_by_id(order_id)
        if not purchase_order or purchase_order.status != PurchaseOrderStatusEnum.DRAFT:
            return False

        self.db.delete(purchase_order)
        self.db.commit()
        return True

    def get_next_order_number(self) -> str:
        """Generate next purchase order number."""
        # Get current year
        current_year = datetime.now().year

        # Find the highest order number for current year
        prefix = f"PO-{current_year}-"
        latest_order = (
            self.db.query(PurchaseOrderDB)
            .filter(PurchaseOrderDB.order_number.like(f"{prefix}%"))
            .order_by(PurchaseOrderDB.order_number.desc())
            .first()
        )

        if latest_order:
            # Extract number from latest order and increment
            latest_number = int(latest_order.order_number.split("-")[-1])
            next_number = latest_number + 1
        else:
            next_number = 1

        return f"{prefix}{next_number:04d}"
