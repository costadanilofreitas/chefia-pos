from fastapi import APIRouter, Depends, HTTPException, Query, Path
from typing import List, Optional, Dict
import os
import uuid
from datetime import datetime

from src.product.models.product import (
    Product,
    ProductCreate,
    ProductUpdate,
    ProductSummary,
    ProductCategory,
    CategoryCreate,
    CategoryUpdate,
    ProductStatus,
    ProductType,
    Ingredient,
    IngredientCreate,
    IngredientUpdate
)

router = APIRouter(prefix="/api/v1", tags=["products"])

# Diretório para armazenar imagens
IMAGES_DIR = os.path.join("/tmp/pos-modern/data/images")
os.makedirs(IMAGES_DIR, exist_ok=True)

# Diretório para exportação de cardápios
MENU_EXPORTS_DIR = os.path.join("/tmp/pos-modern/data/menu_exports")
os.makedirs(MENU_EXPORTS_DIR, exist_ok=True)

# Mock data storage
_categories = {}
_products = {}
_ingredients = {}

# Mock dependency - remove auth for testing
def get_current_user_mock():
    """Mock user for testing without auth"""
    return {"id": "admin", "permissions": ["all"]}

# Endpoints para Categorias
@router.post("/categories", response_model=ProductCategory)
async def create_category(
    category: CategoryCreate,
    current_user: dict = Depends(get_current_user_mock)
):
    """Cria uma nova categoria."""
    category_id = str(uuid.uuid4())
    new_category = ProductCategory(
        id=category_id,
        **category.dict()
    )
    _categories[category_id] = new_category
    return new_category

@router.get("/categories/{category_id}", response_model=ProductCategory)
async def get_category(
    category_id: str = Path(..., description="ID da categoria"),
    current_user: dict = Depends(get_current_user_mock)
):
    """Busca uma categoria pelo ID."""
    if category_id not in _categories:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return _categories[category_id]

@router.get("/categories", response_model=List[ProductCategory])
async def list_categories(
    is_active: Optional[bool] = Query(None, description="Filtrar por status ativo"),
    limit: int = Query(50, description="Limite de resultados"),
    offset: int = Query(0, description="Deslocamento para paginação"),
    current_user: dict = Depends(get_current_user_mock)
):
    """Lista categorias com filtros."""
    categories = list(_categories.values())
    
    if is_active is not None:
        categories = [cat for cat in categories if cat.is_active == is_active]
    
    return categories[offset:offset + limit]

@router.put("/categories/{category_id}", response_model=ProductCategory)
async def update_category(
    category_update: CategoryUpdate,
    category_id: str = Path(..., description="ID da categoria"),
    current_user: dict = Depends(get_current_user_mock)
):
    """Atualiza uma categoria."""
    if category_id not in _categories:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    category = _categories[category_id]
    update_data = category_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(category, field, value)
    
    category.updated_at = datetime.utcnow()
    return category

@router.delete("/categories/{category_id}", response_model=Dict[str, bool])
async def delete_category(
    category_id: str = Path(..., description="ID da categoria"),
    current_user: dict = Depends(get_current_user_mock)
):
    """Exclui uma categoria (marcando como inativa)."""
    if category_id not in _categories:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    _categories[category_id].is_active = False
    _categories[category_id].updated_at = datetime.utcnow()
    return {"success": True}

# Endpoints para Produtos
@router.post("/products", response_model=Product)
async def create_product(
    product: ProductCreate,
    current_user: dict = Depends(get_current_user_mock)
):
    """Cria um novo produto."""
    product_id = str(uuid.uuid4())
    new_product = Product(
        id=product_id,
        **product.dict()
    )
    _products[product_id] = new_product
    return new_product

@router.get("/products/{product_id}", response_model=Product)
async def get_product(
    product_id: str = Path(..., description="ID do produto"),
    current_user: dict = Depends(get_current_user_mock)
):
    """Busca um produto pelo ID."""
    if product_id not in _products:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return _products[product_id]

@router.get("/products", response_model=List[ProductSummary])
async def list_products(
    category_id: Optional[str] = Query(None, description="Filtrar por categoria"),
    status: Optional[ProductStatus] = Query(None, description="Filtrar por status"),
    type: Optional[ProductType] = Query(None, description="Filtrar por tipo"),
    is_featured: Optional[bool] = Query(None, description="Filtrar por destaque"),
    search: Optional[str] = Query(None, description="Buscar por nome, descrição, SKU ou código de barras"),
    limit: int = Query(50, description="Limite de resultados"),
    offset: int = Query(0, description="Deslocamento para paginação"),
    current_user: dict = Depends(get_current_user_mock)
):
    """Lista produtos com filtros."""
    products = list(_products.values())
    
    # Aplicar filtros
    if category_id:
        products = [p for p in products if p.category_id == category_id]
    if status:
        products = [p for p in products if p.status == status]
    if type:
        products = [p for p in products if p.type == type]
    if is_featured is not None:
        products = [p for p in products if p.is_featured == is_featured]
    if search:
        search_lower = search.lower()
        products = [p for p in products if 
                   search_lower in p.name.lower() or 
                   (p.description and search_lower in p.description.lower()) or
                   (p.sku and search_lower in p.sku.lower()) or
                   (p.barcode and search_lower in p.barcode.lower())]
    
    # Converter para ProductSummary
    summaries = []
    for product in products[offset:offset + limit]:
        summary = ProductSummary(
            id=product.id,
            name=product.name,
            price=product.price,
            category_id=product.category_id,
            status=product.status,
            type=product.type,
            is_featured=product.is_featured,
            image_url=product.images[0] if product.images else None
        )
        summaries.append(summary)
    
    return summaries

@router.put("/products/{product_id}", response_model=Product)
async def update_product(
    product_update: ProductUpdate,
    product_id: str = Path(..., description="ID do produto"),
    current_user: dict = Depends(get_current_user_mock)
):
    """Atualiza um produto."""
    if product_id not in _products:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    product = _products[product_id]
    update_data = product_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(product, field, value)
    
    product.updated_at = datetime.utcnow()
    return product

@router.delete("/products/{product_id}", response_model=Dict[str, bool])
async def delete_product(
    product_id: str = Path(..., description="ID do produto"),
    current_user: dict = Depends(get_current_user_mock)
):
    """Exclui um produto (marcando como inativo)."""
    if product_id not in _products:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    _products[product_id].status = ProductStatus.INACTIVE
    _products[product_id].updated_at = datetime.utcnow()
    return {"success": True}

# Endpoints para Ingredientes
@router.post("/ingredients", response_model=Ingredient)
async def create_ingredient(
    ingredient: IngredientCreate,
    current_user: dict = Depends(get_current_user_mock)
):
    """Cria um novo ingrediente."""
    ingredient_id = str(uuid.uuid4())
    new_ingredient = Ingredient(
        id=ingredient_id,
        **ingredient.dict()
    )
    _ingredients[ingredient_id] = new_ingredient
    return new_ingredient

@router.get("/ingredients", response_model=List[Ingredient])
async def list_ingredients(
    is_active: Optional[bool] = Query(None, description="Filtrar por status ativo"),
    limit: int = Query(50, description="Limite de resultados"),
    offset: int = Query(0, description="Deslocamento para paginação"),
    current_user: dict = Depends(get_current_user_mock)
):
    """Lista ingredientes com filtros."""
    ingredients = list(_ingredients.values())
    
    if is_active is not None:
        ingredients = [ing for ing in ingredients if ing.is_active == is_active]
    
    return ingredients[offset:offset + limit]

@router.put("/ingredients/{ingredient_id}", response_model=Ingredient)
async def update_ingredient(
    ingredient_update: IngredientUpdate,
    ingredient_id: str = Path(..., description="ID do ingrediente"),
    current_user: dict = Depends(get_current_user_mock)
):
    """Atualiza um ingrediente."""
    if ingredient_id not in _ingredients:
        raise HTTPException(status_code=404, detail="Ingrediente não encontrado")
    
    ingredient = _ingredients[ingredient_id]
    update_data = ingredient_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(ingredient, field, value)
    
    ingredient.updated_at = datetime.utcnow()
    return ingredient

@router.delete("/ingredients/{ingredient_id}", response_model=Dict[str, bool])
async def delete_ingredient(
    ingredient_id: str = Path(..., description="ID do ingrediente"),
    current_user: dict = Depends(get_current_user_mock)
):
    """Exclui um ingrediente (marcando como inativo)."""
    if ingredient_id not in _ingredients:
        raise HTTPException(status_code=404, detail="Ingrediente não encontrado")
    
    _ingredients[ingredient_id].is_active = False
    _ingredients[ingredient_id].updated_at = datetime.utcnow()
    return {"success": True}

