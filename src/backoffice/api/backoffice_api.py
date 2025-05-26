from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import uuid
from datetime import datetime

from ..models.backoffice_models import (
    Brand, BrandCreate, BrandUpdate,
    Restaurant, RestaurantCreate, RestaurantUpdate,
    BackofficeUser, BackofficeUserCreate, BackofficeUserUpdate,
    UserRole, Permission, ReportRequest, ReportResponse, DashboardMetrics
)
from ..auth.auth_service import (
    get_current_active_user, require_permission, require_role,
    require_brand_access, require_restaurant_access
)
from ..services.backoffice_service import BackofficeService

# Create router
router = APIRouter(
    prefix="/api/backoffice",
    tags=["backoffice"],
    responses={404: {"description": "Not found"}}
)

# Dependency to get backoffice service
async def get_backoffice_service():
    # In a real application, this would include database connection and other dependencies
    return BackofficeService()

# === Authentication Endpoints ===
@router.post("/auth/token", response_model=dict)
async def login_for_access_token(
    form_data: dict,
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """Login to get an access token."""
    return await backoffice_service.authenticate_user(form_data.get("username"), form_data.get("password"))

# === User Management Endpoints ===
@router.post("/users", response_model=BackofficeUser)
async def create_user(
    user_create: BackofficeUserCreate,
    current_user: BackofficeUser = Depends(require_permission(Permission.MANAGE_USERS)),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """Create a new backoffice user."""
    return await backoffice_service.create_user(user_create, current_user)

@router.get("/users", response_model=List[BackofficeUser])
async def list_users(
    role: Optional[UserRole] = None,
    brand_id: Optional[uuid.UUID] = None,
    is_active: Optional[bool] = None,
    current_user: BackofficeUser = Depends(require_permission(Permission.VIEW_USERS)),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """List backoffice users with optional filtering."""
    return await backoffice_service.list_users(role, brand_id, is_active, current_user)

@router.get("/users/{user_id}", response_model=BackofficeUser)
async def get_user(
    user_id: uuid.UUID,
    current_user: BackofficeUser = Depends(require_permission(Permission.VIEW_USERS)),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """Get a specific backoffice user."""
    user = await backoffice_service.get_user(user_id, current_user)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    return user

@router.put("/users/{user_id}", response_model=BackofficeUser)
async def update_user(
    user_id: uuid.UUID,
    user_update: BackofficeUserUpdate,
    current_user: BackofficeUser = Depends(require_permission(Permission.MANAGE_USERS)),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """Update a backoffice user."""
    updated_user = await backoffice_service.update_user(user_id, user_update, current_user)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    return updated_user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    current_user: BackofficeUser = Depends(require_permission(Permission.MANAGE_USERS)),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """Delete a backoffice user (deactivate)."""
    success = await backoffice_service.delete_user(user_id, current_user)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    return None

# === Brand Management Endpoints ===
@router.post("/brands", response_model=Brand)
async def create_brand(
    brand_create: BrandCreate,
    current_user: BackofficeUser = Depends(require_permission(Permission.MANAGE_BRANDS)),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """Create a new brand."""
    return await backoffice_service.create_brand(brand_create, current_user)

@router.get("/brands", response_model=List[Brand])
async def list_brands(
    is_active: Optional[bool] = None,
    current_user: BackofficeUser = Depends(require_permission(Permission.VIEW_BRANDS)),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """List brands with optional filtering."""
    return await backoffice_service.list_brands(is_active, current_user)

@router.get("/brands/{brand_id}", response_model=Brand)
async def get_brand(
    brand_id: uuid.UUID,
    current_user: BackofficeUser = Depends(require_permission(Permission.VIEW_BRANDS)),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """Get a specific brand."""
    # Check if user has access to this brand
    if not await backoffice_service.has_brand_access(current_user, brand_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this brand"
        )
    
    brand = await backoffice_service.get_brand(brand_id)
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand with ID {brand_id} not found"
        )
    return brand

@router.put("/brands/{brand_id}", response_model=Brand)
async def update_brand(
    brand_id: uuid.UUID,
    brand_update: BrandUpdate,
    current_user: BackofficeUser = Depends(require_permission(Permission.MANAGE_BRANDS)),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """Update a brand."""
    # Check if user has access to this brand
    if not await backoffice_service.has_brand_access(current_user, brand_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this brand"
        )
    
    updated_brand = await backoffice_service.update_brand(brand_id, brand_update, current_user)
    if not updated_brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand with ID {brand_id} not found"
        )
    return updated_brand

@router.delete("/brands/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand(
    brand_id: uuid.UUID,
    current_user: BackofficeUser = Depends(require_permission(Permission.MANAGE_BRANDS)),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """Delete a brand (deactivate)."""
    # Check if user has access to this brand
    if not await backoffice_service.has_brand_access(current_user, brand_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this brand"
        )
    
    success = await backoffice_service.delete_brand(brand_id, current_user)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand with ID {brand_id} not found"
        )
    return None

# === Restaurant Management Endpoints ===
@router.post("/restaurants", response_model=Restaurant)
async def create_restaurant(
    restaurant_create: RestaurantCreate,
    current_user: BackofficeUser = Depends(require_permission(Permission.MANAGE_RESTAURANTS)),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """Create a new restaurant."""
    # Check if user has access to the brand
    if not await backoffice_service.has_brand_access(current_user, restaurant_create.brand_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this brand"
        )
    
    return await backoffice_service.create_restaurant(restaurant_create, current_user)

@router.get("/restaurants", response_model=List[Restaurant])
async def list_restaurants(
    brand_id: Optional[uuid.UUID] = None,
    is_active: Optional[bool] = None,
    current_user: BackofficeUser = Depends(require_permission(Permission.VIEW_RESTAURANTS)),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """List restaurants with optional filtering."""
    # If brand_id is provided, check if user has access to it
    if brand_id and not await backoffice_service.has_brand_access(current_user, brand_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this brand"
        )
    
    return await backoffice_service.list_restaurants(brand_id, is_active, current_user)

@router.get("/restaurants/{restaurant_id}", response_model=Restaurant)
async def get_restaurant(
    restaurant_id: uuid.UUID,
    current_user: BackofficeUser = Depends(require_permission(Permission.VIEW_RESTAURANTS)),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """Get a specific restaurant."""
    # Check if user has access to this restaurant
    if not await backoffice_service.has_restaurant_access(current_user, restaurant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this restaurant"
        )
    
    restaurant = await backoffice_service.get_restaurant(restaurant_id)
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Restaurant with ID {restaurant_id} not found"
        )
    return restaurant

@router.put("/restaurants/{restaurant_id}", response_model=Restaurant)
async def update_restaurant(
    restaurant_id: uuid.UUID,
    restaurant_update: RestaurantUpdate,
    current_user: BackofficeUser = Depends(require_permission(Permission.MANAGE_RESTAURANTS)),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """Update a restaurant."""
    # Check if user has access to this restaurant
    if not await backoffice_service.has_restaurant_access(current_user, restaurant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this restaurant"
        )
    
    # If brand_id is being updated, check if user has access to the new brand
    if restaurant_update.brand_id and not await backoffice_service.has_brand_access(current_user, restaurant_update.brand_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access the target brand"
        )
    
    updated_restaurant = await backoffice_service.update_restaurant(restaurant_id, restaurant_update, current_user)
    if not updated_restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Restaurant with ID {restaurant_id} not found"
        )
    return updated_restaurant

@router.delete("/restaurants/{restaurant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_restaurant(
    restaurant_id: uuid.UUID,
    current_user: BackofficeUser = Depends(require_permission(Permission.MANAGE_RESTAURANTS)),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """Delete a restaurant (deactivate)."""
    # Check if user has access to this restaurant
    if not await backoffice_service.has_restaurant_access(current_user, restaurant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this restaurant"
        )
    
    success = await backoffice_service.delete_restaurant(restaurant_id, current_user)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Restaurant with ID {restaurant_id} not found"
        )
    return None

# === Report Endpoints ===
@router.post("/reports", response_model=ReportResponse)
async def generate_report(
    report_request: ReportRequest,
    current_user: BackofficeUser = Depends(get_current_active_user),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """Generate a report."""
    # Check permissions based on report type
    if report_request.report_type == "sales" and not await backoffice_service.has_permission(current_user, Permission.VIEW_SALES_REPORTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view sales reports"
        )
    elif report_request.report_type == "inventory" and not await backoffice_service.has_permission(current_user, Permission.VIEW_INVENTORY_REPORTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view inventory reports"
        )
    elif report_request.report_type == "financial" and not await backoffice_service.has_permission(current_user, Permission.VIEW_FINANCIAL_REPORTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view financial reports"
        )
    
    # Check brand access if brand_id is provided
    if report_request.brand_id and not await backoffice_service.has_brand_access(current_user, report_request.brand_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this brand"
        )
    
    # Check restaurant access if restaurant_ids are provided
    if report_request.restaurant_ids:
        for restaurant_id in report_request.restaurant_ids:
            if not await backoffice_service.has_restaurant_access(current_user, restaurant_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Not authorized to access restaurant {restaurant_id}"
                )
    
    return await backoffice_service.generate_report(report_request, current_user)

@router.get("/reports/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: uuid.UUID,
    current_user: BackofficeUser = Depends(get_current_active_user),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """Get a specific report."""
    report = await backoffice_service.get_report(report_id, current_user)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID {report_id} not found"
        )
    return report

# === Dashboard Endpoints ===
@router.get("/dashboard", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    restaurant_id: Optional[uuid.UUID] = None,
    brand_id: Optional[uuid.UUID] = None,
    current_user: BackofficeUser = Depends(get_current_active_user),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """Get dashboard metrics."""
    # Check brand access if brand_id is provided
    if brand_id and not await backoffice_service.has_brand_access(current_user, brand_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this brand"
        )
    
    # Check restaurant access if restaurant_id is provided
    if restaurant_id and not await backoffice_service.has_restaurant_access(current_user, restaurant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this restaurant"
        )
    
    return await backoffice_service.get_dashboard_metrics(restaurant_id, brand_id, current_user)

# === System Status Endpoints ===
@router.get("/system/status")
async def get_system_status(
    current_user: BackofficeUser = Depends(require_permission(Permission.VIEW_SYSTEM_STATUS)),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """Get system status."""
    return await backoffice_service.get_system_status(current_user)

@router.get("/system/logs")
async def get_system_logs(
    module: Optional[str] = None,
    level: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    current_user: BackofficeUser = Depends(require_permission(Permission.VIEW_LOGS)),
    backoffice_service: BackofficeService = Depends(get_backoffice_service)
):
    """Get system logs."""
    return await backoffice_service.get_system_logs(module, level, start_date, end_date, limit, current_user)
