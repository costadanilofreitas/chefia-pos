#!/usr/bin/env python3
"""
Servidor mínimo para testar apenas o módulo de autenticação
"""
import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configurar logging
os.environ.setdefault("LOG_FILE", "/tmp/pos-modern.log")

# Adicionar src ao path
sys.path.append('.')

# Importar apenas o que precisamos para auth
from src.auth.router.numeric_password_router import router as auth_router

# Criar app FastAPI
app = FastAPI(
    title="POS Modern - Auth Service",
    description="Serviço de autenticação do POS Modern",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3004", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])

# Health check
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "auth"}

@app.get("/")
async def root():
    return {"message": "POS Modern Auth Service", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

