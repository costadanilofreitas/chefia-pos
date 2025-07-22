from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import sys
import os

# Adicionar src ao path
sys.path.append('/home/ubuntu/chefia-pos')

# Importar router de produtos
from src.product.router.product_router import router as product_router

# Criar aplicação FastAPI
app = FastAPI(
    title="Chefia POS - Product Service (with JWT Auth)",
    description="Microserviço de produtos com autenticação JWT",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(product_router)

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "product-auth"}

# Root endpoint
@app.get("/")
async def root():
    return {
        "service": "Chefia POS - Product Service",
        "version": "1.0.0",
        "description": "Microserviço de produtos com autenticação JWT",
        "auth_required": True,
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "categories": "/api/v1/categories",
            "products": "/api/v1/products",
            "ingredients": "/api/v1/ingredients",
            "me": "/api/v1/me"
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8002,
        reload=False
    )

