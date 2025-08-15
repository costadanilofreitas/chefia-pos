from fastapi import APIRouter, Body, Depends, HTTPException, Query, Path, Request
from typing import List, Optional, Dict, Any
from uuid import UUID
from ..models.menu_models import Menu, MenuItem, MenuCategory, QRCodeConfig
from ..models.menu_order_models import MenuOrder, MenuOrderStatus
from ..models.menu_cache_models import MenuAccess
from ..services.menu_service_extended import MenuServiceExtended
from ..services.qrcode_service import QRCodeService
from sqlalchemy.ext.asyncio import AsyncSession
from ..database.session import get_async_session

router = APIRouter(prefix="/api/menu", tags=["menu"])
menu_service = MenuServiceExtended()
qrcode_service = QRCodeService()

# Menu endpoints
@router.get("/", response_model=List[Menu])
async def get_all_menus(
    restaurant_id: Optional[UUID] = Query(None, description="Filter by restaurant ID"),
    active: Optional[bool] = Query(None, description="Filter by active status"),
    db: AsyncSession = Depends(get_async_session)
):
    """Get all menus with optional filtering"""
    return await menu_service.get_all_menus(restaurant_id=restaurant_id, active=active, db=db)

@router.get("/{menu_id}", response_model=Menu)
async def get_menu(
    menu_id: UUID = Path(..., description="The ID of the menu to retrieve"),
    db: AsyncSession = Depends(get_async_session)
):
    """Get a specific menu by ID"""
    menu = await menu_service.get_menu_by_id(menu_id, db=db)
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    return menu

@router.post("/", response_model=Menu)
async def create_menu(
    menu: Menu,
    db: AsyncSession = Depends(get_async_session)
):
    """Create a new menu"""
    return await menu_service.create_menu(menu, db=db)

@router.put("/{menu_id}", response_model=Menu)
async def update_menu(
    menu_id: UUID = Path(..., description="The ID of the menu to update"),
    menu_data: Menu = None,
    db: AsyncSession = Depends(get_async_session)
):
    """Update an existing menu"""
    updated_menu = await menu_service.update_menu(menu_id, menu_data, db=db)
    if not updated_menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    return updated_menu

@router.delete("/{menu_id}")
async def delete_menu(
    menu_id: UUID = Path(..., description="The ID of the menu to delete"),
    db: AsyncSession = Depends(get_async_session)
):
    """Delete a menu"""
    success = await menu_service.delete_menu(menu_id, db=db)
    if not success:
        raise HTTPException(status_code=404, detail="Menu not found")
    return {"message": "Menu deleted successfully"}

# Menu items endpoints
@router.get("/{menu_id}/items", response_model=List[MenuItem])
async def get_menu_items(
    menu_id: UUID = Path(..., description="The ID of the menu"),
    category: Optional[str] = Query(None, description="Filter by category"),
    db: AsyncSession = Depends(get_async_session)
):
    """Get all items in a menu with optional category filtering"""
    items = await menu_service.get_menu_items(menu_id, category=category, db=db)
    return items

@router.get("/{menu_id}/items/{item_id}", response_model=MenuItem)
async def get_menu_item(
    menu_id: UUID = Path(..., description="The ID of the menu"),
    item_id: UUID = Path(..., description="The ID of the menu item"),
    db: AsyncSession = Depends(get_async_session)
):
    """Get a specific menu item"""
    item = await menu_service.get_menu_item(menu_id, item_id, db=db)
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return item

@router.post("/{menu_id}/items", response_model=MenuItem)
async def add_menu_item(
    menu_id: UUID = Path(..., description="The ID of the menu"),
    item: MenuItem = None,
    db: AsyncSession = Depends(get_async_session)
):
    """Add a new item to a menu"""
    return await menu_service.add_menu_item(menu_id, item, db=db)

@router.put("/{menu_id}/items/{item_id}", response_model=MenuItem)
async def update_menu_item(
    menu_id: UUID = Path(..., description="The ID of the menu"),
    item_id: UUID = Path(..., description="The ID of the menu item"),
    item_data: MenuItem = None,
    db: AsyncSession = Depends(get_async_session)
):
    """Update an existing menu item"""
    updated_item = await menu_service.update_menu_item(menu_id, item_id, item_data, db=db)
    if not updated_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return updated_item

@router.delete("/{menu_id}/items/{item_id}")
async def delete_menu_item(
    menu_id: UUID = Path(..., description="The ID of the menu"),
    item_id: UUID = Path(..., description="The ID of the menu item"),
    db: AsyncSession = Depends(get_async_session)
):
    """Delete a menu item"""
    success = await menu_service.delete_menu_item(menu_id, item_id, db=db)
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

@router.post("/qrcode/access")
async def record_qrcode_access(
    access: MenuAccess,
    db: AsyncSession = Depends(get_async_session)
):
    """Record an access to a QR code menu"""
    # In a real implementation, this would save to the database
    return access

@router.get("/qrcode/{qrcode_id}/stats")
async def get_qrcode_stats(
    qrcode_id: UUID = Path(..., description="The ID of the QR code configuration"),
    start_date: Optional[str] = Query(None, description="Start date for stats (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date for stats (YYYY-MM-DD)")
):
    """Get access statistics for a QR code"""
    # In a real implementation, this would query the database
    return {
        "qrcode_id": str(qrcode_id),
        "total_scans": 0,
        "unique_devices": 0,
        "period": {
            "start": start_date,
            "end": end_date
        }
    }

# Public menu endpoints
@router.get("/public/{restaurant_id}")
async def get_public_menu(
    restaurant_id: UUID = Path(..., description="The ID of the restaurant"),
    db: AsyncSession = Depends(get_async_session)
):
    """Get the public menu for a restaurant (accessible via QR code)"""
    menu = await menu_service.get_public_menu(restaurant_id, db=db)
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found or not active")
    return menu

@router.get("/public/{restaurant_id}/popular", response_model=List[MenuItem])
async def get_popular_items(
    restaurant_id: UUID = Path(..., description="The ID of the restaurant"),
    limit: int = Query(10, description="Maximum number of items to return"),
    db: AsyncSession = Depends(get_async_session)
):
    """Get popular items for a restaurant"""
    items = await menu_service.get_popular_items(restaurant_id, limit=limit, db=db)
    return items

@router.get("/public/{restaurant_id}/search", response_model=List[MenuItem])
async def search_menu_items(
    restaurant_id: UUID = Path(..., description="The ID of the restaurant"),
    q: str = Query(..., description="Search query"),
    db: AsyncSession = Depends(get_async_session)
):
    """Search for menu items by name, description, or tags"""
    items = await menu_service.search_menu_items(restaurant_id, q, db=db)
    return items

@router.get("/public/{restaurant_id}/filter", response_model=List[MenuItem])
async def filter_menu_items(
    restaurant_id: UUID = Path(..., description="The ID of the restaurant"),
    category: Optional[str] = Query(None, description="Filter by category"),
    min_price: Optional[float] = Query(None, description="Minimum price"),
    max_price: Optional[float] = Query(None, description="Maximum price"),
    allergens_exclude: Optional[List[str]] = Query(None, description="Allergens to exclude"),
    tags_include: Optional[List[str]] = Query(None, description="Tags to include"),
    db: AsyncSession = Depends(get_async_session)
):
    """Filter menu items by various criteria"""
    items = await menu_service.filter_menu_items(
        restaurant_id, 
        category=category,
        min_price=min_price,
        max_price=max_price,
        allergens_exclude=allergens_exclude,
        tags_include=tags_include,
        db=db
    )
    return items

# Order endpoints
@router.post("/orders", response_model=MenuOrder)
async def create_order(
    order: MenuOrder,
    db: AsyncSession = Depends(get_async_session)
):
    """Create a new order from the menu"""
    return await menu_service.create_order(order, db=db)

@router.get("/orders/{order_id}", response_model=MenuOrder)
async def get_order(
    order_id: UUID = Path(..., description="The ID of the order"),
    db: AsyncSession = Depends(get_async_session)
):
    """Get an order by ID"""
    order = await menu_service.get_order(order_id, db=db)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.put("/orders/{order_id}/status", response_model=MenuOrder)
async def update_order_status(
    order_id: UUID = Path(..., description="The ID of the order"),
    status: MenuOrderStatus = Body(..., description="The new status for the order"),
    db: AsyncSession = Depends(get_async_session)
):
    """Update the status of an order"""
    updated_order = await menu_service.update_order_status(order_id, status, db=db)
    if not updated_order:
        raise HTTPException(status_code=404, detail="Order not found")
    return updated_order
