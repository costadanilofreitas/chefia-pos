from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    Query,
    Path,
    Body,
    status,
)  # Added status
from fastapi.responses import FileResponse
from typing import List, Optional, Dict, Any
import os
import shutil
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
    ProductImage,
    ImageUploadResponse,
    ComboItem,
    Menu,
    MenuCreate,
    MenuUpdate,
    ExchangeGroup,
    Ingredient,
    IngredientCreate,
    IngredientUpdate,
    OptionGroup,
    OptionGroupCreate,
    OptionGroupUpdate,
    CompositeSection,
    CompositeProductCreate,
    CompositeProductUpdate,
    MenuExport,
)
from src.product.services.product_service import get_product_service

# Removed check_permissions import, added has_permission
from src.auth.security import get_current_user
from src.auth.models import User, Permission  # Import User and Permission

router = APIRouter(prefix="/api/v1", tags=["products"])

# Diretório para armazenar imagens
IMAGES_DIR = os.path.join("/home/ubuntu/pos-modern/data/images")
os.makedirs(IMAGES_DIR, exist_ok=True)

# Diretório para exportação de cardápios
MENU_EXPORTS_DIR = os.path.join("/home/ubuntu/pos-modern/data/menu_exports")
os.makedirs(MENU_EXPORTS_DIR, exist_ok=True)


# Helper function for inline permission check (similar to other routers)
def _check_permissions(user: User, required_permissions: List[str]):
    """Helper function to check user permissions inline."""
    for perm in required_permissions:
        if perm not in user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissão necessária: {perm}",
            )


# Endpoints para Produtos
@router.post("/products", response_model=Product)
async def create_product(
    product: ProductCreate,
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["product:create"])) # Replaced with inline check
):
    """
    Cria um novo produto.
    Requer permissão: PRODUCT_CREATE
    """
    _check_permissions(current_user, [Permission.PRODUCT_CREATE])
    product_service = get_product_service()
    return await product_service.create_product(product)


@router.get("/products/{product_id}", response_model=Product)
async def get_product(
    product_id: str = Path(..., description="ID do produto"),
    current_user: User = Depends(get_current_user),
):
    """
    Busca um produto pelo ID.
    Requer permissão: PRODUCT_READ
    """
    _check_permissions(current_user, [Permission.PRODUCT_READ])
    product_service = get_product_service()
    product = await product_service.get_product(product_id)

    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    return product


@router.get("/products", response_model=List[ProductSummary])
async def list_products(
    category_id: Optional[str] = Query(None, description="Filtrar por categoria"),
    status: Optional[ProductStatus] = Query(None, description="Filtrar por status"),
    type: Optional[ProductType] = Query(None, description="Filtrar por tipo"),
    is_featured: Optional[bool] = Query(None, description="Filtrar por destaque"),
    search: Optional[str] = Query(
        None, description="Buscar por nome, descrição, SKU ou código de barras"
    ),
    has_ingredients: Optional[bool] = Query(
        None, description="Filtrar produtos com ingredientes"
    ),
    weight_based: Optional[bool] = Query(
        None, description="Filtrar produtos vendidos por peso"
    ),
    limit: int = Query(50, description="Limite de resultados"),
    offset: int = Query(0, description="Deslocamento para paginação"),
    current_user: User = Depends(get_current_user),
):
    """
    Lista produtos com filtros.
    Requer permissão: PRODUCT_READ
    """
    _check_permissions(current_user, [Permission.PRODUCT_READ])
    product_service = get_product_service()
    return await product_service.list_products(
        category_id=category_id,
        status=status,
        type=type,
        is_featured=is_featured,
        search=search,
        has_ingredients=has_ingredients,
        weight_based=weight_based,
        limit=limit,
        offset=offset,
    )


@router.put("/products/{product_id}", response_model=Product)
async def update_product(
    product_update: ProductUpdate,
    product_id: str = Path(..., description="ID do produto"),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["product:update"])) # Replaced with inline check
):
    """
    Atualiza um produto.
    Requer permissão: PRODUCT_UPDATE
    """
    _check_permissions(current_user, [Permission.PRODUCT_UPDATE])
    product_service = get_product_service()
    product = await product_service.update_product(product_id, product_update)

    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    return product


@router.delete("/products/{product_id}", response_model=Dict[str, bool])
async def delete_product(
    product_id: str = Path(..., description="ID do produto"),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["product:delete"])) # Replaced with inline check
):
    """
    Exclui um produto (marcando como inativo).
    Requer permissão: PRODUCT_DELETE
    """
    _check_permissions(current_user, [Permission.PRODUCT_DELETE])
    product_service = get_product_service()
    success = await product_service.delete_product(product_id)

    if not success:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    return {"success": True}


# Endpoints para Combos
@router.post("/combos", response_model=Product)
async def create_combo(
    product: ProductCreate = Body(..., description="Dados do produto base do combo"),
    items: List[ComboItem] = Body(..., description="Itens do combo"),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["product:create"])) # Replaced with inline check
):
    """
    Cria um novo combo.
    Requer permissão: PRODUCT_CREATE
    """
    _check_permissions(current_user, [Permission.PRODUCT_CREATE])
    product_service = get_product_service()
    return await product_service.create_combo(product, items)


@router.put("/combos/{combo_id}", response_model=Product)
async def update_combo(
    combo_id: str = Path(..., description="ID do combo"),
    product_update: Optional[ProductUpdate] = Body(
        None, description="Dados do produto base do combo"
    ),
    items: Optional[List[ComboItem]] = Body(None, description="Itens do combo"),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["product:update"])) # Replaced with inline check
):
    """
    Atualiza um combo.
    Requer permissão: PRODUCT_UPDATE
    """
    _check_permissions(current_user, [Permission.PRODUCT_UPDATE])
    product_service = get_product_service()
    product = await product_service.update_combo(combo_id, product_update, items)

    if not product:
        raise HTTPException(status_code=404, detail="Combo não encontrado")

    return product


@router.get("/combos/{combo_id}/items", response_model=List[Dict[str, Any]])
async def get_combo_items(
    combo_id: str = Path(..., description="ID do combo"),
    current_user: User = Depends(get_current_user),
):
    """
    Busca os itens de um combo.
    Requer permissão: PRODUCT_READ
    """
    _check_permissions(current_user, [Permission.PRODUCT_READ])
    product_service = get_product_service()
    return await product_service.get_combo_items(combo_id)


# Endpoints para Produtos Compostos (ex: pizza meio-a-meio)
@router.post("/composite-products", response_model=Product)
async def create_composite_product(
    data: CompositeProductCreate,
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["product:create"])) # Replaced with inline check
):
    """
    Cria um novo produto composto (ex: pizza meio-a-meio).
    Requer permissão: PRODUCT_CREATE
    """
    _check_permissions(current_user, [Permission.PRODUCT_CREATE])
    product_service = get_product_service()
    return await product_service.create_composite_product(data)


@router.put("/composite-products/{product_id}", response_model=Product)
async def update_composite_product(
    data: CompositeProductUpdate,
    product_id: str = Path(..., description="ID do produto composto"),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["product:update"])) # Replaced with inline check
):
    """
    Atualiza um produto composto.
    Requer permissão: PRODUCT_UPDATE
    """
    _check_permissions(current_user, [Permission.PRODUCT_UPDATE])
    product_service = get_product_service()
    product = await product_service.update_composite_product(product_id, data)

    if not product:
        raise HTTPException(status_code=404, detail="Produto composto não encontrado")

    return product


@router.get(
    "/composite-products/{product_id}/sections", response_model=List[CompositeSection]
)
async def get_composite_sections(
    product_id: str = Path(..., description="ID do produto composto"),
    current_user: User = Depends(get_current_user),
):
    """
    Busca as seções de um produto composto.
    Requer permissão: PRODUCT_READ
    """
    _check_permissions(current_user, [Permission.PRODUCT_READ])
    product_service = get_product_service()
    return await product_service.get_composite_sections(product_id)


@router.post("/composite-products/calculate-price", response_model=Dict[str, float])
async def calculate_composite_product_price(
    product_id: str = Body(..., description="ID do produto composto"),
    section_product_ids: Dict[str, str] = Body(
        ..., description="Dicionário com IDs de seção e IDs de produtos selecionados"
    ),
    current_user: User = Depends(get_current_user),
):
    """
    Calcula o preço de um produto composto com base nas seções e estratégia de precificação.
    Requer permissão: PRODUCT_READ
    """
    _check_permissions(current_user, [Permission.PRODUCT_READ])
    product_service = get_product_service()
    try:
        price = await product_service.calculate_composite_product_price(
            product_id, section_product_ids
        )
        return {"price": price}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# Endpoints para Categorias
@router.post("/categories", response_model=ProductCategory)
async def create_category(
    category: CategoryCreate,
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["category:create"])) # Replaced with inline check
):
    """
    Cria uma nova categoria.
    Requer permissão: CATEGORY_CREATE
    """
    _check_permissions(current_user, [Permission.CATEGORY_CREATE])
    product_service = get_product_service()
    return await product_service.create_category(category)


@router.get("/categories/{category_id}", response_model=ProductCategory)
async def get_category(
    category_id: str = Path(..., description="ID da categoria"),
    current_user: User = Depends(get_current_user),
):
    """
    Busca uma categoria pelo ID.
    Requer permissão: CATEGORY_READ
    """
    _check_permissions(current_user, [Permission.CATEGORY_READ])
    product_service = get_product_service()
    category = await product_service.get_category(category_id)

    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    return category


@router.get("/categories", response_model=List[ProductCategory])
async def list_categories(
    parent_id: Optional[str] = Query(
        None,
        description="Filtrar por categoria pai (vazio para categorias de nível superior)",
    ),
    type: Optional[str] = Query(None, description="Filtrar por tipo"),
    current_user: User = Depends(get_current_user),
):
    """
    Lista categorias com filtros.
    Requer permissão: CATEGORY_READ
    """
    _check_permissions(current_user, [Permission.CATEGORY_READ])
    product_service = get_product_service()
    return await product_service.list_categories(parent_id=parent_id, type=type)


@router.put("/categories/{category_id}", response_model=ProductCategory)
async def update_category(
    category_update: CategoryUpdate,
    category_id: str = Path(..., description="ID da categoria"),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["category:update"])) # Replaced with inline check
):
    """
    Atualiza uma categoria.
    Requer permissão: CATEGORY_UPDATE
    """
    _check_permissions(current_user, [Permission.CATEGORY_UPDATE])
    product_service = get_product_service()
    category = await product_service.update_category(category_id, category_update)

    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    return category


@router.delete("/categories/{category_id}", response_model=Dict[str, bool])
async def delete_category(
    category_id: str = Path(..., description="ID da categoria"),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["category:delete"])) # Replaced with inline check
):
    """
    Exclui uma categoria (marcando como inativa).
    Requer permissão: CATEGORY_DELETE
    """
    _check_permissions(current_user, [Permission.CATEGORY_DELETE])
    product_service = get_product_service()
    success = await product_service.delete_category(category_id)

    if not success:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    return {"success": True}


# Endpoints para Imagens
@router.post("/products/{product_id}/images", response_model=ImageUploadResponse)
async def upload_product_image(
    product_id: str = Path(..., description="ID do produto"),
    file: UploadFile = File(..., description="Arquivo de imagem"),
    is_main: bool = Form(False, description="Definir como imagem principal"),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["product:update"])) # Replaced with inline check
):
    """
    Faz upload de uma imagem para um produto.
    Requer permissão: PRODUCT_UPDATE
    """
    _check_permissions(current_user, [Permission.PRODUCT_UPDATE])
    product_service = get_product_service()

    # Verificar se o produto existe
    product = await product_service.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    # Verificar extensão do arquivo
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        raise HTTPException(status_code=400, detail="Formato de arquivo não suportado")

    # Gerar nome de arquivo único
    filename = f"{uuid.uuid4()}{file_ext}"
    filepath = os.path.join(IMAGES_DIR, filename)

    # Salvar arquivo
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Adicionar imagem ao produto
    image = await product_service.add_product_image(
        product_id=product_id,
        file_path=f"/api/v1/images/{filename}",
        file_name=filename,
        is_main=is_main,
    )

    # Retornar resposta com URL
    return ImageUploadResponse(**image.dict(), url=f"/api/v1/images/{filename}")


@router.get("/products/{product_id}/images", response_model=List[ProductImage])
async def get_product_images(
    product_id: str = Path(..., description="ID do produto"),
    current_user: User = Depends(get_current_user),
):
    """
    Busca as imagens de um produto.
    Requer permissão: PRODUCT_READ
    """
    _check_permissions(current_user, [Permission.PRODUCT_READ])
    product_service = get_product_service()
    return await product_service.get_product_images(product_id)


@router.put("/images/{image_id}/main", response_model=ProductImage)
async def set_main_image(
    image_id: str = Path(..., description="ID da imagem"),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["product:update"])) # Replaced with inline check
):
    """
    Define uma imagem como principal.
    Requer permissão: PRODUCT_UPDATE
    """
    _check_permissions(current_user, [Permission.PRODUCT_UPDATE])
    product_service = get_product_service()
    image = await product_service.set_main_image(image_id)

    if not image:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")

    return image


@router.delete("/images/{image_id}", response_model=Dict[str, bool])
async def delete_image(
    image_id: str = Path(..., description="ID da imagem"),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["product:update"])) # Replaced with inline check
):
    """
    Exclui uma imagem.
    Requer permissão: PRODUCT_UPDATE
    """
    _check_permissions(current_user, [Permission.PRODUCT_UPDATE])
    product_service = get_product_service()
    success = await product_service.delete_image(image_id)

    if not success:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")

    return {"success": True}


@router.get("/images/{filename}")
async def get_image(filename: str = Path(..., description="Nome do arquivo de imagem")):
    """
    Retorna uma imagem pelo nome do arquivo.
    """
    filepath = os.path.join(IMAGES_DIR, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Imagem não encontrada")

    return FileResponse(filepath)


# Endpoints para Grupos de Troca
@router.post("/exchange-groups", response_model=ExchangeGroup)
async def create_exchange_group(
    name: str = Body(..., embed=True, description="Nome do grupo de troca"),
    description: Optional[str] = Body(None, embed=True, description="Descrição"),
    products: List[str] = Body(..., embed=True, description="Lista de IDs de produtos"),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["product:update"])) # Replaced with inline check
):
    """
    Cria um novo grupo de troca para combos.
    Requer permissão: PRODUCT_UPDATE
    """
    _check_permissions(current_user, [Permission.PRODUCT_UPDATE])
    product_service = get_product_service()
    return await product_service.create_exchange_group(name, description, products)


@router.get("/exchange-groups", response_model=List[ExchangeGroup])
async def list_exchange_groups(current_user: User = Depends(get_current_user)):
    """
    Lista todos os grupos de troca.
    Requer permissão: PRODUCT_READ
    """
    _check_permissions(current_user, [Permission.PRODUCT_READ])
    product_service = get_product_service()
    return await product_service.list_exchange_groups()


@router.put("/exchange-groups/{group_id}", response_model=ExchangeGroup)
async def update_exchange_group(
    group_id: str = Path(..., description="ID do grupo de troca"),
    name: Optional[str] = Body(None, embed=True, description="Nome do grupo de troca"),
    description: Optional[str] = Body(None, embed=True, description="Descrição"),
    products: Optional[List[str]] = Body(
        None, embed=True, description="Lista de IDs de produtos"
    ),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["product:update"])) # Replaced with inline check
):
    """
    Atualiza um grupo de troca.
    Requer permissão: PRODUCT_UPDATE
    """
    _check_permissions(current_user, [Permission.PRODUCT_UPDATE])
    product_service = get_product_service()
    group = await product_service.update_exchange_group(
        group_id, name, description, products
    )
    if not group:
        raise HTTPException(status_code=404, detail="Grupo de troca não encontrado")
    return group


@router.delete("/exchange-groups/{group_id}", response_model=Dict[str, bool])
async def delete_exchange_group(
    group_id: str = Path(..., description="ID do grupo de troca"),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["product:update"])) # Replaced with inline check
):
    """
    Exclui um grupo de troca.
    Requer permissão: PRODUCT_UPDATE
    """
    _check_permissions(current_user, [Permission.PRODUCT_UPDATE])
    product_service = get_product_service()
    success = await product_service.delete_exchange_group(group_id)
    if not success:
        raise HTTPException(status_code=404, detail="Grupo de troca não encontrado")
    return {"success": True}


# Endpoints para Ingredientes
@router.post("/ingredients", response_model=Ingredient)
async def create_ingredient(
    ingredient: IngredientCreate,
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["product:update"])) # Replaced with inline check
):
    """
    Cria um novo ingrediente.
    Requer permissão: PRODUCT_UPDATE
    """
    _check_permissions(current_user, [Permission.PRODUCT_UPDATE])
    product_service = get_product_service()
    return await product_service.create_ingredient(ingredient)


@router.get("/ingredients", response_model=List[Ingredient])
async def list_ingredients(
    search: Optional[str] = Query(None, description="Buscar por nome"),
    is_active: Optional[bool] = Query(None, description="Filtrar por status ativo"),
    limit: int = Query(100, description="Limite de resultados"),
    offset: int = Query(0, description="Deslocamento para paginação"),
    current_user: User = Depends(get_current_user),
):
    """
    Lista ingredientes com filtros.
    Requer permissão: PRODUCT_READ
    """
    _check_permissions(current_user, [Permission.PRODUCT_READ])
    product_service = get_product_service()
    return await product_service.list_ingredients(
        search=search, is_active=is_active, limit=limit, offset=offset
    )


@router.put("/ingredients/{ingredient_id}", response_model=Ingredient)
async def update_ingredient(
    ingredient_id: str = Path(..., description="ID do ingrediente"),
    ingredient_update: IngredientUpdate = Body(...),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["product:update"])) # Replaced with inline check
):
    """
    Atualiza um ingrediente.
    Requer permissão: PRODUCT_UPDATE
    """
    _check_permissions(current_user, [Permission.PRODUCT_UPDATE])
    product_service = get_product_service()
    ingredient = await product_service.update_ingredient(
        ingredient_id, ingredient_update
    )
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingrediente não encontrado")
    return ingredient


@router.delete("/ingredients/{ingredient_id}", response_model=Dict[str, bool])
async def delete_ingredient(
    ingredient_id: str = Path(..., description="ID do ingrediente"),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["product:update"])) # Replaced with inline check
):
    """
    Exclui um ingrediente (marcando como inativo).
    Requer permissão: PRODUCT_UPDATE
    """
    _check_permissions(current_user, [Permission.PRODUCT_UPDATE])
    product_service = get_product_service()
    success = await product_service.delete_ingredient(ingredient_id)
    if not success:
        raise HTTPException(status_code=404, detail="Ingrediente não encontrado")
    return {"success": True}


# Endpoints para Grupos de Opções
@router.post("/option-groups", response_model=OptionGroup)
async def create_option_group(
    option_group: OptionGroupCreate,
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["product:update"])) # Replaced with inline check
):
    """
    Cria um novo grupo de opções.
    Requer permissão: PRODUCT_UPDATE
    """
    _check_permissions(current_user, [Permission.PRODUCT_UPDATE])
    product_service = get_product_service()
    return await product_service.create_option_group(option_group)


@router.get("/option-groups", response_model=List[OptionGroup])
async def list_option_groups(
    search: Optional[str] = Query(None, description="Buscar por nome"),
    limit: int = Query(100, description="Limite de resultados"),
    offset: int = Query(0, description="Deslocamento para paginação"),
    current_user: User = Depends(get_current_user),
):
    """
    Lista grupos de opções com filtros.
    Requer permissão: PRODUCT_READ
    """
    _check_permissions(current_user, [Permission.PRODUCT_READ])
    product_service = get_product_service()
    return await product_service.list_option_groups(
        search=search, limit=limit, offset=offset
    )


@router.put("/option-groups/{group_id}", response_model=OptionGroup)
async def update_option_group(
    group_id: str = Path(..., description="ID do grupo de opções"),
    group_update: OptionGroupUpdate = Body(...),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["product:update"])) # Replaced with inline check
):
    """
    Atualiza um grupo de opções.
    Requer permissão: PRODUCT_UPDATE
    """
    _check_permissions(current_user, [Permission.PRODUCT_UPDATE])
    product_service = get_product_service()
    group = await product_service.update_option_group(group_id, group_update)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo de opções não encontrado")
    return group


@router.delete("/option-groups/{group_id}", response_model=Dict[str, bool])
async def delete_option_group(
    group_id: str = Path(..., description="ID do grupo de opções"),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["product:update"])) # Replaced with inline check
):
    """
    Exclui um grupo de opções.
    Requer permissão: PRODUCT_UPDATE
    """
    _check_permissions(current_user, [Permission.PRODUCT_UPDATE])
    product_service = get_product_service()
    success = await product_service.delete_option_group(group_id)
    if not success:
        raise HTTPException(status_code=404, detail="Grupo de opções não encontrado")
    return {"success": True}


# Endpoints para Cardápios
@router.post("/menus", response_model=Menu)
async def create_menu(
    menu: MenuCreate,
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["menu:create"])) # Replaced with inline check
):
    """
    Cria um novo cardápio.
    Requer permissão: MENU_CREATE
    """
    _check_permissions(current_user, [Permission.MENU_CREATE])
    product_service = get_product_service()
    return await product_service.create_menu(menu)


@router.get("/menus/{menu_id}", response_model=Menu)
async def get_menu(
    menu_id: str = Path(..., description="ID do cardápio"),
    current_user: User = Depends(get_current_user),
):
    """
    Busca um cardápio pelo ID.
    Requer permissão: MENU_READ
    """
    _check_permissions(current_user, [Permission.MENU_READ])
    product_service = get_product_service()
    menu = await product_service.get_menu(menu_id)
    if not menu:
        raise HTTPException(status_code=404, detail="Cardápio não encontrado")
    return menu


@router.get("/menus", response_model=List[Menu])
async def list_menus(
    is_active: Optional[bool] = Query(None, description="Filtrar por status ativo"),
    limit: int = Query(50, description="Limite de resultados"),
    offset: int = Query(0, description="Deslocamento para paginação"),
    current_user: User = Depends(get_current_user),
):
    """
    Lista cardápios com filtros.
    Requer permissão: MENU_READ
    """
    _check_permissions(current_user, [Permission.MENU_READ])
    product_service = get_product_service()
    return await product_service.list_menus(
        is_active=is_active, limit=limit, offset=offset
    )


@router.put("/menus/{menu_id}", response_model=Menu)
async def update_menu(
    menu_id: str = Path(..., description="ID do cardápio"),
    menu_update: MenuUpdate = Body(...),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["menu:update"])) # Replaced with inline check
):
    """
    Atualiza um cardápio.
    Requer permissão: MENU_UPDATE
    """
    _check_permissions(current_user, [Permission.MENU_UPDATE])
    product_service = get_product_service()
    menu = await product_service.update_menu(menu_id, menu_update)
    if not menu:
        raise HTTPException(status_code=404, detail="Cardápio não encontrado")
    return menu


@router.delete("/menus/{menu_id}", response_model=Dict[str, bool])
async def delete_menu(
    menu_id: str = Path(..., description="ID do cardápio"),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["menu:delete"])) # Replaced with inline check
):
    """
    Exclui um cardápio (marcando como inativo).
    Requer permissão: MENU_DELETE
    """
    _check_permissions(current_user, [Permission.MENU_DELETE])
    product_service = get_product_service()
    success = await product_service.delete_menu(menu_id)
    if not success:
        raise HTTPException(status_code=404, detail="Cardápio não encontrado")
    return {"success": True}


@router.post("/menus/{menu_id}/export", response_model=Dict[str, str])
async def export_menu(
    menu_id: str = Path(..., description="ID do cardápio a ser exportado"),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["menu:read"])) # Replaced with inline check
):
    """
    Exporta um cardápio completo (incluindo produtos, categorias, etc.) para um arquivo JSON.
    Requer permissão: MENU_READ
    """
    _check_permissions(current_user, [Permission.MENU_READ])
    product_service = get_product_service()
    try:
        export_data = await product_service.export_menu(menu_id)
        filename = f"menu_export_{menu_id}_v{export_data.version}_{datetime.now().strftime('%Y%m%d%H%M%S')}.json"
        filepath = os.path.join(MENU_EXPORTS_DIR, filename)
        with open(filepath, "w") as f:
            f.write(export_data.json(indent=4))
        return {
            "export_file": filename,
            "download_url": f"/api/v1/menus/exports/{filename}",
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/menus/exports/{filename}")
async def download_menu_export(
    filename: str = Path(..., description="Nome do arquivo de exportação")
):
    """
    Faz o download de um arquivo de exportação de cardápio.
    """
    filepath = os.path.join(MENU_EXPORTS_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(
            status_code=404, detail="Arquivo de exportação não encontrado"
        )
    return FileResponse(filepath, filename=filename)


@router.post("/menus/import")
async def import_menu(
    file: UploadFile = File(..., description="Arquivo JSON de exportação do cardápio"),
    current_user: User = Depends(get_current_user),
    # permissions: bool = Depends(check_permissions(["menu:create", "menu:update"])) # Replaced with inline check
):
    """
    Importa um cardápio a partir de um arquivo JSON.
    Requer permissões: MENU_CREATE, MENU_UPDATE
    """
    _check_permissions(current_user, [Permission.MENU_CREATE, Permission.MENU_UPDATE])
    if not file.filename.endswith(".json"):
        raise HTTPException(
            status_code=400,
            detail="Formato de arquivo inválido. Apenas JSON é suportado.",
        )

    try:
        content = await file.read()
        import_data = MenuExport.parse_raw(content)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Erro ao processar o arquivo JSON: {e}"
        )

    product_service = get_product_service()
    try:
        imported_menu = await product_service.import_menu(import_data)
        return {
            "message": "Cardápio importado com sucesso",
            "menu_id": imported_menu.id,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro interno durante a importação: {e}"
        )
