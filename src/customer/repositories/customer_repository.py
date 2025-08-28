# Customer repository for database operations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

from ..models.customer_models import (
    Address,
    CustomerCreate,
    CustomerUpdate,
    PurchaseHistoryEntry,
)
from ..models.db_models import (
    AddressDB,
    CustomerDB,
    LoyaltyDB,
    PointsRedemptionDB,
    PurchaseHistoryDB,
)


class CustomerRepository:
    """Repository for customer database operations."""

    def __init__(self, db: Session):
        self.db = db

    def create_customer(self, customer_data: CustomerCreate) -> CustomerDB:
        """Create a new customer in the database."""
        # Create customer
        db_customer = CustomerDB(
            name=customer_data.name,
            phone=customer_data.phone,
            email=customer_data.email,
        )
        self.db.add(db_customer)
        self.db.flush()  # Get the ID

        # Create loyalty record
        loyalty = LoyaltyDB(customer_id=db_customer.id)
        self.db.add(loyalty)

        # Create addresses if provided
        if customer_data.addresses:
            for addr_data in customer_data.addresses:
                address = AddressDB(
                    customer_id=db_customer.id,
                    street=addr_data.street,
                    number=addr_data.number,
                    complement=addr_data.complement,
                    neighborhood=addr_data.neighborhood,
                    city=addr_data.city,
                    state=addr_data.state,
                    zip_code=addr_data.zip_code,
                    is_primary=addr_data.is_primary,
                )
                self.db.add(address)

        self.db.commit()
        self.db.refresh(db_customer)
        return db_customer

    def get_customer_by_id(self, customer_id: uuid.UUID) -> Optional[CustomerDB]:
        """Get a customer by ID with all related data."""
        return (
            self.db.query(CustomerDB)
            .options(
                joinedload(CustomerDB.addresses),
                joinedload(CustomerDB.loyalty),
                joinedload(CustomerDB.purchase_history),
                joinedload(CustomerDB.points_redemptions),
            )
            .filter(CustomerDB.id == customer_id)
            .first()
        )

    def get_customer_by_phone(self, phone: str) -> Optional[CustomerDB]:
        """Get a customer by phone number."""
        return (
            self.db.query(CustomerDB)
            .options(
                joinedload(CustomerDB.addresses),
                joinedload(CustomerDB.loyalty),
                joinedload(CustomerDB.purchase_history),
            )
            .filter(CustomerDB.phone == phone)
            .first()
        )

    def get_customer_by_email(self, email: str) -> Optional[CustomerDB]:
        """Get a customer by email address."""
        return (
            self.db.query(CustomerDB)
            .options(
                joinedload(CustomerDB.addresses),
                joinedload(CustomerDB.loyalty),
                joinedload(CustomerDB.purchase_history),
            )
            .filter(CustomerDB.email == email)
            .first()
        )

    def list_customers(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        phone: Optional[str] = None,
        email: Optional[str] = None,
    ) -> List[CustomerDB]:
        """List customers with optional search filters."""
        query = self.db.query(CustomerDB).options(
            joinedload(CustomerDB.addresses), joinedload(CustomerDB.loyalty)
        )

        # Apply filters
        if search:
            query = query.filter(
                or_(
                    CustomerDB.name.ilike(f"%{search}%"),
                    CustomerDB.phone.ilike(f"%{search}%"),
                    CustomerDB.email.ilike(f"%{search}%"),
                )
            )

        if phone:
            query = query.filter(CustomerDB.phone == phone)

        if email:
            query = query.filter(CustomerDB.email == email)

        return query.order_by(CustomerDB.name).offset(skip).limit(limit).all()

    def update_customer(
        self, customer_id: uuid.UUID, customer_data: CustomerUpdate
    ) -> Optional[CustomerDB]:
        """Update a customer's basic information."""
        db_customer = (
            self.db.query(CustomerDB).filter(CustomerDB.id == customer_id).first()
        )
        if not db_customer:
            return None

        update_data = customer_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_customer, field, value)

        db_customer.last_updated = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_customer)
        return db_customer

    def delete_customer(self, customer_id: uuid.UUID) -> bool:
        """Delete a customer and all related data."""
        db_customer = (
            self.db.query(CustomerDB).filter(CustomerDB.id == customer_id).first()
        )
        if not db_customer:
            return False

        self.db.delete(db_customer)
        self.db.commit()
        return True

    # Address operations
    def add_address(
        self, customer_id: uuid.UUID, address_data: Address
    ) -> Optional[AddressDB]:
        """Add a new address to a customer."""
        # Check if customer exists
        customer = (
            self.db.query(CustomerDB).filter(CustomerDB.id == customer_id).first()
        )
        if not customer:
            return None

        # If this is primary, unset others
        if address_data.is_primary:
            self.db.query(AddressDB).filter(
                AddressDB.customer_id == customer_id
            ).update({"is_primary": False})

        address = AddressDB(
            customer_id=customer_id,
            street=address_data.street,
            number=address_data.number,
            complement=address_data.complement,
            neighborhood=address_data.neighborhood,
            city=address_data.city,
            state=address_data.state,
            zip_code=address_data.zip_code,
            is_primary=address_data.is_primary,
        )
        self.db.add(address)
        self.db.commit()
        self.db.refresh(address)
        return address

    def update_address(
        self, address_id: uuid.UUID, address_data: Address
    ) -> Optional[AddressDB]:
        """Update an existing address."""
        db_address = self.db.query(AddressDB).filter(AddressDB.id == address_id).first()
        if not db_address:
            return None

        # If setting as primary, unset others for this customer
        if address_data.is_primary:
            self.db.query(AddressDB).filter(
                and_(
                    AddressDB.customer_id == db_address.customer_id,
                    AddressDB.id != address_id,
                )
            ).update({"is_primary": False})

        update_data = address_data.dict(exclude={"id"})
        for field, value in update_data.items():
            setattr(db_address, field, value)

        self.db.commit()
        self.db.refresh(db_address)
        return db_address

    def delete_address(self, address_id: uuid.UUID) -> bool:
        """Delete an address."""
        db_address = self.db.query(AddressDB).filter(AddressDB.id == address_id).first()
        if not db_address:
            return False

        self.db.delete(db_address)
        self.db.commit()
        return True

    # Loyalty operations
    def update_loyalty_points(
        self, customer_id: uuid.UUID, points_change: int
    ) -> Optional[LoyaltyDB]:
        """Update customer loyalty points (can be positive or negative)."""
        loyalty = (
            self.db.query(LoyaltyDB)
            .filter(LoyaltyDB.customer_id == customer_id)
            .first()
        )
        if not loyalty:
            return None

        loyalty.points = max(0, int(loyalty.points) + points_change)  # Don't go below 0
        loyalty.last_updated = datetime.utcnow()

        # Update loyalty level based on points
        current_points = int(loyalty.points)
        if current_points >= 1000:
            loyalty.level = "Platinum"
        elif current_points >= 500:
            loyalty.level = "Gold"
        elif current_points >= 100:
            loyalty.level = "Silver"
        else:
            loyalty.level = "Bronze"

        self.db.commit()
        self.db.refresh(loyalty)
        return loyalty

    def add_purchase_history(
        self, customer_id: uuid.UUID, purchase_data: PurchaseHistoryEntry
    ) -> PurchaseHistoryDB:
        """Add a purchase to customer history."""
        purchase = PurchaseHistoryDB(
            customer_id=customer_id,
            order_id=purchase_data.order_id,
            purchase_date=purchase_data.purchase_date,
            total_amount=purchase_data.total_amount,
            items_summary=purchase_data.items_summary,
        )
        self.db.add(purchase)
        self.db.commit()
        self.db.refresh(purchase)
        return purchase

    def redeem_points(
        self,
        customer_id: uuid.UUID,
        order_id: uuid.UUID,
        points_to_redeem: int,
        discount_amount: float,
    ) -> Optional[PointsRedemptionDB]:
        """Redeem loyalty points for a discount."""
        # Check if customer has enough points
        loyalty = (
            self.db.query(LoyaltyDB)
            .filter(LoyaltyDB.customer_id == customer_id)
            .first()
        )
        if not loyalty or loyalty.points < points_to_redeem:
            return None

        # Deduct points
        loyalty.points = int(loyalty.points) - points_to_redeem
        loyalty.last_updated = datetime.utcnow()

        # Record redemption
        redemption = PointsRedemptionDB(
            customer_id=customer_id,
            order_id=order_id,
            points_redeemed=points_to_redeem,
            discount_amount=discount_amount,
        )
        self.db.add(redemption)
        self.db.commit()
        self.db.refresh(redemption)
        return redemption

    def get_customer_analytics(
        self, customer_id: uuid.UUID
    ) -> Optional[Dict[str, Any]]:
        """Get analytics data for a customer."""
        customer = self.get_customer_by_id(customer_id)
        if not customer:
            return None

        total_purchases = len(customer.purchase_history)
        total_spent = sum(p.total_amount for p in customer.purchase_history)
        avg_order_value = total_spent / total_purchases if total_purchases > 0 else 0

        return {
            "total_purchases": total_purchases,
            "total_spent": total_spent,
            "average_order_value": avg_order_value,
            "loyalty_points": customer.loyalty.points if customer.loyalty else 0,
            "loyalty_level": customer.loyalty.level if customer.loyalty else "Bronze",
            "last_purchase": max(
                (p.purchase_date for p in customer.purchase_history), default=None
            ),
        }
