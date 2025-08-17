import json
import os

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from src.api.main import app
from src.product.models.product import (
    Product,
    ProductCategory,
    ProductStatus,
    ProductType,
)
from src.product.services.combo_rules_service import get_combo_rules_service
from src.product.services.product_service import get_product_service

# Configurar cliente de teste
client = TestClient(app)


# Mock para o token de autenticação
def get_auth_token(client, username="gerente", password="senha123"):
    """Obtém um token de autenticação para testes."""
    response = client.post(
        "/api/v1/auth/token",
        data={"username": username, "password": password},
    )
    return response.json()["access_token"]


# Fixture para limpar os dados de teste
@pytest.fixture
def clean_test_data():
    """Limpa os dados de teste antes e depois de cada teste."""
    # Caminho para os arquivos de dados de teste
    data_dir = os.path.join("/home/ubuntu/pos-modern/data")
    products_file = os.path.join(data_dir, "products.json")
    categories_file = os.path.join(data_dir, "categories.json")
    combo_items_file = os.path.join(data_dir, "combo_items.json")
    images_file = os.path.join(data_dir, "product_images.json")
    exchange_groups_file = os.path.join(data_dir, "exchange_groups.json")
    menus_file = os.path.join(data_dir, "menus.json")
    images_dir = os.path.join(data_dir, "images")

    # Garantir que o diretório existe
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(images_dir, exist_ok=True)

    # Limpar dados antes do teste
    for file_path in [
        products_file,
        categories_file,
        combo_items_file,
        images_file,
        exchange_groups_file,
        menus_file,
    ]:
        with open(file_path, "w") as f:
            json.dump([], f)

    # Limpar diretório de imagens
    for file_name in os.listdir(images_dir):
        file_path = os.path.join(images_dir, file_name)
        if os.path.isfile(file_path):
            os.unlink(file_path)

    yield

    # Limpar dados após o teste
    for file_path in [
        products_file,
        categories_file,
        combo_items_file,
        images_file,
        exchange_groups_file,
        menus_file,
    ]:
        with open(file_path, "w") as f:
            json.dump([], f)

    # Limpar diretório de imagens
    for file_name in os.listdir(images_dir):
        file_path = os.path.join(images_dir, file_name)
        if os.path.isfile(file_path):
            os.unlink(file_path)


# Fixture para criar categorias de teste
@pytest.fixture
async def test_categories(clean_test_data):
    """Cria categorias de teste."""
    service = get_product_service()

    categories = [
        {
            "name": "Lanches",
            "description": "Hambúrgueres e sanduíches",
            "type": CategoryType.MAIN,
            "display_order": 1,
            "is_active": True,
        },
        {
            "name": "Bebidas",
            "description": "Refrigerantes, sucos e água",
            "type": CategoryType.MAIN,
            "display_order": 2,
            "is_active": True,
        },
        {
            "name": "Sobremesas",
            "description": "Doces e sobremesas",
            "type": CategoryType.MAIN,
            "display_order": 3,
            "is_active": True,
        },
    ]

    created_categories = []
    for category_data in categories:
        category = await service.create_category(ProductCategory(**category_data))
        created_categories.append(category)

    return created_categories


# Fixture para criar produtos de teste
@pytest.fixture
async def test_products(test_categories):
    """Cria produtos de teste."""
    service = get_product_service()

    products = [
        {
            "name": "Hambúrguer Clássico",
            "description": "Hambúrguer com queijo, alface e tomate",
            "price": 15.90,
            "cost": 5.50,
            "type": ProductType.SINGLE,
            "status": ProductStatus.ACTIVE,
            "categories": [test_categories[0].id],
            "tags": ["hamburguer", "carne"],
            "attributes": {
                "nutritional_info": {
                    "calories": 450,
                    "protein": 25,
                    "carbs": 30,
                    "fat": 20,
                    "sodium": 800,
                }
            },
            "display_order": 1,
            "is_featured": True,
        },
        {
            "name": "Refrigerante Cola",
            "description": "Refrigerante sabor cola 350ml",
            "price": 5.90,
            "cost": 1.50,
            "type": ProductType.SINGLE,
            "status": ProductStatus.ACTIVE,
            "categories": [test_categories[1].id],
            "tags": ["bebida", "refrigerante"],
            "attributes": {
                "nutritional_info": {
                    "calories": 150,
                    "protein": 0,
                    "carbs": 39,
                    "fat": 0,
                    "sodium": 30,
                }
            },
            "display_order": 1,
            "is_featured": False,
        },
        {
            "name": "Sundae de Chocolate",
            "description": "Sorvete com calda de chocolate",
            "price": 8.90,
            "cost": 2.50,
            "type": ProductType.SINGLE,
            "status": ProductStatus.ACTIVE,
            "categories": [test_categories[2].id],
            "tags": ["sobremesa", "sorvete"],
            "attributes": {
                "nutritional_info": {
                    "calories": 350,
                    "protein": 5,
                    "carbs": 45,
                    "fat": 15,
                    "sodium": 120,
                }
            },
            "display_order": 1,
            "is_featured": True,
        },
    ]

    created_products = []
    for product_data in products:
        product = await service.create_product(Product(**product_data))
        created_products.append(product)

    return created_products


# Fixture para criar um combo de teste
@pytest.fixture
async def test_combo(test_products, test_categories):
    """Cria um combo de teste."""
    service = get_product_service()

    # Criar grupo de troca
    exchange_group = await service.create_exchange_group(
        name="Bebidas do Combo",
        description="Opções de bebidas para o combo",
        products=[test_products[1].id],
    )

    # Criar combo
    combo_product = {
        "name": "Combo Hambúrguer",
        "description": "Hambúrguer + Bebida + Sobremesa",
        "price": 25.90,
        "cost": 9.50,
        "type": ProductType.COMBO,
        "status": ProductStatus.ACTIVE,
        "categories": [test_categories[0].id],
        "tags": ["combo", "promocao"],
        "display_order": 1,
        "is_featured": True,
    }

    combo = await service.create_combo(
        Product(**combo_product),
        [
            {
                "combo_id": "",  # Será preenchido pelo serviço
                "product_id": test_products[0].id,
                "quantity": 1,
                "is_exchangeable": False,
            },
            {
                "combo_id": "",  # Será preenchido pelo serviço
                "product_id": test_products[1].id,
                "quantity": 1,
                "is_exchangeable": True,
                "exchange_group_id": exchange_group.id,
            },
            {
                "combo_id": "",  # Será preenchido pelo serviço
                "product_id": test_products[2].id,
                "quantity": 1,
                "is_exchangeable": False,
            },
        ],
    )

    return combo


# Testes para produtos
@pytest.mark.asyncio
async def test_create_product_success(test_categories):
    """Testa a criação de um produto com sucesso."""
    token = get_auth_token(client)

    response = client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Batata Frita",
            "description": "Porção de batatas fritas crocantes",
            "price": 9.90,
            "cost": 3.50,
            "type": "single",
            "status": "active",
            "categories": [test_categories[0].id],
            "tags": ["batata", "acompanhamento"],
            "display_order": 2,
            "is_featured": False,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Batata Frita"
    assert data["price"] == 9.90
    assert data["type"] == "single"
    assert data["status"] == "active"
    assert test_categories[0].id in data["categories"]


@pytest.mark.asyncio
async def test_list_products(test_products):
    """Testa a listagem de produtos."""
    token = get_auth_token(client)

    response = client.get(
        "/api/v1/products", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3
    assert any(p["name"] == "Hambúrguer Clássico" for p in data)
    assert any(p["name"] == "Refrigerante Cola" for p in data)
    assert any(p["name"] == "Sundae de Chocolate" for p in data)


@pytest.mark.asyncio
async def test_get_product_by_id(test_products):
    """Testa a obtenção de um produto pelo ID."""
    token = get_auth_token(client)

    response = client.get(
        f"/api/v1/products/{test_products[0].id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_products[0].id
    assert data["name"] == "Hambúrguer Clássico"
    assert data["price"] == 15.90
    assert data["type"] == "single"
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_update_product(test_products):
    """Testa a atualização de um produto."""
    token = get_auth_token(client)

    response = client.put(
        f"/api/v1/products/{test_products[0].id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Hambúrguer Clássico Especial",
            "price": 17.90,
            "is_featured": True,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_products[0].id
    assert data["name"] == "Hambúrguer Clássico Especial"
    assert data["price"] == 17.90
    assert data["is_featured"]


@pytest.mark.asyncio
async def test_delete_product(test_products):
    """Testa a exclusão de um produto."""
    token = get_auth_token(client)

    response = client.delete(
        f"/api/v1/products/{test_products[0].id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 204

    # Verificar se o produto foi excluído
    response = client.get(
        f"/api/v1/products/{test_products[0].id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404


# Testes para categorias
@pytest.mark.asyncio
async def test_create_category_success():
    """Testa a criação de uma categoria com sucesso."""
    token = get_auth_token(client)

    response = client.post(
        "/api/v1/products/categories",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Promoções",
            "description": "Itens em promoção",
            "type": "main",
            "display_order": 4,
            "is_active": True,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Promoções"
    assert data["type"] == "main"
    assert data["is_active"]


@pytest.mark.asyncio
async def test_list_categories(test_categories):
    """Testa a listagem de categorias."""
    token = get_auth_token(client)

    response = client.get(
        "/api/v1/products/categories", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3
    assert any(c["name"] == "Lanches" for c in data)
    assert any(c["name"] == "Bebidas" for c in data)
    assert any(c["name"] == "Sobremesas" for c in data)


@pytest.mark.asyncio
async def test_update_category(test_categories):
    """Testa a atualização de uma categoria."""
    token = get_auth_token(client)

    response = client.put(
        f"/api/v1/products/categories/{test_categories[0].id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Lanches Especiais", "display_order": 1},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_categories[0].id
    assert data["name"] == "Lanches Especiais"
    assert data["display_order"] == 1


# Testes para combos
@pytest.mark.asyncio
async def test_create_combo_success(test_products, test_categories):
    """Testa a criação de um combo com sucesso."""
    token = get_auth_token(client)

    # Criar grupo de troca
    exchange_group_response = client.post(
        "/api/v1/products/exchange-groups",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Bebidas do Combo",
            "description": "Opções de bebidas para o combo",
            "products": [test_products[1].id],
        },
    )

    assert exchange_group_response.status_code == 201
    exchange_group = exchange_group_response.json()

    # Criar combo
    response = client.post(
        "/api/v1/products/combos",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "product": {
                "name": "Combo Econômico",
                "description": "Hambúrguer + Bebida",
                "price": 19.90,
                "cost": 7.00,
                "type": "combo",
                "status": "active",
                "categories": [test_categories[0].id],
                "tags": ["combo", "promocao"],
                "display_order": 2,
                "is_featured": True,
            },
            "items": [
                {
                    "product_id": test_products[0].id,
                    "quantity": 1,
                    "is_exchangeable": False,
                },
                {
                    "product_id": test_products[1].id,
                    "quantity": 1,
                    "is_exchangeable": True,
                    "exchange_group_id": exchange_group["id"],
                },
            ],
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Combo Econômico"
    assert data["price"] == 19.90
    assert data["type"] == "combo"

    # Verificar itens do combo
    combo_id = data["id"]
    items_response = client.get(
        f"/api/v1/products/combos/{combo_id}/items",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert items_response.status_code == 200
    items = items_response.json()
    assert len(items) == 2
    assert items[0]["product_id"] == test_products[0].id
    assert items[1]["product_id"] == test_products[1].id
    assert items[1]["is_exchangeable"]
    assert items[1]["exchange_group_id"] == exchange_group["id"]


@pytest.mark.asyncio
async def test_update_combo(test_combo):
    """Testa a atualização de um combo."""
    token = get_auth_token(client)

    response = client.put(
        f"/api/v1/products/combos/{test_combo.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"product": {"name": "Super Combo Hambúrguer", "price": 27.90}},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_combo.id
    assert data["name"] == "Super Combo Hambúrguer"
    assert data["price"] == 27.90


# Testes para imagens
@pytest.mark.asyncio
async def test_upload_product_image(test_products):
    """Testa o upload de uma imagem para um produto."""
    token = get_auth_token(client)

    # Criar arquivo de teste
    test_image_path = "/tmp/test_image.jpg"
    with open(test_image_path, "wb") as f:
        f.write(b"test image content")

    # Fazer upload da imagem
    with open(test_image_path, "rb") as f:
        response = client.post(
            f"/api/v1/products/{test_products[0].id}/images",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("test_image.jpg", f, "image/jpeg")},
            data={"is_main": "true"},
        )

    # Limpar arquivo de teste
    os.remove(test_image_path)

    assert response.status_code == 200
    data = response.json()
    assert data["product_id"] == test_products[0].id
    assert data["is_main"]
    assert "url" in data

    # Verificar se a imagem foi registrada
    images_response = client.get(
        f"/api/v1/products/{test_products[0].id}/images",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert images_response.status_code == 200
    images = images_response.json()
    assert len(images) == 1
    assert images[0]["product_id"] == test_products[0].id
    assert images[0]["is_main"]


# Testes para cardápios
@pytest.mark.asyncio
async def test_create_menu_success(test_categories, test_products):
    """Testa a criação de um cardápio com sucesso."""
    token = get_auth_token(client)

    response = client.post(
        "/api/v1/products/menus",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Cardápio Principal",
            "description": "Cardápio padrão do restaurante",
            "is_active": True,
            "categories": [cat.id for cat in test_categories],
            "products": [prod.id for prod in test_products],
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Cardápio Principal"
    assert data["is_active"]
    assert len(data["categories"]) == 3
    assert len(data["products"]) == 3


@pytest.mark.asyncio
async def test_list_menus(test_categories, test_products):
    """Testa a listagem de cardápios."""
    token = get_auth_token(client)

    # Criar cardápio
    client.post(
        "/api/v1/products/menus",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Cardápio Principal",
            "description": "Cardápio padrão do restaurante",
            "is_active": True,
            "categories": [cat.id for cat in test_categories],
            "products": [prod.id for prod in test_products],
        },
    )

    # Listar cardápios
    response = client.get(
        "/api/v1/products/menus", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["name"] == "Cardápio Principal"


@pytest.mark.asyncio
async def test_get_current_menu(test_categories, test_products):
    """Testa a obtenção do cardápio atual."""
    token = get_auth_token(client)

    # Criar cardápio
    client.post(
        "/api/v1/products/menus",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Cardápio Principal",
            "description": "Cardápio padrão do restaurante",
            "is_active": True,
            "categories": [cat.id for cat in test_categories],
            "products": [prod.id for prod in test_products],
        },
    )

    # Obter cardápio atual
    response = client.get(
        "/api/v1/products/menus/current", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Cardápio Principal"
    assert data["is_active"]


# Testes para regras de negócio de combos
@pytest.mark.asyncio
async def test_combo_validation(test_products):
    """Testa a validação de criação de combo."""
    # Criar serviço de regras de combo
    combo_rules_service = get_combo_rules_service()

    # Caso válido
    await combo_rules_service.validate_combo_creation(
        {},
        [
            {
                "product_id": test_products[0].id,
                "quantity": 1,
                "is_exchangeable": False,
            },
            {
                "product_id": test_products[1].id,
                "quantity": 1,
                "is_exchangeable": False,
            },
        ],
    )

    # Caso inválido: produto inexistente
    with pytest.raises(HTTPException) as excinfo:
        await combo_rules_service.validate_combo_creation(
            {},
            [
                {
                    "product_id": "produto-inexistente",
                    "quantity": 1,
                    "is_exchangeable": False,
                }
            ],
        )

    assert excinfo.value.status_code == 400
    assert "Produto não encontrado" in excinfo.value.detail


@pytest.mark.asyncio
async def test_combo_customization(test_combo, test_products):
    """Testa a personalização de combo."""
    # Criar serviço de regras de combo
    combo_rules_service = get_combo_rules_service()

    # Obter grupo de troca
    product_service = get_product_service()
    combo_items = await product_service.get_combo_items(test_combo.id)
    exchangeable_item = next(
        item for item in combo_items if item.get("is_exchangeable", False)
    )
    exchange_group_id = exchangeable_item["exchange_group_id"]

    # Adicionar produto alternativo ao grupo de troca
    new_product = {
        "name": "Suco de Laranja",
        "description": "Suco natural de laranja 300ml",
        "price": 7.90,
        "cost": 2.50,
        "type": ProductType.SINGLE,
        "status": ProductStatus.ACTIVE,
        "categories": [test_products[1].categories[0]],
        "tags": ["bebida", "suco"],
        "display_order": 2,
        "is_featured": False,
    }

    created_product = await product_service.create_product(Product(**new_product))

    # Adicionar ao grupo de troca
    exchange_group = await product_service.get_exchange_group(exchange_group_id)
    await product_service.update_exchange_group(
        exchange_group_id, products=exchange_group.products + [created_product.id]
    )

    # Testar personalização
    customization_result = await combo_rules_service.process_combo_customization(
        test_combo.id,
        [
            {
                "original_item_id": test_products[1].id,
                "replacement_product_id": created_product.id,
                "quantity": 1,
            }
        ],
    )

    assert customization_result["combo_id"] == test_combo.id
    assert customization_result["base_price"] == test_combo.price
    assert customization_result["adjusted_price"] == test_combo.price + (
        created_product.price - test_products[1].price
    )
    assert len(customization_result["customizations"]) == 1
    assert (
        customization_result["customizations"][0]["original_item"]["id"]
        == test_products[1].id
    )
    assert (
        customization_result["customizations"][0]["replacement"]["id"]
        == created_product.id
    )
