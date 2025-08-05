from typing import List, Dict, Any, Optional
from fastapi import HTTPException
import logging
import json
import os
from datetime import datetime
import uuid

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
    ComboItem,
    Menu,
    MenuCreate,
    MenuUpdate,
    Ingredient,
    IngredientCreate,
    IngredientUpdate,
    OptionGroup,
    OptionGroupCreate,
    OptionGroupUpdate,
    CompositeSection,
    CompositeProductCreate,
    CompositeProductUpdate,
    PricingStrategy,
    MenuExport
)
from src.product.events.product_events import (
    publish_product_created,
    publish_product_updated,
    publish_product_status_changed,
    publish_category_created,
    publish_category_updated,
    publish_menu_updated
    # Removed: publish_ingredient_updated,
    # Removed: publish_option_group_updated
)

logger = logging.getLogger(__name__)

# Simulação de banco de dados com arquivo JSON
DATA_DIR = os.path.join("/home/ubuntu/pos-modern/data")
PRODUCTS_FILE = os.path.join(DATA_DIR, "products.json")
CATEGORIES_FILE = os.path.join(DATA_DIR, "categories.json")
COMBO_ITEMS_FILE = os.path.join(DATA_DIR, "combo_items.json")
COMPOSITE_SECTIONS_FILE = os.path.join(DATA_DIR, "composite_sections.json")
IMAGES_FILE = os.path.join(DATA_DIR, "product_images.json")
EXCHANGE_GROUPS_FILE = os.path.join(DATA_DIR, "exchange_groups.json")
MENUS_FILE = os.path.join(DATA_DIR, "menus.json")
INGREDIENTS_FILE = os.path.join(DATA_DIR, "ingredients.json")
OPTION_GROUPS_FILE = os.path.join(DATA_DIR, "option_groups.json")
IMAGES_DIR = os.path.join(DATA_DIR, "images")
MENU_EXPORTS_DIR = os.path.join(DATA_DIR, "menu_exports")

# Garantir que os diretórios existem
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(MENU_EXPORTS_DIR, exist_ok=True)

# Inicializar arquivos de dados se não existirem
for file_path in [
    PRODUCTS_FILE, CATEGORIES_FILE, COMBO_ITEMS_FILE, COMPOSITE_SECTIONS_FILE,
    IMAGES_FILE, EXCHANGE_GROUPS_FILE, MENUS_FILE, INGREDIENTS_FILE, OPTION_GROUPS_FILE
]:
    if not os.path.exists(file_path):
        with open(file_path, 'w') as f:
            json.dump([], f)


class ProductService:
    """Serviço para gerenciamento de produtos."""
    
    def _load_data(self, file_path: str) -> List[Dict[str, Any]]:
        """Carrega dados de um arquivo JSON."""
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _save_data(self, file_path: str, data: List[Dict[str, Any]]) -> None:
        """Salva dados em um arquivo JSON."""
        def json_encoder(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
        
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=4, default=json_encoder)

    def _load_products(self) -> List[Dict[str, Any]]:
        return self._load_data(PRODUCTS_FILE)

    def _save_products(self, products: List[Dict[str, Any]]) -> None:
        self._save_data(PRODUCTS_FILE, products)

    def _load_categories(self) -> List[Dict[str, Any]]:
        return self._load_data(CATEGORIES_FILE)

    def _save_categories(self, categories: List[Dict[str, Any]]) -> None:
        self._save_data(CATEGORIES_FILE, categories)

    def _load_combo_items(self) -> List[Dict[str, Any]]:
        return self._load_data(COMBO_ITEMS_FILE)

    def _save_combo_items(self, items: List[Dict[str, Any]]) -> None:
        self._save_data(COMBO_ITEMS_FILE, items)

    def _load_composite_sections(self) -> List[Dict[str, Any]]:
        return self._load_data(COMPOSITE_SECTIONS_FILE)

    def _save_composite_sections(self, sections: List[Dict[str, Any]]) -> None:
        self._save_data(COMPOSITE_SECTIONS_FILE, sections)

    def _load_images(self) -> List[Dict[str, Any]]:
        return self._load_data(IMAGES_FILE)

    def _save_images(self, images: List[Dict[str, Any]]) -> None:
        self._save_data(IMAGES_FILE, images)

    def _load_exchange_groups(self) -> List[Dict[str, Any]]:
        return self._load_data(EXCHANGE_GROUPS_FILE)

    def _save_exchange_groups(self, groups: List[Dict[str, Any]]) -> None:
        self._save_data(EXCHANGE_GROUPS_FILE, groups)

    def _load_menus(self) -> List[Dict[str, Any]]:
        return self._load_data(MENUS_FILE)

    def _save_menus(self, menus: List[Dict[str, Any]]) -> None:
        self._save_data(MENUS_FILE, menus)

    def _load_ingredients(self) -> List[Dict[str, Any]]:
        return self._load_data(INGREDIENTS_FILE)

    def _save_ingredients(self, ingredients: List[Dict[str, Any]]) -> None:
        self._save_data(INGREDIENTS_FILE, ingredients)

    def _load_option_groups(self) -> List[Dict[str, Any]]:
        return self._load_data(OPTION_GROUPS_FILE)

    def _save_option_groups(self, groups: List[Dict[str, Any]]) -> None:
        self._save_data(OPTION_GROUPS_FILE, groups)

    async def create_product(self, product_data: ProductCreate) -> Product:
        """Cria um novo produto."""
        products = self._load_products()
        product = Product(**product_data.dict())
        products.append(product.dict())
        self._save_products(products)
        await publish_product_created(product)
        return product
    
    async def get_product(self, product_id: str) -> Optional[Product]:
        """Busca um produto pelo ID."""
        products = self._load_products()
        product_dict = next((p for p in products if p["id"] == product_id), None)
        if not product_dict:
            return None
        return Product(**product_dict)
    
    async def list_products(
        self,
        category_id: Optional[str] = None,
        status: Optional[ProductStatus] = None,
        type: Optional[ProductType] = None,
        is_featured: Optional[bool] = None,
        search: Optional[str] = None,
        has_ingredients: Optional[bool] = None,
        weight_based: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[ProductSummary]:
        """Lista produtos com filtros."""
        products = self._load_products()
        
        filtered_products = products
        if category_id: filtered_products = [p for p in filtered_products if category_id in p.get("categories", [])]
        if status: filtered_products = [p for p in filtered_products if p["status"] == status]
        if type: filtered_products = [p for p in filtered_products if p["type"] == type]
        if is_featured is not None: filtered_products = [p for p in filtered_products if p.get("is_featured", False) == is_featured]
        if has_ingredients is not None:
            if has_ingredients: filtered_products = [p for p in filtered_products if p.get("ingredients", [])]
            else: filtered_products = [p for p in filtered_products if not p.get("ingredients", [])]
        if weight_based is not None:
            if weight_based: filtered_products = [p for p in filtered_products if p.get("type") == ProductType.WEIGHT_BASED]
            else: filtered_products = [p for p in filtered_products if p.get("type") != ProductType.WEIGHT_BASED]
        if search:
            search = search.lower()
            filtered_products = [p for p in filtered_products if search in p["name"].lower() or 
                        (p.get("description") and search in p["description"].lower()) or
                        search in str(p.get("sku", "")).lower() or
                        search in str(p.get("barcode", "")).lower()]
        
        filtered_products.sort(key=lambda x: (x.get("display_order", 0), x.get("name", "")))
        paginated_products = filtered_products[offset:offset + limit]
        
        images = self._load_images()
        main_images = {img["product_id"]: img["file_path"] for img in images if img.get("is_main", False)}
        
        summaries = []
        for p in paginated_products:
            summary = ProductSummary(
                id=p["id"],
                name=p["name"],
                price=p["price"],
                type=p["type"],
                status=p["status"],
                main_image=main_images.get(p["id"]),
                categories=p.get("categories", []),
                is_featured=p.get("is_featured", False)
            )
            summaries.append(summary)
        return summaries
    
    async def update_product(self, product_id: str, update_data: ProductUpdate) -> Optional[Product]:
        """Atualiza um produto."""
        products = self._load_products()
        product_index = next((i for i, p in enumerate(products) if p["id"] == product_id), None)
        if product_index is None: return None
        
        old_status = products[product_index]["status"]
        update_dict = update_data.dict(exclude_unset=True)
        products[product_index].update(update_dict)
        products[product_index]["updated_at"] = datetime.now().isoformat()
        self._save_products(products)
        
        updated_product = Product(**products[product_index])
        await publish_product_updated(updated_product, update_dict)
        if "status" in update_dict and old_status != updated_product.status:
            await publish_product_status_changed(updated_product, old_status)
        return updated_product
    
    async def delete_product(self, product_id: str) -> bool:
        """Exclui um produto (marcando como inativo ou removendo)."""
        products = self._load_products()
        product_index = next((i for i, p in enumerate(products) if p["id"] == product_id), None)
        if product_index is None: return False
        
        combo_items = self._load_combo_items()
        is_used_in_combo = any(item["product_id"] == product_id for item in combo_items)
        composite_sections = self._load_composite_sections()
        is_used_in_composite = any(section["product_id"] == product_id for section in composite_sections)
        
        if is_used_in_combo or is_used_in_composite:
            old_status = products[product_index]["status"]
            if old_status != ProductStatus.INACTIVE:
                products[product_index]["status"] = ProductStatus.INACTIVE
                products[product_index]["updated_at"] = datetime.now().isoformat()
                self._save_products(products)
                updated_product = Product(**products[product_index])
                await publish_product_status_changed(updated_product, old_status)
            return True # Marked as inactive
        else:
            removed_product = products.pop(product_index)
            self._save_products(products)
            
            images = self._load_images()
            product_images = [img for img in images if img["product_id"] == product_id]
            for img in product_images:
                try: os.remove(os.path.join(IMAGES_DIR, img["file_name"]))
                except Exception as e: logger.error(f"Erro ao remover arquivo de imagem: {e}")
            images = [img for img in images if img["product_id"] != product_id]
            self._save_images(images)
            
            # Publicar evento de produto deletado
            await self.event_bus.publish(
                "product.deleted",
                Event(data={"product_id": product_id}, metadata={"event_type": "product.deleted", "module": "product"})
            )
            return True # Removed completely
    
    async def create_combo(self, product_data: ProductCreate, items: List[ComboItem]) -> Product:
        """Cria um novo combo."""
        product_data_dict = product_data.dict()
        product_data_dict["type"] = ProductType.COMBO
        product = await self.create_product(ProductCreate(**product_data_dict))
        
        combo_items = self._load_combo_items()
        for item in items:
            item_dict = item.dict()
            item_dict["combo_id"] = product.id
            combo_items.append(item_dict)
        self._save_combo_items(combo_items)
        return product
    
    async def update_combo(self, combo_id: str, product_update: Optional[ProductUpdate] = None, items: Optional[List[ComboItem]] = None) -> Optional[Product]:
        """Atualiza um combo."""
        product = await self.get_product(combo_id)
        if not product or product.type != ProductType.COMBO: return None
        
        if product_update:
            product = await self.update_product(combo_id, product_update)
            if not product: return None
        
        if items is not None:
            combo_items = self._load_combo_items()
            combo_items = [item for item in combo_items if item["combo_id"] != combo_id]
            for item in items:
                item_dict = item.dict()
                item_dict["combo_id"] = combo_id
                combo_items.append(item_dict)
            self._save_combo_items(combo_items)
        return product
    
    async def get_combo_items(self, combo_id: str) -> List[Dict[str, Any]]:
        """Busca os itens de um combo."""
        combo_items = self._load_combo_items()
        return [item for item in combo_items if item["combo_id"] == combo_id]
    
    async def create_composite_product(self, data: CompositeProductCreate) -> Product:
        """Cria um novo produto composto."""
        product_data_dict = data.product.dict()
        product_data_dict["type"] = ProductType.COMPOSITE
        product_data_dict["pricing_strategy"] = data.pricing_strategy
        product = await self.create_product(ProductCreate(**product_data_dict))
        
        composite_sections = self._load_composite_sections()
        for section in data.sections:
            section_dict = section.dict()
            section_dict["id"] = str(uuid.uuid4())
            section_dict["product_id"] = product.id
            composite_sections.append(section_dict)
        self._save_composite_sections(composite_sections)
        return product
    
    async def update_composite_product(self, product_id: str, data: CompositeProductUpdate) -> Optional[Product]:
        """Atualiza um produto composto."""
        product = await self.get_product(product_id)
        if not product or product.type != ProductType.COMPOSITE: return None
        
        if data.product:
            product = await self.update_product(product_id, data.product)
            if not product: return None
        
        if data.pricing_strategy:
            product = await self.update_product(product_id, ProductUpdate(pricing_strategy=data.pricing_strategy))
        
        if data.sections is not None:
            composite_sections = self._load_composite_sections()
            composite_sections = [section for section in composite_sections if section["product_id"] != product_id]
            for section in data.sections:
                section_dict = section.dict()
                section_dict["id"] = str(uuid.uuid4())
                section_dict["product_id"] = product_id
                composite_sections.append(section_dict)
            self._save_composite_sections(composite_sections)
        return product
    
    async def get_composite_sections(self, product_id: str) -> List[CompositeSection]:
        """Busca as seções de um produto composto."""
        composite_sections = self._load_composite_sections()
        return [CompositeSection(**section) for section in composite_sections if section["product_id"] == product_id]
    
    async def calculate_composite_product_price(self, product_id: str, section_product_ids: Dict[str, str]) -> float:
        """Calcula o preço de um produto composto."""
        product = await self.get_product(product_id)
        if not product or product.type != ProductType.COMPOSITE: raise ValueError(f"Produto {product_id} não é um produto composto")
        
        sections = await self.get_composite_sections(product_id)
        if not sections: return product.price
        
        section_prices = []
        for section in sections:
            selected_product_id = section_product_ids.get(section.id)
            if not selected_product_id: raise ValueError(f"Produto não selecionado para a seção {section.name}")
            
            selected_product = await self.get_product(selected_product_id)
            if not selected_product: raise ValueError(f"Produto {selected_product_id} da seção {section.name} não encontrado")
            section_prices.append(selected_product.price)
        
        if not section_prices: return product.price
        
        if product.pricing_strategy == PricingStrategy.HIGHEST_PRICE:
            return max(section_prices)
        elif product.pricing_strategy == PricingStrategy.AVERAGE_PRICE:
            return sum(section_prices) / len(section_prices)
        elif product.pricing_strategy == PricingStrategy.SUM_PRICE:
            return sum(section_prices)
        else: # Default to highest price
            return max(section_prices)

    # --- Categorias ---
    async def create_category(self, category_data: CategoryCreate) -> ProductCategory:
        """Cria uma nova categoria."""
        categories = self._load_categories()
        category = ProductCategory(**category_data.dict())
        categories.append(category.dict())
        self._save_categories(categories)
        await publish_category_created(category.dict())
        return category

    async def get_category(self, category_id: str) -> Optional[ProductCategory]:
        """Busca uma categoria pelo ID."""
        categories = self._load_categories()
        category_dict = next((c for c in categories if c["id"] == category_id), None)
        if not category_dict: return None
        return ProductCategory(**category_dict)

    async def list_categories(self, type: Optional[str] = None, parent_id: Optional[str] = None) -> List[ProductCategory]:
        """Lista categorias com filtros."""
        categories = self._load_categories()
        filtered_categories = categories
        if type: filtered_categories = [c for c in filtered_categories if c.get("type") == type]
        if parent_id: filtered_categories = [c for c in filtered_categories if c.get("parent_id") == parent_id]
        else: filtered_categories = [c for c in filtered_categories if not c.get("parent_id")] # List root categories if parent_id is None
        
        filtered_categories.sort(key=lambda x: (x.get("display_order", 0), x.get("name", "")))
        return [ProductCategory(**c) for c in filtered_categories]

    async def update_category(self, category_id: str, update_data: CategoryUpdate) -> Optional[ProductCategory]:
        """Atualiza uma categoria."""
        categories = self._load_categories()
        category_index = next((i for i, c in enumerate(categories) if c["id"] == category_id), None)
        if category_index is None: return None
        
        update_dict = update_data.dict(exclude_unset=True)
        categories[category_index].update(update_dict)
        categories[category_index]["updated_at"] = datetime.now().isoformat()
        self._save_categories(categories)
        
        updated_category = ProductCategory(**categories[category_index])
        await publish_category_updated(updated_category.dict(), update_dict)
        return updated_category

    async def delete_category(self, category_id: str) -> bool:
        """Exclui uma categoria."""
        categories = self._load_categories()
        category_index = next((i for i, c in enumerate(categories) if c["id"] == category_id), None)
        if category_index is None: return False
        
        # Check if category is used by products
        products = self._load_products()
        is_used = any(category_id in p.get("categories", []) for p in products)
        if is_used:
            raise HTTPException(status_code=400, detail="Categoria está em uso por produtos e não pode ser excluída.")
        
        # Check if category has subcategories
        has_children = any(c.get("parent_id") == category_id for c in categories)
        if has_children:
            raise HTTPException(status_code=400, detail="Categoria possui subcategorias e não pode ser excluída.")
            
        del categories[category_index]
        self._save_categories(categories)
        # Publicar evento de categoria deletada
        await self.event_bus.publish(
            "category.deleted",
            Event(data={"category_id": category_id}, metadata={"event_type": "category.deleted", "module": "product"})
        )
        return True

    # --- Imagens ---
    async def add_product_image(self, product_id: str, file_name: str, file_path: str, is_main: bool = False) -> ProductImage:
        """Adiciona uma imagem a um produto."""
        images = self._load_images()
        
        # If setting as main, unset other main images for this product
        if is_main:
            for img in images:
                if img["product_id"] == product_id and img.get("is_main", False):
                    img["is_main"] = False
        
        image = ProductImage(
            id=str(uuid.uuid4()),
            product_id=product_id,
            file_name=file_name,
            file_path=file_path,
            is_main=is_main
        )
        images.append(image.dict())
        self._save_images(images)
        # Publicar evento de imagem adicionada
        await self.event_bus.publish(
            "image.added",
            Event(data={"product_id": product_id, "image_id": image_id}, metadata={"event_type": "image.added", "module": "product"})
        )
        return image

    async def get_product_images(self, product_id: str) -> List[ProductImage]:
        """Busca as imagens de um produto."""
        images = self._load_images()
        return [ProductImage(**img) for img in images if img["product_id"] == product_id]

    async def set_main_product_image(self, image_id: str) -> bool:
        """Define uma imagem como principal."""
        images = self._load_images()
        target_image = None
        product_id = None
        
        for img in images:
            if img["id"] == image_id:
                target_image = img
                product_id = img["product_id"]
                break
        
        if not target_image: return False
        
        # Unset other main images for the same product
        for img in images:
            if img["product_id"] == product_id and img["id"] != image_id:
                img["is_main"] = False
        
        target_image["is_main"] = True
        self._save_images(images)
        # Evento main image changed será implementado quando necessário
        return True

    async def delete_product_image(self, image_id: str) -> bool:
        """Exclui uma imagem de produto."""
        images = self._load_images()
        image_index = next((i for i, img in enumerate(images) if img["id"] == image_id), None)
        if image_index is None: return False
        
        image_data = images.pop(image_index)
        self._save_images(images)
        
        # Remove physical file
        try: os.remove(os.path.join(IMAGES_DIR, image_data["file_name"]))
        except Exception as e: logger.error(f"Erro ao remover arquivo de imagem: {e}")
        # Evento image deleted será implementado quando necessário
        return True

    # --- Menus ---
    async def create_menu(self, menu_data: MenuCreate) -> Menu:
        """Cria um novo cardápio."""
        menus = self._load_menus()
        menu = Menu(**menu_data.dict())
        menus.append(menu.dict())
        self._save_menus(menus)
        # Evento menu created será implementado quando necessário
        return menu

    async def get_menu(self, menu_id: str) -> Optional[Menu]:
        """Busca um cardápio pelo ID."""
        menus = self._load_menus()
        menu_dict = next((m for m in menus if m["id"] == menu_id), None)
        if not menu_dict: return None
        return Menu(**menu_dict)

    async def list_menus(self, is_active: Optional[bool] = None) -> List[Menu]:
        """Lista cardápios."""
        menus = self._load_menus()
        filtered_menus = menus
        if is_active is not None: filtered_menus = [m for m in filtered_menus if m.get("is_active") == is_active]
        return [Menu(**m) for m in filtered_menus]

    async def update_menu(self, menu_id: str, update_data: MenuUpdate) -> Optional[Menu]:
        """Atualiza um cardápio."""
        menus = self._load_menus()
        menu_index = next((i for i, m in enumerate(menus) if m["id"] == menu_id), None)
        if menu_index is None: return None
        
        update_dict = update_data.dict(exclude_unset=True)
        menus[menu_index].update(update_dict)
        menus[menu_index]["updated_at"] = datetime.now().isoformat()
        self._save_menus(menus)
        
        updated_menu = Menu(**menus[menu_index])
        await publish_menu_updated(updated_menu.dict())
        return updated_menu

    async def delete_menu(self, menu_id: str) -> bool:
        """Exclui um cardápio."""
        menus = self._load_menus()
        menu_index = next((i for i, m in enumerate(menus) if m["id"] == menu_id), None)
        if menu_index is None: return False
        
        del menus[menu_index]
        self._save_menus(menus)
        # Evento menu deleted será implementado quando necessário
        return True

    async def export_menu(self, menu_id: str, format: str = "json") -> Optional[str]:
        """Exporta um cardápio para um arquivo."""
        menu = await self.get_menu(menu_id)
        if not menu: return None

        products = self._load_products()
        categories = self._load_categories()
        images = self._load_images()
        combo_items = self._load_combo_items()
        composite_sections = self._load_composite_sections()
        ingredients = self._load_ingredients()
        option_groups = self._load_option_groups()

        menu_products = [p for p in products if p["id"] in menu.products]
        menu_categories = [c for c in categories if c["id"] in menu.categories]

        export_data = MenuExport(
            menu=menu,
            products=menu_products,
            categories=menu_categories,
            images=[img for img in images if img["product_id"] in menu.products],
            combo_items=[item for item in combo_items if item["combo_id"] in menu.products],
            composite_sections=[sec for sec in composite_sections if sec["product_id"] in menu.products],
            ingredients=[ing for ing in ingredients if ing["product_id"] in menu.products],
            option_groups=[og for og in option_groups if og["product_id"] in menu.products]
        )

        file_name = f"menu_{menu_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{format}"
        file_path = os.path.join(MENU_EXPORTS_DIR, file_name)

        try:
            with open(file_path, 'w') as f:
                if format == "json":
                    json.dump(export_data.dict(), f, indent=4)
                # Add other formats like CSV, XML if needed
                else:
                    raise ValueError("Formato de exportação não suportado")
            return file_path
        except Exception as e:
            logger.error(f"Erro ao exportar cardápio: {e}")
            return None

    # --- Ingredientes ---
    async def create_ingredient(self, ingredient_data: IngredientCreate) -> Ingredient:
        """Cria um novo ingrediente."""
        ingredients = self._load_ingredients()
        ingredient = Ingredient(**ingredient_data.dict())
        ingredients.append(ingredient.dict())
        self._save_ingredients(ingredients)
        # Evento ingredient created será implementado quando necessário
        return ingredient

    async def get_ingredient(self, ingredient_id: str) -> Optional[Ingredient]:
        """Busca um ingrediente pelo ID."""
        ingredients = self._load_ingredients()
        ingredient_dict = next((ing for ing in ingredients if ing["id"] == ingredient_id), None)
        if not ingredient_dict: return None
        return Ingredient(**ingredient_dict)

    async def list_ingredients(self, product_id: Optional[str] = None) -> List[Ingredient]:
        """Lista ingredientes."""
        ingredients = self._load_ingredients()
        filtered_ingredients = ingredients
        if product_id: filtered_ingredients = [ing for ing in filtered_ingredients if ing.get("product_id") == product_id]
        return [Ingredient(**ing) for ing in filtered_ingredients]

    async def update_ingredient(self, ingredient_id: str, update_data: IngredientUpdate) -> Optional[Ingredient]:
        """Atualiza um ingrediente."""
        ingredients = self._load_ingredients()
        ingredient_index = next((i for i, ing in enumerate(ingredients) if ing["id"] == ingredient_id), None)
        if ingredient_index is None: return None
        
        update_dict = update_data.dict(exclude_unset=True)
        ingredients[ingredient_index].update(update_dict)
        ingredients[ingredient_index]["updated_at"] = datetime.now().isoformat()
        self._save_ingredients(ingredients)
        
        updated_ingredient = Ingredient(**ingredients[ingredient_index])
        # Evento ingredient updated será implementado quando necessário
        # await publish_ingredient_updated(updated_ingredient, update_dict)
        return updated_ingredient

    async def delete_ingredient(self, ingredient_id: str) -> bool:
        """Exclui um ingrediente."""
        ingredients = self._load_ingredients()
        ingredient_index = next((i for i, ing in enumerate(ingredients) if ing["id"] == ingredient_id), None)
        if ingredient_index is None: return False
        
        # Check if ingredient is used in options?
        
        del ingredients[ingredient_index]
        self._save_ingredients(ingredients)
        # Evento ingredient deleted será implementado quando necessário
        return True

    # --- Grupos de Opções e Opções ---
    async def create_option_group(self, group_data: OptionGroupCreate) -> OptionGroup:
        """Cria um novo grupo de opções."""
        option_groups = self._load_option_groups()
        group = OptionGroup(**group_data.dict())
        option_groups.append(group.dict())
        self._save_option_groups(option_groups)
        # Evento option group created será implementado quando necessário
        return group

    async def get_option_group(self, group_id: str) -> Optional[OptionGroup]:
        """Busca um grupo de opções pelo ID."""
        option_groups = self._load_option_groups()
        group_dict = next((og for og in option_groups if og["id"] == group_id), None)
        if not group_dict: return None
        return OptionGroup(**group_dict)

    async def list_option_groups(self, product_id: Optional[str] = None) -> List[OptionGroup]:
        """Lista grupos de opções."""
        option_groups = self._load_option_groups()
        filtered_groups = option_groups
        if product_id: filtered_groups = [og for og in filtered_groups if og.get("product_id") == product_id]
        return [OptionGroup(**og) for og in filtered_groups]

    async def update_option_group(self, group_id: str, update_data: OptionGroupUpdate) -> Optional[OptionGroup]:
        """Atualiza um grupo de opções."""
        option_groups = self._load_option_groups()
        group_index = next((i for i, og in enumerate(option_groups) if og["id"] == group_id), None)
        if group_index is None: return None
        
        update_dict = update_data.dict(exclude_unset=True)
        
        # Handle options update separately
        if "options" in update_dict:
            options_data = update_dict.pop("options")
            option_groups[group_index]["options"] = [opt.dict() for opt in options_data]
            
        option_groups[group_index].update(update_dict)
        option_groups[group_index]["updated_at"] = datetime.now().isoformat()
        self._save_option_groups(option_groups)
        
        updated_group = OptionGroup(**option_groups[group_index])
        # Evento option group updated será implementado quando necessário
        # await publish_option_group_updated(updated_group, update_dict)
        return updated_group

    async def delete_option_group(self, group_id: str) -> bool:
        """Exclui um grupo de opções."""
        option_groups = self._load_option_groups()
        group_index = next((i for i, og in enumerate(option_groups) if og["id"] == group_id), None)
        if group_index is None: return False
        
        del option_groups[group_index]
        self._save_option_groups(option_groups)
        # Evento option group deleted será implementado quando necessário
        return True

# Singleton para o serviço de produtos
_product_service_instance = None

def get_product_service() -> ProductService:
    """Retorna a instância singleton do serviço de produtos."""
    global _product_service_instance
    if _product_service_instance is None:
        _product_service_instance = ProductService()
    return _product_service_instance

