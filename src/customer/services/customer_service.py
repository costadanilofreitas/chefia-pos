from typing import List, Optional, Dict
import uuid
from datetime import datetime

from ..models.customer_models import (
    Customer, CustomerCreate, CustomerUpdate, Address, PurchaseHistoryEntry, PointsRedemption
)

# In-memory storage (replace with database interaction)
_customers_db: dict[uuid.UUID, Customer] = {}
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
        filtered_customers = []
        for customer in _customers_db.values():
            if (search_lower in customer.name.lower() or
                search_lower in customer.email.lower() or
                (customer.phone and search_lower in customer.phone.lower())):
                filtered_customers.append(customer)
        
        return filtered_customers

    async def update_customer(self, customer_id: uuid.UUID, customer_update: CustomerUpdate) -> Optional[Customer]:
        """Updates an existing customer."""
        customer = _customers_db.get(customer_id)
        if not customer:
            return None
        
        # Update fields
        update_data = customer_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(customer, field, value)
        
        customer.last_updated = datetime.utcnow()
        _customers_db[customer_id] = customer
        return customer

    async def delete_customer(self, customer_id: uuid.UUID) -> bool:
        """Deletes a customer."""
        if customer_id in _customers_db:
            del _customers_db[customer_id]
            return True
        return False

    # --- Address Management ---
    async def add_address(self, customer_id: uuid.UUID, address: Address) -> Optional[Customer]:
        """Adds an address to a customer."""
        customer = await self.get_customer(customer_id)
        if not customer:
            return None
        
        # If this is the first address or marked as primary, make it primary
        if not customer.addresses or address.is_primary:
            # Set all existing addresses to non-primary
            for addr in customer.addresses:
                addr.is_primary = False
            address.is_primary = True
        
        customer.addresses.append(address)
        customer.last_updated = datetime.utcnow()
        _customers_db[customer_id] = customer
        return customer

    async def update_address(self, customer_id: uuid.UUID, address_id: uuid.UUID, address_update: Address) -> Optional[Customer]:
        """Updates an address for a customer."""
        customer = await self.get_customer(customer_id)
        if not customer:
            return None
        
        for i, addr in enumerate(customer.addresses):
            if addr.id == address_id:
                # If setting as primary, unset others
                if address_update.is_primary:
                    for other_addr in customer.addresses:
                        other_addr.is_primary = False
                
                customer.addresses[i] = address_update
                customer.last_updated = datetime.utcnow()
                _customers_db[customer_id] = customer
                return customer
        
        return None

    async def remove_address(self, customer_id: uuid.UUID, address_id: uuid.UUID) -> Optional[Customer]:
        """Removes an address from a customer."""
        customer = await self.get_customer(customer_id)
        if not customer:
            return None
        
        for i, addr in enumerate(customer.addresses):
            if addr.id == address_id:
                removed_addr = customer.addresses.pop(i)
                
                # If we removed the primary address, make the first remaining address primary
                if removed_addr.is_primary and customer.addresses:
                    customer.addresses[0].is_primary = True
                
                customer.last_updated = datetime.utcnow()
                _customers_db[customer_id] = customer
                return customer
        
        return None

    # --- Loyalty Management ---
    async def update_loyalty_points(self, customer_id: uuid.UUID, points_change: int, reason: str = "") -> Optional[Customer]:
        """Updates a customer's loyalty points."""
        customer = await self.get_customer(customer_id)
        if not customer:
            return None
        
        customer.loyalty.points += points_change
        customer.loyalty.last_updated = datetime.utcnow()
        
        # Update loyalty level based on points (simple example)
        if customer.loyalty.points >= 1000:
            customer.loyalty.level = "Gold"
        elif customer.loyalty.points >= 500:
            customer.loyalty.level = "Silver"
        elif customer.loyalty.points >= 100:
            customer.loyalty.level = "Bronze"
        else:
            customer.loyalty.level = None
        
        customer.last_updated = datetime.utcnow()
        _customers_db[customer_id] = customer
        return customer

    async def redeem_points(self, customer_id: uuid.UUID, points_to_redeem: int, order_id: uuid.UUID) -> Dict:
        """
        Redeems loyalty points for a discount.
        
        Returns a dictionary with:
        - success: bool
        - discount_amount: float
        - remaining_points: int
        - error: str (if any)
        """
        customer = await self.get_customer(customer_id)
        if not customer:
            return {"success": False, "error": "Customer not found", "discount_amount": 0, "remaining_points": 0}
        
        if customer.loyalty.points < points_to_redeem:
            return {
                "success": False, 
                "error": "Insufficient points", 
                "discount_amount": 0, 
                "remaining_points": customer.loyalty.points
            }
        
        # Calculate discount amount
        discount_amount = points_to_redeem / POINTS_TO_CURRENCY_RATIO
        
        # Deduct points
        customer.loyalty.points -= points_to_redeem
        customer.loyalty.last_updated = datetime.utcnow()
        customer.last_updated = datetime.utcnow()
        _customers_db[customer_id] = customer
        
        # Record redemption
        redemption = PointsRedemption(
            customer_id=customer_id,
            order_id=order_id,
            points_redeemed=points_to_redeem,
            discount_amount=discount_amount
        )
        _points_redemptions_db.append(redemption)
        
        return {
            "success": True,
            "error": None,
            "discount_amount": discount_amount,
            "remaining_points": customer.loyalty.points
        }

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

# Instantiate the service
customer_service = CustomerService()

