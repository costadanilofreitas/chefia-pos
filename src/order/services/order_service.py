from typing import List, Dict, Any, Optional, Union
from fastapi import HTTPException, status
from datetime import datetime
import uuid
import json
import os

from src.product.models.product import (
    OrderItem, OrderItemCreate, OrderItemUpdate, Order, OrderCreate, OrderUpdate,
    OrderStatus, PaymentStatus, PaymentMethod, OrderType,
    ApplyCouponRequest, ApplyPointsRequest, DiscountResponse
)
from src.core.events.event_bus import get_event_bus, Event, EventType
from src.customer.services.customer_service import customer_service

# Simulação de banco de dados com arquivo JSON
DATA_DIR = os.path.join("/home/ubuntu/pos-modern/data")
ORDERS_FILE = os.path.join(DATA_DIR, "orders.json")
ORDER_ITEMS_FILE = os.path.join(DATA_DIR, "order_items.json")

# Garantir que os diretórios existem
os.makedirs(DATA_DIR, exist_ok=True)

# Inicializar arquivos de dados se não existirem
for file_path in [ORDERS_FILE, ORDER_ITEMS_FILE]:
    if not os.path.exists(file_path):
        with open(file_path, 'w') as f:
            json.dump([], f)

class OrderService:
    """Serviço para gerenciamento de pedidos."""
    
    def _load_data(self, file_path: str) -> List[Dict[str, Any]]:
        """Carrega dados de um arquivo JSON."""
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _save_data(self, file_path: str, data: List[Dict[str, Any]]) -> None:
        """Salva dados em um arquivo JSON."""
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=4)

    def _load_orders(self) -> List[Dict[str, Any]]:
        return self._load_data(ORDERS_FILE)

    def _save_orders(self, orders: List[Dict[str, Any]]) -> None:
        self._save_data(ORDERS_FILE, orders)

    def _load_order_items(self) -> List[Dict[str, Any]]:
        return self._load_data(ORDER_ITEMS_FILE)

    def _save_order_items(self, items: List[Dict[str, Any]]) -> None:
        self._save_data(ORDER_ITEMS_FILE, items)

    def _generate_order_number(self) -> str:
        """Gera um número de pedido sequencial simples."""
        orders = self._load_orders()
        if not orders:
            return "1"
        last_order_number = max(int(o.get("order_number", "0")) for o in orders)
        return str(last_order_number + 1)

    async def create_order(self, order_data: OrderCreate, cashier_id: Optional[str] = None) -> Order:
        """Cria um novo pedido."""
        orders = self._load_orders()
        order_items_db = self._load_order_items()
        
        order_number = self._generate_order_number()
        
        order = Order(
            id=str(uuid.uuid4()),
            customer_id=order_data.customer_id,
            customer_name=order_data.customer_name,
            cashier_id=cashier_id or order_data.cashier_id,
            table_number=order_data.table_number,
            order_number=order_number,
            order_type=order_data.order_type,
            status=OrderStatus.PENDING,
            payment_status=PaymentStatus.PENDING,
            items=[],
            subtotal=0.0,
            tax=0.0,
            discount=0.0,
            total=0.0,
            notes=order_data.notes
        )
        
        product_service = get_product_service()
        subtotal = 0.0
        new_order_items = []
        
        for item_data in order_data.items:
            product = await product_service.get_product(item_data.product_id)
            if not product:
                raise HTTPException(status_code=404, detail=f"Produto com ID {item_data.product_id} não encontrado")
            
            unit_price = product.price
            if product.type == ProductType.COMPOSITE and item_data.sections:
                section_product_ids = {s.section_id: s.product_id for s in item_data.sections}
                unit_price = await product_service.calculate_composite_product_price(product.id, section_product_ids)
            
            price_adjustment = sum(c.price_adjustment for c in item_data.customizations)
            unit_price += price_adjustment
            total_price = unit_price * item_data.quantity
            subtotal += total_price
            
            order_item = OrderItem(
                id=str(uuid.uuid4()),
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                product_type=product.type,
                quantity=item_data.quantity,
                unit_price=unit_price,
                total_price=total_price,
                customizations=item_data.customizations,
                sections=item_data.sections,
                notes=item_data.notes
            )
            order.items.append(order_item)
            new_order_items.append(order_item.dict())
        
        order.subtotal = subtotal
        order.total = subtotal - order.discount + order.tax
        
        orders.append(order.dict())
        order_items_db.extend(new_order_items)
        
        self._save_orders(orders)
        self._save_order_items(order_items_db)
        
        event_bus = get_event_bus()
        await event_bus.publish(Event(event_type=EventType.ORDER_CREATED, data=order.dict()))
        
        return order
    
    async def get_order(self, order_id: str) -> Optional[Order]:
        """Busca um pedido pelo ID."""
        orders = self._load_orders()
        order_dict = next((o for o in orders if o["id"] == order_id), None)
        if not order_dict:
            return None
        
        order_items_db = self._load_order_items()
        items = [OrderItem(**item) for item in order_items_db if item["order_id"] == order_id]
        
        order = Order(**order_dict)
        order.items = items
        return order
    
    async def list_orders(
        self,
        customer_id: Optional[str] = None,
        cashier_id: Optional[str] = None,
        status: Optional[OrderStatus] = None,
        payment_status: Optional[PaymentStatus] = None,
        order_type: Optional[OrderType] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Order]:
        """Lista pedidos com filtros."""
        orders = self._load_orders()
        
        filtered_orders = orders
        if customer_id: filtered_orders = [o for o in filtered_orders if o.get("customer_id") == customer_id]
        if cashier_id: filtered_orders = [o for o in filtered_orders if o.get("cashier_id") == cashier_id]
        if status: filtered_orders = [o for o in filtered_orders if o.get("status") == status]
        if payment_status: filtered_orders = [o for o in filtered_orders if o.get("payment_status") == payment_status]
        if order_type: filtered_orders = [o for o in filtered_orders if o.get("order_type") == order_type]
        if start_date: filtered_orders = [o for o in filtered_orders if o.get("created_at", "") >= start_date]
        if end_date: filtered_orders = [o for o in filtered_orders if o.get("created_at", "") <= end_date]
        
        filtered_orders.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        paginated_orders = filtered_orders[offset:offset + limit]
        
        order_items_db = self._load_order_items()
        result = []
        for order_dict in paginated_orders:
            items = [OrderItem(**item) for item in order_items_db if item["order_id"] == order_dict["id"]]
            order = Order(**order_dict)
            order.items = items
            result.append(order)
        return result
    
    async def update_order(self, order_id: str, update_data: OrderUpdate) -> Optional[Order]:
        """Atualiza um pedido."""
        orders = self._load_orders()
        order_index = next((i for i, o in enumerate(orders) if o["id"] == order_id), None)
        if order_index is None: return None
        
        update_dict = update_data.dict(exclude_unset=True)
        orders[order_index].update(update_dict)
        orders[order_index]["updated_at"] = datetime.now().isoformat()
        
        if update_data.status == OrderStatus.DELIVERED:
            orders[order_index]["completed_at"] = datetime.now().isoformat()
        
        # Recalculate total if any discount-related fields were updated
        if any(key in update_dict for key in ["discount", "coupon_discount", "points_discount", "tax"]):
            subtotal = orders[order_index]["subtotal"]
            total_discount = (
                orders[order_index].get("discount", 0) + 
                orders[order_index].get("coupon_discount", 0) + 
                orders[order_index].get("points_discount", 0)
            )
            tax = orders[order_index].get("tax", 0)
            orders[order_index]["total"] = subtotal - total_discount + tax
        
        self._save_orders(orders)
        
        order_items_db = self._load_order_items()
        items = [OrderItem(**item) for item in order_items_db if item["order_id"] == order_id]
        order = Order(**orders[order_index])
        order.items = items
        
        event_bus = get_event_bus()
        await event_bus.publish(Event(event_type=EventType.ORDER_UPDATED, data={
            "order": order.dict(),
            "updates": update_dict
        }))
        return order
    
    async def add_order_item(self, order_id: str, item_data: OrderItemCreate) -> Optional[OrderItem]:
        """Adiciona um item a um pedido existente."""
        order = await self.get_order(order_id)
        if not order: return None
        if order.status not in [OrderStatus.PENDING, OrderStatus.PREPARING]:
            raise HTTPException(status_code=400, detail="Não é possível adicionar itens a um pedido que já foi entregue ou cancelado")
        
        product_service = get_product_service()
        product = await product_service.get_product(item_data.product_id)
        if not product: raise HTTPException(status_code=404, detail=f"Produto com ID {item_data.product_id} não encontrado")
        
        unit_price = product.price
        if product.type == ProductType.COMPOSITE and item_data.sections:
            section_product_ids = {s.section_id: s.product_id for s in item_data.sections}
            unit_price = await product_service.calculate_composite_product_price(product.id, section_product_ids)
        
        price_adjustment = sum(c.price_adjustment for c in item_data.customizations)
        unit_price += price_adjustment
        total_price = unit_price * item_data.quantity
        
        order_item = OrderItem(
            id=str(uuid.uuid4()),
            order_id=order_id,
            product_id=product.id,
            product_name=product.name,
            product_type=product.type,
            quantity=item_data.quantity,
            unit_price=unit_price,
            total_price=total_price,
            customizations=item_data.customizations,
            sections=item_data.sections,
            notes=item_data.notes
        )
        
        order_items_db = self._load_order_items()
        order_items_db.append(order_item.dict())
        self._save_order_items(order_items_db)
        
        orders = self._load_orders()
        order_index = next((i for i, o in enumerate(orders) if o["id"] == order_id), None)
        if order_index is not None:
            orders[order_index]["subtotal"] += total_price
            
            # Recalculate total with all discounts
            subtotal = orders[order_index]["subtotal"]
            total_discount = (
                orders[order_index].get("discount", 0) + 
                orders[order_index].get("coupon_discount", 0) + 
                orders[order_index].get("points_discount", 0)
            )
            tax = orders[order_index].get("tax", 0)
            orders[order_index]["total"] = subtotal - total_discount + tax
            
            orders[order_index]["updated_at"] = datetime.now().isoformat()
            self._save_orders(orders)
        
        event_bus = get_event_bus()
        await event_bus.publish(Event(event_type=EventType.ORDER_UPDATED, data={
            "order_id": order_id,
            "item_added": order_item.dict()
        }))
        return order_item
    
    async def update_order_item(self, item_id: str, update_data: OrderItemUpdate) -> Optional[OrderItem]:
        """Atualiza um item de pedido."""
        order_items_db = self._load_order_items()
        item_index = next((i for i, item in enumerate(order_items_db) if item["id"] == item_id), None)
        if item_index is None: return None
        
        item = order_items_db[item_index]
        order_id = item["order_id"]
        order = await self.get_order(order_id)
        if not order or order.status not in [OrderStatus.PENDING, OrderStatus.PREPARING]:
            raise HTTPException(status_code=400, detail="Não é possível modificar itens de um pedido que já foi entregue ou cancelado")
        
        old_total = item["total_price"]
        price_difference = 0
        
        if update_data.quantity is not None:
            item["quantity"] = update_data.quantity
            item["total_price"] = item["unit_price"] * update_data.quantity
            price_difference = item["total_price"] - old_total
        
        if update_data.customizations is not None:
            product_service = get_product_service()
            product = await product_service.get_product(item["product_id"])
            if not product: raise HTTPException(status_code=404, detail=f"Produto com ID {item['product_id']} não encontrado")
            
            unit_price = product.price
            price_adjustment = sum(c.price_adjustment for c in update_data.customizations)
            unit_price += price_adjustment
            item["unit_price"] = unit_price
            item["total_price"] = unit_price * item["quantity"]
            item["customizations"] = [c.dict() for c in update_data.customizations]
            price_difference = item["total_price"] - old_total # Recalculate difference
        
        if update_data.notes is not None:
            item["notes"] = update_data.notes
        
        self._save_order_items(order_items_db)
        
        if price_difference != 0:
            orders = self._load_orders()
            order_index = next((i for i, o in enumerate(orders) if o["id"] == order_id), None)
            if order_index is not None:
                orders[order_index]["subtotal"] += price_difference
                
                # Recalculate total with all discounts
                subtotal = orders[order_index]["subtotal"]
                total_discount = (
                    orders[order_index].get("discount", 0) + 
                    orders[order_index].get("coupon_discount", 0) + 
                    orders[order_index].get("points_discount", 0)
                )
                tax = orders[order_index].get("tax", 0)
                orders[order_index]["total"] = subtotal - total_discount + tax
                
                orders[order_index]["updated_at"] = datetime.now().isoformat()
                self._save_orders(orders)
        
        event_bus = get_event_bus()
        await event_bus.publish(Event(event_type=EventType.ORDER_UPDATED, data={
            "order_id": order_id,
            "item_updated": item
        }))
        return OrderItem(**item)
    
    async def remove_order_item(self, item_id: str) -> bool:
        """Remove um item de um pedido."""
        order_items_db = self._load_order_items()
        item_index = next((i for i, item in enumerate(order_items_db) if item["id"] == item_id), None)
        if item_index is None: return False
        
        item = order_items_db[item_index]
        order_id = item["order_id"]
        item_price = item["total_price"]
        
        order = await self.get_order(order_id)
        if not order or order.status not in [OrderStatus.PENDING, OrderStatus.PREPARING]:
            raise HTTPException(status_code=400, detail="Não é possível remover itens de um pedido que já foi entregue ou cancelado")
        
        del order_items_db[item_index]
        self._save_order_items(order_items_db)
        
        orders = self._load_orders()
        order_index = next((i for i, o in enumerate(orders) if o["id"] == order_id), None)
        if order_index is not None:
            orders[order_index]["subtotal"] -= item_price
            
            # Recalculate total with all discounts
            subtotal = orders[order_index]["subtotal"]
            total_discount = (
                orders[order_index].get("discount", 0) + 
                orders[order_index].get("coupon_discount", 0) + 
                orders[order_index].get("points_discount", 0)
            )
            tax = orders[order_index].get("tax", 0)
            orders[order_index]["total"] = subtotal - total_discount + tax
            
            orders[order_index]["updated_at"] = datetime.now().isoformat()
            self._save_orders(orders)
        
        event_bus = get_event_bus()
        await event_bus.publish(Event(event_type=EventType.ORDER_UPDATED, data={
            "order_id": order_id,
            "item_removed": item_id
        }))
        return True
    
    # === New methods for coupon and points redemption ===
    
    async def apply_coupon(self, order_id: str, coupon_request: ApplyCouponRequest) -> DiscountResponse:
        """Aplica um cupom a um pedido."""
        order = await self.get_order(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Pedido não encontrado")
        
        if order.status not in [OrderStatus.PENDING, OrderStatus.PREPARING]:
            raise HTTPException(status_code=400, detail="Não é possível aplicar cupom a um pedido que já foi entregue ou cancelado")
        
        if order.payment_status == PaymentStatus.PAID:
            raise HTTPException(status_code=400, detail="Não é possível aplicar cupom a um pedido já pago")
        
        # Validate coupon and calculate discount
        try:
            validation = await customer_service.validate_coupon(
                coupon_request.coupon_code, 
                order.subtotal,
                None  # For order-level coupons, no product_id is needed
            )
        except HTTPException as e:
            # Re-raise the exception from validate_coupon
            raise e
        
        coupon = validation["coupon"]
        discount_amount = validation["discount_amount"]
        
        # Update order with coupon discount
        update_data = OrderUpdate(
            applied_coupon_code=coupon_request.coupon_code,
            coupon_discount=discount_amount
        )
        updated_order = await self.update_order(order_id, update_data)
        
        # Record coupon redemption
        await customer_service.redeem_coupon(
            coupon_request.coupon_code,
            uuid.UUID(order_id),
            uuid.UUID(order.customer_id) if order.customer_id else None,
            discount_amount
        )
        
        # Calculate total discount and return response
        total_discount = updated_order.discount + updated_order.coupon_discount + updated_order.points_discount
        
        return DiscountResponse(
            subtotal=updated_order.subtotal,
            coupon_discount=updated_order.coupon_discount,
            points_discount=updated_order.points_discount,
            total_discount=total_discount,
            tax=updated_order.tax,
            total=updated_order.total,
            applied_coupon_code=updated_order.applied_coupon_code,
            points_redeemed=updated_order.points_redeemed
        )
    
    async def apply_points(self, order_id: str, points_request: ApplyPointsRequest) -> DiscountResponse:
        """Aplica pontos de fidelidade a um pedido."""
        order = await self.get_order(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Pedido não encontrado")
        
        if not order.customer_id:
            raise HTTPException(status_code=400, detail="Este pedido não está associado a um cliente")
        
        if order.status not in [OrderStatus.PENDING, OrderStatus.PREPARING]:
            raise HTTPException(status_code=400, detail="Não é possível aplicar pontos a um pedido que já foi entregue ou cancelado")
        
        if order.payment_status == PaymentStatus.PAID:
            raise HTTPException(status_code=400, detail="Não é possível aplicar pontos a um pedido já pago")
        
        # Calculate points discount
        try:
            calculation = await customer_service.calculate_points_discount(
                uuid.UUID(order.customer_id),
                points_request.points_to_redeem
            )
        except HTTPException as e:
            # Re-raise the exception from calculate_points_discount
            raise e
        
        discount_amount = calculation["discount_amount"]
        
        # Update order with points discount
        update_data = OrderUpdate(
            points_redeemed=points_request.points_to_redeem,
            points_discount=discount_amount
        )
        updated_order = await self.update_order(order_id, update_data)
        
        # Record points redemption (only when order is finalized/paid)
        # This will be done in the finalize_order method to avoid deducting points prematurely
        
        # Calculate total discount and return response
        total_discount = updated_order.discount + updated_order.coupon_discount + updated_order.points_discount
        
        return DiscountResponse(
            subtotal=updated_order.subtotal,
            coupon_discount=updated_order.coupon_discount,
            points_discount=updated_order.points_discount,
            total_discount=total_discount,
            tax=updated_order.tax,
            total=updated_order.total,
            applied_coupon_code=updated_order.applied_coupon_code,
            points_redeemed=updated_order.points_redeemed,
            remaining_points=calculation["remaining_points"]
        )
    
    async def finalize_order(self, order_id: str, payment_method: PaymentMethod) -> Order:
        """Finaliza um pedido, processando pagamento e aplicando pontos/cupons."""
        order = await self.get_order(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Pedido não encontrado")
        
        if order.status not in [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY]:
            raise HTTPException(status_code=400, detail="Não é possível finalizar um pedido que já foi entregue ou cancelado")
        
        if order.payment_status == PaymentStatus.PAID:
            raise HTTPException(status_code=400, detail="Este pedido já foi pago")
        
        # Update order payment status
        update_data = OrderUpdate(
            payment_status=PaymentStatus.PAID,
            payment_method=payment_method,
            status=OrderStatus.DELIVERED if order.status == OrderStatus.READY else order.status
        )
        updated_order = await self.update_order(order_id, update_data)
        
        # Process points redemption if applicable
        if order.points_redeemed and order.customer_id:
            await customer_service.redeem_points(
                uuid.UUID(order.customer_id),
                uuid.UUID(order_id),
                order.points_redeemed
            )
        
        # Add purchase to customer history if applicable
        if order.customer_id:
            # Create a summary of items for the purchase history
            items_summary = ", ".join([f"{item.quantity}x {item.product_name}" for item in order.items[:3]])
            if len(order.items) > 3:
                items_summary += f" e mais {len(order.items) - 3} item(s)"
            
            purchase_entry = PurchaseHistoryEntry(
                order_id=uuid.UUID(order_id),
                purchase_date=datetime.now(),
                total_amount=order.total,
                items_summary=items_summary
            )
            
            await customer_service.add_purchase_history(
                uuid.UUID(order.customer_id),
                purchase_entry
            )
            
            # Award loyalty points based on purchase amount
            # This is a simple implementation - 1 point per currency unit
            points_to_award = int(order.total)
            if points_to_award > 0:
                await customer_service.update_loyalty_points(
                    uuid.UUID(order.customer_id),
                    points_to_award
                )
        
        event_bus = get_event_bus()
        await event_bus.publish(Event(event_type=EventType.ORDER_FINALIZED, data=updated_order.dict()))
        
        return updated_order

# Instantiate the service
order_service = OrderService()

# Helper function to get product service (avoid circular imports)
def get_product_service():
    from src.product.services.product_service import product_service
    return product_service
