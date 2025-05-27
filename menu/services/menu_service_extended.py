from typing import List, Optional, Dict, Any, Union
from uuid import UUID
from datetime import datetime, timedelta
import asyncio
import json
import os
import redis
import boto3
from fastapi import HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete, func
from ..models.menu_models import Menu, MenuItem, MenuCategory, MenuItemCategory, QRCodeConfig
from ..models.menu_order_models import MenuOrder, MenuOrderItem, MenuOrderStatus
from ..models.menu_cache_models import MenuCache
from ..database.session import get_async_session
from ..database.models import MenuDB, MenuItemDB, MenuCategoryDB, MenuOrderDB, MenuOrderItemDB, MenuCacheDB

class MenuServiceExtended:
    """Enhanced service for managing menus and menu items with database persistence and caching"""
    
    def __init__(self, redis_client=None):
        """Initialize the service with optional Redis client for caching"""
        # Initialize Redis client if provided
        self.redis_client = redis_client
        if not self.redis_client and os.environ.get('REDIS_HOST'):
            self.redis_client = redis.Redis(
                host=os.environ.get('REDIS_HOST', 'localhost'),
                port=int(os.environ.get('REDIS_PORT', 6379)),
                db=0,
                decode_responses=True
            )
        
        # Cache TTL in seconds (15 minutes default)
        self.cache_ttl = int(os.environ.get('MENU_CACHE_TTL', 900))
    
    async def get_all_menus(self, 
                           restaurant_id: Optional[UUID] = None, 
                           active: Optional[bool] = None,
                           db: AsyncSession = Depends(get_async_session)) -> List[Menu]:
        """Get all menus with optional filtering"""
        query = select(MenuDB)
        
        if restaurant_id:
            query = query.where(MenuDB.restaurant_id == restaurant_id)
        
        if active is not None:
            query = query.where(MenuDB.active == active)
        
        result = await db.execute(query)
        menu_dbs = result.scalars().all()
        
        # Convert DB models to Pydantic models
        menus = []
        for menu_db in menu_dbs:
            menu = await self._db_to_pydantic_menu(menu_db, db)
            menus.append(menu)
            
        return menus
    
    async def get_menu_by_id(self, 
                            menu_id: UUID,
                            db: AsyncSession = Depends(get_async_session)) -> Optional[Menu]:
        """Get a specific menu by ID"""
        query = select(MenuDB).where(MenuDB.id == menu_id)
        result = await db.execute(query)
        menu_db = result.scalars().first()
        
        if not menu_db:
            return None
        
        return await self._db_to_pydantic_menu(menu_db, db)
    
    async def create_menu(self, 
                         menu: Menu,
                         db: AsyncSession = Depends(get_async_session)) -> Menu:
        """Create a new menu"""
        # Convert Pydantic model to DB model
        menu_db = MenuDB(
            id=menu.id,
            restaurant_id=menu.restaurant_id,
            name=menu.name,
            description=menu.description,
            active=menu.active,
            available_from=menu.available_from,
            available_to=menu.available_to,
            created_at=menu.created_at,
            updated_at=menu.updated_at,
            metadata=menu.metadata
        )
        
        db.add(menu_db)
        await db.commit()
        await db.refresh(menu_db)
        
        # Create categories
        for category in menu.categories:
            category_db = MenuCategoryDB(
                id=category.id,
                menu_id=menu.id,
                name=category.name,
                description=category.description,
                image_url=category.image_url,
                order=category.order,
                available=category.available
            )
            db.add(category_db)
        
        await db.commit()
        
        # Invalidate cache
        await self._invalidate_menu_cache(menu.restaurant_id)
        
        return menu
    
    async def update_menu(self, 
                         menu_id: UUID, 
                         menu_data: Menu,
                         db: AsyncSession = Depends(get_async_session)) -> Optional[Menu]:
        """Update an existing menu"""
        query = select(MenuDB).where(MenuDB.id == menu_id)
        result = await db.execute(query)
        menu_db = result.scalars().first()
        
        if not menu_db:
            return None
        
        # Update menu fields
        menu_db.name = menu_data.name
        menu_db.description = menu_data.description
        menu_db.active = menu_data.active
        menu_db.available_from = menu_data.available_from
        menu_db.available_to = menu_data.available_to
        menu_db.updated_at = datetime.now()
        menu_db.metadata = menu_data.metadata
        
        # Update categories
        # First, remove existing categories
        await db.execute(delete(MenuCategoryDB).where(MenuCategoryDB.menu_id == menu_id))
        
        # Then add new categories
        for category in menu_data.categories:
            category_db = MenuCategoryDB(
                id=category.id,
                menu_id=menu_id,
                name=category.name,
                description=category.description,
                image_url=category.image_url,
                order=category.order,
                available=category.available
            )
            db.add(category_db)
        
        await db.commit()
        await db.refresh(menu_db)
        
        # Invalidate cache
        await self._invalidate_menu_cache(menu_db.restaurant_id)
        
        return await self._db_to_pydantic_menu(menu_db, db)
    
    async def delete_menu(self, 
                         menu_id: UUID,
                         db: AsyncSession = Depends(get_async_session)) -> bool:
        """Delete a menu"""
        # Get restaurant_id for cache invalidation
        query = select(MenuDB).where(MenuDB.id == menu_id)
        result = await db.execute(query)
        menu_db = result.scalars().first()
        
        if not menu_db:
            return False
        
        restaurant_id = menu_db.restaurant_id
        
        # Delete menu items
        await db.execute(delete(MenuItemDB).where(MenuItemDB.menu_id == menu_id))
        
        # Delete categories
        await db.execute(delete(MenuCategoryDB).where(MenuCategoryDB.menu_id == menu_id))
        
        # Delete menu
        await db.execute(delete(MenuDB).where(MenuDB.id == menu_id))
        
        await db.commit()
        
        # Invalidate cache
        await self._invalidate_menu_cache(restaurant_id)
        
        return True
    
    async def get_menu_items(self, 
                            menu_id: UUID, 
                            category: Optional[str] = None,
                            db: AsyncSession = Depends(get_async_session)) -> List[MenuItem]:
        """Get all items in a menu with optional category filtering"""
        query = select(MenuItemDB).where(MenuItemDB.menu_id == menu_id)
        
        if category:
            query = query.where(MenuItemDB.category == category)
            
        result = await db.execute(query)
        item_dbs = result.scalars().all()
        
        # Convert DB models to Pydantic models
        items = []
        for item_db in item_dbs:
            item = await self._db_to_pydantic_menu_item(item_db)
            items.append(item)
            
        return items
    
    async def get_menu_item(self, 
                           menu_id: UUID, 
                           item_id: UUID,
                           db: AsyncSession = Depends(get_async_session)) -> Optional[MenuItem]:
        """Get a specific menu item"""
        query = select(MenuItemDB).where(
            MenuItemDB.menu_id == menu_id,
            MenuItemDB.id == item_id
        )
        result = await db.execute(query)
        item_db = result.scalars().first()
        
        if not item_db:
            return None
        
        return await self._db_to_pydantic_menu_item(item_db)
    
    async def add_menu_item(self, 
                           menu_id: UUID, 
                           item: MenuItem,
                           db: AsyncSession = Depends(get_async_session)) -> MenuItem:
        """Add a new item to a menu"""
        # Check if menu exists
        query = select(MenuDB).where(MenuDB.id == menu_id)
        result = await db.execute(query)
        menu_db = result.scalars().first()
        
        if not menu_db:
            raise HTTPException(status_code=404, detail="Menu not found")
        
        # Convert Pydantic model to DB model
        item_db = MenuItemDB(
            id=item.id,
            menu_id=menu_id,
            name=item.name,
            description=item.description,
            price=item.price,
            image_url=item.image_url,
            category=item.category.value,
            tags=item.tags,
            allergens=[allergen.value for allergen in item.allergens],
            nutrition=item.nutrition.dict() if item.nutrition else None,
            options=[option.dict() for option in item.options],
            variants=[variant.dict() for variant in item.variants],
            available=item.available,
            popular=item.popular,
            featured=item.featured,
            created_at=item.created_at,
            updated_at=item.updated_at,
            product_id=item.product_id
        )
        
        db.add(item_db)
        await db.commit()
        await db.refresh(item_db)
        
        # Update menu category if needed
        await self._update_menu_category(menu_id, item, db)
        
        # Invalidate cache
        await self._invalidate_menu_cache(menu_db.restaurant_id)
        
        return await self._db_to_pydantic_menu_item(item_db)
    
    async def update_menu_item(self, 
                              menu_id: UUID, 
                              item_id: UUID, 
                              item_data: MenuItem,
                              db: AsyncSession = Depends(get_async_session)) -> Optional[MenuItem]:
        """Update an existing menu item"""
        # Get restaurant_id for cache invalidation
        query = select(MenuDB).where(MenuDB.id == menu_id)
        result = await db.execute(query)
        menu_db = result.scalars().first()
        
        if not menu_db:
            return None
        
        # Get item
        query = select(MenuItemDB).where(
            MenuItemDB.menu_id == menu_id,
            MenuItemDB.id == item_id
        )
        result = await db.execute(query)
        item_db = result.scalars().first()
        
        if not item_db:
            return None
        
        # Update item fields
        item_db.name = item_data.name
        item_db.description = item_data.description
        item_db.price = item_data.price
        item_db.image_url = item_data.image_url
        item_db.category = item_data.category.value
        item_db.tags = item_data.tags
        item_db.allergens = [allergen.value for allergen in item_data.allergens]
        item_db.nutrition = item_data.nutrition.dict() if item_data.nutrition else None
        item_db.options = [option.dict() for option in item_data.options]
        item_db.variants = [variant.dict() for variant in item_data.variants]
        item_db.available = item_data.available
        item_db.popular = item_data.popular
        item_db.featured = item_data.featured
        item_db.updated_at = datetime.now()
        item_db.product_id = item_data.product_id
        
        await db.commit()
        await db.refresh(item_db)
        
        # Update menu category if needed
        await self._update_menu_category(menu_id, item_data, db)
        
        # Invalidate cache
        await self._invalidate_menu_cache(menu_db.restaurant_id)
        
        return await self._db_to_pydantic_menu_item(item_db)
    
    async def delete_menu_item(self, 
                              menu_id: UUID, 
                              item_id: UUID,
                              db: AsyncSession = Depends(get_async_session)) -> bool:
        """Delete a menu item"""
        # Get restaurant_id for cache invalidation
        query = select(MenuDB).where(MenuDB.id == menu_id)
        result = await db.execute(query)
        menu_db = result.scalars().first()
        
        if not menu_db:
            return False
        
        # Delete item
        query = delete(MenuItemDB).where(
            MenuItemDB.menu_id == menu_id,
            MenuItemDB.id == item_id
        )
        result = await db.execute(query)
        
        if result.rowcount == 0:
            return False
        
        # Remove item from categories
        query = select(MenuCategoryDB).where(MenuCategoryDB.menu_id == menu_id)
        result = await db.execute(query)
        categories = result.scalars().all()
        
        for category in categories:
            if category.items and item_id in category.items:
                category.items.remove(item_id)
        
        await db.commit()
        
        # Invalidate cache
        await self._invalidate_menu_cache(menu_db.restaurant_id)
        
        return True
    
    async def get_public_menu(self, 
                             restaurant_id: UUID,
                             db: AsyncSession = Depends(get_async_session)) -> Optional[Dict[str, Any]]:
        """Get the public menu for a restaurant (accessible via QR code) with caching"""
        # Try to get from cache first
        cache_key = f"menu:public:{restaurant_id}"
        cached_menu = await self._get_from_cache(cache_key)
        
        if cached_menu:
            return cached_menu
        
        # If not in cache, build from database
        # Find the active menu for this restaurant
        query = select(MenuDB).where(
            MenuDB.restaurant_id == restaurant_id,
            MenuDB.active == True
        )
        
        # Add time-based filtering if available
        now = datetime.now()
        query = query.where(
            (MenuDB.available_from.is_(None) | (MenuDB.available_from <= now)) &
            (MenuDB.available_to.is_(None) | (MenuDB.available_to >= now))
        )
        
        result = await db.execute(query)
        menu_db = result.scalars().first()
        
        if not menu_db:
            return None
        
        # Convert to Pydantic model
        menu = await self._db_to_pydantic_menu(menu_db, db)
        
        # Get all items for this menu
        items = await self.get_menu_items(menu.id, db=db)
        
        # Organize items by category
        categorized_items = {}
        for item in items:
            if item.category.value not in categorized_items:
                categorized_items[item.category.value] = []
            categorized_items[item.category.value].append(item.dict())
        
        # Build the public menu structure
        public_menu = {
            "restaurant_id": str(restaurant_id),
            "menu_id": str(menu.id),
            "name": menu.name,
            "description": menu.description,
            "theme": menu.theme.dict() if menu.theme else {},
            "categories": [
                {
                    "name": category.name,
                    "description": category.description,
                    "image_url": category.image_url,
                    "items": categorized_items.get(category.name, [])
                }
                for category in menu.categories
            ]
        }
        
        # Store in cache
        await self._store_in_cache(cache_key, public_menu)
        
        return public_menu
    
    async def get_popular_items(self, 
                               restaurant_id: UUID, 
                               limit: int = 10,
                               db: AsyncSession = Depends(get_async_session)) -> List[MenuItem]:
        """Get popular items for a restaurant based on order history and manual flags"""
        # Try to get from cache first
        cache_key = f"menu:popular:{restaurant_id}:{limit}"
        cached_items = await self._get_from_cache(cache_key)
        
        if cached_items:
            return cached_items
        
        # Find the active menu for this restaurant
        query = select(MenuDB).where(
            MenuDB.restaurant_id == restaurant_id,
            MenuDB.active == True
        )
        result = await db.execute(query)
        menu_db = result.scalars().first()
        
        if not menu_db:
            return []
        
        # First, get items marked as popular
        query = select(MenuItemDB).where(
            MenuItemDB.menu_id == menu_db.id,
            MenuItemDB.popular == True,
            MenuItemDB.available == True
        ).limit(limit)
        
        result = await db.execute(query)
        popular_items_db = result.scalars().all()
        
        # If we don't have enough, supplement with most ordered items
        if len(popular_items_db) < limit:
            # This would be a more complex query in a real implementation
            # For now, we'll just get additional available items
            remaining = limit - len(popular_items_db)
            
            # Get IDs of already selected items to exclude
            popular_ids = [item.id for item in popular_items_db]
            
            query = select(MenuItemDB).where(
                MenuItemDB.menu_id == menu_db.id,
                MenuItemDB.available == True,
                ~MenuItemDB.id.in_(popular_ids)
            ).limit(remaining)
            
            result = await db.execute(query)
            additional_items_db = result.scalars().all()
            
            popular_items_db.extend(additional_items_db)
        
        # Convert to Pydantic models
        popular_items = []
        for item_db in popular_items_db:
            item = await self._db_to_pydantic_menu_item(item_db)
            popular_items.append(item)
        
        # Store in cache
        await self._store_in_cache(cache_key, popular_items, ttl=3600)  # Cache for 1 hour
        
        return popular_items
    
    async def search_menu_items(self, 
                               restaurant_id: UUID, 
                               query_text: str,
                               db: AsyncSession = Depends(get_async_session)) -> List[MenuItem]:
        """Search for menu items by name, description, or tags"""
        # Find the active menu for this restaurant
        menu_query = select(MenuDB).where(
            MenuDB.restaurant_id == restaurant_id,
            MenuDB.active == True
        )
        result = await db.execute(menu_query)
        menu_db = result.scalars().first()
        
        if not menu_db:
            return []
        
        # Search for items
        search_term = f"%{query_text.lower()}%"
        
        item_query = select(MenuItemDB).where(
            MenuItemDB.menu_id == menu_db.id,
            MenuItemDB.available == True
        ).where(
            func.lower(MenuItemDB.name).like(search_term) |
            func.lower(MenuItemDB.description).like(search_term) |
            MenuItemDB.tags.contains([query_text.lower()])
        )
        
        result = await db.execute(item_query)
        item_dbs = result.scalars().all()
        
        # Convert to Pydantic models
        items = []
        for item_db in item_dbs:
            item = await self._db_to_pydantic_menu_item(item_db)
            items.append(item)
            
        return items
    
    async def filter_menu_items(self, 
                               restaurant_id: UUID,
                               category: Optional[str] = None,
                               min_price: Optional[float] = None,
                               max_price: Optional[float] = None,
                               allergens_exclude: Optional[List[str]] = None,
                               tags_include: Optional[List[str]] = None,
                               db: AsyncSession = Depends(get_async_session)) -> List[MenuItem]:
        """Filter menu items by various criteria"""
        # Find the active menu for this restaurant
        menu_query = select(MenuDB).where(
            MenuDB.restaurant_id == restaurant_id,
            MenuDB.active == True
        )
        result = await db.execute(menu_query)
        menu_db = result.scalars().first()
        
        if not menu_db:
            return []
        
        # Build query with filters
        query = select(MenuItemDB).where(
            MenuItemDB.menu_id == menu_db.id,
            MenuItemDB.available == True
        )
        
        if category:
            query = query.where(MenuItemDB.category == category)
        
        if min_price is not None:
            query = query.where(MenuItemDB.price >= min_price)
        
        if max_price is not None:
            query = query.where(MenuItemDB.price <= max_price)
        
        result = await db.execute(query)
        item_dbs = result.scalars().all()
        
        # Convert to Pydantic models and apply additional filters
        items = []
        for item_db in item_dbs:
            # Apply allergen exclusion filter
            if allergens_exclude:
                item_allergens = set(item_db.allergens or [])
                exclude_allergens = set(allergens_exclude)
                if item_allergens.intersection(exclude_allergens):
                    continue
            
            # Apply tag inclusion filter
            if tags_include:
                item_tags = set(item_db.tags or [])
                include_tags = set(tags_include)
                if not include_tags.issubset(item_tags):
                    continue
            
            item = await self._db_to_pydantic_menu_item(item_db)
            items.append(item)
            
        return items
    
    async def create_order(self, 
                          order: MenuOrder,
                          db: AsyncSession = Depends(get_async_session)) -> MenuOrder:
        """Create a new order from the menu"""
        # Convert Pydantic model to DB model
        order_db = MenuOrderDB(
            id=order.id,
            restaurant_id=order.restaurant_id,
            menu_id=order.menu_id,
            table_number=order.table_number,
            customer_name=order.customer_name,
            customer_phone=order.customer_phone,
            status=order.status.value,
            total_amount=order.total_amount,
            payment_method=order.payment_method,
            payment_status=order.payment_status,
            created_at=order.created_at,
            updated_at=order.updated_at
        )
        
        db.add(order_db)
        await db.commit()
        await db.refresh(order_db)
        
        # Add order items
        for item in order.items:
            item_db = MenuOrderItemDB(
                id=item.id,
                order_id=order.id,
                menu_item_id=item.menu_item_id,
                quantity=item.quantity,
                notes=item.notes,
                options=item.options,
                variant_id=item.variant_id,
                unit_price=item.unit_price,
                total_price=item.total_price
            )
            db.add(item_db)
        
        await db.commit()
        
        # Return the created order
        return order
    
    async def get_order(self, 
                       order_id: UUID,
                       db: AsyncSession = Depends(get_async_session)) -> Optional[MenuOrder]:
        """Get an order by ID"""
        query = select(MenuOrderDB).where(MenuOrderDB.id == order_id)
        result = await db.execute(query)
        order_db = result.scalars().first()
        
        if not order_db:
            return None
        
        # Get order items
        query = select(MenuOrderItemDB).where(MenuOrderItemDB.order_id == order_id)
        result = await db.execute(query)
        item_dbs = result.scalars().all()
        
        # Convert to Pydantic models
        items = []
        for item_db in item_dbs:
            item = MenuOrderItem(
                id=item_db.id,
                menu_item_id=item_db.menu_item_id,
                quantity=item_db.quantity,
                notes=item_db.notes,
                options=item_db.options,
                variant_id=item_db.variant_id,
                unit_price=item_db.unit_price,
                total_price=item_db.total_price
            )
            items.append(item)
        
        # Create order
        order = MenuOrder(
            id=order_db.id,
            restaurant_id=order_db.restaurant_id,
            menu_id=order_db.menu_id,
            table_number=order_db.table_number,
            customer_name=order_db.customer_name,
            customer_phone=order_db.customer_phone,
            items=items,
            status=MenuOrderStatus(order_db.status),
            total_amount=order_db.total_amount,
            payment_method=order_db.payment_method,
            payment_status=order_db.payment_status,
            created_at=order_db.created_at,
            updated_at=order_db.updated_at
        )
        
        return order
    
    async def update_order_status(self, 
                                 order_id: UUID, 
                                 status: MenuOrderStatus,
                                 db: AsyncSession = Depends(get_async_session)) -> Optional[MenuOrder]:
        """Update the status of an order"""
        query = select(MenuOrderDB).where(MenuOrderDB.id == order_id)
        result = await db.execute(query)
        order_db = result.scalars().first()
        
        if not order_db:
            return None
        
        # Update status
        order_db.status = status.value
        order_db.updated_at = datetime.now()
        
        await db.commit()
        await db.refresh(order_db)
        
        # Return updated order
        return await self.get_order(order_id, db)
    
    # Helper methods
    
    async def _db_to_pydantic_menu(self, menu_db, db) -> Menu:
        """Convert a DB menu model to a Pydantic model"""
        # Get categories
        query = select(MenuCategoryDB).where(MenuCategoryDB.menu_id == menu_db.id)
        result = await db.execute(query)
        category_dbs = result.scalars().all()
        
        categories = []
        for category_db in category_dbs:
            category = MenuCategory(
                id=category_db.id,
                name=category_db.name,
                description=category_db.description,
                image_url=category_db.image_url,
                items=category_db.items or [],
                order=category_db.order,
                available=category_db.available
            )
            categories.append(category)
        
        # Create menu
        menu = Menu(
            id=menu_db.id,
            restaurant_id=menu_db.restaurant_id,
            name=menu_db.name,
            description=menu_db.description,
            categories=categories,
            theme=menu_db.theme,
            active=menu_db.active,
            available_from=menu_db.available_from,
            available_to=menu_db.available_to,
            created_at=menu_db.created_at,
            updated_at=menu_db.updated_at,
            metadata=menu_db.metadata or {}
        )
        
        return menu
    
    async def _db_to_pydantic_menu_item(self, item_db) -> MenuItem:
        """Convert a DB menu item model to a Pydantic model"""
        from ..models.menu_models import MenuItemNutrition, MenuItemOption, MenuItemVariant
        
        # Convert nutrition
        nutrition = None
        if item_db.nutrition:
            nutrition = MenuItemNutrition(**item_db.nutrition)
        
        # Convert options
        options = []
        if item_db.options:
            for option_data in item_db.options:
                option = MenuItemOption(**option_data)
                options.append(option)
        
        # Convert variants
        variants = []
        if item_db.variants:
            for variant_data in item_db.variants:
                variant = MenuItemVariant(**variant_data)
                variants.append(variant)
        
        # Create item
        item = MenuItem(
            id=item_db.id,
            name=item_db.name,
            description=item_db.description,
            price=item_db.price,
            image_url=item_db.image_url,
            category=MenuItemCategory(item_db.category),
            tags=item_db.tags or [],
            allergens=[MenuItemAllergen(a) for a in (item_db.allergens or [])],
            nutrition=nutrition,
            options=options,
            variants=variants,
            available=item_db.available,
            popular=item_db.popular,
            featured=item_db.featured,
            created_at=item_db.created_at,
            updated_at=item_db.updated_at,
            product_id=item_db.product_id
        )
        
        return item
    
    async def _update_menu_category(self, menu_id, item, db):
        """Update menu categories when adding or updating an item"""
        # Get categories for this menu
        query = select(MenuCategoryDB).where(MenuCategoryDB.menu_id == menu_id)
        result = await db.execute(query)
        categories = result.scalars().all()
        
        # Find category matching the item's category
        category_exists = False
        for category in categories:
            if category.name == item.category.value:
                # Ensure items list exists
                if not category.items:
                    category.items = []
                
                # Add item if not already in the list
                if item.id not in category.items:
                    category.items.append(item.id)
                
                category_exists = True
                break
        
        # If category doesn't exist, create it
        if not category_exists:
            new_category = MenuCategoryDB(
                menu_id=menu_id,
                name=item.category.value,
                items=[item.id],
                order=len(categories)
            )
            db.add(new_category)
        
        await db.commit()
    
    async def _get_from_cache(self, key: str) -> Optional[Any]:
        """Get data from Redis cache"""
        if not self.redis_client:
            return None
        
        try:
            data = self.redis_client.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            print(f"Cache error: {e}")
        
        return None
    
    async def _store_in_cache(self, key: str, data: Any, ttl: int = None) -> bool:
        """Store data in Redis cache"""
        if not self.redis_client:
            return False
        
        try:
            json_data = json.dumps(data)
            self.redis_client.set(key, json_data, ex=ttl or self.cache_ttl)
            return True
        except Exception as e:
            print(f"Cache error: {e}")
        
        return False
    
    async def _invalidate_menu_cache(self, restaurant_id: UUID) -> bool:
        """Invalidate all cache entries for a restaurant's menu"""
        if not self.redis_client:
            return False
        
        try:
            # Delete public menu cache
            self.redis_client.delete(f"menu:public:{restaurant_id}")
            
            # Delete popular items cache (with any limit)
            pattern = f"menu:popular:{restaurant_id}:*"
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
            
            return True
        except Exception as e:
            print(f"Cache invalidation error: {e}")
        
        return False
