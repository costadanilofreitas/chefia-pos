"""Stub for whatsapp service."""

from typing import Any, Dict


class WhatsAppService:
    """Service for WhatsApp operations."""

    async def send_message(self, phone: str, message: str) -> Dict[str, Any]:
        """Send WhatsApp message."""
        return {"status": "sent"}
