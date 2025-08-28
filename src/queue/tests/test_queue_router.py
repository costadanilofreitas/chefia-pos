"""
Tests for Queue Management Router
"""

from datetime import datetime
from unittest.mock import AsyncMock, patch
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from src.core.models.user import User
from src.queue.models.queue_models import (
    NotificationMethod,
    NotificationStatus,
    PartySize,
    QueueEntry,
    QueueEntryCreate,
    QueueEntryUpdate,
    QueueNotification,
    QueuePosition,
    QueueStatistics,
    QueueStatus,
    TableSuggestion,
    WaitTimeEstimate,
)
from src.queue.router.queue_router import router


@pytest.fixture
def mock_current_user():
    """Create a mock current user"""
    return User(
        id=uuid4(),
        email="test@example.com",
        name="Test User",
        store_id="store-123",
        terminal_id="terminal-456",
        is_active=True,
        is_superuser=False
    )


@pytest.fixture
def mock_queue_service():
    """Create a mock queue service"""
    mock_service = AsyncMock()
    return mock_service


@pytest.fixture
def sample_queue_entry():
    """Sample queue entry for testing"""
    return QueueEntry(
        id=uuid4(),
        customer_name="John Doe",
        customer_phone="11999998888",
        party_size=4,
        party_size_category=PartySize.MEDIUM,
        status=QueueStatus.WAITING,
        position_in_queue=1,
        table_preferences=["window"],
        notification_method=NotificationMethod.SMS,
        check_in_time=datetime.utcnow(),
        estimated_wait_minutes=15,
        store_id="store-123",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )


class TestQueueRouter:
    """Test suite for Queue Management Router"""

    @pytest.mark.asyncio
    async def test_add_to_queue(self, mock_current_user, mock_queue_service, sample_queue_entry):
        """Test adding customer to queue endpoint"""
        # Arrange
        entry_data = QueueEntryCreate(
            customer_name="John Doe",
            customer_phone="11999998888",
            party_size=4,
            notification_method=NotificationMethod.SMS
        )

        mock_queue_service.add_to_queue.return_value = sample_queue_entry

        with patch('src.queue.router.queue_router.queue_service', mock_queue_service):
            with patch('src.queue.router.queue_router.get_current_user', return_value=mock_current_user):
                # Act
                result = await router.app.post(
                    "/",
                    json=entry_data.dict(),
                    headers={"Authorization": "Bearer fake-token"}
                )

                # Assert
                mock_queue_service.add_to_queue.assert_called_once_with(
                    entry_data=entry_data,
                    store_id=mock_current_user.store_id,
                    user_id=str(mock_current_user.id),
                    terminal_id=mock_current_user.terminal_id
                )

    @pytest.mark.asyncio
    async def test_list_queue(self, mock_current_user, mock_queue_service):
        """Test listing queue entries endpoint"""
        # Arrange
        mock_entries = [
            QueueEntry(
                id=uuid4(),
                customer_name=f"Customer {i}",
                customer_phone=f"1199999000{i}",
                party_size=2,
                party_size_category=PartySize.SMALL,
                status=QueueStatus.WAITING,
                position_in_queue=i+1,
                check_in_time=datetime.utcnow(),
                store_id="store-123",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            for i in range(3)
        ]

        mock_queue_service.get_queue_list.return_value = mock_entries

        with patch('src.queue.router.queue_router.queue_service', mock_queue_service):
            with patch('src.queue.router.queue_router.get_current_user', return_value=mock_current_user):
                # Act - Test without filter
                result = await router.app.get(
                    "/",
                    headers={"Authorization": "Bearer fake-token"}
                )

                # Assert
                mock_queue_service.get_queue_list.assert_called_with(
                    store_id=mock_current_user.store_id,
                    status_filter=None
                )

                # Act - Test with status filter
                result = await router.app.get(
                    "/?status=WAITING",
                    headers={"Authorization": "Bearer fake-token"}
                )

                # Assert
                mock_queue_service.get_queue_list.assert_called_with(
                    store_id=mock_current_user.store_id,
                    status_filter=QueueStatus.WAITING
                )

    @pytest.mark.asyncio
    async def test_get_queue_statistics(self, mock_current_user, mock_queue_service):
        """Test getting queue statistics endpoint"""
        # Arrange
        mock_stats = QueueStatistics(
            total_in_queue=5,
            average_wait_time=20.5,
            longest_wait=45,
            parties_by_size={
                "SMALL": 2,
                "MEDIUM": 2,
                "LARGE": 1,
                "XLARGE": 0
            },
            estimated_total_clear_time=102,
            no_show_rate=0.1,
            accuracy_last_24h=0.85
        )

        mock_queue_service.get_statistics.return_value = mock_stats

        with patch('src.queue.router.queue_router.queue_service', mock_queue_service):
            with patch('src.queue.router.queue_router.get_current_user', return_value=mock_current_user):
                # Act
                result = await router.app.get(
                    "/statistics",
                    headers={"Authorization": "Bearer fake-token"}
                )

                # Assert
                mock_queue_service.get_statistics.assert_called_once_with(
                    mock_current_user.store_id
                )

    @pytest.mark.asyncio
    async def test_estimate_wait_time(self, mock_current_user, mock_queue_service):
        """Test estimating wait time endpoint"""
        # Arrange
        party_size = 4
        mock_estimate = WaitTimeEstimate(
            party_size=party_size,
            estimated_minutes=25,
            confidence_level=0.75,
            factors={
                "queue_size": 3,
                "party_size": party_size,
                "size_factor": 1.0
            }
        )

        mock_queue_service.estimate_wait_time.return_value = mock_estimate

        with patch('src.queue.router.queue_router.queue_service', mock_queue_service):
            with patch('src.queue.router.queue_router.get_current_user', return_value=mock_current_user):
                # Act
                result = await router.app.get(
                    f"/estimate?party_size={party_size}",
                    headers={"Authorization": "Bearer fake-token"}
                )

                # Assert
                mock_queue_service.estimate_wait_time.assert_called_once_with(
                    party_size=party_size,
                    store_id=mock_current_user.store_id
                )

    @pytest.mark.asyncio
    async def test_get_queue_entry(self, mock_current_user, mock_queue_service, sample_queue_entry):
        """Test getting specific queue entry endpoint"""
        # Arrange
        entry_id = str(sample_queue_entry.id)
        mock_queue_service.queue_entries = {entry_id: sample_queue_entry}

        with patch('src.queue.router.queue_router.queue_service', mock_queue_service):
            with patch('src.queue.router.queue_router.get_current_user', return_value=mock_current_user):
                # Act - Entry exists
                result = await router.app.get(
                    f"/{entry_id}",
                    headers={"Authorization": "Bearer fake-token"}
                )

                # Assert
                assert result.status_code == 200

                # Act - Entry doesn't exist
                with pytest.raises(HTTPException) as exc_info:
                    await router.app.get(
                        "/non-existent-id",
                        headers={"Authorization": "Bearer fake-token"}
                    )
                assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_get_queue_position(self, mock_queue_service):
        """Test getting queue position endpoint"""
        # Arrange
        entry_id = str(uuid4())
        mock_position = QueuePosition(
            position=3,
            total_ahead=2,
            estimated_wait_minutes=30,
            status=QueueStatus.WAITING,
            last_updated=datetime.utcnow()
        )

        mock_queue_service.get_position.return_value = mock_position

        with patch('src.queue.router.queue_router.queue_service', mock_queue_service):
            # Act
            result = await router.app.get(f"/{entry_id}/position")

            # Assert
            mock_queue_service.get_position.assert_called_once_with(entry_id)

    @pytest.mark.asyncio
    async def test_update_queue_entry(self, mock_current_user, mock_queue_service, sample_queue_entry):
        """Test updating queue entry endpoint"""
        # Arrange
        entry_id = str(sample_queue_entry.id)
        update_data = QueueEntryUpdate(
            party_size=6,
            notes="Updated party size"
        )

        updated_entry = sample_queue_entry.copy()
        updated_entry.party_size = 6
        updated_entry.notes = "Updated party size"
        mock_queue_service.update_queue_entry.return_value = updated_entry

        with patch('src.queue.router.queue_router.queue_service', mock_queue_service):
            with patch('src.queue.router.queue_router.get_current_user', return_value=mock_current_user):
                # Act
                result = await router.app.put(
                    f"/{entry_id}",
                    json=update_data.dict(),
                    headers={"Authorization": "Bearer fake-token"}
                )

                # Assert
                mock_queue_service.update_queue_entry.assert_called_once_with(
                    entry_id=entry_id,
                    update_data=update_data,
                    user_id=str(mock_current_user.id),
                    terminal_id=mock_current_user.terminal_id
                )

    @pytest.mark.asyncio
    async def test_notify_customer(self, mock_current_user, mock_queue_service):
        """Test notifying customer endpoint"""
        # Arrange
        entry_id = str(uuid4())
        mock_notification = QueueNotification(
            id=uuid4(),
            queue_entry_id=UUID(entry_id),
            notification_type=NotificationMethod.SMS,
            status=NotificationStatus.SENT,
            message="Your table is ready",
            sent_at=datetime.utcnow(),
            created_at=datetime.utcnow()
        )

        mock_queue_service.notify_customer.return_value = mock_notification

        with patch('src.queue.router.queue_router.queue_service', mock_queue_service):
            with patch('src.queue.router.queue_router.get_current_user', return_value=mock_current_user):
                # Act
                result = await router.app.post(
                    f"/{entry_id}/notify",
                    headers={"Authorization": "Bearer fake-token"}
                )

                # Assert
                mock_queue_service.notify_customer.assert_called_once_with(
                    entry_id=entry_id,
                    user_id=str(mock_current_user.id),
                    terminal_id=mock_current_user.terminal_id
                )

    @pytest.mark.asyncio
    async def test_seat_customer(self, mock_current_user, mock_queue_service, sample_queue_entry):
        """Test seating customer endpoint"""
        # Arrange
        entry_id = str(sample_queue_entry.id)
        table_id = "table-001"

        seated_entry = sample_queue_entry.copy()
        seated_entry.status = QueueStatus.SEATED
        seated_entry.seated_time = datetime.utcnow()
        seated_entry.assigned_table_id = UUID(table_id)
        mock_queue_service.seat_customer.return_value = seated_entry

        with patch('src.queue.router.queue_router.queue_service', mock_queue_service):
            with patch('src.queue.router.queue_router.get_current_user', return_value=mock_current_user):
                # Act
                result = await router.app.post(
                    f"/{entry_id}/seat?table_id={table_id}",
                    headers={"Authorization": "Bearer fake-token"}
                )

                # Assert
                mock_queue_service.seat_customer.assert_called_once_with(
                    entry_id=entry_id,
                    table_id=table_id,
                    user_id=str(mock_current_user.id),
                    terminal_id=mock_current_user.terminal_id
                )

    @pytest.mark.asyncio
    async def test_mark_no_show(self, mock_current_user, mock_queue_service, sample_queue_entry):
        """Test marking customer as no-show endpoint"""
        # Arrange
        entry_id = str(sample_queue_entry.id)

        no_show_entry = sample_queue_entry.copy()
        no_show_entry.status = QueueStatus.NO_SHOW
        mock_queue_service.mark_no_show.return_value = no_show_entry

        with patch('src.queue.router.queue_router.queue_service', mock_queue_service):
            with patch('src.queue.router.queue_router.get_current_user', return_value=mock_current_user):
                # Act
                result = await router.app.post(
                    f"/{entry_id}/no-show",
                    headers={"Authorization": "Bearer fake-token"}
                )

                # Assert
                mock_queue_service.mark_no_show.assert_called_once_with(
                    entry_id=entry_id,
                    user_id=str(mock_current_user.id),
                    terminal_id=mock_current_user.terminal_id
                )

    @pytest.mark.asyncio
    async def test_cancel_queue_entry(self, mock_current_user, mock_queue_service, sample_queue_entry):
        """Test canceling queue entry endpoint"""
        # Arrange
        entry_id = str(sample_queue_entry.id)
        reason = "Customer request"

        cancelled_entry = sample_queue_entry.copy()
        cancelled_entry.status = QueueStatus.CANCELLED
        mock_queue_service.cancel_entry.return_value = cancelled_entry

        with patch('src.queue.router.queue_router.queue_service', mock_queue_service):
            with patch('src.queue.router.queue_router.get_current_user', return_value=mock_current_user):
                # Act
                result = await router.app.delete(
                    f"/{entry_id}?reason={reason}",
                    headers={"Authorization": "Bearer fake-token"}
                )

                # Assert
                mock_queue_service.cancel_entry.assert_called_once_with(
                    entry_id=entry_id,
                    reason=reason,
                    user_id=str(mock_current_user.id),
                    terminal_id=mock_current_user.terminal_id
                )

    @pytest.mark.asyncio
    async def test_get_table_suggestions(self, mock_current_user, mock_queue_service):
        """Test getting table suggestions endpoint"""
        # Arrange
        entry_id = str(uuid4())
        available_tables = [
            {"id": "table-1", "number": 1, "seats": 4},
            {"id": "table-2", "number": 2, "seats": 6}
        ]

        mock_suggestions = [
            TableSuggestion(
                table_id=UUID("table-1"),
                table_number=1,
                score=0.8,
                reasons=["Perfect size"],
                estimated_availability=None,
                requires_combination=False
            )
        ]

        mock_queue_service.suggest_tables.return_value = mock_suggestions

        with patch('src.queue.router.queue_router.queue_service', mock_queue_service):
            with patch('src.queue.router.queue_router.get_current_user', return_value=mock_current_user):
                # Act
                result = await router.app.post(
                    f"/{entry_id}/suggestions",
                    json=available_tables,
                    headers={"Authorization": "Bearer fake-token"}
                )

                # Assert
                mock_queue_service.suggest_tables.assert_called_once_with(
                    entry_id=entry_id,
                    available_tables=available_tables
                )

    @pytest.mark.asyncio
    async def test_get_public_queue_position(self, mock_queue_service):
        """Test public queue position endpoint"""
        # Arrange
        token = str(uuid4())
        mock_position = QueuePosition(
            position=2,
            total_ahead=1,
            estimated_wait_minutes=15,
            status=QueueStatus.WAITING,
            last_updated=datetime.utcnow()
        )

        mock_queue_service.get_position.return_value = mock_position

        with patch('src.queue.router.queue_router.queue_service', mock_queue_service):
            # Act
            result = await router.app.get(f"/public/{token}")

            # Assert
            mock_queue_service.get_position.assert_called_once_with(token)

    @pytest.mark.asyncio
    async def test_leave_queue_public(self, mock_queue_service, sample_queue_entry):
        """Test public leave queue endpoint"""
        # Arrange
        token = str(uuid4())

        cancelled_entry = sample_queue_entry.copy()
        cancelled_entry.status = QueueStatus.CANCELLED
        mock_queue_service.cancel_entry.return_value = cancelled_entry

        with patch('src.queue.router.queue_router.queue_service', mock_queue_service):
            # Act
            result = await router.app.post(f"/public/{token}/leave")

            # Assert
            mock_queue_service.cancel_entry.assert_called_once_with(
                entry_id=token,
                reason="Customer left queue",
                user_id="customer",
                terminal_id="public"
            )


class TestQueueRouterValidation:
    """Test validation in Queue Router"""

    @pytest.mark.asyncio
    async def test_party_size_validation(self, mock_current_user, mock_queue_service):
        """Test party size validation in estimate endpoint"""
        with patch('src.queue.router.queue_router.queue_service', mock_queue_service):
            with patch('src.queue.router.queue_router.get_current_user', return_value=mock_current_user):
                # Test invalid party size (too small)
                with pytest.raises(ValueError):
                    await router.app.get(
                        "/estimate?party_size=0",
                        headers={"Authorization": "Bearer fake-token"}
                    )

                # Test invalid party size (too large)
                with pytest.raises(ValueError):
                    await router.app.get(
                        "/estimate?party_size=21",
                        headers={"Authorization": "Bearer fake-token"}
                    )

    @pytest.mark.asyncio
    async def test_authentication_required(self, mock_queue_service):
        """Test that authentication is required for protected endpoints"""
        # Arrange
        endpoints = [
            ("POST", "/"),
            ("GET", "/"),
            ("GET", "/statistics"),
            ("GET", "/estimate?party_size=4"),
            ("PUT", "/test-id"),
            ("POST", "/test-id/notify"),
            ("POST", "/test-id/seat?table_id=table-1"),
            ("POST", "/test-id/no-show"),
            ("DELETE", "/test-id"),
        ]

        with patch('src.queue.router.queue_router.queue_service', mock_queue_service):
            for method, endpoint in endpoints:
                # Act & Assert - Should require authentication
                with pytest.raises(Exception):  # Would be 401 Unauthorized
                    if method == "POST":
                        await router.app.post(endpoint)
                    elif method == "GET":
                        await router.app.get(endpoint)
                    elif method == "PUT":
                        await router.app.put(endpoint)
                    elif method == "DELETE":
                        await router.app.delete(endpoint)
