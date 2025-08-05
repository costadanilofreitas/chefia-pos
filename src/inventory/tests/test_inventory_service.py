import unittest
from unittest.mock import patch
import uuid

from src.inventory.models.inventory_models import (
    InventoryItemCreate, InventoryItemUpdate,
    InventoryTransactionCreate, TransactionType, TransactionStatus,
    InventoryLossCreate, LossReason
)
from src.inventory.services.inventory_service import InventoryService

class TestInventoryService(unittest.TestCase):
    """Test cases for the InventoryService class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.inventory_service = InventoryService()
        # Clear in-memory storage before each test
        self.inventory_service._inventory_items_db = {}
        self.inventory_service._inventory_transactions_db = {}
        self.inventory_service._inventory_losses_db = {}
        self.inventory_service._inventory_counts_db = {}
        self.inventory_service._financial_entries_db = {}
    
    async def create_test_item(self):
        """Helper to create a test inventory item."""
        item_create = InventoryItemCreate(
            name="Test Item",
            description="Test Description",
            sku="TEST-001",
            unit_of_measure_id=uuid.uuid4(),
            initial_stock=100,
            cost_per_unit=10.0,
            minimum_stock=10,
            reorder_point=20
        )
        return await self.inventory_service.create_inventory_item(item_create)
    
    @patch('src.inventory.services.inventory_service._inventory_items_db', {})
    @patch('src.inventory.services.inventory_service._inventory_transactions_db', {})
    async def test_create_inventory_item(self):
        """Test creating an inventory item."""
        item_create = InventoryItemCreate(
            name="Test Item",
            description="Test Description",
            sku="TEST-001",
            unit_of_measure_id=uuid.uuid4(),
            initial_stock=100,
            cost_per_unit=10.0,
            minimum_stock=10,
            reorder_point=20
        )
        
        item = await self.inventory_service.create_inventory_item(item_create)
        
        self.assertEqual(item.name, "Test Item")
        self.assertEqual(item.description, "Test Description")
        self.assertEqual(item.sku, "TEST-001")
        self.assertEqual(item.current_stock, 100)
        self.assertEqual(item.cost_per_unit, 10.0)
        self.assertEqual(item.value, 1000.0)  # 100 * 10.0
        self.assertEqual(item.minimum_stock, 10)
        self.assertEqual(item.reorder_point, 20)
        self.assertTrue(item.is_active)
        
        # Verify that an initial transaction was created
        transactions = await self.inventory_service.list_transactions(item_id=item.id)
        self.assertEqual(len(transactions), 1)
        self.assertEqual(transactions[0].transaction_type, TransactionType.INITIAL)
        self.assertEqual(transactions[0].quantity, 100)
        self.assertEqual(transactions[0].unit_cost, 10.0)
        self.assertEqual(transactions[0].status, TransactionStatus.APPROVED)
    
    @patch('src.inventory.services.inventory_service._inventory_items_db', {})
    async def test_get_inventory_item(self):
        """Test retrieving an inventory item."""
        item = await self.create_test_item()
        
        retrieved_item = await self.inventory_service.get_inventory_item(item.id)
        
        self.assertEqual(retrieved_item.id, item.id)
        self.assertEqual(retrieved_item.name, item.name)
        self.assertEqual(retrieved_item.current_stock, item.current_stock)
    
    @patch('src.inventory.services.inventory_service._inventory_items_db', {})
    async def test_list_inventory_items(self):
        """Test listing inventory items with filters."""
        # Create multiple items
        item1 = await self.create_test_item()
        
        item2_create = InventoryItemCreate(
            name="Another Item",
            description="Another Description",
            sku="TEST-002",
            unit_of_measure_id=uuid.uuid4(),
            initial_stock=5,
            cost_per_unit=20.0,
            minimum_stock=10,
            reorder_point=15
        )
        item2 = await self.inventory_service.create_inventory_item(item2_create)
        
        # Test listing all items
        items = await self.inventory_service.list_inventory_items()
        self.assertEqual(len(items), 2)
        
        # Test search filter
        items = await self.inventory_service.list_inventory_items(search="Another")
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].id, item2.id)
        
        # Test low stock filter
        items = await self.inventory_service.list_inventory_items(low_stock_only=True)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].id, item2.id)
    
    @patch('src.inventory.services.inventory_service._inventory_items_db', {})
    async def test_update_inventory_item(self):
        """Test updating an inventory item."""
        item = await self.create_test_item()
        
        item_update = InventoryItemUpdate(
            name="Updated Item",
            description="Updated Description",
            cost_per_unit=15.0
        )
        
        updated_item = await self.inventory_service.update_inventory_item(item.id, item_update)
        
        self.assertEqual(updated_item.name, "Updated Item")
        self.assertEqual(updated_item.description, "Updated Description")
        self.assertEqual(updated_item.cost_per_unit, 15.0)
        self.assertEqual(updated_item.value, 1500.0)  # 100 * 15.0
    
    @patch('src.inventory.services.inventory_service._inventory_items_db', {})
    async def test_delete_inventory_item(self):
        """Test deleting (soft delete) an inventory item."""
        item = await self.create_test_item()
        
        success = await self.inventory_service.delete_inventory_item(item.id)
        self.assertTrue(success)
        
        # Item should still exist but be inactive
        item = await self.inventory_service.get_inventory_item(item.id)
        self.assertFalse(item.is_active)
    
    @patch('src.inventory.services.inventory_service._inventory_items_db', {})
    @patch('src.inventory.services.inventory_service._inventory_transactions_db', {})
    async def test_create_transaction(self):
        """Test creating an inventory transaction."""
        item = await self.create_test_item()
        
        # Create a purchase transaction
        transaction_create = InventoryTransactionCreate(
            item_id=item.id,
            quantity=50,
            transaction_type=TransactionType.PURCHASE,
            notes="Test purchase"
        )
        
        transaction = await self.inventory_service.create_transaction(transaction_create)
        
        self.assertEqual(transaction.item_id, item.id)
        self.assertEqual(transaction.quantity, 50)
        self.assertEqual(transaction.transaction_type, TransactionType.PURCHASE)
        self.assertEqual(transaction.notes, "Test purchase")
        self.assertEqual(transaction.previous_stock, 100)
        self.assertEqual(transaction.new_stock, 150)
        self.assertEqual(transaction.value_change, 500.0)  # 50 * 10.0
        self.assertEqual(transaction.status, TransactionStatus.APPROVED)
        
        # Verify that the item stock was updated
        updated_item = await self.inventory_service.get_inventory_item(item.id)
        self.assertEqual(updated_item.current_stock, 150)
        self.assertEqual(updated_item.value, 1500.0)  # 150 * 10.0
    
    @patch('src.inventory.services.inventory_service._inventory_items_db', {})
    @patch('src.inventory.services.inventory_service._inventory_transactions_db', {})
    @patch('src.inventory.services.inventory_service._inventory_losses_db', {})
    async def test_report_loss(self):
        """Test reporting an inventory loss."""
        item = await self.create_test_item()
        
        loss_create = InventoryLossCreate(
            item_id=item.id,
            quantity=20,
            reason=LossReason.SPOILAGE,
            notes="Test loss",
            reported_by=uuid.uuid4()
        )
        
        loss = await self.inventory_service.report_loss(loss_create)
        
        self.assertEqual(loss.item_id, item.id)
        self.assertEqual(loss.quantity, 20)
        self.assertEqual(loss.reason, LossReason.SPOILAGE)
        self.assertEqual(loss.notes, "Test loss")
        self.assertEqual(loss.value, 200.0)  # 20 * 10.0
        self.assertEqual(loss.status, TransactionStatus.PENDING)
        
        # Verify that a transaction was created
        self.assertIsNotNone(loss.transaction_id)
        transaction = await self.inventory_service.get_transaction(loss.transaction_id)
        self.assertEqual(transaction.transaction_type, TransactionType.LOSS)
        self.assertEqual(transaction.quantity, 20)
        self.assertEqual(transaction.status, TransactionStatus.PENDING)
        
        # Verify that the item stock was not yet updated (pending approval)
        item = await self.inventory_service.get_inventory_item(item.id)
        self.assertEqual(item.current_stock, 100)
    
    @patch('src.inventory.services.inventory_service._inventory_items_db', {})
    @patch('src.inventory.services.inventory_service._inventory_transactions_db', {})
    @patch('src.inventory.services.inventory_service._inventory_losses_db', {})
    @patch('src.inventory.services.inventory_service._financial_entries_db', {})
    async def test_approve_loss(self):
        """Test approving an inventory loss."""
        item = await self.create_test_item()
        
        loss_create = InventoryLossCreate(
            item_id=item.id,
            quantity=20,
            reason=LossReason.SPOILAGE,
            notes="Test loss",
            reported_by=uuid.uuid4()
        )
        
        loss = await self.inventory_service.report_loss(loss_create)
        
        # Approve the loss
        approver_id = uuid.uuid4()
        approved_loss = await self.inventory_service.approve_loss(loss.id, approver_id)
        
        self.assertEqual(approved_loss.status, TransactionStatus.APPROVED)
        self.assertEqual(approved_loss.approved_by, approver_id)
        self.assertIsNotNone(approved_loss.approved_at)
        
        # Verify that the transaction was approved
        transaction = await self.inventory_service.get_transaction(loss.transaction_id)
        self.assertEqual(transaction.status, TransactionStatus.APPROVED)
        
        # Verify that the item stock was updated
        item = await self.inventory_service.get_inventory_item(item.id)
        self.assertEqual(item.current_stock, 80)  # 100 - 20
        
        # Verify that a financial entry was created
        self.assertIsNotNone(approved_loss.financial_entry_id)
    
    @patch('src.inventory.services.inventory_service._inventory_items_db', {})
    @patch('src.inventory.services.inventory_service._inventory_transactions_db', {})
    @patch('src.inventory.services.inventory_service._inventory_losses_db', {})
    async def test_reject_loss(self):
        """Test rejecting an inventory loss."""
        item = await self.create_test_item()
        
        loss_create = InventoryLossCreate(
            item_id=item.id,
            quantity=20,
            reason=LossReason.SPOILAGE,
            notes="Test loss",
            reported_by=uuid.uuid4()
        )
        
        loss = await self.inventory_service.report_loss(loss_create)
        
        # Reject the loss
        approver_id = uuid.uuid4()
        rejected_loss = await self.inventory_service.reject_loss(loss.id, approver_id)
        
        self.assertEqual(rejected_loss.status, TransactionStatus.REJECTED)
        self.assertEqual(rejected_loss.approved_by, approver_id)
        self.assertIsNotNone(rejected_loss.approved_at)
        
        # Verify that the transaction was rejected
        transaction = await self.inventory_service.get_transaction(loss.transaction_id)
        self.assertEqual(transaction.status, TransactionStatus.REJECTED)
        
        # Verify that the item stock was not updated
        item = await self.inventory_service.get_inventory_item(item.id)
        self.assertEqual(item.current_stock, 100)

if __name__ == '__main__':
    unittest.main()
