import os
import sys
import unittest
import uuid

# Add the parent directory to the path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Import test modules
from src.accounts.services.accounts_service import AccountsService

# Import inventory models for end-to-end testing
from src.inventory.models.inventory_models import (
    FinancialEntryType,
    InventoryItemCreate,
    InventoryLossCreate,
    LossReason,
    TransactionStatus,
    TransactionType,
)

# Import services for end-to-end testing
from src.inventory.services.inventory_service import InventoryService
from src.inventory.tests.test_inventory_financial_integration import (
    TestInventoryFinancialIntegration,
)
from src.inventory.tests.test_inventory_router import TestInventoryRouter
from src.inventory.tests.test_inventory_service import TestInventoryService


class TestInventoryEndToEnd(unittest.TestCase):
    """End-to-end tests for the inventory module."""

    async def test_inventory_loss_financial_flow(self):
        """Test the complete flow of inventory loss with financial posting."""
        # Initialize services
        accounts_service = AccountsService()
        inventory_service = InventoryService(accounts_service=accounts_service)

        # 1. Create an inventory item
        item_create = InventoryItemCreate(
            name="Test Product",
            description="Test product for end-to-end testing",
            sku="E2E-001",
            unit_of_measure_id=uuid.uuid4(),
            initial_stock=100,
            cost_per_unit=25.0,
            minimum_stock=10,
            reorder_point=20,
        )

        item = await inventory_service.create_inventory_item(item_create)
        self.assertEqual(item.current_stock, 100)
        self.assertEqual(item.value, 2500.0)  # 100 * 25.0

        # 2. Report a loss
        reporter_id = uuid.uuid4()
        loss_create = InventoryLossCreate(
            item_id=item.id,
            quantity=15,
            reason=LossReason.BREAKAGE,
            notes="End-to-end test loss",
            reported_by=reporter_id,
        )

        loss = await inventory_service.report_loss(loss_create)
        self.assertEqual(loss.status, TransactionStatus.PENDING)

        # 3. Approve the loss
        approver_id = uuid.uuid4()
        approved_loss = await inventory_service.approve_loss(loss.id, approver_id)
        self.assertEqual(approved_loss.status, TransactionStatus.APPROVED)

        # 4. Verify stock update
        updated_item = await inventory_service.get_inventory_item(item.id)
        self.assertEqual(updated_item.current_stock, 85)  # 100 - 15
        self.assertEqual(updated_item.value, 2125.0)  # 85 * 25.0

        # 5. Verify financial entry
        self.assertIsNotNone(approved_loss.financial_entry_id)
        financial_entry = inventory_service._financial_entries_db[
            approved_loss.financial_entry_id
        ]
        self.assertEqual(financial_entry.entry_type, FinancialEntryType.INVENTORY_LOSS)
        self.assertEqual(financial_entry.amount, 375.0)  # 15 * 25.0
        self.assertTrue(financial_entry.is_posted)

        # 6. Verify transaction
        transaction = await inventory_service.get_transaction(
            approved_loss.transaction_id
        )
        self.assertEqual(transaction.transaction_type, TransactionType.LOSS)
        self.assertEqual(transaction.status, TransactionStatus.APPROVED)
        self.assertEqual(transaction.previous_stock, 100)
        self.assertEqual(transaction.new_stock, 85)
        self.assertEqual(transaction.value_change, -375.0)  # Negative for loss


def run_tests():
    """Run all inventory module tests."""
    # Create a test suite
    suite = unittest.TestSuite()

    # Add service tests
    service_tests = unittest.defaultTestLoader.loadTestsFromTestCase(
        TestInventoryService
    )
    suite.addTests(service_tests)

    # Add router tests
    router_tests = unittest.defaultTestLoader.loadTestsFromTestCase(TestInventoryRouter)
    suite.addTests(router_tests)

    # Add financial integration tests
    integration_tests = unittest.defaultTestLoader.loadTestsFromTestCase(
        TestInventoryFinancialIntegration
    )
    suite.addTests(integration_tests)

    # Add end-to-end tests
    end_to_end_tests = unittest.defaultTestLoader.loadTestsFromTestCase(
        TestInventoryEndToEnd
    )
    suite.addTests(end_to_end_tests)

    # Run the tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
