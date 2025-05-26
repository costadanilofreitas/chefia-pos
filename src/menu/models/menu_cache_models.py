from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from datetime import datetime
from uuid import UUID, uuid4


class MenuCache(BaseModel):
    """Model for caching menu data"""
    menu_id: UUID
    restaurant_id: UUID
    cache_key: str
    cache_data: Dict[str, Any]
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: datetime


class MenuAccess(BaseModel):
    """Model for tracking QR code menu access"""
    id: UUID = Field(default_factory=uuid4)
    qrcode_id: UUID
    access_time: datetime = Field(default_factory=datetime.now)
    device_type: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
