from fastapi import APIRouter, Depends, HTTPException, Query, Path
from typing import List, Optional
from uuid import UUID
from ..models.menu_models import Menu, MenuItem, MenuCategory, QRCodeConfig
from ..services.menu_service import MenuService
from ..services.qrcode_service import QRCodeService

router = APIRouter(prefix="/api/menu", tags=["menu"])
menu_service = MenuService()
qrcode_service = QRCodeService()

# Menu endpoints
@router.get("/", response_model=List[Menu])
async def get_all_menus(
    restaurant_id: Optional[UUID] = Query(None, description="Filter by restaurant ID"),
    active: Optional[bool] = Query(None, description="Filter by active status")
):
    """Get all menus with optional filtering"""
    return await menu_service.get_all_menus(restaurant_id=restaurant_id, active=active)

@router.get("/{menu_id}", response_model=Menu)
async def get_menu(
    menu_id: UUID = Path(..., description="The ID of the menu to retrieve")
):
    """Get a specific menu by ID"""
    menu = await menu_service.get_menu_by_id(menu_id)
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    return menu

@router.post("/", response_model=Menu)
async def create_menu(menu: Menu):
    """Create a new menu"""
    return await menu_service.create_menu(menu)

@router.put("/{menu_id}", response_model=Menu)
async def update_menu(
    menu_id: UUID = Path(..., description="The ID of the menu to update"),
    menu_data: Menu = None
):
    """Update an existing menu"""
    updated_menu = await menu_service.update_menu(menu_id, menu_data)
    if not updated_menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    return updated_menu

@router.delete("/{menu_id}")
async def delete_menu(
    menu_id: UUID = Path(..., description="The ID of the menu to delete")
):
    """Delete a menu"""
    success = await menu_service.delete_menu(menu_id)
    if not success:
        raise HTTPException(status_code=404, detail="Menu not found")
    return {"message": "Menu deleted successfully"}

# Menu items endpoints
@router.get("/{menu_id}/items", response_model=List[MenuItem])
async def get_menu_items(
    menu_id: UUID = Path(..., description="The ID of the menu"),
    category: Optional[str] = Query(None, description="Filter by category")
):
    """Get all items in a menu with optional category filtering"""
    items = await menu_service.get_menu_items(menu_id, category=category)
    return items

@router.get("/{menu_id}/items/{item_id}", response_model=MenuItem)
async def get_menu_item(
    menu_id: UUID = Path(..., description="The ID of the menu"),
    item_id: UUID = Path(..., description="The ID of the menu item")
):
    """Get a specific menu item"""
    item = await menu_service.get_menu_item(menu_id, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return item

@router.post("/{menu_id}/items", response_model=MenuItem)
async def add_menu_item(
    menu_id: UUID = Path(..., description="The ID of the menu"),
    item: MenuItem = None
):
    """Add a new item to a menu"""
    return await menu_service.add_menu_item(menu_id, item)

@router.put("/{menu_id}/items/{item_id}", response_model=MenuItem)
async def update_menu_item(
    menu_id: UUID = Path(..., description="The ID of the menu"),
    item_id: UUID = Path(..., description="The ID of the menu item"),
    item_data: MenuItem = None
):
    """Update an existing menu item"""
    updated_item = await menu_service.update_menu_item(menu_id, item_id, item_data)
    if not updated_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return updated_item

@router.delete("/{menu_id}/items/{item_id}")
async def delete_menu_item(
    menu_id: UUID = Path(..., description="The ID of the menu"),
    item_id: UUID = Path(..., description="The ID of the menu item")
):
    """Delete a menu item"""
    success = await menu_service.delete_menu_item(menu_id, item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted successfully"}

# QR Code endpoints
@router.get("/qrcode/{restaurant_id}", response_model=List[QRCodeConfig])
async def get_qrcodes(
    restaurant_id: UUID = Path(..., description="The ID of the restaurant")
):
    """Get all QR codes for a restaurant"""
    return await qrcode_service.get_qrcodes_by_restaurant(restaurant_id)

@router.post("/qrcode", response_model=QRCodeConfig)
async def create_qrcode(qrcode_config: QRCodeConfig):
    """Create a new QR code configuration"""
    return await qrcode_service.create_qrcode(qrcode_config)

@router.get("/qrcode/{qrcode_id}/image")
async def get_qrcode_image(
    qrcode_id: UUID = Path(..., description="The ID of the QR code configuration")
):
    """Generate and return a QR code image"""
    qrcode_image = await qrcode_service.generate_qrcode_image(qrcode_id)
    if not qrcode_image:
        raise HTTPException(status_code=404, detail="QR code configuration not found")
    return qrcode_image

@router.get("/public/{restaurant_id}")
async def get_public_menu(
    restaurant_id: UUID = Path(..., description="The ID of the restaurant")
):
    """Get the public menu for a restaurant (accessible via QR code)"""
    menu = await menu_service.get_public_menu(restaurant_id)
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found or not active")
    return menu
