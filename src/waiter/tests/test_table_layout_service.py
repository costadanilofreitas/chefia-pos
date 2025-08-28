"""
Tests for Table Layout Service
"""

from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from src.waiter.models.table_layout_models import (
    TableLayout,
    TableLayoutConfig,
    TableStatus,
)
from src.waiter.services.table_layout_service import TableLayoutService


@pytest.fixture
def mock_db_service():
    """Create a mock database service"""
    db_service = AsyncMock()
    return db_service


@pytest.fixture
def table_layout_service(mock_db_service):
    """Create a TableLayoutService instance with mocked dependencies"""
    service = TableLayoutService(mock_db_service)
    return service


@pytest.fixture
def sample_table_data():
    """Sample table data"""
    return {
        "id": str(uuid4()),
        "number": 1,
        "capacity": 4,
        "status": TableStatus.AVAILABLE,
        "position": {"x": 100, "y": 200},
        "size": {"width": 80, "height": 80}
    }


@pytest.fixture
def sample_layout_data(sample_table_data):
    """Sample layout data for testing"""
    return {
        "name": "Main Floor",
        "restaurant_id": "rest-123",
        "store_id": "store-456",
        "is_active": True,
        "tables": [sample_table_data],
        "areas": [
            {
                "id": str(uuid4()),
                "name": "Dining Area",
                "position": {"x": 0, "y": 0},
                "size": {"width": 500, "height": 400}
            }
        ],
        "metadata": {
            "theme": "modern",
            "capacity": 50
        }
    }


@pytest.fixture
def sample_layout(sample_layout_data):
    """Sample TableLayout object"""
    layout_id = str(uuid4())
    sample_layout_data["id"] = layout_id
    sample_layout_data["created_at"] = datetime.now()
    sample_layout_data["updated_at"] = datetime.now()
    return TableLayout(**sample_layout_data)


@pytest.fixture
def sample_layout_config():
    """Sample TableLayoutConfig object"""
    return TableLayoutConfig(
        restaurant_id="rest-123",
        store_id="store-456",
        active_layout_id=str(uuid4()),
        available_layouts=[str(uuid4()), str(uuid4())]
    )


class TestTableLayoutService:
    """Test suite for TableLayoutService"""

    @pytest.mark.asyncio
    async def test_create_layout_success(
        self, table_layout_service, mock_db_service, sample_layout_data
    ):
        """Test successfully creating a table layout"""
        # Arrange
        mock_db_service.insert_one.return_value = True
        mock_db_service.find_one.return_value = None  # No existing config

        # Act
        result = await table_layout_service.create_layout(sample_layout_data)

        # Assert
        assert result is not None
        assert result.name == sample_layout_data["name"]
        assert result.restaurant_id == sample_layout_data["restaurant_id"]
        assert result.store_id == sample_layout_data["store_id"]
        assert result.id is not None
        assert result.created_at is not None
        assert result.updated_at is not None
        assert len(result.tables) == 1

        # Verify database calls
        mock_db_service.insert_one.assert_called_once()
        call_args = mock_db_service.insert_one.call_args
        assert call_args[0][0] == "table_layouts"

    @pytest.mark.asyncio
    async def test_create_layout_with_existing_config(
        self, table_layout_service, mock_db_service,
        sample_layout_data, sample_layout_config
    ):
        """Test creating layout when config already exists"""
        # Arrange
        mock_db_service.insert_one.return_value = True
        mock_db_service.find_one.return_value = sample_layout_config.dict()
        mock_db_service.update_one.return_value = True

        # Act
        result = await table_layout_service.create_layout(sample_layout_data)

        # Assert
        assert result is not None
        # Verify config was updated
        assert mock_db_service.update_one.called or mock_db_service.insert_one.called

    @pytest.mark.asyncio
    async def test_get_layout_success(
        self, table_layout_service, mock_db_service, sample_layout
    ):
        """Test successfully getting a layout by ID"""
        # Arrange
        layout_id = sample_layout.id
        mock_db_service.find_one.return_value = sample_layout.dict()

        # Act
        result = await table_layout_service.get_layout(layout_id)

        # Assert
        assert result is not None
        assert result.id == layout_id
        assert result.name == sample_layout.name
        mock_db_service.find_one.assert_called_once_with(
            "table_layouts",
            {"id": layout_id}
        )

    @pytest.mark.asyncio
    async def test_get_layout_not_found(
        self, table_layout_service, mock_db_service
    ):
        """Test getting non-existent layout"""
        # Arrange
        layout_id = str(uuid4())
        mock_db_service.find_one.return_value = None

        # Act
        result = await table_layout_service.get_layout(layout_id)

        # Assert
        assert result is None

    @pytest.mark.asyncio
    async def test_get_layouts_by_restaurant(
        self, table_layout_service, mock_db_service, sample_layout
    ):
        """Test getting all layouts for a restaurant/store"""
        # Arrange
        restaurant_id = "rest-123"
        store_id = "store-456"

        mock_layouts = [
            sample_layout.dict(),
            {**sample_layout.dict(), "id": str(uuid4()), "name": "Second Floor"}
        ]
        mock_db_service.find.return_value = mock_layouts

        # Act
        result = await table_layout_service.get_layouts_by_restaurant(
            restaurant_id, store_id
        )

        # Assert
        assert len(result) == 2
        assert all(isinstance(layout, TableLayout) for layout in result)
        assert result[0].restaurant_id == restaurant_id
        assert result[0].store_id == store_id

        mock_db_service.find.assert_called_once_with(
            "table_layouts",
            {"restaurant_id": restaurant_id, "store_id": store_id}
        )

    @pytest.mark.asyncio
    async def test_get_active_layout_success(
        self, table_layout_service, mock_db_service,
        sample_layout, sample_layout_config
    ):
        """Test getting the active layout for a restaurant/store"""
        # Arrange
        restaurant_id = "rest-123"
        store_id = "store-456"
        sample_layout_config.active_layout_id = sample_layout.id

        # Mock config retrieval
        table_layout_service.get_layout_config = AsyncMock(
            return_value=sample_layout_config
        )

        # Mock layout retrieval
        mock_db_service.find_one.return_value = sample_layout.dict()

        # Act
        result = await table_layout_service.get_active_layout(
            restaurant_id, store_id
        )

        # Assert
        assert result is not None
        assert result.id == sample_layout.id
        table_layout_service.get_layout_config.assert_called_once_with(
            restaurant_id, store_id
        )

    @pytest.mark.asyncio
    async def test_get_active_layout_no_config(
        self, table_layout_service, mock_db_service
    ):
        """Test getting active layout when no config exists"""
        # Arrange
        restaurant_id = "rest-123"
        store_id = "store-456"

        table_layout_service.get_layout_config = AsyncMock(return_value=None)

        # Act
        result = await table_layout_service.get_active_layout(
            restaurant_id, store_id
        )

        # Assert
        assert result is None

    @pytest.mark.asyncio
    async def test_update_layout_success(
        self, table_layout_service, mock_db_service, sample_layout
    ):
        """Test successfully updating a layout"""
        # Arrange
        layout_id = sample_layout.id
        update_data = {
            "name": "Updated Main Floor",
            "metadata": {"theme": "classic", "capacity": 60}
        }

        # Mock existing layout
        table_layout_service.get_layout = AsyncMock(return_value=sample_layout)
        mock_db_service.update_one.return_value = True

        # Act
        result = await table_layout_service.update_layout(layout_id, update_data)

        # Assert
        assert result is not None
        table_layout_service.get_layout.assert_called_once_with(layout_id)
        mock_db_service.update_one.assert_called()

    @pytest.mark.asyncio
    async def test_update_layout_not_found(
        self, table_layout_service, mock_db_service
    ):
        """Test updating non-existent layout"""
        # Arrange
        layout_id = str(uuid4())
        update_data = {"name": "Updated"}

        table_layout_service.get_layout = AsyncMock(return_value=None)

        # Act
        result = await table_layout_service.update_layout(layout_id, update_data)

        # Assert
        assert result is None
        mock_db_service.update_one.assert_not_called()

    @pytest.mark.asyncio
    async def test_update_table_status_success(
        self, table_layout_service, mock_db_service, sample_layout
    ):
        """Test updating table status within a layout"""
        # Arrange
        layout_id = sample_layout.id
        table_id = sample_layout.tables[0]["id"] if isinstance(sample_layout.tables[0], dict) else sample_layout.tables[0].id
        new_status = TableStatus.OCCUPIED
        order_id = str(uuid4())
        waiter_id = str(uuid4())

        # Mock get_layout
        table_layout_service.get_layout = AsyncMock(return_value=sample_layout)
        mock_db_service.update_one.return_value = True

        # Act
        result = await table_layout_service.update_table_status(
            layout_id, table_id, new_status, order_id, waiter_id
        )

        # Assert
        assert result is not None
        # Verify the table status was updated
        updated_table = result.tables[0] if isinstance(result.tables[0], dict) else result.tables[0]
        if isinstance(updated_table, dict):
            assert updated_table.get("status") == new_status
        else:
            assert updated_table.status == new_status

    @pytest.mark.asyncio
    async def test_delete_layout_success(
        self, table_layout_service, mock_db_service,
        sample_layout, sample_layout_config
    ):
        """Test successfully deleting a layout"""
        # Arrange
        layout_id = sample_layout.id

        # Mock get_layout
        table_layout_service.get_layout = AsyncMock(return_value=sample_layout)

        # Mock config operations
        table_layout_service.get_layout_config = AsyncMock(
            return_value=sample_layout_config
        )
        mock_db_service.delete_one.return_value = True
        mock_db_service.update_one.return_value = True

        # Act
        result = await table_layout_service.delete_layout(layout_id)

        # Assert
        assert result is True
        mock_db_service.delete_one.assert_called_once_with(
            "table_layouts",
            {"id": layout_id}
        )

    @pytest.mark.asyncio
    async def test_create_layout_config_success(
        self, table_layout_service, mock_db_service
    ):
        """Test creating a layout configuration"""
        # Arrange
        config_data = {
            "restaurant_id": "rest-123",
            "store_id": "store-456",
            "active_layout_id": str(uuid4()),
            "available_layouts": [str(uuid4())]
        }

        mock_db_service.insert_one.return_value = True

        # Act
        result = await table_layout_service.create_layout_config(config_data)

        # Assert
        assert result is not None
        assert result.restaurant_id == config_data["restaurant_id"]
        assert result.store_id == config_data["store_id"]
        mock_db_service.insert_one.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_layout_config_success(
        self, table_layout_service, mock_db_service, sample_layout_config
    ):
        """Test getting layout configuration"""
        # Arrange
        restaurant_id = "rest-123"
        store_id = "store-456"

        mock_db_service.find_one.return_value = sample_layout_config.dict()

        # Act
        result = await table_layout_service.get_layout_config(
            restaurant_id, store_id
        )

        # Assert
        assert result is not None
        assert result.restaurant_id == restaurant_id
        assert result.store_id == store_id
        mock_db_service.find_one.assert_called_once()

    @pytest.mark.asyncio
    async def test_set_active_layout_success(
        self, table_layout_service, mock_db_service,
        sample_layout, sample_layout_config
    ):
        """Test setting a layout as active"""
        # Arrange
        restaurant_id = "rest-123"
        store_id = "store-456"
        layout_id = str(uuid4())

        # Mock operations
        table_layout_service.get_layout = AsyncMock(return_value=sample_layout)
        table_layout_service.get_layout_config = AsyncMock(
            return_value=sample_layout_config
        )
        mock_db_service.update_one.return_value = True

        # Act
        result = await table_layout_service.set_active_layout(
            restaurant_id, store_id, layout_id
        )

        # Assert
        assert result is True
        mock_db_service.update_one.assert_called()


class TestTableLayoutServiceIntegration:
    """Integration tests for TableLayoutService"""

    @pytest.mark.asyncio
    async def test_complete_layout_lifecycle(
        self, table_layout_service, mock_db_service, sample_layout_data
    ):
        """Test complete layout lifecycle from creation to deletion"""
        # Setup mocks for the entire flow
        created_layout = None

        async def mock_insert(collection, data):
            nonlocal created_layout
            created_layout = data
            return True

        async def mock_find_one(collection, query):
            if collection == "table_layouts" and created_layout:
                if query.get("id") == created_layout.get("id"):
                    return created_layout
            return None

        mock_db_service.insert_one = mock_insert
        mock_db_service.find_one = mock_find_one
        mock_db_service.update_one.return_value = True
        mock_db_service.delete_one.return_value = True
        mock_db_service.find.return_value = []

        # 1. Create layout
        layout = await table_layout_service.create_layout(sample_layout_data)
        assert layout is not None
        assert layout.name == sample_layout_data["name"]

        # 2. Get layout
        table_layout_service.get_layout = AsyncMock(return_value=layout)
        retrieved = await table_layout_service.get_layout(layout.id)
        assert retrieved is not None
        assert retrieved.id == layout.id

        # 3. Update layout
        update_data = {"name": "Updated Floor"}
        updated = await table_layout_service.update_layout(layout.id, update_data)
        assert updated is not None

        # 4. Delete layout
        table_layout_service.get_layout_config = AsyncMock(return_value=None)
        deleted = await table_layout_service.delete_layout(layout.id)
        assert deleted is True

    @pytest.mark.asyncio
    async def test_multiple_layouts_management(
        self, table_layout_service, mock_db_service
    ):
        """Test managing multiple layouts for a restaurant"""
        # Arrange
        restaurant_id = "rest-123"
        store_id = "store-456"

        layouts_data = [
            {"name": f"Floor {i}", "restaurant_id": restaurant_id, "store_id": store_id}
            for i in range(3)
        ]

        created_layouts = []

        # Mock database operations
        mock_db_service.insert_one.return_value = True
        mock_db_service.find_one.return_value = None
        mock_db_service.find.return_value = []

        # Create multiple layouts
        for layout_data in layouts_data:
            layout = await table_layout_service.create_layout(layout_data)
            created_layouts.append(layout)

        # Verify all layouts were created
        assert len(created_layouts) == 3
        assert all(l.restaurant_id == restaurant_id for l in created_layouts)
        assert all(l.store_id == store_id for l in created_layouts)
