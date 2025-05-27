from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4


class MenuItemCategory(str, Enum):
    APPETIZER = "appetizer"
    MAIN_COURSE = "main_course"
    DESSERT = "dessert"
    BEVERAGE = "beverage"
    SIDE = "side"
    COMBO = "combo"
    SPECIAL = "special"
    OTHER = "other"


class MenuItemAllergen(str, Enum):
    GLUTEN = "gluten"
    DAIRY = "dairy"
    NUTS = "nuts"
    EGGS = "eggs"
    SOY = "soy"
    FISH = "fish"
    SHELLFISH = "shellfish"
    WHEAT = "wheat"
    PEANUTS = "peanuts"


class MenuItemNutrition(BaseModel):
    calories: Optional[int] = None
    protein: Optional[float] = None  # in grams
    carbs: Optional[float] = None    # in grams
    fat: Optional[float] = None      # in grams
    sodium: Optional[float] = None   # in milligrams


class MenuItemOption(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: Optional[str] = None
    price_addition: float = 0.0
    available: bool = True


class MenuItemVariant(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: Optional[str] = None
    price: float
    available: bool = True


class MenuItem(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    category: MenuItemCategory
    tags: List[str] = []
    allergens: List[MenuItemAllergen] = []
    nutrition: Optional[MenuItemNutrition] = None
    options: List[MenuItemOption] = []
    variants: List[MenuItemVariant] = []
    available: bool = True
    popular: bool = False
    featured: bool = False
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    product_id: Optional[UUID] = None  # Reference to the product in the product module


class MenuCategory(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    items: List[UUID] = []  # References to MenuItem IDs
    order: int = 0
    available: bool = True


class MenuTheme(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    primary_color: str = "#2196F3"
    secondary_color: str = "#FFC107"
    background_color: str = "#FFFFFF"
    text_color: str = "#212121"
    font_family: str = "Roboto, sans-serif"
    logo_url: Optional[str] = None
    header_image_url: Optional[str] = None


class QRCodeConfig(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    restaurant_id: UUID
    menu_id: UUID
    name: str
    description: Optional[str] = None
    foreground_color: str = "#000000"
    background_color: str = "#FFFFFF"
    logo_url: Optional[str] = None
    error_correction_level: str = "M"  # L, M, Q, H
    size: int = 300  # Size in pixels
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class Menu(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    restaurant_id: UUID
    name: str
    description: Optional[str] = None
    categories: List[MenuCategory] = []
    theme: MenuTheme
    active: bool = True
    available_from: Optional[datetime] = None
    available_to: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = {}
