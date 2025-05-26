from typing import Dict, Any, List, Optional, Union
import logging
from datetime import datetime
import uuid
from pydantic import BaseModel

from src.remote_orders.models.remote_order_models import (
    RemoteOrder, RemoteOrderStatus, RemoteOrderItem
)
from src.remote_orders.adapters.rappi_adapter import RappiAdapter
from src.core.events.event_bus import EventBus, Event
from src.payment.services.payment_service import PaymentService

logger = logging.getLogger(__name__)

class RappiConfiguration(BaseModel):
    """Configuração para integração com Rappi."""
    id: str
    restaurant_id: str
    store_id: str
    api_key: str
    api_secret: str
    webhook_url: str
    auto_accept: bool
    notification_email: str
    notification_phone: str
    active: bool
    created_at: datetime
    updated_at: datetime

class RappiProductMapping(BaseModel):
    """Mapeamento de produtos entre Rappi e POS Modern."""
    id: str
    restaurant_id: str
    rappi_product_id: str
    pos_product_id: str
    rappi_product_name: str
    pos_product_name: str
    active: bool
    created_at: datetime
    updated_at: datetime

class RappiOrderService:
    """Serviço para gerenciamento de pedidos do Rappi."""
    
    def __init__(self, event_bus: EventBus, payment_service: PaymentService):
        """
        Inicializa o serviço com as dependências necessárias.
        
        Args:
            event_bus: Barramento de eventos
            payment_service: Serviço de pagamento
        """
        self.event_bus = event_bus
        self.payment_service = payment_service
        self.register_event_handlers()
        
    def register_event_handlers(self):
        """Registra handlers para eventos relevantes."""
        self.event_bus.subscribe("remote_order.status_changed", self.handle_order_status_change)
        self.event_bus.subscribe("remote_order.confirmation_timeout", self.handle_confirmation_timeout)
        
    async def get_rappi_configuration(self, restaurant_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtém a configuração do Rappi para um restaurante.
        
        Args:
            restaurant_id: ID do restaurante
            
        Returns:
            Optional[Dict]: Configuração do Rappi ou None se não encontrada
        """
        # Em uma implementação real, buscar do banco de dados
        # Exemplo:
        # config = await RappiConfiguration.get(restaurant_id=restaurant_id)
        # return config.dict() if config else None
        
        # Implementação simulada para desenvolvimento
        if restaurant_id:
            return {
                "id": str(uuid.uuid4()),
                "restaurant_id": restaurant_id,
                "store_id": f"store_{restaurant_id}",
                "api_key": "rappi_api_key_example",
                "api_secret": "rappi_api_secret_example",
                "webhook_url": f"https://api.posmodern.com/webhooks/rappi/{restaurant_id}",
                "auto_accept": True,
                "notification_email": "restaurant@example.com",
                "notification_phone": "+5511999999999",
                "active": True,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
        
        return None
    
    async def process_rappi_webhook(self, webhook_data: Dict[str, Any], signature: str) -> Optional[RemoteOrder]:
        """
        Processa um webhook recebido do Rappi.
        
        Args:
            webhook_data: Dados do webhook
            signature: Assinatura do webhook para validação
            
        Returns:
            Optional[RemoteOrder]: Pedido processado ou None
        """
        # Extrair restaurant_id do webhook
        restaurant_id = webhook_data.get("restaurantId") or webhook_data.get("restaurant_id")
        
        if not restaurant_id:
            logger.error("Restaurant ID not found in Rappi webhook")
            return None
        
        # Obter configuração do restaurante
        config = await self.get_rappi_configuration(restaurant_id)
        
        if not config:
            logger.error(f"Rappi configuration not found for restaurant {restaurant_id}")
            return None
        
        # Validar assinatura do webhook
        async with RappiAdapter(config) as adapter:
            is_valid = await adapter.validate_webhook_signature(
                signature, 
                str(webhook_data)
            )
            
            if not is_valid:
                logger.error("Invalid Rappi webhook signature")
                return None
            
            # Processar webhook
            remote_order = await adapter.process_webhook(webhook_data)
            
            if remote_order:
                # Salvar pedido no banco de dados
                saved_order = await self.save_remote_order(remote_order)
                
                # Publicar evento
                await self.event_bus.publish(
                    "remote_order.received",
                    Event(data={
                        "order_id": saved_order.id,
                        "source": "rappi",
                        "restaurant_id": saved_order.restaurant_id,
                        "store_id": saved_order.store_id
                    })
                )
                
                # Verificar aceitação automática
                if config.get("auto_accept", False):
                    await self.confirm_remote_order(saved_order.id)
                else:
                    # Agendar timeout para confirmação manual
                    # Em uma implementação real, usar um job scheduler
                    # Exemplo: await schedule_confirmation_timeout(saved_order.id, 300)  # 5 minutos
                    pass
                
                return saved_order
        
        return None
    
    async def save_remote_order(self, order: RemoteOrder) -> RemoteOrder:
        """
        Salva um pedido remoto no banco de dados.
        
        Args:
            order: Pedido a ser salvo
            
        Returns:
            RemoteOrder: Pedido salvo
        """
        # Em uma implementação real, salvar no banco de dados
        # Exemplo:
        # db_order = await RemoteOrderModel.create(**order.dict())
        # return RemoteOrder(**db_order.dict())
        
        # Implementação simulada para desenvolvimento
        logger.info(f"Saving Rappi order: {order.id}")
        return order
    
    async def confirm_remote_order(self, order_id: str) -> bool:
        """
        Confirma um pedido remoto.
        
        Args:
            order_id: ID do pedido
            
        Returns:
            bool: True se a confirmação foi bem-sucedida
        """
        # Obter pedido
        order = await self.get_remote_order(order_id)
        
        if not order:
            logger.error(f"Order {order_id} not found")
            return False
        
        if order.source != "rappi":
            logger.error(f"Order {order_id} is not from Rappi")
            return False
        
        # Obter configuração do restaurante
        config = await self.get_rappi_configuration(order.restaurant_id)
        
        if not config:
            logger.error(f"Rappi configuration not found for restaurant {order.restaurant_id}")
            return False
        
        # Atualizar status na API Rappi
        async with RappiAdapter(config) as adapter:
            success = await adapter.update_order_status(
                order.external_id, 
                RemoteOrderStatus.CONFIRMED
            )
            
            if success:
                # Atualizar status no banco de dados
                order.status = RemoteOrderStatus.CONFIRMED
                order.updated_at = datetime.now()
                await self.update_remote_order(order)
                
                # Publicar evento
                await self.event_bus.publish(
                    "remote_order.status_changed",
                    Event(data={
                        "order_id": order.id,
                        "source": "rappi",
                        "restaurant_id": order.restaurant_id,
                        "store_id": order.store_id,
                        "status": RemoteOrderStatus.CONFIRMED.value,
                        "previous_status": RemoteOrderStatus.PENDING.value
                    })
                )
                
                # Notificar cliente
                await self.notify_customer_status_change(order, RemoteOrderStatus.CONFIRMED)
                
                return True
        
        return False
    
    async def reject_remote_order(self, order_id: str, reason: str) -> bool:
        """
        Rejeita um pedido remoto.
        
        Args:
            order_id: ID do pedido
            reason: Motivo da rejeição
            
        Returns:
            bool: True se a rejeição foi bem-sucedida
        """
        # Obter pedido
        order = await self.get_remote_order(order_id)
        
        if not order:
            logger.error(f"Order {order_id} not found")
            return False
        
        if order.source != "rappi":
            logger.error(f"Order {order_id} is not from Rappi")
            return False
        
        # Obter configuração do restaurante
        config = await self.get_rappi_configuration(order.restaurant_id)
        
        if not config:
            logger.error(f"Rappi configuration not found for restaurant {order.restaurant_id}")
            return False
        
        # Rejeitar pedido na API Rappi
        async with RappiAdapter(config) as adapter:
            success = await adapter.reject_order(order.external_id, reason)
            
            if success:
                # Atualizar status no banco de dados
                order.status = RemoteOrderStatus.REJECTED
                order.updated_at = datetime.now()
                await self.update_remote_order(order)
                
                # Publicar evento
                await self.event_bus.publish(
                    "remote_order.status_changed",
                    Event(data={
                        "order_id": order.id,
                        "source": "rappi",
                        "restaurant_id": order.restaurant_id,
                        "store_id": order.store_id,
                        "status": RemoteOrderStatus.REJECTED.value,
                        "previous_status": order.status.value,
                        "reason": reason
                    })
                )
                
                # Processar reembolso se necessário
                if order.payment and order.payment.online:
                    await self.process_refund(order, reason)
                
                # Notificar cliente
                await self.notify_customer_status_change(order, RemoteOrderStatus.REJECTED)
                
                return True
        
        return False
    
    async def update_remote_order(self, order: RemoteOrder) -> RemoteOrder:
        """
        Atualiza um pedido remoto no banco de dados.
        
        Args:
            order: Pedido a ser atualizado
            
        Returns:
            RemoteOrder: Pedido atualizado
        """
        # Em uma implementação real, atualizar no banco de dados
        # Exemplo:
        # db_order = await RemoteOrderModel.get(id=order.id)
        # for key, value in order.dict().items():
        #     setattr(db_order, key, value)
        # await db_order.save()
        # return RemoteOrder(**db_order.dict())
        
        # Implementação simulada para desenvolvimento
        logger.info(f"Updating Rappi order: {order.id} to status {order.status}")
        return order
    
    async def get_remote_order(self, order_id: str) -> Optional[RemoteOrder]:
        """
        Obtém um pedido remoto pelo ID.
        
        Args:
            order_id: ID do pedido
            
        Returns:
            Optional[RemoteOrder]: Pedido encontrado ou None
        """
        # Em uma implementação real, buscar do banco de dados
        # Exemplo:
        # db_order = await RemoteOrderModel.get(id=order_id)
        # return RemoteOrder(**db_order.dict()) if db_order else None
        
        # Implementação simulada para desenvolvimento
        # Criar um pedido simulado para testes
        if order_id.startswith("rappi_"):
            return RemoteOrder(
                id=order_id,
                external_id=order_id.replace("rappi_", ""),
                source="rappi",
                restaurant_id="restaurant_123",
                store_id="store_123",
                order_number="R12345",
                status=RemoteOrderStatus.PENDING,
                customer={
                    "id": "customer_123",
                    "name": "Cliente Teste",
                    "email": "cliente@teste.com",
                    "phone": "+5511999999999",
                    "address": {
                        "street": "Rua Teste",
                        "number": "123",
                        "complement": "Apto 45",
                        "neighborhood": "Bairro Teste",
                        "city": "São Paulo",
                        "state": "SP",
                        "zipcode": "01234-567"
                    }
                },
                items=[
                    RemoteOrderItem(
                        id="item_1",
                        name="X-Burger",
                        quantity=1,
                        unit_price=25.90,
                        total_price=25.90,
                        notes="Sem cebola",
                        options=[]
                    ),
                    RemoteOrderItem(
                        id="item_2",
                        name="Batata Frita",
                        quantity=1,
                        unit_price=12.90,
                        total_price=12.90,
                        notes="",
                        options=[]
                    )
                ],
                payment={
                    "method": "credit_card",
                    "status": "approved",
                    "total": 38.80,
                    "currency": "BRL",
                    "online": True
                },
                delivery={
                    "type": "delivery",
                    "address": {
                        "street": "Rua Teste",
                        "number": "123",
                        "complement": "Apto 45",
                        "neighborhood": "Bairro Teste",
                        "city": "São Paulo",
                        "state": "SP",
                        "zipcode": "01234-567"
                    },
                    "notes": "",
                    "estimated_time": 30
                },
                total_amount=38.80,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                raw_data={}
            )
        
        return None
    
    async def update_order_status(self, order_id: str, status: RemoteOrderStatus) -> bool:
        """
        Atualiza o status de um pedido remoto.
        
        Args:
            order_id: ID do pedido
            status: Novo status
            
        Returns:
            bool: True se a atualização foi bem-sucedida
        """
        # Obter pedido
        order = await self.get_remote_order(order_id)
        
        if not order:
            logger.error(f"Order {order_id} not found")
            return False
        
        if order.source != "rappi":
            logger.error(f"Order {order_id} is not from Rappi")
            return False
        
        # Obter configuração do restaurante
        config = await self.get_rappi_configuration(order.restaurant_id)
        
        if not config:
            logger.error(f"Rappi configuration not found for restaurant {order.restaurant_id}")
            return False
        
        # Salvar status anterior
        previous_status = order.status
        
        # Atualizar status na API Rappi
        async with RappiAdapter(config) as adapter:
            success = await adapter.update_order_status(order.external_id, status)
            
            if success:
                # Atualizar status no banco de dados
                order.status = status
                order.updated_at = datetime.now()
                await self.update_remote_order(order)
                
                # Publicar evento
                await self.event_bus.publish(
                    "remote_order.status_changed",
                    Event(data={
                        "order_id": order.id,
                        "source": "rappi",
                        "restaurant_id": order.restaurant_id,
                        "store_id": order.store_id,
                        "status": status.value,
                        "previous_status": previous_status.value
                    })
                )
                
                # Notificar cliente
                await self.notify_customer_status_change(order, status)
                
                return True
        
        return False
    
    async def process_refund(self, order: RemoteOrder, reason: str) -> bool:
        """
        Processa o reembolso de um pedido.
        
        Args:
            order: Pedido a ser reembolsado
            reason: Motivo do reembolso
            
        Returns:
            bool: True se o reembolso foi processado com sucesso
        """
        if not order.payment or not order.payment.online:
            logger.info(f"Order {order.id} does not have online payment, no refund needed")
            return True
        
        # Obter configuração do restaurante
        config = await self.get_rappi_configuration(order.restaurant_id)
        
        if not config:
            logger.error(f"Rappi configuration not found for restaurant {order.restaurant_id}")
            return False
        
        # Solicitar reembolso na API Rappi
        async with RappiAdapter(config) as adapter:
            success = await adapter.request_refund(
                order.external_id, 
                reason,
                order.payment.total
            )
            
            if success:
                # Registrar reembolso no sistema de pagamento
                await self.payment_service.register_refund(
                    order_id=order.id,
                    amount=order.payment.total,
                    reason=reason,
                    source="rappi"
                )
                
                # Publicar evento
                await self.event_bus.publish(
                    "remote_order.refunded",
                    Event(data={
                        "order_id": order.id,
                        "source": "rappi",
                        "restaurant_id": order.restaurant_id,
                        "store_id": order.store_id,
                        "amount": order.payment.total,
                        "reason": reason
                    })
                )
                
                return True
        
        return False
    
    async def notify_customer_status_change(self, order: RemoteOrder, status: RemoteOrderStatus) -> bool:
        """
        Notifica o cliente sobre mudança de status do pedido.
        
        Args:
            order: Pedido atualizado
            status: Novo status
            
        Returns:
            bool: True se a notificação foi enviada com sucesso
        """
        # Obter configuração do restaurante
        config = await self.get_rappi_configuration(order.restaurant_id)
        
        if not config:
            logger.error(f"Rappi configuration not found for restaurant {order.restaurant_id}")
            return False
        
        # Definir mensagem com base no status
        message = ""
        if status == RemoteOrderStatus.CONFIRMED:
            message = "Seu pedido foi confirmado e está sendo preparado!"
        elif status == RemoteOrderStatus.REJECTED:
            message = "Infelizmente seu pedido foi rejeitado. Entre em contato para mais informações."
        elif status == RemoteOrderStatus.PREPARING:
            message = "Seu pedido está sendo preparado!"
        elif status == RemoteOrderStatus.READY:
            message = "Seu pedido está pronto e será entregue em breve!"
        elif status == RemoteOrderStatus.DELIVERING:
            message = "Seu pedido saiu para entrega!"
        elif status == RemoteOrderStatus.DELIVERED:
            message = "Seu pedido foi entregue. Bom apetite!"
        else:
            message = f"O status do seu pedido foi atualizado para: {status.value}"
        
        # Enviar notificação via API Rappi
        async with RappiAdapter(config) as adapter:
            success = await adapter.notify_customer(order.external_id, message)
            
            if success:
                logger.info(f"Customer notification sent for order {order.id}: {message}")
                return True
            else:
                logger.error(f"Failed to send customer notification for order {order.id}")
                return False
    
    async def handle_order_status_change(self, event: Event) -> None:
        """
        Manipula eventos de mudança de status de pedidos.
        
        Args:
            event: Evento de mudança de status
        """
        data = event.data
        order_id = data.get("order_id")
        status = data.get("status")
        source = data.get("source")
        
        if not order_id or not status or source != "rappi":
            return
        
        logger.info(f"Handling status change for Rappi order {order_id}: {status}")
        
        # Lógica específica para cada transição de status
        # Exemplo: enviar notificações, atualizar inventário, etc.
        
    async def handle_confirmation_timeout(self, event: Event) -> None:
        """
        Manipula eventos de timeout de confirmação de pedidos.
        
        Args:
            event: Evento de timeout
        """
        data = event.data
        order_id = data.get("order_id")
        
        if not order_id:
            return
        
        # Obter pedido
        order = await self.get_remote_order(order_id)
        
        if not order or order.source != "rappi" or order.status != RemoteOrderStatus.PENDING:
            return
        
        logger.info(f"Confirmation timeout for Rappi order {order_id}")
        
        # Rejeitar pedido automaticamente
        await self.reject_remote_order(
            order_id, 
            "Tempo de confirmação expirado"
        )
    
    async def update_product_availability(self, restaurant_id: str, product_id: str, available: bool) -> bool:
        """
        Atualiza a disponibilidade de um produto no Rappi.
        
        Args:
            restaurant_id: ID do restaurante
            product_id: ID do produto no sistema POS
            available: True se disponível, False caso contrário
            
        Returns:
            bool: True se a atualização foi bem-sucedida
        """
        # Obter configuração do restaurante
        config = await self.get_rappi_configuration(restaurant_id)
        
        if not config:
            logger.error(f"Rappi configuration not found for restaurant {restaurant_id}")
            return False
        
        # Obter mapeamento do produto
        rappi_product_id = await self.get_rappi_product_id(restaurant_id, product_id)
        
        if not rappi_product_id:
            logger.error(f"Rappi product mapping not found for product {product_id}")
            return False
        
        # Atualizar disponibilidade na API Rappi
        async with RappiAdapter(config) as adapter:
            success = await adapter.update_product_availability(rappi_product_id, available)
            
            if success:
                logger.info(f"Product {product_id} availability updated to {available} in Rappi")
                return True
            else:
                logger.error(f"Failed to update product {product_id} availability in Rappi")
                return False
    
    async def get_rappi_product_id(self, restaurant_id: str, pos_product_id: str) -> Optional[str]:
        """
        Obtém o ID de um produto no Rappi a partir do ID no sistema POS.
        
        Args:
            restaurant_id: ID do restaurante
            pos_product_id: ID do produto no sistema POS
            
        Returns:
            Optional[str]: ID do produto no Rappi ou None se não encontrado
        """
        # Em uma implementação real, buscar do banco de dados
        # Exemplo:
        # mapping = await RappiProductMapping.get(
        #     restaurant_id=restaurant_id,
        #     pos_product_id=pos_product_id,
        #     active=True
        # )
        # return mapping.rappi_product_id if mapping else None
        
        # Implementação simulada para desenvolvimento
        # Simular um mapeamento básico
        product_mappings = {
            "product_1": "rappi_product_1",
            "product_2": "rappi_product_2",
            "product_3": "rappi_product_3"
        }
        
        return product_mappings.get(pos_product_id)

# Função para obter uma instância do serviço
_rappi_order_service = None

def get_rappi_order_service(event_bus=None, payment_service=None) -> RappiOrderService:
    """
    Obtém uma instância do serviço de pedidos Rappi.
    
    Args:
        event_bus: Instância opcional do barramento de eventos
        payment_service: Instância opcional do serviço de pagamento
        
    Returns:
        RappiOrderService: Instância do serviço de pedidos Rappi
    """
    global _rappi_order_service
    
    if _rappi_order_service is None:
        from src.core.events.event_bus import get_event_bus
        from src.payment.services.payment_service import get_payment_service
        
        _event_bus = event_bus or get_event_bus()
        _payment_service = payment_service or get_payment_service()
        
        _rappi_order_service = RappiOrderService(_event_bus, _payment_service)
        
    return _rappi_order_service
