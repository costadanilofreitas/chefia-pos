# /home/ubuntu/pos-modern/src/versioning/models/version_models.py

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import semver

class VersionInfo(BaseModel):
    """Model for system version information."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    version: str  # Semantic version (e.g., "1.0.0")
    release_date: datetime = Field(default_factory=datetime.utcnow)
    description: str
    changelog: List[str]
    is_critical: bool = False
    min_required_version: Optional[str] = None  # Minimum version required to update to this version
    modules_affected: List[str] = []  # List of modules affected by this update
    file_url: Optional[str] = None  # URL to download the update package
    file_hash: Optional[str] = None  # Hash of the update package for verification
    installation_steps: List[Dict[str, Any]] = []  # Steps to install the update
    rollback_steps: List[Dict[str, Any]] = []  # Steps to rollback the update if it fails
    
    class Config:
        schema_extra = {
            "example": {
                "version": "1.0.0",
                "release_date": "2025-05-24T12:00:00",
                "description": "Initial release",
                "changelog": [
                    "Added basic POS functionality",
                    "Added KDS module",
                    "Added Waiter module"
                ],
                "is_critical": False,
                "min_required_version": None,
                "modules_affected": ["pos", "kds", "waiter"],
                "file_url": "https://example.com/updates/pos-modern-1.0.0.zip",
                "file_hash": "sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                "installation_steps": [
                    {"type": "backup", "path": "/home/ubuntu/pos-modern"},
                    {"type": "extract", "source": "pos-modern-1.0.0.zip", "destination": "/home/ubuntu/pos-modern"},
                    {"type": "run", "command": "npm install"},
                    {"type": "run", "command": "pip install -r requirements.txt"}
                ],
                "rollback_steps": [
                    {"type": "restore", "path": "/home/ubuntu/pos-modern"}
                ]
            }
        }

class SystemVersion(BaseModel):
    """Model for the current system version."""
    current_version: str
    last_update_check: Optional[datetime] = None
    last_update: Optional[datetime] = None
    update_available: bool = False
    available_version: Optional[str] = None
    update_description: Optional[str] = None
    is_critical_update: bool = False
    auto_update_enabled: bool = True
    update_check_interval_hours: int = 24
    update_history: List[Dict[str, Any]] = []
    
    class Config:
        schema_extra = {
            "example": {
                "current_version": "1.0.0",
                "last_update_check": "2025-05-24T12:00:00",
                "last_update": "2025-05-20T10:00:00",
                "update_available": True,
                "available_version": "1.1.0",
                "update_description": "Bug fixes and performance improvements",
                "is_critical_update": False,
                "auto_update_enabled": True,
                "update_check_interval_hours": 24,
                "update_history": [
                    {
                        "version": "1.0.0",
                        "date": "2025-05-20T10:00:00",
                        "success": True
                    },
                    {
                        "version": "0.9.0",
                        "date": "2025-05-10T09:00:00",
                        "success": True
                    }
                ]
            }
        }

class UpdateRequest(BaseModel):
    """Model for requesting an update."""
    target_version: Optional[str] = None  # If None, update to the latest version
    force: bool = False  # Force update even if not recommended
    
    class Config:
        schema_extra = {
            "example": {
                "target_version": "1.1.0",
                "force": False
            }
        }

class UpdateResult(BaseModel):
    """Model for the result of an update operation."""
    success: bool
    message: str
    from_version: str
    to_version: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: Optional[Dict[str, Any]] = None
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "message": "Update completed successfully",
                "from_version": "1.0.0",
                "to_version": "1.1.0",
                "timestamp": "2025-05-24T12:30:00",
                "details": {
                    "steps_completed": 4,
                    "total_steps": 4,
                    "backup_created": True,
                    "backup_path": "/home/ubuntu/pos-modern-backup-20250524123000"
                }
            }
        }

class UpdateCheckResult(BaseModel):
    """Model for the result of checking for updates."""
    update_available: bool
    current_version: str
    latest_version: Optional[str] = None
    is_critical: bool = False
    description: Optional[str] = None
    changelog: Optional[List[str]] = None
    
    class Config:
        schema_extra = {
            "example": {
                "update_available": True,
                "current_version": "1.0.0",
                "latest_version": "1.1.0",
                "is_critical": False,
                "description": "Bug fixes and performance improvements",
                "changelog": [
                    "Fixed issue with order processing",
                    "Improved performance of KDS module",
                    "Added new reporting features"
                ]
            }
        }
