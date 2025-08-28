"""
Tests for Queue Management Service
"""

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException
from src.queue.models.queue_models import (
    NotificationMethod,
    NotificationStatus,
    PartySize,
    QueueEntry,
    QueueEntryCreate,
    QueueEntryUpdate,
    QueueNotification,
    QueueStatus,
)
from src.queue.services.queue_service import QueueService


@pytest.fixture
def queue_service():
    """Create a QueueService instance with mocked dependencies"""
    service = QueueService()
    service.notification_service = AsyncMock()
    return service


@pytest.fixture
def sample_entry_data():
    """Sample data for creating a queue entry"""
    return QueueEntryCreate(
        customer_name="John Doe",
        customer_phone="11999998888",
        party_size=4,
        table_preferences=["window", "quiet"],
        notification_method=NotificationMethod.SMS,
        notes="Birthday celebration"
    )


@pytest.fixture
def sample_queue_entry():
    """Sample queue entry"""
    entry_id = uuid4()
    return QueueEntry(
        id=entry_id,
        customer_name="John Doe",
        customer_phone="11999998888",
        customer_id=None,
        party_size=4,
        party_size_category=PartySize.MEDIUM,
        status=QueueStatus.WAITING,
        position_in_queue=1,
        table_preferences=["window", "quiet"],
        notification_method=NotificationMethod.SMS,
        notes="Birthday celebration",
        check_in_time=datetime.utcnow(),
        estimated_wait_minutes=15,
        store_id="store-123",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        version=1
    )


class TestQueueService:
    """Test suite for QueueService"""

    @pytest.mark.asyncio
    async def test_add_to_queue_success(self, queue_service, sample_entry_data):
        """Test successfully adding a customer to the queue"""
        # Arrange
        store_id = "store-123"
        user_id = "user-456"
        terminal_id = "terminal-789"

        with patch('src.queue.services.queue_service.notify_data_change') as mock_notify:
            with patch('src.queue.services.queue_service.audit_logger.log') as mock_audit:
                # Act
                result = await queue_service.add_to_queue(
                    sample_entry_data,
                    store_id,
                    user_id,
                    terminal_id
                )

                # Assert
                assert result is not None
                assert result.customer_name == sample_entry_data.customer_name
                assert result.customer_phone == sample_entry_data.customer_phone
                assert result.party_size == sample_entry_data.party_size
                assert result.status == QueueStatus.WAITING
                assert result.position_in_queue == 1
                assert result.store_id == store_id
                assert result.party_size_category == PartySize.MEDIUM

                # Verify notifications
                mock_notify.assert_called_once()
                mock_audit.assert_called_once()

    @pytest.mark.asyncio
    async def test_add_to_queue_duplicate_phone(self, queue_service, sample_entry_data):
        """Test adding customer with same phone number already in queue"""
        # Arrange
        store_id = "store-123"
        user_id = "user-456"
        terminal_id = "terminal-789"

        # Add first customer
        with patch('src.queue.services.queue_service.notify_data_change'):
            with patch('src.queue.services.queue_service.audit_logger.log'):
                await queue_service.add_to_queue(
                    sample_entry_data,
                    store_id,
                    user_id,
                    terminal_id
                )

        # Act & Assert - Try to add same customer again
        with pytest.raises(HTTPException) as exc_info:
            await queue_service.add_to_queue(
                sample_entry_data,
                store_id,
                user_id,
                terminal_id
            )

        assert exc_info.value.status_code == 409
        assert "already in queue" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_update_queue_entry_success(self, queue_service, sample_queue_entry):
        """Test successfully updating a queue entry"""
        # Arrange
        entry_id = str(sample_queue_entry.id)
        queue_service.queue_entries[entry_id] = sample_queue_entry

        update_data = QueueEntryUpdate(
            party_size=6,
            notes="Birthday celebration for 6 people"
        )

        with patch('src.queue.services.queue_service.notify_data_change') as mock_notify:
            with patch('src.queue.services.queue_service.audit_logger.log') as mock_audit:
                with patch('src.queue.services.queue_service.optimistic_lock_manager.validate_version'):
                    # Act
                    result = await queue_service.update_queue_entry(
                        entry_id,
                        update_data,
                        "user-456",
                        "terminal-789"
                    )

                    # Assert
                    assert result.party_size == 6
                    assert "6 people" in result.notes
                    assert result.version == 2
                    mock_notify.assert_called_once()
                    mock_audit.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_queue_entry_not_found(self, queue_service):
        """Test updating non-existent queue entry"""
        # Arrange
        update_data = QueueEntryUpdate(party_size=6)

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await queue_service.update_queue_entry(
                "non-existent-id",
                update_data,
                "user-456",
                "terminal-789"
            )

        assert exc_info.value.status_code == 404
        assert "not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_notify_customer_success(self, queue_service, sample_queue_entry):
        """Test successfully notifying a customer"""
        # Arrange
        entry_id = str(sample_queue_entry.id)
        queue_service.queue_entries[entry_id] = sample_queue_entry

        notification = QueueNotification(
            id=uuid4(),
            queue_entry_id=sample_queue_entry.id,
            notification_type=NotificationMethod.SMS,
            status=NotificationStatus.SENT,
            message="Your table is ready",
            sent_at=datetime.utcnow(),
            created_at=datetime.utcnow()
        )

        queue_service.notification_service.send_notification.return_value = notification

        with patch('src.queue.services.queue_service.notify_data_change') as mock_notify:
            with patch('src.queue.services.queue_service.audit_logger.log') as mock_audit:
                # Act
                result = await queue_service.notify_customer(
                    entry_id,
                    "user-456",
                    "terminal-789"
                )

                # Assert
                assert result == notification
                assert sample_queue_entry.status == QueueStatus.NOTIFIED
                assert sample_queue_entry.notification_time is not None
                queue_service.notification_service.send_notification.assert_called_once()
                mock_notify.assert_called_once()
                mock_audit.assert_called_once()

    @pytest.mark.asyncio
    async def test_seat_customer_success(self, queue_service, sample_queue_entry):
        """Test successfully seating a customer"""
        # Arrange
        entry_id = str(sample_queue_entry.id)
        table_id = "table-001"
        queue_service.queue_entries[entry_id] = sample_queue_entry
        queue_service.queue_order = [entry_id]

        with patch('src.queue.services.queue_service.notify_data_change') as mock_notify:
            with patch('src.queue.services.queue_service.audit_logger.log') as mock_audit:
                # Act
                result = await queue_service.seat_customer(
                    entry_id,
                    table_id,
                    "user-456",
                    "terminal-789"
                )

                # Assert
                assert result.status == QueueStatus.SEATED
                assert result.seated_time is not None
                assert str(result.assigned_table_id) == table_id
                assert entry_id not in queue_service.queue_order
                mock_notify.assert_called()
                mock_audit.assert_called_once()

    @pytest.mark.asyncio
    async def test_mark_no_show(self, queue_service, sample_queue_entry):
        """Test marking a customer as no-show"""
        # Arrange
        entry_id = str(sample_queue_entry.id)
        sample_queue_entry.status = QueueStatus.NOTIFIED
        queue_service.queue_entries[entry_id] = sample_queue_entry
        queue_service.queue_order = [entry_id]

        with patch('src.queue.services.queue_service.notify_data_change') as mock_notify:
            with patch('src.queue.services.queue_service.audit_logger.log') as mock_audit:
                # Act
                result = await queue_service.mark_no_show(entry_id)

                # Assert
                assert result.status == QueueStatus.NO_SHOW
                assert entry_id not in queue_service.queue_order
                mock_notify.assert_called()
                mock_audit.assert_called_once()

    @pytest.mark.asyncio
    async def test_cancel_entry(self, queue_service, sample_queue_entry):
        """Test cancelling a queue entry"""
        # Arrange
        entry_id = str(sample_queue_entry.id)
        queue_service.queue_entries[entry_id] = sample_queue_entry
        queue_service.queue_order = [entry_id]

        with patch('src.queue.services.queue_service.notify_data_change') as mock_notify:
            with patch('src.queue.services.queue_service.audit_logger.log') as mock_audit:
                # Act
                result = await queue_service.cancel_entry(
                    entry_id,
                    "Customer request",
                    "user-456",
                    "terminal-789"
                )

                # Assert
                assert result.status == QueueStatus.CANCELLED
                assert "Customer request" in result.notes
                assert entry_id not in queue_service.queue_order
                mock_notify.assert_called()
                mock_audit.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_queue_list(self, queue_service):
        """Test getting queue list with filters"""
        # Arrange
        store_id = "store-123"

        # Add multiple entries with different statuses
        for i in range(3):
            entry = QueueEntry(
                id=uuid4(),
                customer_name=f"Customer {i}",
                customer_phone=f"1199999000{i}",
                party_size=2,
                party_size_category=PartySize.SMALL,
                status=QueueStatus.WAITING if i < 2 else QueueStatus.SEATED,
                position_in_queue=i + 1,
                check_in_time=datetime.utcnow(),
                store_id=store_id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            entry_id = str(entry.id)
            queue_service.queue_entries[entry_id] = entry
            if i < 2:
                queue_service.queue_order.append(entry_id)

        # Act
        all_entries = await queue_service.get_queue_list(store_id)
        waiting_entries = await queue_service.get_queue_list(
            store_id,
            status_filter=QueueStatus.WAITING
        )

        # Assert
        assert len(all_entries) == 2  # Only entries in queue_order
        assert len(waiting_entries) == 2
        assert all(e.status == QueueStatus.WAITING for e in waiting_entries)

    @pytest.mark.asyncio
    async def test_get_position(self, queue_service, sample_queue_entry):
        """Test getting position in queue"""
        # Arrange
        entry_id = str(sample_queue_entry.id)
        queue_service.queue_entries[entry_id] = sample_queue_entry
        queue_service.queue_order = ["other-1", "other-2", entry_id]

        # Act
        position = await queue_service.get_position(entry_id)

        # Assert
        assert position.position == 3
        assert position.total_ahead == 2
        assert position.status == QueueStatus.WAITING
        assert position.estimated_wait_minutes >= 5

    @pytest.mark.asyncio
    async def test_estimate_wait_time(self, queue_service):
        """Test estimating wait time"""
        # Arrange
        party_size = 4
        store_id = "store-123"

        # Add some entries to queue
        for i in range(3):
            queue_service.queue_order.append(f"entry-{i}")

        # Act
        estimate = await queue_service.estimate_wait_time(party_size, store_id)

        # Assert
        assert estimate.party_size == party_size
        assert estimate.estimated_minutes >= 5  # Minimum 5 minutes
        assert estimate.confidence_level <= 1.0
        assert "queue_size" in estimate.factors
        assert estimate.factors["queue_size"] == 3

    @pytest.mark.asyncio
    async def test_get_statistics(self, queue_service):
        """Test getting queue statistics"""
        # Arrange
        store_id = "store-123"

        # Add entries with various statuses
        statuses = [QueueStatus.WAITING, QueueStatus.WAITING, QueueStatus.NO_SHOW, QueueStatus.SEATED]
        for i, status in enumerate(statuses):
            entry = QueueEntry(
                id=uuid4(),
                customer_name=f"Customer {i}",
                customer_phone=f"1199999000{i}",
                party_size=(i % 3) + 1,
                party_size_category=PartySize.SMALL if i < 2 else PartySize.MEDIUM,
                status=status,
                position_in_queue=i + 1,
                check_in_time=datetime.utcnow() - timedelta(minutes=30),
                store_id=store_id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            if status == QueueStatus.SEATED:
                entry.seated_time = datetime.utcnow()

            queue_service.queue_entries[str(entry.id)] = entry

        # Act
        stats = await queue_service.get_statistics(store_id)

        # Assert
        assert stats.total_in_queue == 2  # Only WAITING entries
        assert stats.no_show_rate > 0
        assert isinstance(stats.parties_by_size, dict)
        assert PartySize.SMALL.value in stats.parties_by_size

    @pytest.mark.asyncio
    async def test_suggest_tables(self, queue_service, sample_queue_entry):
        """Test table suggestions for a queue entry"""
        # Arrange
        entry_id = str(sample_queue_entry.id)
        queue_service.queue_entries[entry_id] = sample_queue_entry

        available_tables = [
            {
                "id": "table-1",
                "number": 1,
                "seats": 4,
                "features": ["window", "quiet"]
            },
            {
                "id": "table-2",
                "number": 2,
                "seats": 6,
                "features": ["outdoor"]
            },
            {
                "id": "table-3",
                "number": 3,
                "seats": 2,
                "features": []
            }
        ]

        # Act
        suggestions = await queue_service.suggest_tables(entry_id, available_tables)

        # Assert
        assert len(suggestions) <= 5
        assert suggestions[0].table_number == 1  # Best match
        assert suggestions[0].score > 0
        assert len(suggestions[0].reasons) > 0
        assert "Tamanho perfeito" in suggestions[0].reasons

        # Table 3 should not be suggested (too small)
        assert not any(s.table_number == 3 for s in suggestions)


class TestQueueServiceIntegration:
    """Integration tests for QueueService"""

    @pytest.mark.asyncio
    async def test_complete_queue_flow(self, queue_service, sample_entry_data):
        """Test complete queue flow from entry to seating"""
        store_id = "store-123"
        user_id = "user-456"
        terminal_id = "terminal-789"

        with patch('src.queue.services.queue_service.notify_data_change'):
            with patch('src.queue.services.queue_service.audit_logger.log'):
                # 1. Add to queue
                entry = await queue_service.add_to_queue(
                    sample_entry_data,
                    store_id,
                    user_id,
                    terminal_id
                )
                entry_id = str(entry.id)
                assert entry.status == QueueStatus.WAITING
                assert entry.position_in_queue == 1

                # 2. Check position
                position = await queue_service.get_position(entry_id)
                assert position.position == 1
                assert position.total_ahead == 0

                # 3. Notify customer
                notification = QueueNotification(
                    id=uuid4(),
                    queue_entry_id=entry.id,
                    notification_type=NotificationMethod.SMS,
                    status=NotificationStatus.SENT,
                    message="Your table is ready",
                    sent_at=datetime.utcnow(),
                    created_at=datetime.utcnow()
                )
                queue_service.notification_service.send_notification.return_value = notification

                await queue_service.notify_customer(entry_id, user_id, terminal_id)
                assert queue_service.queue_entries[entry_id].status == QueueStatus.NOTIFIED

                # 4. Seat customer
                result = await queue_service.seat_customer(
                    entry_id,
                    "table-001",
                    user_id,
                    terminal_id
                )
                assert result.status == QueueStatus.SEATED
                assert result.actual_wait_minutes is not None
                assert entry_id not in queue_service.queue_order

    @pytest.mark.asyncio
    async def test_party_size_categorization(self, queue_service):
        """Test party size categorization logic"""
        # Test different party sizes
        test_cases = [
            (1, PartySize.SMALL),
            (2, PartySize.SMALL),
            (3, PartySize.MEDIUM),
            (4, PartySize.MEDIUM),
            (5, PartySize.LARGE),
            (6, PartySize.LARGE),
            (7, PartySize.XLARGE),
            (10, PartySize.XLARGE),
        ]

        for size, expected_category in test_cases:
            category = queue_service._get_party_size_category(size)
            assert category == expected_category

    @pytest.mark.asyncio
    async def test_position_recalculation(self, queue_service):
        """Test position recalculation after removing entries"""
        # Arrange
        store_id = "store-123"
        entries = []

        for i in range(5):
            entry = QueueEntry(
                id=uuid4(),
                customer_name=f"Customer {i}",
                customer_phone=f"1199999000{i}",
                party_size=2,
                party_size_category=PartySize.SMALL,
                status=QueueStatus.WAITING,
                position_in_queue=i + 1,
                check_in_time=datetime.utcnow(),
                store_id=store_id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            entry_id = str(entry.id)
            queue_service.queue_entries[entry_id] = entry
            queue_service.queue_order.append(entry_id)
            entries.append((entry_id, entry))

        with patch('src.queue.services.queue_service.notify_data_change'):
            # Remove middle entry
            middle_entry_id = entries[2][0]
            queue_service.queue_order.remove(middle_entry_id)
            await queue_service._recalculate_positions()

            # Check positions are updated correctly
            for i, (entry_id, _) in enumerate(entries):
                if entry_id != middle_entry_id:
                    entry = queue_service.queue_entries[entry_id]
                    if i < 2:
                        assert entry.position_in_queue == i + 1
                    else:
                        assert entry.position_in_queue == i  # One less due to removal
