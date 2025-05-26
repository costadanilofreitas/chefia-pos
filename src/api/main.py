from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import json
import logging
from datetime import datetime

from src.core.middleware import add_middlewares
from src.auth.security import get_current_user
from src.pos.router.pos_router import router as pos_router
from src.order.router.order_router import router as order_router
from src.product.router.product_router import router as product_router
from src.business_day.router.business_day_router import router as business_day_router
from src.cashier.router.cashier_router import router as cashier_router
from src.kds.router.kds_router import router as kds_router
from src.waiter.router.waiter_router import router as waiter_router
from src.stock.router.stock_router import router as stock_router
from src.customer.router.customer_router import router as customer_router
from src.kiosk.router.kiosk_router import router as kiosk_router
from src.versioning.router.version_router import router as version_router
from src.logging.router.log_router import router as log_router
from src.supplier.router.supplier_router import router as supplier_router
from src.employee.router.employee_router import router as employee_router
from src.accounts.router.accounts_router import router as accounts_router

app = FastAPI(
    title="POS Modern API",
    description="API para o sistema POS Modern",
    version="1.0.0"
)

# Configuração de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Adiciona middlewares personalizados
add_middlewares(app)

# Inclui rotas
app.include_router(pos_router)
app.include_router(order_router)
app.include_router(product_router)
app.include_router(business_day_router)
app.include_router(cashier_router)
app.include_router(kds_router)
app.include_router(waiter_router)
app.include_router(stock_router)
app.include_router(customer_router)
app.include_router(kiosk_router)
app.include_router(version_router)
app.include_router(log_router)
app.include_router(supplier_router)
app.include_router(employee_router)
app.include_router(accounts_router)

@app.get("/")
async def root():
    return {"message": "POS Modern API", "version": "1.0.0", "status": "online"}

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
