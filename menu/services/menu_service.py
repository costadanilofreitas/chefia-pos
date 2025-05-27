from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
import asyncio
from ..models.menu_models import Menu, MenuItem, MenuCategory, QRCodeConfig

class MenuService:
    """Service for managing menus and menu items"""
    
    def __init__(self):
        # In a real implementation, this would connect to a database
        # For now, we'll use in-memory storage
        self.menus = {}
        self.menu_items = {}
    
    async def get_all_menus(self, restaurant_id: Optional[UUID] = None, active: Optional[bool] = None) -> List[Menu]:
        """Get all menus with optional filtering"""
        menus = list(self.menus.values())
        
        if restaurant_id:
            menus = [menu for menu in menus if menu.restaurant_id == restaurant_id]
        
        if active is not None:
            menus = [menu for menu in menus if menu.active == active]
            
        return menus
    
    async def get_menu_by_id(self, menu_id: UUID) -> Optional[Menu]:
        """Get a specific menu by ID"""
        return self.menus.get(menu_id)
    
    async def create_menu(self, menu: Menu) -> Menu:
        """Create a new menu"""
        self.menus[menu.id] = menu
        return menu
    
    async def update_menu(self, menu_id: UUID, menu_data: Menu) -> Optional[Menu]:
        """Update an existing menu"""
        if menu_id not in self.menus:
            return None
        
        menu_data.id = menu_id  # Ensure ID doesn't change
        menu_data.updated_at = datetime.now()
        self.menus[menu_id] = menu_data
        return menu_data
    
    async def delete_menu(self, menu_id: UUID) -> bool:
        """Delete a menu"""
        if menu_id not in self.menus:
            return False
        
        del self.menus[menu_id]
        # Also delete all menu items associated with this menu
        self.menu_items = {k: v for k, v in self.menu_items.items() if k[0] != menu_id}
        return True
    
    async def get_menu_items(self, menu_id: UUID, category: Optional[str] = None) -> List[MenuItem]:
        """Get all items in a menu with optional category filtering"""
        items = [item for (mid, _), item in self.menu_items.items() if mid == menu_id]
        
        if category:
            items = [item for item in items if item.category.value == category]
            
        return items
    
    async def get_menu_item(self, menu_id: UUID, item_id: UUID) -> Optional[MenuItem]:
        """Get a specific menu item"""
        return self.menu_items.get((menu_id, item_id))
    
    async def add_menu_item(self, menu_id: UUID, item: MenuItem) -> MenuItem:
        """Add a new item to a menu"""
        if menu_id not in self.menus:
            raise ValueError("Menu not found")
        
        self.menu_items[(menu_id, item.id)] = item
        
        # Update the menu's categories if needed
        menu = self.menus[menu_id]
        category_exists = False
        
        for category in menu.categories:
            if category.name == item.category.value:
                if item.id not in category.items:
                    category.items.append(item.id)
                category_exists = True
                break
        
        if not category_exists:
            # Create a new category
            new_category = MenuCategory(
                name=item.category.value,
                items=[item.id],
                order=len(menu.categories)
            )
            menu.categories.append(new_category)
        
        menu.updated_at = datetime.now()
        return item
    
    async def update_menu_item(self, menu_id: UUID, item_id: UUID, item_data: MenuItem) -> Optional[MenuItem]:
        """Update an existing menu item"""
        if (menu_id, item_id) not in self.menu_items:
            return None
        
        item_data.id = item_id  # Ensure ID doesn't change
        item_data.updated_at = datetime.now()
        self.menu_items[(menu_id, item_id)] = item_data
        
        # Update the menu's updated_at timestamp
        if menu_id in self.menus:
            self.menus[menu_id].updated_at = datetime.now()
            
        return item_data
    
    async def delete_menu_item(self, menu_id: UUID, item_id: UUID) -> bool:
        """Delete a menu item"""
        if (menu_id, item_id) not in self.menu_items:
            return False
        
        del self.menu_items[(menu_id, item_id)]
        
        # Remove the item from any categories
        if menu_id in self.menus:
            menu = self.menus[menu_id]
            for category in menu.categories:
                if item_id in category.items:
                    category.items.remove(item_id)
            menu.updated_at = datetime.now()
            
        return True
    
    async def get_public_menu(self, restaurant_id: UUID) -> Optional[Dict[str, Any]]:
        """Get the public menu for a restaurant (accessible via QR code)"""
        # Find the active menu for this restaurant
        menus = await self.get_all_menus(restaurant_id=restaurant_id, active=True)
        if not menus:
            return None
        
        # Use the first active menu (in a real implementation, we might have logic to select the appropriate menu)
        menu = menus[0]
        
        # Get all items for this menu
        items = await self.get_menu_items(menu.id)
        
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
            "theme": menu.theme.dict(),
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
        
        return public_menu
