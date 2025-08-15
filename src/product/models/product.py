import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# Enums
class ProductStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    OUT_OF_STOCK = "OUT_OF_STOCK"


class ProductType(str, Enum):
    SIMPLE = "SIMPLE"
    COMBO = "COMBO"
    COMPOSITE = "COMPOSITE"


class PricingStrategy(str, Enum):
    FIXED = "FIXED"
    WEIGHT_BASED = "WEIGHT_BASED"
    DYNAMIC = "DYNAMIC"
    HIGHEST_PRICE = "HIGHEST_PRICE"
    AVERAGE_PRICE = "AVERAGE_PRICE"
    SUM_PRICE = "SUM_PRICE"


# Base Models
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    category_id: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    status: ProductStatus = ProductStatus.ACTIVE
    type: ProductType = ProductType.SIMPLE
    is_featured: bool = False
    weight_based: bool = False
    pricing_strategy: PricingStrategy = PricingStrategy.FIXED


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    status: Optional[ProductStatus] = None
    type: Optional[ProductType] = None
    is_featured: Optional[bool] = None
    weight_based: Optional[bool] = None
    pricing_strategy: Optional[PricingStrategy] = None


class Product(ProductBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    images: List[str] = []
    ingredients: List[Dict[str, Any]] = []
    combo_items: List[Dict[str, Any]] = []
    attributes: Dict[str, Any] = {}  # Atributos personalizados do produto


class ProductSummary(BaseModel):
    id: str
    name: str
    price: float
    category_id: Optional[str] = None
    status: ProductStatus
    type: ProductType
    is_featured: bool
    image_url: Optional[str] = None


# Category Models
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None


class ProductCategory(CategoryBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Image Models
class ProductImage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    url: str
    filename: str
    is_main: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ImageUploadResponse(BaseModel):
    id: str
    url: str
    filename: str
    message: str


# Combo Models
class ComboItem(BaseModel):
    product_id: str
    quantity: int = 1
    is_optional: bool = False
    price_adjustment: float = 0.0


# Ingredient Models
class IngredientBase(BaseModel):
    name: str
    description: Optional[str] = None
    unit: str = "unit"
    cost_per_unit: float = 0.0
    supplier: Optional[str] = None
    is_active: bool = True


class IngredientCreate(IngredientBase):
    pass


class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    cost_per_unit: Optional[float] = None
    supplier: Optional[str] = None
    is_active: Optional[bool] = None


class Ingredient(IngredientBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    current_stock: float = 0.0
    minimum_stock: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Menu Models
class MenuBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True
    products: List[str] = []  # Lista de IDs de produtos
    categories: List[str] = []  # Lista de IDs de categorias


class MenuCreate(MenuBase):
    pass


class MenuUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class Menu(MenuBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Option Models
class OptionBase(BaseModel):
    name: str
    price_adjustment: float = 0.0
    is_active: bool = True


class OptionCreate(OptionBase):
    pass


class Option(OptionBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    group_id: str


class OptionGroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_required: bool = False
    max_selections: int = 1
    is_active: bool = True


class OptionGroupCreate(OptionGroupBase):
    options: List[OptionCreate] = []


class OptionGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_required: Optional[bool] = None
    max_selections: Optional[int] = None
    is_active: Optional[bool] = None


class OptionGroup(OptionGroupBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    options: List[Option] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Composite Product Models
class CompositeSectionBase(BaseModel):
    name: str
    description: Optional[str] = None
    min_items: int = 0
    max_items: Optional[int] = None
    is_required: bool = False


class CompositeSectionCreate(CompositeSectionBase):
    pass


class CompositeSection(CompositeSectionBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str


class CompositeProductCreate(ProductBase):
    sections: List[CompositeSectionCreate] = []


class CompositeProductUpdate(ProductUpdate):
    sections: Optional[List[CompositeSectionCreate]] = None


# Exchange Group Models
class ExchangeGroup(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    product_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Menu Export Models
class MenuExport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    format: str
    file_path: str
    menu: Dict[str, Any] = {}
    products: List[Dict[str, Any]] = []
    categories: List[Dict[str, Any]] = []
    images: List[Dict[str, Any]] = []
    combo_items: List[Dict[str, Any]] = []
    composite_sections: List[Dict[str, Any]] = []
    ingredients: List[Dict[str, Any]] = []
    option_groups: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
