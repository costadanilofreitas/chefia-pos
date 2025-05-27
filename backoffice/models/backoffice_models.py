from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
from enum import Enum

class UserRole(str, Enum):
    """Enum for user roles in the backoffice."""
    ADMIN = "admin"
    MANAGER = "manager"
    ACCOUNTANT = "accountant"
    OPERATOR = "operator"
    VIEWER = "viewer"

class Permission(str, Enum):
    """Enum for permissions in the backoffice."""
    # User management
    MANAGE_USERS = "manage_users"
    VIEW_USERS = "view_users"
    
    # Restaurant management
    MANAGE_RESTAURANTS = "manage_restaurants"
    VIEW_RESTAURANTS = "view_restaurants"
    
    # Brand management
    MANAGE_BRANDS = "manage_brands"
    VIEW_BRANDS = "view_brands"
    
    # Reports
    VIEW_SALES_REPORTS = "view_sales_reports"
    VIEW_INVENTORY_REPORTS = "view_inventory_reports"
    VIEW_FINANCIAL_REPORTS = "view_financial_reports"
    EXPORT_REPORTS = "export_reports"
    
    # Configuration
    MANAGE_SYSTEM_CONFIG = "manage_system_config"
    MANAGE_RESTAURANT_CONFIG = "manage_restaurant_config"
    
    # Operations
    APPROVE_INVENTORY_TRANSACTIONS = "approve_inventory_transactions"
    MANAGE_MENU = "manage_menu"
    MANAGE_PROMOTIONS = "manage_promotions"
    
    # Monitoring
    VIEW_SYSTEM_STATUS = "view_system_status"
    VIEW_LOGS = "view_logs"

class BackofficeUser(BaseModel):
    """Model for a backoffice user."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    username: str
    email: str
    full_name: str
    role: UserRole
    permissions: List[Permission]
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    brand_id: Optional[uuid.UUID] = None  # If user is restricted to a specific brand
    restaurant_ids: List[uuid.UUID] = []  # If user is restricted to specific restaurants

class BackofficeUserCreate(BaseModel):
    """Model for creating a backoffice user."""
    username: str
    email: str
    password: str
    full_name: str
    role: UserRole
    permissions: Optional[List[Permission]] = None
    brand_id: Optional[uuid.UUID] = None
    restaurant_ids: Optional[List[uuid.UUID]] = None

class BackofficeUserUpdate(BaseModel):
    """Model for updating a backoffice user."""
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    permissions: Optional[List[Permission]] = None
    is_active: Optional[bool] = None
    brand_id: Optional[uuid.UUID] = None
    restaurant_ids: Optional[List[uuid.UUID]] = None

class Brand(BaseModel):
    """Model for a brand in the system."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    name: str
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    config: Dict[str, Any] = {}  # Brand-specific configuration

class BrandCreate(BaseModel):
    """Model for creating a brand."""
    name: str
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

class BrandUpdate(BaseModel):
    """Model for updating a brand."""
    name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    is_active: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None

class Restaurant(BaseModel):
    """Model for a restaurant in the system."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    brand_id: uuid.UUID
    name: str
    address: str
    city: str
    state: str
    postal_code: str
    country: str
    phone: str
    email: Optional[str] = None
    manager_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    config: Dict[str, Any] = {}  # Restaurant-specific configuration

class RestaurantCreate(BaseModel):
    """Model for creating a restaurant."""
    brand_id: uuid.UUID
    name: str
    address: str
    city: str
    state: str
    postal_code: str
    country: str
    phone: str
    email: Optional[str] = None
    manager_name: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

class RestaurantUpdate(BaseModel):
    """Model for updating a restaurant."""
    brand_id: Optional[uuid.UUID] = None
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    manager_name: Optional[str] = None
    is_active: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None

class ReportType(str, Enum):
    """Enum for report types."""
    SALES = "sales"
    INVENTORY = "inventory"
    FINANCIAL = "financial"
    EMPLOYEE = "employee"
    CUSTOMER = "customer"
    CUSTOM = "custom"

class ReportFormat(str, Enum):
    """Enum for report formats."""
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"
    JSON = "json"

class ReportRequest(BaseModel):
    """Model for requesting a report."""
    report_type: ReportType
    start_date: datetime
    end_date: datetime
    restaurant_ids: Optional[List[uuid.UUID]] = None
    brand_id: Optional[uuid.UUID] = None
    format: ReportFormat = ReportFormat.PDF
    filters: Dict[str, Any] = {}
    grouping: Optional[List[str]] = None

class ReportResponse(BaseModel):
    """Model for a report response."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    report_type: ReportType
    start_date: datetime
    end_date: datetime
    restaurant_ids: Optional[List[uuid.UUID]] = None
    brand_id: Optional[uuid.UUID] = None
    format: ReportFormat
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: uuid.UUID
    file_url: str
    status: str = "completed"
    error_message: Optional[str] = None

class DashboardMetrics(BaseModel):
    """Model for dashboard metrics."""
    sales_today: float
    sales_week: float
    sales_month: float
    sales_growth: float  # Percentage growth compared to previous period
    active_orders: int
    completed_orders_today: int
    average_order_value: float
    top_selling_products: List[Dict[str, Any]]
    inventory_alerts: List[Dict[str, Any]]
    recent_activities: List[Dict[str, Any]]
