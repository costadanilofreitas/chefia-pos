from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import sys
import os

# Adicionar src ao path
sys.path.append('/home/ubuntu/chefia-pos')

# Importar router de autenticação
from src.auth.router.numeric_password_router import router as auth_router

# Criar aplicação FastAPI
app = FastAPI(
    title="Chefia POS - Auth Service",
    description="Microserviço de autenticação com senhas numéricas",
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
app.include_router(auth_router, prefix="/api/v1/auth")

# Health check
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "auth"}

# Root endpoint
@app.get("/")
async def root():
    return {
        "service": "Chefia POS - Auth Service",
        "version": "1.0.0",
        "description": "Microserviço de autenticação com senhas numéricas",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "auth": "/api/v1/auth"
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        reload=False
    )

