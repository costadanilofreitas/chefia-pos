from typing import Optional, Dict, Any
from uuid import UUID
import qrcode
from io import BytesIO
import base64
from ..models.menu_models import QRCodeConfig
from fastapi.responses import Response
from fastapi import HTTPException

class QRCodeService:
    """Service for generating and managing QR codes for menus"""
    
    def __init__(self):
        # In a real implementation, this would connect to a database
        # For now, we'll use in-memory storage
        self.qrcode_configs = {}
    
    async def get_qrcodes_by_restaurant(self, restaurant_id: UUID):
        """Get all QR code configurations for a restaurant"""
        return [
            config for config in self.qrcode_configs.values()
            if config.restaurant_id == restaurant_id
        ]
    
    async def create_qrcode(self, qrcode_config: QRCodeConfig) -> QRCodeConfig:
        """Create a new QR code configuration"""
        self.qrcode_configs[qrcode_config.id] = qrcode_config
        return qrcode_config
    
    async def get_qrcode_config(self, qrcode_id: UUID) -> Optional[QRCodeConfig]:
        """Get a QR code configuration by ID"""
        return self.qrcode_configs.get(qrcode_id)
    
    async def update_qrcode(self, qrcode_id: UUID, qrcode_data: QRCodeConfig) -> Optional[QRCodeConfig]:
        """Update an existing QR code configuration"""
        if qrcode_id not in self.qrcode_configs:
            return None
        
        qrcode_data.id = qrcode_id  # Ensure ID doesn't change
        self.qrcode_configs[qrcode_id] = qrcode_data
        return qrcode_data
    
    async def delete_qrcode(self, qrcode_id: UUID) -> bool:
        """Delete a QR code configuration"""
        if qrcode_id not in self.qrcode_configs:
            return False
        
        del self.qrcode_configs[qrcode_id]
        return True
    
    async def generate_qrcode_image(self, qrcode_id: UUID) -> Response:
        """Generate a QR code image based on configuration"""
        config = await self.get_qrcode_config(qrcode_id)
        if not config:
            return None
        
        # Build the URL for the menu
        # In a real implementation, this would be a configurable base URL
        menu_url = f"https://menu.posmodern.com.br/r/{config.restaurant_id}/m/{config.menu_id}"
        
        # Create QR code instance
        qr = qrcode.QRCode(
            version=1,
            error_correction=self._get_error_correction_level(config.error_correction_level),
            box_size=10,
            border=4,
        )
        
        # Add data to the QR code
        qr.add_data(menu_url)
        qr.make(fit=True)
        
        # Create an image from the QR code
        img = qr.make_image(
            fill_color=config.foreground_color,
            back_color=config.background_color
        )
        
        # If a logo is specified, overlay it on the QR code
        if config.logo_url:
            # In a real implementation, we would download and overlay the logo
            # For now, we'll skip this step
            pass
        
        # Convert the image to bytes
        img_bytes = BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        # Return the image as a response
        return Response(content=img_bytes.read(), media_type="image/png")
    
    def _get_error_correction_level(self, level_str: str) -> int:
        """Convert string error correction level to qrcode constant"""
        levels = {
            'L': qrcode.constants.ERROR_CORRECT_L,  # About 7% error correction
            'M': qrcode.constants.ERROR_CORRECT_M,  # About 15% error correction
            'Q': qrcode.constants.ERROR_CORRECT_Q,  # About 25% error correction
            'H': qrcode.constants.ERROR_CORRECT_H,  # About 30% error correction
        }
        return levels.get(level_str.upper(), qrcode.constants.ERROR_CORRECT_M)
