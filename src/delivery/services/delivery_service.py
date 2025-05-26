import os
import json
import uuid
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import asyncio

from src.delivery.models.delivery_models import (
    DeliveryOrder, DeliveryOrderStatus, DeliveryCourier, CourierStatus, 
    CourierType, DeliveryRoute, RouteStatus, DeliveryZone, 
    DeliveryTracking, TrackingEventType
)
from src.core.events.event_bus import get_event_bus, Event, EventType


class DeliveryService:
    """Serviço para gerenciamento de pedidos de delivery."""
    
    def __init__(self):
        self.delivery_orders = {}  # Simulação de banco de dados
        self.event_bus = get_event_bus()
        
    async def create_delivery_order(self, order_id: str, customer_id: str, address_id: str, 
                                   delivery_fee: float, delivery_notes: Optional[str] = None,
                                   payment_on_delivery: bool = False, payment_amount: Optional[float] = None,
                                   payment_method: Optional[str] = None, priority: int = 0) -> DeliveryOrder:
        """Cria um novo pedido de delivery."""
        now = datetime.now()
        
        # Estimar tempo de entrega (simplificado)
        estimated_delivery_time = now + timedelta(minutes=30)
        
        # Gerar código de rastreamento
        tracking_code = f"DEL-{uuid.uuid4().hex[:8].upper()}"
        
        delivery_order = DeliveryOrder(
            id=str(uuid.uuid4()),
            order_id=order_id,
            customer_id=customer_id,
            address_id=address_id,
            delivery_fee=delivery_fee,
            estimated_delivery_time=estimated_delivery_time,
            delivery_notes=delivery_notes,
            status=DeliveryOrderStatus.PENDING,
            payment_on_delivery=payment_on_delivery,
            payment_amount=payment_amount,
            payment_method=payment_method,
            created_at=now,
            updated_at=now,
            tracking_code=tracking_code,
            priority=priority
        )
        
        # Salvar no "banco de dados"
        self.delivery_orders[delivery_order.id] = delivery_order
        
        # Criar evento de rastreamento
        await self.create_tracking_event(
            delivery_order_id=delivery_order.id,
            event_type=TrackingEventType.ORDER_CREATED,
            notes="Pedido de delivery criado"
        )
        
        # Publicar evento
        await self.event_bus.publish(Event(
            event_type=EventType.ORDER_CREATED,
            data={
                "delivery_order": delivery_order.dict(),
                "source": "delivery_service"
            }
        ))
        
        return delivery_order
    
    async def assign_courier(self, delivery_order_id: str, courier_id: str) -> DeliveryOrder:
        """Atribui um entregador a um pedido."""
        if delivery_order_id not in self.delivery_orders:
            raise ValueError(f"Pedido de delivery {delivery_order_id} não encontrado")
        
        delivery_order = self.delivery_orders[delivery_order_id]
        
        # Verificar se o entregador existe
        courier = await courier_service.get_courier(courier_id)
        if not courier:
            raise ValueError(f"Entregador {courier_id} não encontrado")
        
        # Verificar se o entregador está disponível
        if courier.status != CourierStatus.AVAILABLE:
            raise ValueError(f"Entregador {courier_id} não está disponível")
        
        # Atualizar pedido
        delivery_order.courier_id = courier_id
        delivery_order.status = DeliveryOrderStatus.ASSIGNED
        delivery_order.updated_at = datetime.now()
        
        # Atualizar entregador
        await courier_service.update_courier_status(courier_id, CourierStatus.BUSY)
        
        # Criar evento de rastreamento
        await self.create_tracking_event(
            delivery_order_id=delivery_order.id,
            event_type=TrackingEventType.ORDER_ASSIGNED,
            notes=f"Pedido atribuído ao entregador {courier.name}"
        )
        
        # Publicar evento
        await self.event_bus.publish(Event(
            event_type=EventType.ORDER_STATUS_CHANGED,
            data={
                "delivery_order_id": delivery_order.id,
                "status": delivery_order.status,
                "courier_id": courier_id,
                "source": "delivery_service"
            }
        ))
        
        return delivery_order
    
    async def update_order_status(self, delivery_order_id: str, status: DeliveryOrderStatus, 
                                 notes: Optional[str] = None) -> DeliveryOrder:
        """Atualiza o status de um pedido."""
        if delivery_order_id not in self.delivery_orders:
            raise ValueError(f"Pedido de delivery {delivery_order_id} não encontrado")
        
        delivery_order = self.delivery_orders[delivery_order_id]
        old_status = delivery_order.status
        
        # Atualizar pedido
        delivery_order.status = status
        delivery_order.updated_at = datetime.now()
        
        # Lógica específica para cada status
        if status == DeliveryOrderStatus.READY_FOR_PICKUP:
            # Criar evento de rastreamento
            await self.create_tracking_event(
                delivery_order_id=delivery_order.id,
                event_type=TrackingEventType.READY_FOR_PICKUP,
                notes=notes or "Pedido pronto para coleta"
            )
        
        elif status == DeliveryOrderStatus.IN_TRANSIT:
            # Criar evento de rastreamento
            await self.create_tracking_event(
                delivery_order_id=delivery_order.id,
                event_type=TrackingEventType.IN_TRANSIT,
                notes=notes or "Pedido em trânsito"
            )
        
        elif status == DeliveryOrderStatus.DELIVERED:
            # Registrar horário de entrega
            delivery_order.actual_delivery_time = datetime.now()
            
            # Criar evento de rastreamento
            await self.create_tracking_event(
                delivery_order_id=delivery_order.id,
                event_type=TrackingEventType.DELIVERED,
                notes=notes or "Pedido entregue"
            )
            
            # Se o entregador estiver atribuído, atualizar seu status
            if delivery_order.courier_id:
                await courier_service.update_courier_after_delivery(delivery_order.courier_id)
        
        elif status == DeliveryOrderStatus.CANCELLED:
            # Criar evento de rastreamento
            await self.create_tracking_event(
                delivery_order_id=delivery_order.id,
                event_type=TrackingEventType.CANCELLED,
                notes=notes or "Pedido cancelado"
            )
            
            # Se o entregador estiver atribuído, atualizar seu status
            if delivery_order.courier_id:
                await courier_service.update_courier_after_delivery(delivery_order.courier_id)
        
        # Publicar evento
        await self.event_bus.publish(Event(
            event_type=EventType.ORDER_STATUS_CHANGED,
            data={
                "delivery_order_id": delivery_order.id,
                "old_status": old_status,
                "new_status": status,
                "notes": notes,
                "source": "delivery_service"
            }
        ))
        
        return delivery_order
    
    async def get_delivery_order(self, delivery_order_id: str) -> Optional[DeliveryOrder]:
        """Obtém um pedido pelo ID."""
        return self.delivery_orders.get(delivery_order_id)
    
    async def get_delivery_order_by_tracking(self, tracking_code: str) -> Optional[DeliveryOrder]:
        """Obtém um pedido pelo código de rastreamento."""
        for order in self.delivery_orders.values():
            if order.tracking_code == tracking_code:
                return order
        return None
    
    async def list_delivery_orders(self, status: Optional[DeliveryOrderStatus] = None, 
                                  courier_id: Optional[str] = None,
                                  customer_id: Optional[str] = None,
                                  from_date: Optional[datetime] = None,
                                  to_date: Optional[datetime] = None) -> List[DeliveryOrder]:
        """Lista pedidos com filtros."""
        result = []
        
        for order in self.delivery_orders.values():
            # Aplicar filtros
            if status and order.status != status:
                continue
            
            if courier_id and order.courier_id != courier_id:
                continue
            
            if customer_id and order.customer_id != customer_id:
                continue
            
            if from_date and order.created_at < from_date:
                continue
            
            if to_date and order.created_at > to_date:
                continue
            
            result.append(order)
        
        # Ordenar por prioridade (decrescente) e data de criação (crescente)
        result.sort(key=lambda x: (-x.priority, x.created_at))
        
        return result
    
    async def calculate_delivery_fee(self, address_id: str, order_value: float) -> float:
        """Calcula a taxa de entrega para um endereço."""
        # Obter zona de entrega para o endereço
        zone = await zone_service.get_zone_for_address(address_id)
        
        if not zone:
            # Endereço fora das zonas de entrega
            return 0.0
        
        # Calcular taxa base
        fee = zone.base_fee
        
        # Aplicar regras adicionais
        if zone.min_order_value and order_value < zone.min_order_value:
            # Taxa adicional para pedidos abaixo do valor mínimo
            fee += 5.0
        
        # Calcular distância (simplificado)
        distance = 5.0  # km
        
        # Adicionar taxa por km, se configurada
        if zone.additional_fee_per_km:
            fee += distance * zone.additional_fee_per_km
        
        return round(fee, 2)
    
    async def estimate_delivery_time(self, address_id: str) -> int:
        """Estima o tempo de entrega em minutos."""
        # Obter zona de entrega para o endereço
        zone = await zone_service.get_zone_for_address(address_id)
        
        if not zone:
            # Endereço fora das zonas de entrega
            return 60  # Tempo padrão
        
        # Calcular tempo médio
        avg_time = (zone.min_delivery_time + zone.max_delivery_time) // 2
        
        # Adicionar tempo de preparo (15 minutos)
        total_time = avg_time + 15
        
        return total_time
    
    async def create_tracking_event(self, delivery_order_id: str, event_type: TrackingEventType,
                                   location: Optional[Dict[str, float]] = None,
                                   notes: Optional[str] = None) -> DeliveryTracking:
        """Cria um evento de rastreamento."""
        # Verificar se o pedido existe
        if delivery_order_id not in self.delivery_orders:
            raise ValueError(f"Pedido de delivery {delivery_order_id} não encontrado")
        
        tracking_event = DeliveryTracking(
            id=str(uuid.uuid4()),
            delivery_order_id=delivery_order_id,
            event_type=event_type,
            timestamp=datetime.now(),
            location=location,
            notes=notes,
            created_by="system"  # Simplificado
        )
        
        # Em um sistema real, salvaríamos no banco de dados
        # Aqui, vamos apenas retornar o evento
        
        return tracking_event
    
    async def get_tracking_history(self, delivery_order_id: str) -> List[DeliveryTracking]:
        """Obtém o histórico de rastreamento de um pedido."""
        # Em um sistema real, consultaríamos o banco de dados
        # Aqui, vamos retornar uma lista simulada
        
        if delivery_order_id not in self.delivery_orders:
            raise ValueError(f"Pedido de delivery {delivery_order_id} não encontrado")
        
        # Simulação de histórico
        order = self.delivery_orders[delivery_order_id]
        history = []
        
        # Evento de criação
        history.append(DeliveryTracking(
            id=str(uuid.uuid4()),
            delivery_order_id=delivery_order_id,
            event_type=TrackingEventType.ORDER_CREATED,
            timestamp=order.created_at,
            notes="Pedido criado",
            created_by="system"
        ))
        
        # Adicionar mais eventos com base no status atual
        if order.status.value in [s.value for s in [
            DeliveryOrderStatus.ASSIGNED, DeliveryOrderStatus.PREPARING,
            DeliveryOrderStatus.READY_FOR_PICKUP, DeliveryOrderStatus.IN_TRANSIT,
            DeliveryOrderStatus.DELIVERED
        ]]:
            # Atribuído
            history.append(DeliveryTracking(
                id=str(uuid.uuid4()),
                delivery_order_id=delivery_order_id,
                event_type=TrackingEventType.ORDER_ASSIGNED,
                timestamp=order.created_at + timedelta(minutes=5),
                notes="Pedido atribuído a entregador",
                created_by="system"
            ))
        
        if order.status.value in [s.value for s in [
            DeliveryOrderStatus.PREPARING, DeliveryOrderStatus.READY_FOR_PICKUP,
            DeliveryOrderStatus.IN_TRANSIT, DeliveryOrderStatus.DELIVERED
        ]]:
            # Preparando
            history.append(DeliveryTracking(
                id=str(uuid.uuid4()),
                delivery_order_id=delivery_order_id,
                event_type=TrackingEventType.PREPARING,
                timestamp=order.created_at + timedelta(minutes=10),
                notes="Pedido em preparação",
                created_by="system"
            ))
        
        if order.status.value in [s.value for s in [
            DeliveryOrderStatus.READY_FOR_PICKUP, DeliveryOrderStatus.IN_TRANSIT,
            DeliveryOrderStatus.DELIVERED
        ]]:
            # Pronto para coleta
            history.append(DeliveryTracking(
                id=str(uuid.uuid4()),
                delivery_order_id=delivery_order_id,
                event_type=TrackingEventType.READY_FOR_PICKUP,
                timestamp=order.created_at + timedelta(minutes=20),
                notes="Pedido pronto para coleta",
                created_by="system"
            ))
        
        if order.status.value in [s.value for s in [
            DeliveryOrderStatus.IN_TRANSIT, DeliveryOrderStatus.DELIVERED
        ]]:
            # Em trânsito
            history.append(DeliveryTracking(
                id=str(uuid.uuid4()),
                delivery_order_id=delivery_order_id,
                event_type=TrackingEventType.IN_TRANSIT,
                timestamp=order.created_at + timedelta(minutes=25),
                notes="Pedido em trânsito",
                created_by="system"
            ))
        
        if order.status == DeliveryOrderStatus.DELIVERED:
            # Entregue
            history.append(DeliveryTracking(
                id=str(uuid.uuid4()),
                delivery_order_id=delivery_order_id,
                event_type=TrackingEventType.DELIVERED,
                timestamp=order.actual_delivery_time or (order.created_at + timedelta(minutes=40)),
                notes="Pedido entregue",
                created_by="system"
            ))
        
        elif order.status == DeliveryOrderStatus.CANCELLED:
            # Cancelado
            history.append(DeliveryTracking(
                id=str(uuid.uuid4()),
                delivery_order_id=delivery_order_id,
                event_type=TrackingEventType.CANCELLED,
                timestamp=order.updated_at,
                notes="Pedido cancelado",
                created_by="system"
            ))
        
        # Ordenar por timestamp
        history.sort(key=lambda x: x.timestamp)
        
        return history
    
    async def optimize_routes(self) -> List[DeliveryRoute]:
        """Otimiza rotas para entregas pendentes."""
        # Em um sistema real, implementaríamos um algoritmo de otimização
        # Aqui, vamos apenas retornar uma lista simulada
        
        # Obter pedidos pendentes
        pending_orders = await self.list_delivery_orders(status=DeliveryOrderStatus.PENDING)
        
        if not pending_orders:
            return []
        
        # Agrupar por região (simplificado)
        regions = {}
        for order in pending_orders:
            # Simulação de região
            region = "CENTRAL"
            
            if region not in regions:
                regions[region] = []
            
            regions[region].append(order)
        
        # Criar rotas
        routes = []
        for region, orders in regions.items():
            route = DeliveryRoute(
                id=str(uuid.uuid4()),
                status=RouteStatus.PLANNING,
                orders=[order.id for order in orders],
                estimated_start_time=datetime.now() + timedelta(minutes=15),
                estimated_end_time=datetime.now() + timedelta(hours=2),
                created_at=datetime.now(),
                updated_at=datetime.now(),
                optimization_score=0.85  # Simulado
            )
            
            routes.append(route)
        
        return routes


class CourierService:
    """Serviço para gerenciamento de entregadores."""
    
    def __init__(self):
        self.couriers = {}  # Simulação de banco de dados
        self.event_bus = get_event_bus()
    
    async def create_courier(self, name: str, phone: str, vehicle_type: str,
                            courier_type: CourierType, employee_id: Optional[str] = None,
                            email: Optional[str] = None, vehicle_plate: Optional[str] = None,
                            max_deliveries: int = 1, notes: Optional[str] = None) -> DeliveryCourier:
        """Cria um novo entregador."""
        now = datetime.now()
        
        courier = DeliveryCourier(
            id=str(uuid.uuid4()),
            name=name,
            phone=phone,
            email=email,
            vehicle_type=vehicle_type,
            vehicle_plate=vehicle_plate,
            status=CourierStatus.AVAILABLE,
            courier_type=courier_type,
            employee_id=employee_id,
            max_deliveries=max_deliveries,
            created_at=now,
            updated_at=now,
            is_active=True,
            notes=notes
        )
        
        # Salvar no "banco de dados"
        self.couriers[courier.id] = courier
        
        # Publicar evento
        await self.event_bus.publish(Event(
            event_type=EventType.SYSTEM_CONFIG_CHANGED,
            data={
                "courier": courier.dict(),
                "action": "created",
                "source": "courier_service"
            }
        ))
        
        return courier
    
    async def update_courier(self, courier_id: str, data: Dict[str, Any]) -> DeliveryCourier:
        """Atualiza dados de um entregador."""
        if courier_id not in self.couriers:
            raise ValueError(f"Entregador {courier_id} não encontrado")
        
        courier = self.couriers[courier_id]
        
        # Atualizar campos permitidos
        allowed_fields = [
            "name", "phone", "email", "vehicle_type", "vehicle_plate",
            "max_deliveries", "notes", "is_active"
        ]
        
        for field, value in data.items():
            if field in allowed_fields:
                setattr(courier, field, value)
        
        courier.updated_at = datetime.now()
        
        # Publicar evento
        await self.event_bus.publish(Event(
            event_type=EventType.SYSTEM_CONFIG_CHANGED,
            data={
                "courier_id": courier_id,
                "updates": data,
                "source": "courier_service"
            }
        ))
        
        return courier
    
    async def update_courier_status(self, courier_id: str, status: CourierStatus) -> DeliveryCourier:
        """Atualiza o status de um entregador."""
        if courier_id not in self.couriers:
            raise ValueError(f"Entregador {courier_id} não encontrado")
        
        courier = self.couriers[courier_id]
        old_status = courier.status
        
        # Atualizar status
        courier.status = status
        courier.updated_at = datetime.now()
        
        # Lógica específica para cada status
        if status == CourierStatus.BUSY:
            courier.current_deliveries += 1
        
        # Publicar evento
        await self.event_bus.publish(Event(
            event_type=EventType.SYSTEM_CONFIG_CHANGED,
            data={
                "courier_id": courier_id,
                "old_status": old_status,
                "new_status": status,
                "source": "courier_service"
            }
        ))
        
        return courier
    
    async def update_courier_location(self, courier_id: str, location: Dict[str, float]) -> DeliveryCourier:
        """Atualiza a localização de um entregador."""
        if courier_id not in self.couriers:
            raise ValueError(f"Entregador {courier_id} não encontrado")
        
        courier = self.couriers[courier_id]
        
        # Atualizar localização
        courier.current_location = location
        courier.updated_at = datetime.now()
        
        # Publicar evento
        await self.event_bus.publish(Event(
            event_type=EventType.SYSTEM_CONFIG_CHANGED,
            data={
                "courier_id": courier_id,
                "location": location,
                "source": "courier_service"
            }
        ))
        
        return courier
    
    async def get_courier(self, courier_id: str) -> Optional[DeliveryCourier]:
        """Obtém um entregador pelo ID."""
        return self.couriers.get(courier_id)
    
    async def list_couriers(self, status: Optional[CourierStatus] = None,
                           courier_type: Optional[CourierType] = None,
                           is_active: bool = True) -> List[DeliveryCourier]:
        """Lista entregadores com filtros."""
        result = []
        
        for courier in self.couriers.values():
            # Aplicar filtros
            if status and courier.status != status:
                continue
            
            if courier_type and courier.courier_type != courier_type:
                continue
            
            if is_active and not courier.is_active:
                continue
            
            result.append(courier)
        
        return result
    
    async def get_courier_current_deliveries(self, courier_id: str) -> List[DeliveryOrder]:
        """Obtém as entregas atuais de um entregador."""
        if courier_id not in self.couriers:
            raise ValueError(f"Entregador {courier_id} não encontrado")
        
        # Obter pedidos atribuídos ao entregador
        delivery_service = DeliveryService()
        orders = await delivery_service.list_delivery_orders(
            courier_id=courier_id,
            status=DeliveryOrderStatus.IN_TRANSIT
        )
        
        return orders
    
    async def update_courier_after_delivery(self, courier_id: str) -> DeliveryCourier:
        """Atualiza o status de um entregador após uma entrega."""
        if courier_id not in self.couriers:
            raise ValueError(f"Entregador {courier_id} não encontrado")
        
        courier = self.couriers[courier_id]
        
        # Decrementar entregas atuais
        if courier.current_deliveries > 0:
            courier.current_deliveries -= 1
        
        # Se não tiver mais entregas, atualizar status para disponível
        if courier.current_deliveries == 0:
            courier.status = CourierStatus.AVAILABLE
        
        courier.updated_at = datetime.now()
        
        # Publicar evento
        await self.event_bus.publish(Event(
            event_type=EventType.SYSTEM_CONFIG_CHANGED,
            data={
                "courier_id": courier_id,
                "status": courier.status,
                "current_deliveries": courier.current_deliveries,
                "source": "courier_service"
            }
        ))
        
        return courier
    
    async def get_courier_performance(self, courier_id: str, 
                                     from_date: Optional[datetime] = None,
                                     to_date: Optional[datetime] = None) -> Dict[str, Any]:
        """Obtém métricas de desempenho de um entregador."""
        if courier_id not in self.couriers:
            raise ValueError(f"Entregador {courier_id} não encontrado")
        
        # Em um sistema real, consultaríamos o banco de dados
        # Aqui, vamos retornar métricas simuladas
        
        return {
            "courier_id": courier_id,
            "total_deliveries": 45,
            "on_time_deliveries": 42,
            "late_deliveries": 3,
            "average_delivery_time": 28,  # minutos
            "customer_rating": 4.8,
            "total_distance": 320.5,  # km
            "period": {
                "from": from_date.isoformat() if from_date else "2023-01-01T00:00:00",
                "to": to_date.isoformat() if to_date else datetime.now().isoformat()
            }
        }


class DeliveryZoneService:
    """Serviço para gerenciamento de zonas de entrega."""
    
    def __init__(self):
        self.zones = {}  # Simulação de banco de dados
        self.event_bus = get_event_bus()
    
    async def create_zone(self, name: str, base_fee: float, min_delivery_time: int,
                         max_delivery_time: int, polygon: List[Dict[str, float]],
                         description: Optional[str] = None,
                         additional_fee_per_km: Optional[float] = None,
                         min_order_value: Optional[float] = None) -> DeliveryZone:
        """Cria uma nova zona de entrega."""
        now = datetime.now()
        
        zone = DeliveryZone(
            id=str(uuid.uuid4()),
            name=name,
            description=description,
            base_fee=base_fee,
            min_delivery_time=min_delivery_time,
            max_delivery_time=max_delivery_time,
            is_active=True,
            created_at=now,
            updated_at=now,
            polygon=polygon,
            additional_fee_per_km=additional_fee_per_km,
            min_order_value=min_order_value
        )
        
        # Salvar no "banco de dados"
        self.zones[zone.id] = zone
        
        # Publicar evento
        await self.event_bus.publish(Event(
            event_type=EventType.SYSTEM_CONFIG_CHANGED,
            data={
                "zone": zone.dict(),
                "action": "created",
                "source": "zone_service"
            }
        ))
        
        return zone
    
    async def update_zone(self, zone_id: str, data: Dict[str, Any]) -> DeliveryZone:
        """Atualiza uma zona de entrega."""
        if zone_id not in self.zones:
            raise ValueError(f"Zona {zone_id} não encontrada")
        
        zone = self.zones[zone_id]
        
        # Atualizar campos permitidos
        allowed_fields = [
            "name", "description", "base_fee", "min_delivery_time", "max_delivery_time",
            "is_active", "polygon", "additional_fee_per_km", "min_order_value"
        ]
        
        for field, value in data.items():
            if field in allowed_fields:
                setattr(zone, field, value)
        
        zone.updated_at = datetime.now()
        
        # Publicar evento
        await self.event_bus.publish(Event(
            event_type=EventType.SYSTEM_CONFIG_CHANGED,
            data={
                "zone_id": zone_id,
                "updates": data,
                "source": "zone_service"
            }
        ))
        
        return zone
    
    async def get_zone(self, zone_id: str) -> Optional[DeliveryZone]:
        """Obtém uma zona pelo ID."""
        return self.zones.get(zone_id)
    
    async def list_zones(self, is_active: bool = True) -> List[DeliveryZone]:
        """Lista zonas de entrega."""
        result = []
        
        for zone in self.zones.values():
            if is_active and not zone.is_active:
                continue
            
            result.append(zone)
        
        return result
    
    async def get_zone_for_address(self, address_id: str) -> Optional[DeliveryZone]:
        """Obtém a zona de entrega para um endereço."""
        # Em um sistema real, consultaríamos o banco de dados e usaríamos
        # funções geoespaciais para verificar se o endereço está dentro do polígono
        # Aqui, vamos retornar uma zona simulada
        
        # Simulação: retornar a primeira zona ativa
        for zone in self.zones.values():
            if zone.is_active:
                return zone
        
        return None
    
    async def check_address_deliverable(self, address_id: str) -> bool:
        """Verifica se um endereço está em uma zona de entrega."""
        zone = await self.get_zone_for_address(address_id)
        return zone is not None


# Instâncias singleton dos serviços
delivery_service = DeliveryService()
courier_service = CourierService()
zone_service = DeliveryZoneService()
