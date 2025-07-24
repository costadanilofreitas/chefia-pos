#!/usr/bin/env python3
"""
Servidor simples de produtos para teste de integração
Simula os endpoints básicos do microserviço de produtos
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from datetime import datetime
import uuid

# Modelos de dados
class Product(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    price: float
    category_id: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    status: str = "ACTIVE"
    type: str = "SIMPLE"
    is_featured: bool = False
    weight_based: bool = False
    pricing_strategy: str = "FIXED"
    created_at: str
    updated_at: str
    images: List[str] = []
    ingredients: List[dict] = []
    combo_items: List[dict] = []

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    category_id: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    type: Optional[str] = "SIMPLE"
    is_featured: Optional[bool] = False
    weight_based: Optional[bool] = False
    pricing_strategy: Optional[str] = "FIXED"

class Category(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: str
    updated_at: str

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

# Criar aplicação FastAPI
app = FastAPI(
    title="Simple Product Service",
    description="Servidor simples de produtos para teste de integração",
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

# Dados mock
mock_categories = [
    Category(
        id="cat1",
        name="Bebidas",
        description="Bebidas diversas",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    ),
    Category(
        id="cat2", 
        name="Lanches",
        description="Lanches e petiscos",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    ),
    Category(
        id="cat3",
        name="Pratos Principais",
        description="Pratos principais do cardápio",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    )
]

mock_products = [
    Product(
        id="prod1",
        name="Coca-Cola 350ml",
        description="Refrigerante Coca-Cola lata 350ml",
        price=4.50,
        category_id="cat1",
        sku="COCA350",
        status="ACTIVE",
        type="SIMPLE",
        is_featured=True,
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    ),
    Product(
        id="prod2",
        name="Hambúrguer Clássico",
        description="Hambúrguer com carne, queijo, alface e tomate",
        price=18.90,
        category_id="cat2",
        sku="HAMB001",
        status="ACTIVE",
        type="SIMPLE",
        is_featured=True,
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    ),
    Product(
        id="prod3",
        name="Batata Frita",
        description="Porção de batata frita crocante",
        price=12.00,
        category_id="cat2",
        sku="BATATA001",
        status="ACTIVE",
        type="SIMPLE",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    ),
    Product(
        id="prod4",
        name="Filé de Frango Grelhado",
        description="Filé de frango grelhado com legumes",
        price=25.90,
        category_id="cat3",
        sku="FRANGO001",
        status="ACTIVE",
        type="SIMPLE",
        is_featured=True,
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    )
]

# Endpoints
@app.get("/")
async def root():
    return {"message": "Simple Product Service", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "product-service"}

@app.get("/products", response_model=List[Product])
async def get_products():
    return mock_products

@app.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    for product in mock_products:
        if product.id == product_id:
            return product
    raise HTTPException(status_code=404, detail="Product not found")

@app.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate):
    new_product = Product(
        id=str(uuid.uuid4()),
        name=product_data.name,
        description=product_data.description,
        price=product_data.price,
        category_id=product_data.category_id,
        sku=product_data.sku,
        barcode=product_data.barcode,
        status=product_data.status,
        type=product_data.type,
        is_featured=product_data.is_featured,
        weight_based=product_data.weight_based,
        pricing_strategy=product_data.pricing_strategy,
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    )
    mock_products.append(new_product)
    return new_product

@app.get("/categories", response_model=List[Category])
async def get_categories():
    return mock_categories

@app.get("/categories/{category_id}", response_model=Category)
async def get_category(category_id: str):
    for category in mock_categories:
        if category.id == category_id:
            return category
    raise HTTPException(status_code=404, detail="Category not found")

@app.post("/categories", response_model=Category)
async def create_category(category_data: CategoryCreate):
    new_category = Category(
        id=str(uuid.uuid4()),
        name=category_data.name,
        description=category_data.description,
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    )
    mock_categories.append(new_category)
    return new_category

@app.get("/categories/{category_id}/products", response_model=List[Product])
async def get_products_by_category(category_id: str):
    products = [p for p in mock_products if p.category_id == category_id]
    return products

if __name__ == "__main__":
    print("Iniciando servidor simples de produtos...")
    print("Endpoints disponíveis:")
    print("- GET /products - Lista todos os produtos")
    print("- GET /products/{id} - Busca produto por ID")
    print("- POST /products - Cria novo produto")
    print("- GET /categories - Lista todas as categorias")
    print("- GET /categories/{id} - Busca categoria por ID")
    print("- POST /categories - Cria nova categoria")
    print("- GET /categories/{id}/products - Lista produtos por categoria")
    print("- GET /health - Health check")
    print("\nServidor rodando em: http://localhost:8002")
    
    uvicorn.run(app, host="0.0.0.0", port=8002)

