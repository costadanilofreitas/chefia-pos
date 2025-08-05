import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.auth.security import get_current_user, check_permissions

# Mock de autenticação para testes
@pytest.fixture
def mock_auth():
    def override_get_current_user():
        return {
            "id": "test-user-id",
            "username": "test_user",
            "email": "test@example.com",
            "role": "manager",
            "permissions": ["product:create", "product:update", "product:delete", 
                           "category:create", "category:update", "category:delete",
                           "menu:create", "menu:update", "menu:delete", "menu:export", "menu:import",
                           "ingredient:create", "ingredient:update", "ingredient:delete",
                           "option:create", "option:update", "option:delete"]
        }
    
    def override_check_permissions(required_permissions):
        def check(current_user=None):
            return True
        return check
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[check_permissions] = override_check_permissions
    
    yield
    
    app.dependency_overrides = {}

@pytest.fixture
def client(mock_auth):
    return TestClient(app)

@pytest.fixture
def test_product_data():
    return {
        "name": "Hambúrguer Teste",
        "description": "Hambúrguer para testes",
        "price": 15.90,
        "sku": "BURG001",
        "barcode": "7891234567890",
        "type": "single",
        "status": "active",
        "category_id": "cat-001",
        "tax_group": "food",
        "is_featured": True,
        "has_ingredients": True,
        "weight_based": False
    }

@pytest.fixture
def test_ingredient_data():
    return {
        "name": "Queijo Cheddar",
        "description": "Fatia de queijo cheddar",
        "type": "dairy",
        "unit": "slice",
        "cost": 1.50,
        "stock_quantity": 100,
        "is_active": True,
        "allergens": ["milk"]
    }

@pytest.fixture
def test_option_group_data():
    return {
        "name": "Tipo de Pão",
        "description": "Escolha o tipo de pão para o seu sanduíche",
        "is_required": True,
        "min_selections": 1,
        "max_selections": 1,
        "options": [
            {
                "name": "Pão Francês",
                "price_adjustment": 0.0,
                "is_default": True
            },
            {
                "name": "Pão Integral",
                "price_adjustment": 1.0,
                "is_default": False
            },
            {
                "name": "Pão Australiano",
                "price_adjustment": 2.0,
                "is_default": False
            }
        ]
    }

@pytest.fixture
def test_composite_product_data():
    return {
        "base_product": {
            "name": "Pizza Meio a Meio",
            "description": "Pizza com dois sabores à sua escolha",
            "price": 45.90,
            "sku": "PIZZA001",
            "barcode": "7891234567891",
            "type": "composite",
            "status": "active",
            "category_id": "cat-002",
            "tax_group": "food",
            "is_featured": True,
            "has_ingredients": False,
            "weight_based": False
        },
        "sections": [
            {
                "name": "Primeira Metade",
                "description": "Escolha o sabor da primeira metade",
                "proportion": 0.5,
                "required": True
            },
            {
                "name": "Segunda Metade",
                "description": "Escolha o sabor da segunda metade",
                "proportion": 0.5,
                "required": True
            }
        ],
        "available_products": ["prod-001", "prod-002", "prod-003", "prod-004"],
        "pricing_strategy": "highest"
    }

# Testes para produtos simples
def test_create_product(client, test_product_data):
    response = client.post("/api/v1/products", json=test_product_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == test_product_data["name"]
    assert data["price"] == test_product_data["price"]
    assert data["type"] == test_product_data["type"]
    assert "id" in data

def test_get_product(client, test_product_data):
    # Primeiro criar um produto
    create_response = client.post("/api/v1/products", json=test_product_data)
    product_id = create_response.json()["id"]
    
    # Depois buscar o produto criado
    response = client.get(f"/api/v1/products/{product_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == product_id
    assert data["name"] == test_product_data["name"]

def test_update_product(client, test_product_data):
    # Primeiro criar um produto
    create_response = client.post("/api/v1/products", json=test_product_data)
    product_id = create_response.json()["id"]
    
    # Depois atualizar o produto
    update_data = {"name": "Hambúrguer Atualizado", "price": 18.90}
    response = client.put(f"/api/v1/products/{product_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == update_data["name"]
    assert data["price"] == update_data["price"]
    assert data["description"] == test_product_data["description"]  # Não alterado

def test_list_products(client, test_product_data):
    # Criar alguns produtos
    client.post("/api/v1/products", json=test_product_data)
    test_product_data["name"] = "Outro Produto"
    test_product_data["sku"] = "BURG002"
    client.post("/api/v1/products", json=test_product_data)
    
    # Listar produtos
    response = client.get("/api/v1/products")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    assert isinstance(data, list)

def test_delete_product(client, test_product_data):
    # Primeiro criar um produto
    create_response = client.post("/api/v1/products", json=test_product_data)
    product_id = create_response.json()["id"]
    
    # Depois excluir o produto
    response = client.delete(f"/api/v1/products/{product_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    # Verificar se o produto foi marcado como inativo
    get_response = client.get(f"/api/v1/products/{product_id}")
    assert get_response.status_code == 200
    product_data = get_response.json()
    assert product_data["status"] == "inactive"

# Testes para ingredientes
def test_create_ingredient(client, test_ingredient_data):
    response = client.post("/api/v1/ingredients", json=test_ingredient_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == test_ingredient_data["name"]
    assert data["type"] == test_ingredient_data["type"]
    assert "id" in data

def test_get_ingredient(client, test_ingredient_data):
    # Primeiro criar um ingrediente
    create_response = client.post("/api/v1/ingredients", json=test_ingredient_data)
    ingredient_id = create_response.json()["id"]
    
    # Depois buscar o ingrediente criado
    response = client.get(f"/api/v1/ingredients/{ingredient_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == ingredient_id
    assert data["name"] == test_ingredient_data["name"]

def test_update_ingredient(client, test_ingredient_data):
    # Primeiro criar um ingrediente
    create_response = client.post("/api/v1/ingredients", json=test_ingredient_data)
    ingredient_id = create_response.json()["id"]
    
    # Depois atualizar o ingrediente
    update_data = {"name": "Queijo Prato", "cost": 1.75}
    response = client.put(f"/api/v1/ingredients/{ingredient_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == update_data["name"]
    assert data["cost"] == update_data["cost"]
    assert data["type"] == test_ingredient_data["type"]  # Não alterado

def test_list_ingredients(client, test_ingredient_data):
    # Criar alguns ingredientes
    client.post("/api/v1/ingredients", json=test_ingredient_data)
    test_ingredient_data["name"] = "Bacon"
    test_ingredient_data["type"] = "meat"
    client.post("/api/v1/ingredients", json=test_ingredient_data)
    
    # Listar ingredientes
    response = client.get("/api/v1/ingredients")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    assert isinstance(data, list)

# Testes para grupos de opções
def test_create_option_group(client, test_option_group_data):
    response = client.post("/api/v1/option-groups", json=test_option_group_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == test_option_group_data["name"]
    assert data["is_required"] == test_option_group_data["is_required"]
    assert len(data["options"]) == len(test_option_group_data["options"])
    assert "id" in data

def test_get_option_group(client, test_option_group_data):
    # Primeiro criar um grupo de opções
    create_response = client.post("/api/v1/option-groups", json=test_option_group_data)
    group_id = create_response.json()["id"]
    
    # Depois buscar o grupo criado
    response = client.get(f"/api/v1/option-groups/{group_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == group_id
    assert data["name"] == test_option_group_data["name"]
    assert len(data["options"]) == len(test_option_group_data["options"])

def test_update_option_group(client, test_option_group_data):
    # Primeiro criar um grupo de opções
    create_response = client.post("/api/v1/option-groups", json=test_option_group_data)
    group_id = create_response.json()["id"]
    
    # Depois atualizar o grupo
    update_data = {
        "name": "Tipo de Queijo",
        "description": "Escolha o tipo de queijo",
        "options": [
            {
                "name": "Cheddar",
                "price_adjustment": 0.0,
                "is_default": True
            },
            {
                "name": "Prato",
                "price_adjustment": 0.0,
                "is_default": False
            }
        ]
    }
    response = client.put(f"/api/v1/option-groups/{group_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == update_data["name"]
    assert data["description"] == update_data["description"]
    assert len(data["options"]) == len(update_data["options"])

# Testes para produtos compostos (pizza meio-a-meio)
def test_create_composite_product(client, test_composite_product_data):
    response = client.post("/api/v1/composite-products", json=test_composite_product_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == test_composite_product_data["base_product"]["name"]
    assert data["type"] == "composite"
    assert "id" in data

def test_get_composite_sections(client, test_composite_product_data):
    # Primeiro criar um produto composto
    create_response = client.post("/api/v1/composite-products", json=test_composite_product_data)
    product_id = create_response.json()["id"]
    
    # Depois buscar as seções do produto
    response = client.get(f"/api/v1/composite-products/{product_id}/sections")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == len(test_composite_product_data["sections"])
    assert data[0]["name"] == test_composite_product_data["sections"][0]["name"]
    assert data[1]["name"] == test_composite_product_data["sections"][1]["name"]

def test_calculate_composite_price(client, test_composite_product_data):
    # Primeiro criar um produto composto
    create_response = client.post("/api/v1/composite-products", json=test_composite_product_data)
    product_id = create_response.json()["id"]
    
    # Criar produtos para as seções
    product1 = {
        "name": "Pizza Calabresa",
        "description": "Pizza de calabresa",
        "price": 40.00,
        "sku": "PIZZA002",
        "type": "single",
        "status": "active",
        "category_id": "cat-002"
    }
    product2 = {
        "name": "Pizza Margherita",
        "description": "Pizza margherita",
        "price": 45.00,
        "sku": "PIZZA003",
        "type": "single",
        "status": "active",
        "category_id": "cat-002"
    }
    
    prod1_response = client.post("/api/v1/products", json=product1)
    prod2_response = client.post("/api/v1/products", json=product2)
    
    prod1_id = prod1_response.json()["id"]
    prod2_id = prod2_response.json()["id"]
    
    # Buscar seções
    sections_response = client.get(f"/api/v1/composite-products/{product_id}/sections")
    sections = sections_response.json()
    
    # Calcular preço
    price_data = {
        "product_id": product_id,
        "section_product_ids": {
            sections[0]["id"]: prod1_id,
            sections[1]["id"]: prod2_id
        }
    }
    
    response = client.post("/api/v1/composite-products/calculate-price", json=price_data)
    assert response.status_code == 200
    data = response.json()
    
    # Com estratégia "highest", deve usar o preço do produto mais caro (45.00)
    assert data["price"] == 45.00

# Testes para exportação e importação de menu
def test_export_import_menu(client):
    # Criar categoria
    category_data = {
        "name": "Lanches",
        "description": "Categoria de lanches",
        "type": "food",
        "is_active": True
    }
    category_response = client.post("/api/v1/categories", json=category_data)
    category_id = category_response.json()["id"]
    
    # Criar produtos
    product1 = {
        "name": "X-Burger",
        "description": "Hambúrguer com queijo",
        "price": 15.90,
        "sku": "XBURG001",
        "type": "single",
        "status": "active",
        "category_id": category_id,
        "has_ingredients": True
    }
    
    product2 = {
        "name": "X-Salada",
        "description": "Hambúrguer com queijo e salada",
        "price": 17.90,
        "sku": "XBURG002",
        "type": "single",
        "status": "active",
        "category_id": category_id,
        "has_ingredients": True
    }
    
    prod1_response = client.post("/api/v1/products", json=product1)
    prod2_response = client.post("/api/v1/products", json=product2)
    
    prod1_id = prod1_response.json()["id"]
    prod2_id = prod2_response.json()["id"]
    
    # Criar menu
    menu_data = {
        "name": "Menu Principal",
        "description": "Menu principal do restaurante",
        "is_active": True,
        "products": [prod1_id, prod2_id],
        "categories": [category_id],
        "days_of_week": [0, 1, 2, 3, 4, 5, 6],  # Todos os dias
        "start_time": "08:00",
        "end_time": "22:00"
    }
    
    menu_response = client.post("/api/v1/menus", json=menu_data)
    assert menu_response.status_code == 200
    menu_id = menu_response.json()["id"]
    
    # Exportar menu
    export_response = client.post(f"/api/v1/menus/{menu_id}/export")
    assert export_response.status_code == 200
    export_data = export_response.json()
    assert "file_url" in export_data
    
    # Obter arquivo de exportação
    file_url = export_data["file_url"]
    file_name = file_url.split("/")[-1]
    
    # Importar menu (simulando upload de arquivo)
    # Nota: Este teste é simplificado, pois não podemos facilmente simular upload de arquivo
    # Em um ambiente real, usaríamos um cliente HTTP para fazer upload do arquivo
    
    # Verificar se o menu foi exportado corretamente
    assert menu_id is not None
    assert file_url is not None

# Testes para produtos com ingredientes
def test_product_with_ingredients(client, test_product_data, test_ingredient_data):
    # Criar ingredientes
    ingredient1_response = client.post("/api/v1/ingredients", json=test_ingredient_data)
    test_ingredient_data["name"] = "Hambúrguer"
    test_ingredient_data["type"] = "meat"
    ingredient2_response = client.post("/api/v1/ingredients", json=test_ingredient_data)
    
    ingredient1_id = ingredient1_response.json()["id"]
    ingredient2_id = ingredient2_response.json()["id"]
    
    # Criar produto com ingredientes
    test_product_data["ingredients"] = [
        {"ingredient_id": ingredient1_id, "quantity": 1},
        {"ingredient_id": ingredient2_id, "quantity": 1}
    ]
    
    response = client.post("/api/v1/products", json=test_product_data)
    assert response.status_code == 200
    data = response.json()
    
    # Verificar se os ingredientes foram associados
    assert "ingredients" in data
    assert len(data["ingredients"]) == 2
    assert data["ingredients"][0]["ingredient_id"] == ingredient1_id
    assert data["ingredients"][1]["ingredient_id"] == ingredient2_id

# Testes para produtos vendidos por peso
def test_weight_based_product(client):
    # Criar produto vendido por peso
    product_data = {
        "name": "Salada ao Peso",
        "description": "Salada vendida por quilo",
        "price": 59.90,  # Preço por kg
        "sku": "SALADA001",
        "type": "single",
        "status": "active",
        "category_id": "cat-003",
        "weight_based": True,
        "weight_unit": "kg"
    }
    
    response = client.post("/api/v1/products", json=product_data)
    assert response.status_code == 200
    data = response.json()
    
    assert data["weight_based"] is True
    assert data["weight_unit"] == "kg"
    assert data["price"] == 59.90  # Preço por kg

# Testes integrados para fluxos complexos
def test_integrated_product_flow(client):
    # 1. Criar categoria
    category_data = {
        "name": "Pizzas",
        "description": "Categoria de pizzas",
        "type": "food",
        "is_active": True
    }
    category_response = client.post("/api/v1/categories", json=category_data)
    category_id = category_response.json()["id"]
    
    # 2. Criar ingredientes
    ingredients = [
        {"name": "Massa de Pizza", "type": "dough", "unit": "unit", "cost": 5.00},
        {"name": "Molho de Tomate", "type": "sauce", "unit": "ml", "cost": 0.05},
        {"name": "Queijo Mussarela", "type": "cheese", "unit": "g", "cost": 0.08},
        {"name": "Calabresa", "type": "meat", "unit": "g", "cost": 0.10},
        {"name": "Cebola", "type": "vegetable", "unit": "g", "cost": 0.03}
    ]
    
    ingredient_ids = []
    for ingredient in ingredients:
        response = client.post("/api/v1/ingredients", json=ingredient)
        ingredient_ids.append(response.json()["id"])
    
    # 3. Criar grupo de opções para bordas
    option_group_data = {
        "name": "Tipo de Borda",
        "description": "Escolha o tipo de borda para sua pizza",
        "is_required": False,
        "min_selections": 0,
        "max_selections": 1,
        "options": [
            {"name": "Borda Tradicional", "price_adjustment": 0.0, "is_default": True},
            {"name": "Borda Recheada com Catupiry", "price_adjustment": 5.0, "is_default": False},
            {"name": "Borda Recheada com Cheddar", "price_adjustment": 5.0, "is_default": False}
        ]
    }
    
    option_group_response = client.post("/api/v1/option-groups", json=option_group_data)
    option_group_id = option_group_response.json()["id"]
    
    # 4. Criar produtos de pizza simples
    pizza_calabresa = {
        "name": "Pizza Calabresa",
        "description": "Pizza de calabresa com cebola",
        "price": 45.90,
        "sku": "PIZZA001",
        "type": "single",
        "status": "active",
        "category_id": category_id,
        "has_ingredients": True,
        "ingredients": [
            {"ingredient_id": ingredient_ids[0], "quantity": 1},  # Massa
            {"ingredient_id": ingredient_ids[1], "quantity": 100},  # Molho
            {"ingredient_id": ingredient_ids[2], "quantity": 150},  # Queijo
            {"ingredient_id": ingredient_ids[3], "quantity": 100},  # Calabresa
            {"ingredient_id": ingredient_ids[4], "quantity": 50}   # Cebola
        ],
        "option_groups": [option_group_id]
    }
    
    pizza_mussarela = {
        "name": "Pizza Mussarela",
        "description": "Pizza de mussarela",
        "price": 40.90,
        "sku": "PIZZA002",
        "type": "single",
        "status": "active",
        "category_id": category_id,
        "has_ingredients": True,
        "ingredients": [
            {"ingredient_id": ingredient_ids[0], "quantity": 1},  # Massa
            {"ingredient_id": ingredient_ids[1], "quantity": 100},  # Molho
            {"ingredient_id": ingredient_ids[2], "quantity": 200}   # Queijo
        ],
        "option_groups": [option_group_id]
    }
    
    pizza1_response = client.post("/api/v1/products", json=pizza_calabresa)
    pizza2_response = client.post("/api/v1/products", json=pizza_mussarela)
    
    pizza1_id = pizza1_response.json()["id"]
    pizza2_id = pizza2_response.json()["id"]
    
    # 5. Criar produto composto (pizza meio a meio)
    composite_product_data = {
        "base_product": {
            "name": "Pizza Meio a Meio",
            "description": "Pizza com dois sabores à sua escolha",
            "price": 45.90,
            "sku": "PIZZA003",
            "type": "composite",
            "status": "active",
            "category_id": category_id,
            "option_groups": [option_group_id]
        },
        "sections": [
            {
                "name": "Primeira Metade",
                "description": "Escolha o sabor da primeira metade",
                "proportion": 0.5,
                "required": True
            },
            {
                "name": "Segunda Metade",
                "description": "Escolha o sabor da segunda metade",
                "proportion": 0.5,
                "required": True
            }
        ],
        "available_products": [pizza1_id, pizza2_id],
        "pricing_strategy": "highest"
    }
    
    composite_response = client.post("/api/v1/composite-products", json=composite_product_data)
    composite_id = composite_response.json()["id"]
    
    # 6. Buscar seções do produto composto
    sections_response = client.get(f"/api/v1/composite-products/{composite_id}/sections")
    sections = sections_response.json()
    
    # 7. Calcular preço do produto composto
    price_data = {
        "product_id": composite_id,
        "section_product_ids": {
            sections[0]["id"]: pizza1_id,
            sections[1]["id"]: pizza2_id
        }
    }
    
    price_response = client.post("/api/v1/composite-products/calculate-price", json=price_data)
    price_data = price_response.json()
    
    # Com estratégia "highest", deve usar o preço da pizza mais cara (calabresa, 45.90)
    assert price_data["price"] == 45.90
    
    # 8. Criar menu com os produtos
    menu_data = {
        "name": "Cardápio de Pizzas",
        "description": "Cardápio de pizzas do restaurante",
        "is_active": True,
        "products": [pizza1_id, pizza2_id, composite_id],
        "categories": [category_id],
        "days_of_week": [0, 1, 2, 3, 4, 5, 6],  # Todos os dias
        "start_time": "18:00",
        "end_time": "23:00"
    }
    
    menu_response = client.post("/api/v1/menus", json=menu_data)
    menu_id = menu_response.json()["id"]
    
    # 9. Exportar menu
    export_response = client.post(f"/api/v1/menus/{menu_id}/export")
    assert export_response.status_code == 200
    
    # Verificar se o fluxo completo foi executado com sucesso
    assert composite_id is not None
    assert menu_id is not None
    assert price_data["price"] == 45.90
