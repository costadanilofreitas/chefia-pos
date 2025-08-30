"""
Database Service for POS System
Simple in-memory database service for testing
"""
from typing import Any, Dict, List, Optional


class DatabaseService:
    """Simple in-memory database service"""
    
    def __init__(self):
        self.data: Dict[str, Dict[str, Any]] = {}
    
    async def get(self, collection: str, item_id: str) -> Optional[Dict[str, Any]]:
        """Get item from collection"""
        if collection not in self.data:
            return None
        return self.data[collection].get(item_id)
    
    async def upsert(self, collection: str, item_id: str, data: Dict[str, Any]) -> None:
        """Insert or update item in collection"""
        if collection not in self.data:
            self.data[collection] = {}
        self.data[collection][item_id] = data
    
    async def query(self, collection: str, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Query collection"""
        if collection not in self.data:
            return []
        
        # Simple query implementation - just return all items for now
        # In production, this would filter based on query
        return list(self.data[collection].values())
    
    async def delete(self, collection: str, item_id: str) -> bool:
        """Delete item from collection"""
        if collection not in self.data:
            return False
        if item_id in self.data[collection]:
            del self.data[collection][item_id]
            return True
        return False


# Global instance
_db_service = None


def get_db_service() -> DatabaseService:
    """Get database service instance"""
    global _db_service
    if _db_service is None:
        _db_service = DatabaseService()
    return _db_service