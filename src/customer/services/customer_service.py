# /home/ubuntu/pos-modern/src/customer/services/customer_service.py

from fastapi import HTTPException, status
from typing import List, Optional, Dict
import uuid
from datetime import datetime, date
from enum import Enum

from ..models.customer_models import (
    Customer, CustomerCreate, CustomerUpdate, Address, PurchaseHistoryEntry, Loyalty,
    Coupon, CouponCreate, CouponUpdate, CouponRedemption, PointsRedemption,
    CouponType, CouponScope
)

# In-memory storage (replace with database interaction)
_customers_db: dict[uuid.UUID, Customer] = {}
_coupons_db: dict[uuid.UUID, Coupon] = {}
_coupon_codes_map: dict[str, uuid.UUID] = {}  # For quick lookup by code
_coupon_redemptions_db: list[CouponRedemption] = []
_points_redemptions_db: list[PointsRedemption] = []

# Configuration for points conversion (should be moved to a config file)
POINTS_TO_CURRENCY_RATIO = 100  # 100 points = 1 currency unit (e.g., R$1.00)

class CustomerService:
    """Service layer for managing customers, addresses, loyalty, and purchase history."""

    async def create_customer(self, customer_create: CustomerCreate) -> Customer:
        """Creates a new customer."""
        customer_id = uuid.uuid4()
        now = datetime.utcnow()
        customer = Customer(
            id=customer_id,
            created_at=now,
            last_updated=now,
            **customer_create.dict()
        )
        _customers_db[customer_id] = customer
        return customer

    async def get_customer(self, customer_id: uuid.UUID) -> Optional[Customer]:
        """Retrieves a customer by their ID."""
        return _customers_db.get(customer_id)

    async def list_customers(self, search: Optional[str] = None) -> List[Customer]:
        """Lists all customers, optionally filtering by name, phone, or email."""
        if not search:
            return list(_customers_db.values())

        search_lower = search.lower()
        return [
            c for c in _customers_db.values()
            if search_lower in c.name.lower() or
               (c.phone and search_lower in c.phone) or
               (c.email and search_lower in c.email.lower())
        ]

    async def update_customer(self, customer_id: uuid.UUID, customer_update: CustomerUpdate) -> Optional[Customer]:
        """Updates basic customer details (name, phone, email)."""
        customer = await self.get_customer(customer_id)
        if not customer:
            return None

        update_data = customer_update.dict(exclude_unset=True)
        if not update_data:
             return customer # No changes requested

        updated_customer = customer.copy(update=update_data)
        updated_customer.last_updated = datetime.utcnow()
        _customers_db[customer_id] = updated_customer
        return updated_customer

    async def delete_customer(self, customer_id: uuid.UUID) -> bool:
        """Deletes a customer."""
        if customer_id in _customers_db:
            del _customers_db[customer_id]
            return True
        return False

    # --- Address Management ---
    async def add_address(self, customer_id: uuid.UUID, address: Address) -> Optional[Customer]:
        """Adds a new address to a customer."""
        customer = await self.get_customer(customer_id)
        if not customer:
            return None
        # Ensure only one primary address
        if address.is_primary:
            for existing_addr in customer.addresses:
                existing_addr.is_primary = False
        customer.addresses.append(address)
        customer.last_updated = datetime.utcnow()
        _customers_db[customer_id] = customer
        return customer

    async def update_address(self, customer_id: uuid.UUID, address_id: uuid.UUID, address_update: Address) -> Optional[Customer]:
        """Updates an existing address for a customer."""
        customer = await self.get_customer(customer_id)
        if not customer:
            return None

        address_found = False
        for i, addr in enumerate(customer.addresses):
            if addr.id == address_id:
                 # Ensure only one primary address
                if address_update.is_primary and not addr.is_primary:
                    for other_addr in customer.addresses:
                        if other_addr.id != address_id:
                            other_addr.is_primary = False
                customer.addresses[i] = address_update # Replace with updated address
                address_found = True
                break

        if not address_found:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")

        customer.last_updated = datetime.utcnow()
        _customers_db[customer_id] = customer
        return customer

    async def delete_address(self, customer_id: uuid.UUID, address_id: uuid.UUID) -> Optional[Customer]:
        """Deletes an address from a customer."""
        customer = await self.get_customer(customer_id)
        if not customer:
            return None

        initial_len = len(customer.addresses)
        customer.addresses = [addr for addr in customer.addresses if addr.id != address_id]

        if len(customer.addresses) == initial_len:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")

        # If the deleted address was primary, try to set another one as primary (optional logic)
        # Or ensure at least one address remains primary if required

        customer.last_updated = datetime.utcnow()
        _customers_db[customer_id] = customer
        return customer

    # --- Loyalty Management ---
    async def update_loyalty_points(self, customer_id: uuid.UUID, points_change: int) -> Optional[Loyalty]:
        """Updates loyalty points for a customer."""
        customer = await self.get_customer(customer_id)
        if not customer:
            return None
        customer.loyalty.points += points_change
        customer.loyalty.last_updated = datetime.utcnow()
        # Add logic to update loyalty level based on points if needed
        customer.last_updated = datetime.utcnow()
        _customers_db[customer_id] = customer
        return customer.loyalty

    async def calculate_points_discount(self, customer_id: uuid.UUID, points_to_redeem: int) -> Dict:
        """Calculates the discount amount for a given number of points."""
        customer = await self.get_customer(customer_id)
        if not customer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        
        if points_to_redeem <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Points to redeem must be positive")
        
        if customer.loyalty.points < points_to_redeem:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Insufficient points. Customer has {customer.loyalty.points} points, but {points_to_redeem} were requested."
            )
        
        # Calculate discount amount based on the conversion ratio
        discount_amount = points_to_redeem / POINTS_TO_CURRENCY_RATIO
        
        return {
            "points_to_redeem": points_to_redeem,
            "discount_amount": discount_amount,
            "remaining_points": customer.loyalty.points - points_to_redeem
        }

    async def redeem_points(self, customer_id: uuid.UUID, order_id: uuid.UUID, points_to_redeem: int) -> PointsRedemption:
        """Redeems loyalty points for a discount on an order."""
        # Calculate the discount
        calculation = await self.calculate_points_discount(customer_id, points_to_redeem)
        
        # Deduct the points from the customer's loyalty account
        customer = await self.get_customer(customer_id)
        customer.loyalty.points -= points_to_redeem
        customer.loyalty.last_updated = datetime.utcnow()
        _customers_db[customer_id] = customer
        
        # Record the redemption
        redemption = PointsRedemption(
            customer_id=customer_id,
            order_id=order_id,
            points_redeemed=points_to_redeem,
            discount_amount=calculation["discount_amount"]
        )
        _points_redemptions_db.append(redemption)
        
        return redemption

    # --- Purchase History Management ---
    async def add_purchase_history(self, customer_id: uuid.UUID, purchase: PurchaseHistoryEntry) -> Optional[Customer]:
        """Adds a purchase record to the customer's history."""
        customer = await self.get_customer(customer_id)
        if not customer:
            return None
        customer.purchase_history.append(purchase)
        customer.last_updated = datetime.utcnow()
        _customers_db[customer_id] = customer
        return customer

    # --- Coupon Management ---
    async def create_coupon(self, coupon_create: CouponCreate) -> Coupon:
        """Creates a new coupon."""
        # Check if code already exists
        if coupon_create.code in _coupon_codes_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Coupon code '{coupon_create.code}' already exists"
            )
        
        # Validate coupon data
        if coupon_create.discount_type == CouponType.PERCENTAGE and (coupon_create.discount_value <= 0 or coupon_create.discount_value > 100):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Percentage discount must be between 0 and 100"
            )
        
        if coupon_create.discount_type == CouponType.FIXED and coupon_create.discount_value <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fixed discount must be greater than 0"
            )
        
        if coupon_create.scope == CouponScope.PRODUCT and not coupon_create.product_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product ID is required for product-specific coupons"
            )
        
        # Create the coupon
        coupon_id = uuid.uuid4()
        now = datetime.utcnow()
        coupon = Coupon(
            id=coupon_id,
            created_at=now,
            updated_at=now,
            **coupon_create.dict()
        )
        
        _coupons_db[coupon_id] = coupon
        _coupon_codes_map[coupon.code] = coupon_id
        
        return coupon

    async def get_coupon(self, coupon_id: uuid.UUID) -> Optional[Coupon]:
        """Retrieves a coupon by its ID."""
        return _coupons_db.get(coupon_id)

    async def get_coupon_by_code(self, code: str) -> Optional[Coupon]:
        """Retrieves a coupon by its code."""
        coupon_id = _coupon_codes_map.get(code)
        if not coupon_id:
            return None
        return _coupons_db.get(coupon_id)

    async def list_coupons(self, active_only: bool = False) -> List[Coupon]:
        """Lists all coupons, optionally filtering by active status."""
        coupons = list(_coupons_db.values())
        if active_only:
            today = date.today()
            return [
                c for c in coupons 
                if c.is_active and 
                c.valid_from <= today and 
                (c.valid_until is None or c.valid_until >= today) and
                (c.max_uses is None or c.uses_count < c.max_uses)
            ]
        return coupons

    async def update_coupon(self, coupon_id: uuid.UUID, coupon_update: CouponUpdate) -> Optional[Coupon]:
        """Updates a coupon."""
        coupon = await self.get_coupon(coupon_id)
        if not coupon:
            return None
        
        update_data = coupon_update.dict(exclude_unset=True)
        if not update_data:
            return coupon  # No changes requested
        
        updated_coupon = coupon.copy(update=update_data)
        updated_coupon.updated_at = datetime.utcnow()
        _coupons_db[coupon_id] = updated_coupon
        
        return updated_coupon

    async def delete_coupon(self, coupon_id: uuid.UUID) -> bool:
        """Deletes a coupon."""
        if coupon_id not in _coupons_db:
            return False
        
        coupon = _coupons_db[coupon_id]
        del _coupon_codes_map[coupon.code]
        del _coupons_db[coupon_id]
        return True

    async def validate_coupon(self, code: str, order_value: float, product_id: Optional[uuid.UUID] = None) -> Dict:
        """Validates a coupon and calculates the discount amount."""
        coupon = await self.get_coupon_by_code(code)
        if not coupon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Coupon with code '{code}' not found"
            )
        
        # Check if coupon is active
        if not coupon.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This coupon is not active"
            )
        
        # Check validity dates
        today = date.today()
        if coupon.valid_from > today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This coupon is not valid yet. Valid from {coupon.valid_from}"
            )
        
        if coupon.valid_until and coupon.valid_until < today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This coupon has expired on {coupon.valid_until}"
            )
        
        # Check usage limit
        if coupon.max_uses and coupon.uses_count >= coupon.max_uses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This coupon has reached its maximum number of uses"
            )
        
        # Check minimum order value
        if coupon.min_order_value and order_value < coupon.min_order_value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order value must be at least {coupon.min_order_value} to use this coupon"
            )
        
        # Check product-specific coupon
        if coupon.scope == CouponScope.PRODUCT:
            if not product_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Product ID is required for this coupon"
                )
            
            if product_id != coupon.product_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"This coupon is only valid for product with ID {coupon.product_id}"
                )
        
        # Calculate discount amount
        discount_amount = 0.0
        if coupon.discount_type == CouponType.FIXED:
            discount_amount = coupon.discount_value
        else:  # PERCENTAGE
            discount_amount = order_value * (coupon.discount_value / 100)
            
            # Apply maximum discount if specified
            if coupon.max_discount and discount_amount > coupon.max_discount:
                discount_amount = coupon.max_discount
        
        return {
            "coupon": coupon,
            "discount_amount": discount_amount,
            "is_valid": True
        }

    async def redeem_coupon(self, code: str, order_id: uuid.UUID, customer_id: Optional[uuid.UUID], discount_amount: float) -> CouponRedemption:
        """Records a coupon redemption and updates the coupon usage count."""
        coupon = await self.get_coupon_by_code(code)
        if not coupon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Coupon with code '{code}' not found"
            )
        
        # Increment usage count
        coupon.uses_count += 1
        coupon.updated_at = datetime.utcnow()
        _coupons_db[coupon.id] = coupon
        
        # Record redemption
        redemption = CouponRedemption(
            coupon_id=coupon.id,
            order_id=order_id,
            customer_id=customer_id,
            discount_amount=discount_amount
        )
        _coupon_redemptions_db.append(redemption)
        
        return redemption

# Instantiate the service
customer_service = CustomerService()
