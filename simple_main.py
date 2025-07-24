#!/usr/bin/env python3
"""
Main simplificado para teste de integração
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import logging

# Configurar logging básico
logging.basicConfig(level=logging.INFO)
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Routers simplificados
from fastapi import APIRouter

# Auth Router Simplificado
auth_router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

@auth_router.post("/login")
async def login():
    """Login simplificado para teste."""
    return {
        "access_token": "test_token",
        "token_type": "bearer",
        "expires_in": 3600
    }

@auth_router.get("/me")
async def get_current_user():
    """Usuário atual simplificado."""
    return {
        "id": "1",
        "username": "gerente",
        "full_name": "Gerente Teste",
        "role": "gerente"
    }

# Cashier Router Simplificado
cashier_router = APIRouter(prefix="/api/v1/cashiers", tags=["cashier"])

@cashier_router.get("/current")
async def get_current_cashier():
    """Caixa atual simplificado."""
    return None  # Nenhum caixa aberto

@cashier_router.post("/open")
async def open_cashier():
    """Abrir caixa simplificado."""
    return {
        "id": "1",
        "terminal_id": "1",
        "operator_id": "1",
        "operator_name": "Gerente Teste",
        "status": "open",
        "opening_date": datetime.now().isoformat(),
        "initial_amount": 100.0,
        "current_amount": 100.0,
        "total_sales": 0.0,
        "total_cash_in": 0.0,
        "total_cash_out": 0.0,
        "transactions_count": 0
    }

# Product Router Simplificado
product_router = APIRouter(prefix="/api/v1/products", tags=["products"])

@product_router.get("/categories")
async def get_categories():
    """Categorias simplificadas."""
    return [
        {
            "id": "cat_1",
            "name": "Lanches",
            "description": "Hambúrgueres e sanduíches",
            "is_active": True,
            "sort_order": 1
        },
        {
            "id": "cat_2", 
            "name": "Bebidas",
            "description": "Refrigerantes, sucos e águas",
            "is_active": True,
            "sort_order": 2
        }
    ]

@product_router.get("")
async def get_products():
    """Produtos simplificados."""
    return [
        {
            "id": "prod_1",
            "name": "X-Burger",
            "description": "Hambúrguer com queijo",
            "category_id": "cat_1",
            "price": 15.90,
            "is_active": True,
            "is_available": True
        },
        {
            "id": "prod_2",
            "name": "Coca-Cola",
            "description": "Refrigerante gelado",
            "category_id": "cat_2",
            "price": 4.50,
            "is_active": True,
            "is_available": True
        }
    ]

# Registrar routers
app.include_router(auth_router)
app.include_router(cashier_router)
app.include_router(product_router)

@app.on_event("startup")
async def startup_event():
    """Evento executado na inicialização da aplicação."""
    logger.info("Aplicação POS Modern iniciada (versão simplificada)")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Iniciando servidor POS Modern simplificado...")
    print("📍 URL: http://localhost:8000")
    print("📋 Endpoints disponíveis:")
    print("   - GET /health")
    print("   - POST /api/v1/auth/login")
    print("   - GET /api/v1/auth/me")
    print("   - GET /api/v1/cashiers/current")
    print("   - POST /api/v1/cashiers/open")
    print("   - GET /api/v1/products/categories")
    print("   - GET /api/v1/products")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)

