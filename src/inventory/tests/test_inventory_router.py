import unittest
import uuid
from datetime import datetime
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.inventory.models.inventory_models import (
    InventoryItem,
    InventoryLoss,
    LossReason,
    TransactionStatus,
)
from src.inventory.router.inventory_router import router

# Create a test app
app = FastAPI()
app.include_router(router)
client = TestClient(app)


class TestInventoryRouter(unittest.TestCase):
    """Test cases for the inventory router endpoints."""

    @patch("src.inventory.router.inventory_router.get_inventory_service")
    def test_create_inventory_item(self, mock_get_service):
        """Test creating an inventory item via API."""
        # Setup mock
        mock_service = AsyncMock()
        mock_service.create_inventory_item.return_value = InventoryItem(
            id=uuid.uuid4(),
            name="Test Item",
            description="Test Description",
            sku="TEST-001",
            unit_of_measure_id=uuid.uuid4(),
            current_stock=100,
            cost_per_unit=10.0,
            value=1000.0,
            minimum_stock=10,
            reorder_point=20,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            last_stock_update=datetime.utcnow(),
        )
        mock_get_service.return_value = mock_service

        # Test request
        response = client.post(
            "/inventory/items",
            json={
                "name": "Test Item",
                "description": "Test Description",
                "sku": "TEST-001",
                "unit_of_measure_id": str(uuid.uuid4()),
                "initial_stock": 100,
                "cost_per_unit": 10.0,
                "minimum_stock": 10,
                "reorder_point": 20,
            },
        )

        # Assertions
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["name"], "Test Item")
        self.assertEqual(response.json()["current_stock"], 100)
        self.assertEqual(response.json()["value"], 1000.0)

    @patch("src.inventory.router.inventory_router.get_inventory_service")
    def test_list_inventory_items(self, mock_get_service):
        """Test listing inventory items via API."""
        # Setup mock
        mock_service = AsyncMock()
        mock_service.list_inventory_items.return_value = [
            InventoryItem(
                id=uuid.uuid4(),
                name="Test Item 1",
                description="Test Description 1",
                sku="TEST-001",
                unit_of_measure_id=uuid.uuid4(),
                current_stock=100,
                cost_per_unit=10.0,
                value=1000.0,
                minimum_stock=10,
                reorder_point=20,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                last_stock_update=datetime.utcnow(),
            ),
            InventoryItem(
                id=uuid.uuid4(),
                name="Test Item 2",
                description="Test Description 2",
                sku="TEST-002",
                unit_of_measure_id=uuid.uuid4(),
                current_stock=50,
                cost_per_unit=20.0,
                value=1000.0,
                minimum_stock=5,
                reorder_point=10,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                last_stock_update=datetime.utcnow(),
            ),
        ]
        mock_get_service.return_value = mock_service

        # Test request
        response = client.get("/inventory/items")

        # Assertions
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)
        self.assertEqual(response.json()[0]["name"], "Test Item 1")
        self.assertEqual(response.json()[1]["name"], "Test Item 2")

    @patch("src.inventory.router.inventory_router.get_inventory_service")
    def test_report_loss(self, mock_get_service):
        """Test reporting an inventory loss via API."""
        # Setup mock
        mock_service = AsyncMock()
        item_id = uuid.uuid4()
        loss_id = uuid.uuid4()
        transaction_id = uuid.uuid4()
        reporter_id = uuid.uuid4()

        mock_service.report_loss.return_value = InventoryLoss(
            id=loss_id,
            item_id=item_id,
            quantity=20,
            reason=LossReason.SPOILAGE,
            notes="Test loss",
            reported_by=reporter_id,
            transaction_id=transaction_id,
            value=200.0,
            status=TransactionStatus.PENDING,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        mock_get_service.return_value = mock_service

        # Test request
        response = client.post(
            "/inventory/losses",
            json={
                "item_id": str(item_id),
                "quantity": 20,
                "reason": "spoilage",
                "notes": "Test loss",
                "reported_by": str(reporter_id),
            },
        )

        # Assertions
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["item_id"], str(item_id))
        self.assertEqual(response.json()["quantity"], 20)
        self.assertEqual(response.json()["reason"], "spoilage")
        self.assertEqual(response.json()["value"], 200.0)
        self.assertEqual(response.json()["status"], "pending")

    @patch("src.inventory.router.inventory_router.get_inventory_service")
    def test_approve_loss(self, mock_get_service):
        """Test approving an inventory loss via API."""
        # Setup mock
        mock_service = AsyncMock()
        item_id = uuid.uuid4()
        loss_id = uuid.uuid4()
        transaction_id = uuid.uuid4()
        reporter_id = uuid.uuid4()
        approver_id = uuid.uuid4()
        financial_entry_id = uuid.uuid4()

        mock_service.approve_loss.return_value = InventoryLoss(
            id=loss_id,
            item_id=item_id,
            quantity=20,
            reason=LossReason.SPOILAGE,
            notes="Test loss",
            reported_by=reporter_id,
            transaction_id=transaction_id,
            financial_entry_id=financial_entry_id,
            value=200.0,
            status=TransactionStatus.APPROVED,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            approved_by=approver_id,
            approved_at=datetime.utcnow(),
        )
        mock_get_service.return_value = mock_service

        # Test request
        response = client.post(f"/inventory/losses/{loss_id}/approve")

        # Assertions
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], str(loss_id))
        self.assertEqual(response.json()["status"], "approved")
        self.assertEqual(response.json()["financial_entry_id"], str(financial_entry_id))
        self.assertIsNotNone(response.json()["approved_by"])
        self.assertIsNotNone(response.json()["approved_at"])


if __name__ == "__main__":
    unittest.main()
