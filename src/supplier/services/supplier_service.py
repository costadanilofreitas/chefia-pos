# /home/ubuntu/pos-modern/src/supplier/services/supplier_service.py

import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid
import re

from ..models.supplier_models import (
    Supplier, 
    SupplierCreate, 
    SupplierUpdate, 
    SupplierQuery,
    PurchaseOrder,
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderStatus,
    PurchaseOrderItem
)

from src.stock.services.stock_service import stock_service
from src.logging.services.log_service import log_info, log_error, LogSource

# Configuration
SUPPLIERS_DATA_FILE = os.path.join("/home/ubuntu/pos-modern/data", "suppliers.json")
PURCHASE_ORDERS_DATA_FILE = os.path.join("/home/ubuntu/pos-modern/data", "purchase_orders.json")

# Ensure data directory exists
os.makedirs(os.path.dirname(SUPPLIERS_DATA_FILE), exist_ok=True)

class SupplierService:
    """Service for managing suppliers and purchase orders."""
    
    def __init__(self):
        """Initialize the supplier service."""
        self._load_or_create_data()
    
    def _load_or_create_data(self) -> None:
        """Load existing supplier data or create new data if it doesn't exist."""
        # Load suppliers
        if os.path.exists(SUPPLIERS_DATA_FILE):
            with open(SUPPLIERS_DATA_FILE, 'r') as f:
                self.suppliers = json.load(f)
        else:
            self.suppliers = []
            self._save_suppliers()
        
        # Load purchase orders
        if os.path.exists(PURCHASE_ORDERS_DATA_FILE):
            with open(PURCHASE_ORDERS_DATA_FILE, 'r') as f:
                self.purchase_orders = json.load(f)
        else:
            self.purchase_orders = []
            self._save_purchase_orders()
    
    def _save_suppliers(self) -> None:
        """Save suppliers data to file."""
        with open(SUPPLIERS_DATA_FILE, 'w') as f:
            json.dump(self.suppliers, f, indent=2, default=str)
    
    def _save_purchase_orders(self) -> None:
        """Save purchase orders data to file."""
        with open(PURCHASE_ORDERS_DATA_FILE, 'w') as f:
            json.dump(self.purchase_orders, f, indent=2, default=str)
    
    async def create_supplier(self, supplier_data: SupplierCreate, user_id: str, user_name: str) -> Supplier:
        """
        Create a new supplier.
        
        Args:
            supplier_data: The supplier data
            user_id: ID of the user creating the supplier
            user_name: Name of the user creating the supplier
            
        Returns:
            Supplier: The created supplier
        """
        # Create a new supplier with an ID
        supplier = Supplier(
            **supplier_data.dict(),
            id=str(uuid.uuid4()),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Add to suppliers list
        self.suppliers.append(supplier.dict())
        self._save_suppliers()
        
        # Log the creation
        await log_info(
            message=f"Supplier created: {supplier.name}",
            source=LogSource.SUPPLIER,
            module="supplier",
            user_id=user_id,
            user_name=user_name,
            details={"supplier_id": supplier.id, "supplier_name": supplier.name}
        )
        
        return supplier
    
    async def get_supplier(self, supplier_id: str) -> Optional[Supplier]:
        """
        Get a supplier by ID.
        
        Args:
            supplier_id: The supplier ID
            
        Returns:
            Supplier or None: The supplier if found, None otherwise
        """
        for supplier_data in self.suppliers:
            if supplier_data.get("id") == supplier_id:
                return Supplier(**supplier_data)
        
        return None
    
    async def update_supplier(self, supplier_id: str, supplier_data: SupplierUpdate, user_id: str, user_name: str) -> Optional[Supplier]:
        """
        Update a supplier.
        
        Args:
            supplier_id: The supplier ID
            supplier_data: The updated supplier data
            user_id: ID of the user updating the supplier
            user_name: Name of the user updating the supplier
            
        Returns:
            Supplier or None: The updated supplier if found, None otherwise
        """
        for i, supplier in enumerate(self.suppliers):
            if supplier.get("id") == supplier_id:
                # Get current supplier data
                current_supplier = Supplier(**supplier)
                
                # Update with new data
                update_data = supplier_data.dict(exclude_unset=True)
                updated_supplier = current_supplier.copy(update=update_data)
                updated_supplier.updated_at = datetime.utcnow()
                
                # Replace in list
                self.suppliers[i] = updated_supplier.dict()
                self._save_suppliers()
                
                # Log the update
                await log_info(
                    message=f"Supplier updated: {updated_supplier.name}",
                    source=LogSource.SUPPLIER,
                    module="supplier",
                    user_id=user_id,
                    user_name=user_name,
                    details={
                        "supplier_id": supplier_id,
                        "supplier_name": updated_supplier.name,
                        "updated_fields": list(update_data.keys())
                    }
                )
                
                return updated_supplier
        
        return None
    
    async def delete_supplier(self, supplier_id: str, user_id: str, user_name: str) -> bool:
        """
        Delete a supplier.
        
        Args:
            supplier_id: The supplier ID
            user_id: ID of the user deleting the supplier
            user_name: Name of the user deleting the supplier
            
        Returns:
            bool: True if deleted, False otherwise
        """
        for i, supplier in enumerate(self.suppliers):
            if supplier.get("id") == supplier_id:
                # Check if there are active purchase orders
                has_active_orders = any(
                    po.get("supplier_id") == supplier_id and 
                    po.get("status") not in [PurchaseOrderStatus.RECEIVED.value, PurchaseOrderStatus.CANCELLED.value]
                    for po in self.purchase_orders
                )
                
                if has_active_orders:
                    await log_error(
                        message=f"Failed to delete supplier: {supplier.get('name')} - Has active purchase orders",
                        source=LogSource.SUPPLIER,
                        module="supplier",
                        user_id=user_id,
                        user_name=user_name,
                        details={"supplier_id": supplier_id, "supplier_name": supplier.get("name")}
                    )
                    return False
                
                # Instead of deleting, mark as inactive
                supplier_obj = Supplier(**supplier)
                supplier_obj.is_active = False
                supplier_obj.updated_at = datetime.utcnow()
                self.suppliers[i] = supplier_obj.dict()
                self._save_suppliers()
                
                # Log the deletion
                await log_info(
                    message=f"Supplier marked as inactive: {supplier.get('name')}",
                    source=LogSource.SUPPLIER,
                    module="supplier",
                    user_id=user_id,
                    user_name=user_name,
                    details={"supplier_id": supplier_id, "supplier_name": supplier.get("name")}
                )
                
                return True
        
        return False
    
    async def query_suppliers(self, query: SupplierQuery) -> List[Supplier]:
        """
        Query suppliers based on criteria.
        
        Args:
            query: The query parameters
            
        Returns:
            List[Supplier]: Matching suppliers
        """
        results = []
        
        for supplier_data in self.suppliers:
            if self._supplier_matches_query(supplier_data, query):
                results.append(Supplier(**supplier_data))
        
        # Sort by name
        results.sort(key=lambda s: s.name)
        
        # Apply pagination
        paginated_results = results[query.offset:query.offset + query.limit]
        
        return paginated_results
    
    def _supplier_matches_query(self, supplier_data: Dict[str, Any], query: SupplierQuery) -> bool:
        """
        Check if a supplier matches the query criteria.
        
        Args:
            supplier_data: The supplier data
            query: The query parameters
            
        Returns:
            bool: True if the supplier matches the query, False otherwise
        """
        # Check name
        if query.name and query.name.lower() not in supplier_data.get("name", "").lower():
            return False
        
        # Check document
        if query.document and query.document not in supplier_data.get("document", ""):
            return False
        
        # Check category
        if query.category and query.category != supplier_data.get("category"):
            return False
        
        # Check active status
        if query.is_active is not None and query.is_active != supplier_data.get("is_active", True):
            return False
        
        # Check rating
        if query.min_rating is not None and (supplier_data.get("rating") is None or supplier_data.get("rating") < query.min_rating):
            return False
        
        # Check city
        if query.city and query.city.lower() != supplier_data.get("address", {}).get("city", "").lower():
            return False
        
        # Check state
        if query.state and query.state.lower() != supplier_data.get("address", {}).get("state", "").lower():
            return False
        
        # Check product (would require integration with product service)
        # This is a placeholder for future implementation
        
        return True
    
    async def create_purchase_order(self, order_data: PurchaseOrderCreate, user_id: str, user_name: str) -> PurchaseOrder:
        """
        Create a new purchase order.
        
        Args:
            order_data: The purchase order data
            user_id: ID of the user creating the order
            user_name: Name of the user creating the order
            
        Returns:
            PurchaseOrder: The created purchase order
        """
        # Get supplier
        supplier = await self.get_supplier(order_data.supplier_id)
        if not supplier:
            raise ValueError(f"Supplier not found: {order_data.supplier_id}")
        
        # Generate order number
        order_number = f"PO-{datetime.utcnow().strftime('%Y%m')}-{len(self.purchase_orders) + 1:04d}"
        
        # Calculate total amount
        total_amount = sum(item.quantity * item.unit_price for item in order_data.items)
        
        # Create purchase order
        purchase_order = PurchaseOrder(
            id=str(uuid.uuid4()),
            supplier_id=supplier.id,
            supplier_name=supplier.name,
            order_number=order_number,
            status=PurchaseOrderStatus.DRAFT,
            items=order_data.items,
            total_amount=total_amount,
            expected_delivery_date=order_data.expected_delivery_date,
            payment_term_days=order_data.payment_term_days,
            notes=order_data.notes,
            created_by=user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Add to purchase orders list
        self.purchase_orders.append(purchase_order.dict())
        self._save_purchase_orders()
        
        # Log the creation
        await log_info(
            message=f"Purchase order created: {purchase_order.order_number} for {supplier.name}",
            source=LogSource.SUPPLIER,
            module="purchase_order",
            user_id=user_id,
            user_name=user_name,
            details={
                "purchase_order_id": purchase_order.id,
                "purchase_order_number": purchase_order.order_number,
                "supplier_id": supplier.id,
                "supplier_name": supplier.name,
                "total_amount": purchase_order.total_amount,
                "items_count": len(purchase_order.items)
            }
        )
        
        return purchase_order
    
    async def get_purchase_order(self, order_id: str) -> Optional[PurchaseOrder]:
        """
        Get a purchase order by ID.
        
        Args:
            order_id: The purchase order ID
            
        Returns:
            PurchaseOrder or None: The purchase order if found, None otherwise
        """
        for order_data in self.purchase_orders:
            if order_data.get("id") == order_id:
                return PurchaseOrder(**order_data)
        
        return None
    
    async def update_purchase_order(self, order_id: str, order_data: PurchaseOrderUpdate, user_id: str, user_name: str) -> Optional[PurchaseOrder]:
        """
        Update a purchase order.
        
        Args:
            order_id: The purchase order ID
            order_data: The updated purchase order data
            user_id: ID of the user updating the order
            user_name: Name of the user updating the order
            
        Returns:
            PurchaseOrder or None: The updated purchase order if found, None otherwise
        """
        for i, order in enumerate(self.purchase_orders):
            if order.get("id") == order_id:
                # Check if order can be updated
                status = order.get("status")
                if status not in [PurchaseOrderStatus.DRAFT.value, PurchaseOrderStatus.SENT.value]:
                    await log_error(
                        message=f"Failed to update purchase order: {order.get('order_number')} - Invalid status: {status}",
                        source=LogSource.SUPPLIER,
                        module="purchase_order",
                        user_id=user_id,
                        user_name=user_name,
                        details={"purchase_order_id": order_id, "purchase_order_number": order.get("order_number")}
                    )
                    return None
                
                # Get current order data
                current_order = PurchaseOrder(**order)
                
                # Update with new data
                update_data = order_data.dict(exclude_unset=True)
                
                # Recalculate total amount if items changed
                if "items" in update_data:
                    update_data["total_amount"] = sum(item.quantity * item.unit_price for item in order_data.items)
                
                updated_order = current_order.copy(update=update_data)
                updated_order.updated_at = datetime.utcnow()
                
                # Replace in list
                self.purchase_orders[i] = updated_order.dict()
                self._save_purchase_orders()
                
                # Log the update
                await log_info(
                    message=f"Purchase order updated: {updated_order.order_number}",
                    source=LogSource.SUPPLIER,
                    module="purchase_order",
                    user_id=user_id,
                    user_name=user_name,
                    details={
                        "purchase_order_id": order_id,
                        "purchase_order_number": updated_order.order_number,
                        "updated_fields": list(update_data.keys())
                    }
                )
                
                return updated_order
        
        return None
    
    async def change_purchase_order_status(self, order_id: str, new_status: PurchaseOrderStatus, user_id: str, user_name: str) -> Optional[PurchaseOrder]:
        """
        Change the status of a purchase order.
        
        Args:
            order_id: The purchase order ID
            new_status: The new status
            user_id: ID of the user changing the status
            user_name: Name of the user changing the status
            
        Returns:
            PurchaseOrder or None: The updated purchase order if found, None otherwise
        """
        for i, order in enumerate(self.purchase_orders):
            if order.get("id") == order_id:
                # Get current order data
                current_order = PurchaseOrder(**order)
                current_status = current_order.status
                
                # Check if status change is valid
                if not self._is_valid_status_change(current_status, new_status):
                    await log_error(
                        message=f"Invalid status change for purchase order {current_order.order_number}: {current_status} -> {new_status}",
                        source=LogSource.SUPPLIER,
                        module="purchase_order",
                        user_id=user_id,
                        user_name=user_name,
                        details={
                            "purchase_order_id": order_id,
                            "purchase_order_number": current_order.order_number,
                            "current_status": current_status,
                            "new_status": new_status
                        }
                    )
                    return None
                
                # Update status and timestamp
                update_data = {"status": new_status}
                
                if new_status == PurchaseOrderStatus.SENT:
                    update_data["sent_at"] = datetime.utcnow()
                elif new_status == PurchaseOrderStatus.CONFIRMED:
                    update_data["confirmed_at"] = datetime.utcnow()
                elif new_status == PurchaseOrderStatus.RECEIVED:
                    update_data["received_at"] = datetime.utcnow()
                    
                    # Update stock when order is received
                    try:
                        await self._update_stock_on_order_received(current_order)
                    except Exception as e:
                        await log_error(
                            message=f"Failed to update stock for purchase order {current_order.order_number}: {str(e)}",
                            source=LogSource.SUPPLIER,
                            module="purchase_order",
                            user_id=user_id,
                            user_name=user_name,
                            details={
                                "purchase_order_id": order_id,
                                "purchase_order_number": current_order.order_number,
                                "error": str(e)
                            }
                        )
                elif new_status == PurchaseOrderStatus.CANCELLED:
                    update_data["cancelled_at"] = datetime.utcnow()
                
                updated_order = current_order.copy(update=update_data)
                updated_order.updated_at = datetime.utcnow()
                
                # Replace in list
                self.purchase_orders[i] = updated_order.dict()
                self._save_purchase_orders()
                
                # Log the status change
                await log_info(
                    message=f"Purchase order status changed: {updated_order.order_number} - {current_status} -> {new_status}",
                    source=LogSource.SUPPLIER,
                    module="purchase_order",
                    user_id=user_id,
                    user_name=user_name,
                    details={
                        "purchase_order_id": order_id,
                        "purchase_order_number": updated_order.order_number,
                        "previous_status": current_status,
                        "new_status": new_status
                    }
                )
                
                return updated_order
        
        return None
    
    def _is_valid_status_change(self, current_status: PurchaseOrderStatus, new_status: PurchaseOrderStatus) -> bool:
        """
        Check if a status change is valid.
        
        Args:
            current_status: The current status
            new_status: The new status
            
        Returns:
            bool: True if the status change is valid, False otherwise
        """
        # Define valid status transitions
        valid_transitions = {
            PurchaseOrderStatus.DRAFT: [
                PurchaseOrderStatus.SENT,
                PurchaseOrderStatus.CANCELLED
            ],
            PurchaseOrderStatus.SENT: [
                PurchaseOrderStatus.CONFIRMED,
                PurchaseOrderStatus.CANCELLED
            ],
            PurchaseOrderStatus.CONFIRMED: [
                PurchaseOrderStatus.PARTIALLY_RECEIVED,
                PurchaseOrderStatus.RECEIVED,
                PurchaseOrderStatus.CANCELLED
            ],
            PurchaseOrderStatus.PARTIALLY_RECEIVED: [
                PurchaseOrderStatus.RECEIVED,
                PurchaseOrderStatus.CANCELLED
            ],
            PurchaseOrderStatus.RECEIVED: [],  # Terminal state
            PurchaseOrderStatus.CANCELLED: []   # Terminal state
        }
        
        return new_status in valid_transitions.get(current_status, [])
    
    async def _update_stock_on_order_received(self, order: PurchaseOrder) -> None:
        """
        Update stock when a purchase order is received.
        
        Args:
            order: The purchase order
        """
        for item in order.items:
            # Create stock movement for each item
            await stock_service.add_stock_entry(
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
                source="purchase_order",
                source_id=order.id,
                notes=f"Received from PO: {order.order_number}"
            )
    
    async def query_purchase_orders(self, 
                                   supplier_id: Optional[str] = None,
                                   status: Optional[PurchaseOrderStatus] = None,
                                   start_date: Optional[datetime] = None,
                                   end_date: Optional[datetime] = None,
                                   limit: int = 100,
                                   offset: int = 0) -> List[PurchaseOrder]:
        """
        Query purchase orders based on criteria.
        
        Args:
            supplier_id: Filter by supplier ID
            status: Filter by status
            start_date: Filter by creation date (start)
            end_date: Filter by creation date (end)
            limit: Maximum number of results
            offset: Offset for pagination
            
        Returns:
            List[PurchaseOrder]: Matching purchase orders
        """
        results = []
        
        for order_data in self.purchase_orders:
            if self._purchase_order_matches_query(order_data, supplier_id, status, start_date, end_date):
                results.append(PurchaseOrder(**order_data))
        
        # Sort by creation date (newest first)
        results.sort(key=lambda o: o.created_at, reverse=True)
        
        # Apply pagination
        paginated_results = results[offset:offset + limit]
        
        return paginated_results
    
    def _purchase_order_matches_query(self,
                                     order_data: Dict[str, Any],
                                     supplier_id: Optional[str],
                                     status: Optional[PurchaseOrderStatus],
                                     start_date: Optional[datetime],
                                     end_date: Optional[datetime]) -> bool:
        """
        Check if a purchase order matches the query criteria.
        
        Args:
            order_data: The purchase order data
            supplier_id: Filter by supplier ID
            status: Filter by status
            start_date: Filter by creation date (start)
            end_date: Filter by creation date (end)
            
        Returns:
            bool: True if the purchase order matches the query, False otherwise
        """
        # Check supplier ID
        if supplier_id and order_data.get("supplier_id") != supplier_id:
            return False
        
        # Check status
        if status and order_data.get("status") != status.value:
            return False
        
        # Check creation date
        created_at = datetime.fromisoformat(order_data.get("created_at")) if isinstance(order_data.get("created_at"), str) else order_data.get("created_at")
        
        if start_date and created_at < start_date:
            return False
        
        if end_date and created_at > end_date:
            return False
        
        return True
    
    async def get_supplier_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about suppliers.
        
        Returns:
            Dict[str, Any]: Statistics about suppliers
        """
        total_suppliers = len(self.suppliers)
        active_suppliers = sum(1 for s in self.suppliers if s.get("is_active", True))
        
        # Count by category
        categories = {}
        for supplier in self.suppliers:
            category = supplier.get("category")
            if category:
                categories[category] = categories.get(category, 0) + 1
        
        # Count by state
        states = {}
        for supplier in self.suppliers:
            state = supplier.get("address", {}).get("state")
            if state:
                states[state] = states.get(state, 0) + 1
        
        # Count by rating
        ratings = {
            "5": sum(1 for s in self.suppliers if s.get("rating") == 5),
            "4": sum(1 for s in self.suppliers if s.get("rating") == 4),
            "3": sum(1 for s in self.suppliers if s.get("rating") == 3),
            "2": sum(1 for s in self.suppliers if s.get("rating") == 2),
            "1": sum(1 for s in self.suppliers if s.get("rating") == 1),
            "unrated": sum(1 for s in self.suppliers if s.get("rating") is None)
        }
        
        return {
            "total_suppliers": total_suppliers,
            "active_suppliers": active_suppliers,
            "inactive_suppliers": total_suppliers - active_suppliers,
            "by_category": categories,
            "by_state": states,
            "by_rating": ratings
        }
    
    async def get_purchase_order_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about purchase orders.
        
        Returns:
            Dict[str, Any]: Statistics about purchase orders
        """
        total_orders = len(self.purchase_orders)
        
        # Count by status
        status_counts = {}
        for status in PurchaseOrderStatus:
            status_counts[status.value] = sum(1 for po in self.purchase_orders if po.get("status") == status.value)
        
        # Calculate total value by status
        total_value_by_status = {}
        for status in PurchaseOrderStatus:
            total_value_by_status[status.value] = sum(
                po.get("total_amount", 0) 
                for po in self.purchase_orders 
                if po.get("status") == status.value
            )
        
        # Count by month (last 12 months)
        current_month = datetime.utcnow().replace(day=1)
        months = {}
        
        for i in range(12):
            month = current_month.replace(month=((current_month.month - i - 1) % 12) + 1)
            if month.month > current_month.month:
                month = month.replace(year=current_month.year - 1)
            
            month_str = month.strftime("%Y-%m")
            months[month_str] = sum(
                1 for po in self.purchase_orders
                if datetime.fromisoformat(po.get("created_at")) if isinstance(po.get("created_at"), str) else po.get("created_at").strftime("%Y-%m") == month_str
            )
        
        return {
            "total_orders": total_orders,
            "by_status": status_counts,
            "total_value_by_status": total_value_by_status,
            "by_month": dict(sorted(months.items()))
        }

# Create a singleton instance
supplier_service = SupplierService()
