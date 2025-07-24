#!/usr/bin/env python3
"""
Servidor simples de cashier para teste de integração
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
import uvicorn
import uuid

# Modelos
class CashierStatus(BaseModel):
    id: str
    terminal_id: str
    operator_id: str
    operator_name: str
    status: str  # "open", "closed"
    opening_date: datetime
    closing_date: Optional[datetime] = None
    initial_amount: float
    current_amount: float
    total_sales: float
    total_cash_in: float
    total_cash_out: float
    transactions_count: int

class OpenCashierData(BaseModel):
    terminal_id: str
    operator_id: str
    operator_name: str
    initial_amount: float

class CloseCashierData(BaseModel):
    final_amount: float
    notes: Optional[str] = None

class SaleData(BaseModel):
    amount: float
    payment_method: str
    order_id: str

class CashMovementData(BaseModel):
    amount: float
    reason: str
    notes: Optional[str] = None

# Dados em memória
cashiers_db = {}
current_cashier_id = None

# Criar aplicação
app = FastAPI(
    title="POS Cashier Service",
    description="Serviço de caixa para teste",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoints
@app.get("/")
async def root():
    return {"name": "POS Cashier Service", "version": "1.0.0", "status": "online"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "cashier-service", "timestamp": datetime.now().isoformat()}

@app.get("/api/v1/cashiers/current", response_model=Optional[CashierStatus])
async def get_current_cashier():
    """
    Retorna o caixa atualmente aberto.
    """
    if current_cashier_id and current_cashier_id in cashiers_db:
        cashier = cashiers_db[current_cashier_id]
        if cashier.status == "open":
            return cashier
    return None

@app.post("/api/v1/cashiers/open", response_model=CashierStatus)
async def open_cashier(data: OpenCashierData):
    """
    Abre um novo caixa.
    """
    global current_cashier_id
    
    # Verificar se já existe um caixa aberto
    if current_cashier_id and current_cashier_id in cashiers_db:
        current = cashiers_db[current_cashier_id]
        if current.status == "open":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Já existe um caixa aberto. Feche o caixa atual antes de abrir um novo."
            )
    
    # Criar novo caixa
    cashier_id = str(uuid.uuid4())
    cashier = CashierStatus(
        id=cashier_id,
        terminal_id=data.terminal_id,
        operator_id=data.operator_id,
        operator_name=data.operator_name,
        status="open",
        opening_date=datetime.now(),
        initial_amount=data.initial_amount,
        current_amount=data.initial_amount,
        total_sales=0.0,
        total_cash_in=0.0,
        total_cash_out=0.0,
        transactions_count=0
    )
    
    cashiers_db[cashier_id] = cashier
    current_cashier_id = cashier_id
    
    print(f"✅ Caixa aberto: {data.operator_name} - R$ {data.initial_amount:.2f}")
    return cashier

@app.post("/api/v1/cashiers/close", response_model=CashierStatus)
async def close_cashier(data: CloseCashierData):
    """
    Fecha o caixa atual.
    """
    global current_cashier_id
    
    if not current_cashier_id or current_cashier_id not in cashiers_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não há caixa aberto para fechar."
        )
    
    cashier = cashiers_db[current_cashier_id]
    if cashier.status != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O caixa já está fechado."
        )
    
    # Fechar caixa
    cashier.status = "closed"
    cashier.closing_date = datetime.now()
    cashier.current_amount = data.final_amount
    
    print(f"✅ Caixa fechado: {cashier.operator_name} - R$ {data.final_amount:.2f}")
    current_cashier_id = None
    
    return cashier

@app.post("/api/v1/cashiers/sales", response_model=CashierStatus)
async def register_sale(data: SaleData):
    """
    Registra uma venda no caixa.
    """
    if not current_cashier_id or current_cashier_id not in cashiers_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não há caixa aberto."
        )
    
    cashier = cashiers_db[current_cashier_id]
    if cashier.status != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O caixa não está aberto."
        )
    
    # Registrar venda
    cashier.total_sales += data.amount
    if data.payment_method.lower() in ["dinheiro", "cash"]:
        cashier.current_amount += data.amount
    cashier.transactions_count += 1
    
    print(f"💰 Venda registrada: R$ {data.amount:.2f} ({data.payment_method})")
    return cashier

@app.post("/api/v1/cashiers/cash-out", response_model=CashierStatus)
async def register_cash_out(data: CashMovementData):
    """
    Registra uma sangria (retirada de dinheiro).
    """
    if not current_cashier_id or current_cashier_id not in cashiers_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não há caixa aberto."
        )
    
    cashier = cashiers_db[current_cashier_id]
    if cashier.status != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O caixa não está aberto."
        )
    
    if cashier.current_amount < data.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valor insuficiente no caixa."
        )
    
    # Registrar sangria
    cashier.current_amount -= data.amount
    cashier.total_cash_out += data.amount
    cashier.transactions_count += 1
    
    print(f"📤 Sangria registrada: R$ {data.amount:.2f} - {data.reason}")
    return cashier

@app.post("/api/v1/cashiers/cash-in", response_model=CashierStatus)
async def register_cash_in(data: CashMovementData):
    """
    Registra um reforço (entrada de dinheiro).
    """
    if not current_cashier_id or current_cashier_id not in cashiers_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não há caixa aberto."
        )
    
    cashier = cashiers_db[current_cashier_id]
    if cashier.status != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O caixa não está aberto."
        )
    
    # Registrar reforço
    cashier.current_amount += data.amount
    cashier.total_cash_in += data.amount
    cashier.transactions_count += 1
    
    print(f"📥 Reforço registrado: R$ {data.amount:.2f} - {data.reason}")
    return cashier

@app.get("/api/v1/cashiers/history", response_model=List[CashierStatus])
async def get_cashier_history():
    """
    Retorna o histórico de caixas.
    """
    return list(cashiers_db.values())

@app.get("/api/v1/cashiers", response_model=List[CashierStatus])
async def get_cashiers(status: Optional[str] = None):
    """
    Retorna lista de caixas, opcionalmente filtrada por status.
    """
    cashiers = list(cashiers_db.values())
    if status:
        cashiers = [c for c in cashiers if c.status == status]
    return cashiers

if __name__ == "__main__":
    print("🚀 Iniciando servidor de caixa...")
    print("📍 URL: http://localhost:8001")
    print("📋 Endpoints:")
    print("   - GET /api/v1/cashiers/current")
    print("   - POST /api/v1/cashiers/open")
    print("   - POST /api/v1/cashiers/close")
    print("   - POST /api/v1/cashiers/sales")
    print("   - POST /api/v1/cashiers/cash-out")
    print("   - POST /api/v1/cashiers/cash-in")
    print("   - GET /api/v1/cashiers/history")
    print("   - GET /health")
    
    uvicorn.run(app, host="0.0.0.0", port=8001)

