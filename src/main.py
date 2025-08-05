from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
from datetime import datetime

from src.core.middleware.error_handling import register_exception_handlers, error_handling_middleware
from src.core.utils.logging_utils import configure_logging

# Configurar logging
log_file = os.environ.get("LOG_FILE", "/var/log/pos-modern/app.log")
log_level = os.environ.get("LOG_LEVEL", "INFO")

configure_logging(
    log_level=log_level,
    log_file=log_file
)

logger = logging.getLogger(__name__)

# Criar aplicação
app = FastAPI(
    title="POS Modern API",
    description="API para o sistema POS Modern",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar origens permitidas
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar middleware de tratamento de erros
app.middleware("http")(error_handling_middleware)

# Registrar handlers de exceções
register_exception_handlers(app)

# Importar e registrar routers
from src.auth.auth_router import router as auth_router
from src.cashier.router.cashier_router import router as cashier_router
from src.customer.router.customer_router import router as customer_router
from src.employee.router.employee_router import router as employee_router
from src.delivery.router.delivery_router import router as delivery_router
from src.product.router.product_router import router as product_router
from src.order.router.order_router import router as order_router
from src.business_day.router.business_day_router import router as business_day_router
from src.loyalty.router.campaign_router import router as campaign_router
from src.loyalty.router.coupon_router import router as coupon_router
# from src.analytics.router.analytics_router import router as analytics_router  # Comentado temporariamente
# from src.payment.router.payment_router import router as payment_router
# from src.payment.router.split_payment_router import router as split_payment_router
# from src.remote_orders.router.remote_order_router import router as remote_order_router
# from src.remote_orders.router.rappi_router import router as rappi_router
# from src.waiter.router.table_layout_router import router as table_layout_router
# from src.peripherals.router.keyboard_router import router as keyboard_router

# Registrar routers
app.include_router(auth_router)
app.include_router(cashier_router)
app.include_router(product_router)
app.include_router(customer_router)
app.include_router(delivery_router)
# app.include_router(maps_router)  # Comentado - não definido
app.include_router(employee_router)
app.include_router(business_day_router)
app.include_router(campaign_router)
app.include_router(coupon_router)
app.include_router(order_router)
# app.include_router(analytics_router)  # Comentado temporariamente
# app.include_router(payment_router)
# app.include_router(split_payment_router)
# app.include_router(remote_order_router)
# app.include_router(rappi_router)
# app.include_router(table_layout_router)
# app.include_router(keyboard_router)

@app.on_event("startup")
async def startup_event():
    """Evento executado na inicialização da aplicação."""
    logger.info("Aplicação POS Modern iniciada")
    
    # Inicializar serviços que precisam ser iniciados na startup
    from src.peripherals.services.keyboard_manager import get_keyboard_manager
    keyboard_manager = get_keyboard_manager()
    keyboard_manager.start()
    
    logger.info("Serviços inicializados com sucesso")

@app.on_event("shutdown")
async def shutdown_event():
    """Evento executado no encerramento da aplicação."""
    logger.info("Encerrando aplicação POS Modern")
    
    # Parar serviços que precisam ser encerrados
    from src.peripherals.services.keyboard_manager import get_keyboard_manager
    keyboard_manager = get_keyboard_manager()
    keyboard_manager.stop()
    
    logger.info("Serviços encerrados com sucesso")

@app.get("/")
async def root():
    """Endpoint raiz da API."""
    return {
        "name": "POS Modern API",
        "version": "1.0.0",
        "status": "online"
    }

@app.get("/health")
async def health_check():
    """Endpoint para verificação de saúde da API."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
