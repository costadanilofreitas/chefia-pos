from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class TableShape(str, Enum):
    """Enum para os formatos de mesa disponíveis."""

    SQUARE = "square"
    RECTANGLE = "rectangle"
    CIRCLE = "circle"
    ELLIPSE = "ellipse"
    CUSTOM = "custom"


class TableStatus(str, Enum):
    """Enum para os status possíveis de uma mesa."""

    AVAILABLE = "available"  # Mesa disponível
    OCCUPIED = "occupied"  # Mesa ocupada
    RESERVED = "reserved"  # Mesa reservada
    DIRTY = "dirty"  # Mesa suja (precisa de limpeza)
    INACTIVE = "inactive"  # Mesa inativa (não disponível para uso)


class TablePosition(BaseModel):
    """Modelo para a posição de uma mesa no layout."""

    x: float = Field(..., description="Posição X da mesa no layout (em porcentagem)")
    y: float = Field(..., description="Posição Y da mesa no layout (em porcentagem)")
    width: float = Field(..., description="Largura da mesa (em porcentagem)")
    height: float = Field(..., description="Altura da mesa (em porcentagem)")
    rotation: float = Field(0, description="Rotação da mesa em graus")


class TableModel(BaseModel):
    """Modelo para uma mesa no sistema."""

    id: str = Field(..., description="Identificador único da mesa")
    number: str = Field(..., description="Número ou identificação visível da mesa")
    shape: TableShape = Field(TableShape.RECTANGLE, description="Formato da mesa")
    position: TablePosition = Field(..., description="Posição da mesa no layout")
    status: TableStatus = Field(
        TableStatus.AVAILABLE, description="Status atual da mesa"
    )
    capacity: int = Field(4, description="Capacidade de pessoas na mesa")
    current_order_id: Optional[str] = Field(
        None, description="ID do pedido atual, se houver"
    )
    waiter_id: Optional[str] = Field(
        None, description="ID do garçom responsável, se atribuído"
    )
    custom_shape_path: Optional[str] = Field(
        None, description="Caminho SVG para formas personalizadas"
    )
    metadata: Dict[str, Any] = Field({}, description="Metadados adicionais da mesa")
    created_at: datetime = Field(
        default_factory=datetime.now, description="Data de criação"
    )
    updated_at: datetime = Field(
        default_factory=datetime.now, description="Data da última atualização"
    )


class LayoutSection(BaseModel):
    """Modelo para uma seção do layout (ex: área interna, terraço, etc.)."""

    id: str = Field(..., description="Identificador único da seção")
    name: str = Field(..., description="Nome da seção")
    description: Optional[str] = Field(None, description="Descrição da seção")
    background_image: Optional[str] = Field(
        None, description="URL ou caminho da imagem de fundo"
    )
    background_color: str = Field("#FFFFFF", description="Cor de fundo da seção")
    position: Dict[str, float] = Field(
        {}, description="Posição e dimensões da seção no layout"
    )
    metadata: Dict[str, Any] = Field({}, description="Metadados adicionais da seção")
    created_at: datetime = Field(
        default_factory=datetime.now, description="Data de criação"
    )
    updated_at: datetime = Field(
        default_factory=datetime.now, description="Data da última atualização"
    )


class TableLayout(BaseModel):
    """Modelo para o layout completo de mesas de um restaurante."""

    id: str = Field(..., description="Identificador único do layout")
    restaurant_id: str = Field(..., description="ID do restaurante")
    store_id: str = Field(..., description="ID da loja")
    name: str = Field(..., description="Nome do layout")
    description: Optional[str] = Field(None, description="Descrição do layout")
    tables: List[TableModel] = Field([], description="Lista de mesas no layout")
    sections: List[LayoutSection] = Field([], description="Lista de seções no layout")
    background_image: Optional[str] = Field(
        None, description="URL ou caminho da imagem de fundo"
    )
    background_color: str = Field("#FFFFFF", description="Cor de fundo do layout")
    width: int = Field(1000, description="Largura do layout em pixels")
    height: int = Field(800, description="Altura do layout em pixels")
    is_active: bool = Field(True, description="Indica se este layout está ativo")
    metadata: Dict[str, Any] = Field({}, description="Metadados adicionais do layout")
    created_at: datetime = Field(
        default_factory=datetime.now, description="Data de criação"
    )
    updated_at: datetime = Field(
        default_factory=datetime.now, description="Data da última atualização"
    )


class TableLayoutConfig(BaseModel):
    """Configuração global para layouts de mesa."""

    restaurant_id: str = Field(..., description="ID do restaurante")
    store_id: str = Field(..., description="ID da loja")
    active_layout_id: str = Field(..., description="ID do layout ativo")
    available_layouts: List[str] = Field([], description="IDs dos layouts disponíveis")
    auto_assign_waiter: bool = Field(
        False, description="Atribuir garçom automaticamente"
    )
    table_status_colors: Dict[str, str] = Field(
        {
            "available": "#4CAF50",  # Verde
            "occupied": "#F44336",  # Vermelho
            "reserved": "#2196F3",  # Azul
            "dirty": "#FF9800",  # Laranja
            "inactive": "#9E9E9E",  # Cinza
        },
        description="Cores para os diferentes status de mesa",
    )
    created_at: datetime = Field(
        default_factory=datetime.now, description="Data de criação"
    )
    updated_at: datetime = Field(
        default_factory=datetime.now, description="Data da última atualização"
    )
