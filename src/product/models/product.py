# Updating the Order model to support coupon and points redemption

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
import uuid
from enum import Enum

# Existing models (assuming these are already defined)
class OrderItemCustomization(BaseModel):
    name: str
    price_adjustment: float = 0.0

class OrderItemSection(BaseModel):
    section_id: str
    product_id: str

class OrderStatus(str, Enum):
    PENDING = "PENDING"
    PREPARING = "PREPARING"
    READY = "READY"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    DELIVERING = "DELIVERING"  # Added for remote orders integration

class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    REFUNDED = "REFUNDED"
    CANCELLED = "CANCELLED"

class PaymentMethod(str, Enum):
    CASH = "CASH"
    CREDIT = "CREDIT"
    DEBIT = "DEBIT"
    PIX = "PIX"
    OTHER = "OTHER"

class OrderType(str, Enum):
    DINE_IN = "DINE_IN"
    TAKEOUT = "TAKEOUT"
    DELIVERY = "DELIVERY"

# Updated Order models with coupon and points redemption support
class OrderItemBase(BaseModel):
    product_id: str
    quantity: int = 1
    customizations: List[OrderItemCustomization] = []
    sections: List[OrderItemSection] = []
    notes: Optional[str] = None

class OrderItemCreate(OrderItemBase):
    pass

class OrderItem(OrderItemBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    product_name: str
    product_type: str
    unit_price: float
    total_price: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class OrderItemUpdate(BaseModel):
    quantity: Optional[int] = None
    customizations: Optional[List[OrderItemCustomization]] = None
    notes: Optional[str] = None

class OrderBase(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    cashier_id: Optional[str] = None
    table_number: Optional[int] = None
    order_type: OrderType = OrderType.DINE_IN
    notes: Optional[str] = None

class OrderCreate(OrderBase):
    items: List[OrderItemCreate] = []

class Order(OrderBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    status: OrderStatus = OrderStatus.PENDING
    payment_status: PaymentStatus = PaymentStatus.PENDING
    payment_method: Optional[PaymentMethod] = None
    items: List[OrderItem] = []
    subtotal: float = 0.0
    tax: float = 0.0
    discount: float = 0.0
    total: float = 0.0
    
    # New fields for coupon and points redemption
    applied_coupon_code: Optional[str] = None
    coupon_discount: float = 0.0
    points_redeemed: Optional[int] = None
    points_discount: float = 0.0
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    payment_status: Optional[PaymentStatus] = None
    payment_method: Optional[PaymentMethod] = None
    tax: Optional[float] = None
    discount: Optional[float] = None
    notes: Optional[str] = None
    
    # New fields for coupon and points redemption
    applied_coupon_code: Optional[str] = None
    coupon_discount: Optional[float] = None
    points_redeemed: Optional[int] = None
    points_discount: Optional[float] = None

# New models for applying discounts during order finalization
class ApplyCouponRequest(BaseModel):
    coupon_code: str
    
class ApplyPointsRequest(BaseModel):
    points_to_redeem: int

class DiscountResponse(BaseModel):
    subtotal: float
    coupon_discount: float = 0.0
    points_discount: float = 0.0
    total_discount: float
    tax: float
    total: float
    applied_coupon_code: Optional[str] = None
    points_redeemed: Optional[int] = None
    remaining_points: Optional[int] = None


# Product models
class ProductStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    OUT_OF_STOCK = "OUT_OF_STOCK"

class ProductType(str, Enum):
    FOOD = "FOOD"
    BEVERAGE = "BEVERAGE"
    DESSERT = "DESSERT"
    COMBO = "COMBO"
    OTHER = "OTHER"

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float = Field(gt=0)
    category_id: Optional[str] = None
    product_type: ProductType = ProductType.FOOD
    is_available: bool = True
    preparation_time: Optional[int] = None  # em minutos
    calories: Optional[int] = None
    allergens: List[str] = []
    tags: List[str] = []

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    category_id: Optional[str] = None
    product_type: Optional[ProductType] = None
    is_available: Optional[bool] = None
    preparation_time: Optional[int] = None
    calories: Optional[int] = None
    allergens: Optional[List[str]] = None
    tags: Optional[List[str]] = None

class Product(ProductBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: ProductStatus = ProductStatus.ACTIVE
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ProductSummary(BaseModel):
    id: str
    name: str
    price: float
    category_id: Optional[str] = None
    is_available: bool
    image_url: Optional[str] = None

# Category models
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    display_order: int = 0
    is_active: bool = True

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

class ProductCategory(CategoryBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Inventory models
class InventoryBase(BaseModel):
    product_id: str
    current_stock: int = 0
    minimum_stock: int = 0
    maximum_stock: Optional[int] = None
    unit: str = "unit"

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseModel):
    current_stock: Optional[int] = None
    minimum_stock: Optional[int] = None
    maximum_stock: Optional[int] = None
    unit: Optional[str] = None

class Inventory(InventoryBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None

# Stock movement models
class StockMovementType(str, Enum):
    IN = "IN"
    OUT = "OUT"
    ADJUSTMENT = "ADJUSTMENT"
    WASTE = "WASTE"

class StockMovementBase(BaseModel):
    product_id: str
    movement_type: StockMovementType
    quantity: int
    reason: Optional[str] = None
    reference_id: Optional[str] = None  # order_id, supplier_id, etc.

class StockMovementCreate(StockMovementBase):
    pass

class StockMovement(StockMovementBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    previous_stock: int
    new_stock: int


# Image models
class ProductImage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    image_url: str
    is_primary: bool = False
    alt_text: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ImageUploadResponse(BaseModel):
    image_id: str
    image_url: str
    message: str

# Combo models
class ComboItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    combo_id: str
    product_id: str
    quantity: int = 1
    is_required: bool = True
    price_adjustment: float = 0.0

# Menu models
class MenuBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True
    start_time: Optional[str] = None  # HH:MM format
    end_time: Optional[str] = None    # HH:MM format
    days_of_week: List[int] = []      # 0=Sunday, 1=Monday, etc.

class MenuCreate(MenuBase):
    category_ids: List[str] = []

class MenuUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    days_of_week: Optional[List[int]] = None
    category_ids: Optional[List[str]] = None

class Menu(MenuBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    categories: List[ProductCategory] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Exchange group models
class ExchangeGroup(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    product_ids: List[str] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Ingredient models
class IngredientBase(BaseModel):
    name: str
    description: Optional[str] = None
    unit: str = "unit"
    cost_per_unit: float = 0.0
    supplier_id: Optional[str] = None

class IngredientCreate(IngredientBase):
    pass

class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    cost_per_unit: Optional[float] = None
    supplier_id: Optional[str] = None

class Ingredient(IngredientBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Option models
class OptionBase(BaseModel):
    name: str
    price_adjustment: float = 0.0
    is_available: bool = True

class OptionCreate(OptionBase):
    pass

class Option(OptionBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    option_group_id: str

# Option Group models
class OptionGroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_required: bool = False
    min_selections: int = 0
    max_selections: Optional[int] = None

class OptionGroupCreate(OptionGroupBase):
    options: List[OptionCreate] = []

class OptionGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_required: Optional[bool] = None
    min_selections: Optional[int] = None
    max_selections: Optional[int] = None

class OptionGroup(OptionGroupBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    options: List[Option] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Composite Section models
class CompositeSectionBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_required: bool = True
    min_items: int = 1
    max_items: Optional[int] = None

class CompositeSectionCreate(CompositeSectionBase):
    product_ids: List[str] = []

class CompositeSection(CompositeSectionBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Composite Product models
class CompositeProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    base_price: float = Field(gt=0)
    sections: List[CompositeSectionCreate] = []
    category_id: Optional[str] = None

class CompositeProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = Field(None, gt=0)
    sections: Optional[List[CompositeSectionCreate]] = None
    category_id: Optional[str] = None

# Pricing Strategy models
class PricingStrategy(str, Enum):
    FIXED = "FIXED"
    DYNAMIC = "DYNAMIC"
    COST_PLUS = "COST_PLUS"
    MARKET_BASED = "MARKET_BASED"

# Menu Export models
class MenuExport(BaseModel):
    menu_id: str
    format: Literal["json", "csv", "pdf"] = "json"
    include_prices: bool = True
    include_descriptions: bool = True
    include_images: bool = False

