#!/usr/bin/env python3
"""
Servidor simples de produtos baseado no router real para teste de integração
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
import uvicorn
import uuid

# Modelos baseados no router real
class ProductCategory(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0
    created_at: datetime
    updated_at: datetime

class Product(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category_id: str
    price: float
    cost: Optional[float] = None
    image_url: Optional[str] = None
    is_active: bool = True
    is_available: bool = True
    sort_order: int = 0
    barcode: Optional[str] = None
    sku: Optional[str] = None
    stock_quantity: Optional[int] = None
    min_stock: Optional[int] = None
    created_at: datetime
    updated_at: datetime

# Dados em memória
categories_db = {}
products_db = {}

# Criar aplicação
app = FastAPI(
    title="POS Product Service",
    description="Serviço de produtos para teste",
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

# Inicializar dados de exemplo
def init_sample_data():
    global categories_db, products_db
    
    # Categorias de exemplo
    categories = [
        {
            "id": "cat_1",
            "name": "Lanches",
            "description": "Hambúrgueres e sanduíches",
            "image_url": None,
            "is_active": True,
            "sort_order": 1,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        },
        {
            "id": "cat_2", 
            "name": "Bebidas",
            "description": "Refrigerantes, sucos e águas",
            "image_url": None,
            "is_active": True,
            "sort_order": 2,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        },
        {
            "id": "cat_3",
            "name": "Sobremesas",
            "description": "Doces e sobremesas",
            "image_url": None,
            "is_active": True,
            "sort_order": 3,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
    ]
    
    for cat_data in categories:
        categories_db[cat_data["id"]] = ProductCategory(**cat_data)
    
    # Produtos de exemplo
    products = [
        {
            "id": "prod_1",
            "name": "X-Burger",
            "description": "Hambúrguer com queijo, alface e tomate",
            "category_id": "cat_1",
            "price": 15.90,
            "cost": 8.50,
            "image_url": None,
            "is_active": True,
            "is_available": True,
            "sort_order": 1,
            "barcode": "7891234567890",
            "sku": "XB001",
            "stock_quantity": 50,
            "min_stock": 10,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        },
        {
            "id": "prod_2",
            "name": "X-Bacon",
            "description": "Hambúrguer com bacon, queijo e molho especial",
            "category_id": "cat_1",
            "price": 18.90,
            "cost": 10.50,
            "image_url": None,
            "is_active": True,
            "is_available": True,
            "sort_order": 2,
            "barcode": "7891234567891",
            "sku": "XB002",
            "stock_quantity": 30,
            "min_stock": 5,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        },
        {
            "id": "prod_3",
            "name": "Coca-Cola 350ml",
            "description": "Refrigerante de cola gelado",
            "category_id": "cat_2",
            "price": 4.50,
            "cost": 2.00,
            "image_url": None,
            "is_active": True,
            "is_available": True,
            "sort_order": 1,
            "barcode": "7891234567892",
            "sku": "CC350",
            "stock_quantity": 100,
            "min_stock": 20,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        },
        {
            "id": "prod_4",
            "name": "Suco de Laranja",
            "description": "Suco natural de laranja 300ml",
            "category_id": "cat_2",
            "price": 6.90,
            "cost": 3.50,
            "image_url": None,
            "is_active": True,
            "is_available": True,
            "sort_order": 2,
            "barcode": "7891234567893",
            "sku": "SL300",
            "stock_quantity": 25,
            "min_stock": 5,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        },
        {
            "id": "prod_5",
            "name": "Pudim de Leite",
            "description": "Pudim caseiro com calda de caramelo",
            "category_id": "cat_3",
            "price": 8.90,
            "cost": 4.00,
            "image_url": None,
            "is_active": True,
            "is_available": True,
            "sort_order": 1,
            "barcode": "7891234567894",
            "sku": "PL001",
            "stock_quantity": 15,
            "min_stock": 3,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
    ]
    
    for prod_data in products:
        products_db[prod_data["id"]] = Product(**prod_data)

# Endpoints
@app.get("/")
async def root():
    return {"name": "POS Product Service", "version": "1.0.0", "status": "online"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "product-service", "timestamp": datetime.now().isoformat()}

@app.get("/api/v1/products/categories", response_model=List[ProductCategory])
async def get_categories():
    """
    Retorna todas as categorias de produtos.
    """
    categories = [cat for cat in categories_db.values() if cat.is_active]
    categories.sort(key=lambda x: x.sort_order)
    print(f"📋 Retornando {len(categories)} categorias")
    return categories

@app.get("/api/v1/products", response_model=List[Product])
async def get_products(
    category_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_available: Optional[bool] = None
):
    """
    Retorna lista de produtos com filtros opcionais.
    """
    products = list(products_db.values())
    
    # Aplicar filtros
    if category_id:
        products = [p for p in products if p.category_id == category_id]
    if is_active is not None:
        products = [p for p in products if p.is_active == is_active]
    if is_available is not None:
        products = [p for p in products if p.is_available == is_available]
    
    # Ordenar por categoria e sort_order
    products.sort(key=lambda x: (x.category_id, x.sort_order))
    
    print(f"🛍️ Retornando {len(products)} produtos (filtros: category_id={category_id}, is_active={is_active}, is_available={is_available})")
    return products

@app.get("/api/v1/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    """
    Retorna um produto específico por ID.
    """
    if product_id not in products_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produto com ID {product_id} não encontrado"
        )
    
    product = products_db[product_id]
    print(f"🔍 Retornando produto: {product.name}")
    return product

@app.get("/api/v1/products/categories/{category_id}", response_model=ProductCategory)
async def get_category(category_id: str):
    """
    Retorna uma categoria específica por ID.
    """
    if category_id not in categories_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Categoria com ID {category_id} não encontrada"
        )
    
    category = categories_db[category_id]
    print(f"📂 Retornando categoria: {category.name}")
    return category

@app.get("/api/v1/products/categories/{category_id}/products", response_model=List[Product])
async def get_products_by_category(category_id: str):
    """
    Retorna todos os produtos de uma categoria específica.
    """
    if category_id not in categories_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Categoria com ID {category_id} não encontrada"
        )
    
    products = [p for p in products_db.values() if p.category_id == category_id and p.is_active and p.is_available]
    products.sort(key=lambda x: x.sort_order)
    
    category_name = categories_db[category_id].name
    print(f"📦 Retornando {len(products)} produtos da categoria: {category_name}")
    return products

if __name__ == "__main__":
    print("🚀 Iniciando servidor de produtos...")
    print("📍 URL: http://localhost:8003")
    print("📋 Endpoints:")
    print("   - GET /api/v1/products/categories")
    print("   - GET /api/v1/products")
    print("   - GET /api/v1/products/{product_id}")
    print("   - GET /api/v1/products/categories/{category_id}")
    print("   - GET /api/v1/products/categories/{category_id}/products")
    print("   - GET /health")
    
    # Inicializar dados de exemplo
    init_sample_data()
    print(f"✅ Dados inicializados: {len(categories_db)} categorias, {len(products_db)} produtos")
    
    uvicorn.run(app, host="0.0.0.0", port=8003)

