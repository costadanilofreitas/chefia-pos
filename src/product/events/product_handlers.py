from src.core.events.event_bus import Event, EventType, EventHandler, get_event_bus
from src.product.services.product_service import get_product_service
import logging

logger = logging.getLogger(__name__)

class ProductEventHandlers:
    """Handlers para eventos relacionados a produtos."""
    
    @staticmethod
    async def handle_business_day_opened(event: Event) -> None:
        """
        Handler para evento de abertura de dia.
        Atualiza status de produtos sazonais se necessário.
        """
        logger.info(f"Processando evento de abertura de dia: {event.event_type}")
        
        try:
            # Aqui poderia implementar lógica para ativar produtos sazonais
            # com base na data do dia que foi aberto
            pass
        except Exception as e:
            logger.error(f"Erro ao processar evento de abertura de dia: {e}")
    
    @staticmethod
    async def handle_business_day_closed(event: Event) -> None:
        """
        Handler para evento de fechamento de dia.
        Pode atualizar estatísticas de produtos ou gerar relatórios.
        """
        logger.info(f"Processando evento de fechamento de dia: {event.event_type}")
        
        try:
            # Aqui poderia implementar lógica para atualizar estatísticas
            # de produtos vendidos no dia
            pass
        except Exception as e:
            logger.error(f"Erro ao processar evento de fechamento de dia: {e}")
    
    @staticmethod
    async def handle_order_created(event: Event) -> None:
        """
        Handler para evento de criação de pedido.
        Pode atualizar contadores de popularidade de produtos.
        """
        logger.info(f"Processando evento de criação de pedido: {event.event_type}")
        
        try:
            # Extrair dados do pedido
            order_data = event.data.get('order', {})
            items = order_data.get('items', [])
            
            # Atualizar contadores de popularidade (exemplo)
            # Em uma implementação real, isso seria persistido em banco de dados
            for item in items:
                product_id = item.get('product_id')
                quantity = item.get('quantity', 1)
                
                if product_id:
                    logger.info(f"Produto {product_id} vendido: {quantity} unidades")
        except Exception as e:
            logger.error(f"Erro ao processar evento de criação de pedido: {e}")
    
    @staticmethod
    async def handle_inventory_updated(event: Event) -> None:
        """
        Handler para evento de atualização de estoque.
        Atualiza status de produtos com base na disponibilidade.
        """
        logger.info(f"Processando evento de atualização de estoque: {event.event_type}")
        
        try:
            # Extrair dados do estoque
            inventory_data = event.data.get('inventory', {})
            product_id = inventory_data.get('product_id')
            quantity = inventory_data.get('quantity', 0)
            
            if not product_id:
                return
            
            # Obter serviço de produtos
            product_service = get_product_service()
            
            # Buscar produto
            product = await product_service.get_product(product_id)
            if not product:
                logger.warning(f"Produto não encontrado: {product_id}")
                return
            
            # Atualizar status com base no estoque
            if quantity <= 0 and product.status != "out_of_stock":
                await product_service.update_product(
                    product_id=product_id,
                    update_data={"status": "out_of_stock"}
                )
                logger.info(f"Produto {product_id} marcado como fora de estoque")
            elif quantity > 0 and product.status == "out_of_stock":
                await product_service.update_product(
                    product_id=product_id,
                    update_data={"status": "active"}
                )
                logger.info(f"Produto {product_id} reativado")
        except Exception as e:
            logger.error(f"Erro ao processar evento de atualização de estoque: {e}")


async def register_product_event_handlers():
    """Registra os handlers de eventos para o módulo de produtos."""
    event_bus = get_event_bus()
    
    # Registrar handlers
    await event_bus.subscribe(
        EventType.BUSINESS_DAY_OPENED,
        EventHandler(ProductEventHandlers.handle_business_day_opened)
    )
    
    await event_bus.subscribe(
        EventType.BUSINESS_DAY_CLOSED,
        EventHandler(ProductEventHandlers.handle_business_day_closed)
    )
    
    await event_bus.subscribe(
        EventType.ORDER_CREATED,
        EventHandler(ProductEventHandlers.handle_order_created)
    )
    
    await event_bus.subscribe(
        EventType.INVENTORY_UPDATED,
        EventHandler(ProductEventHandlers.handle_inventory_updated)
    )
    
    logger.info("Handlers de eventos para o módulo de produtos registrados com sucesso")
