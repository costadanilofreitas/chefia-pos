"""
Tests for Queue Notification Service
"""

import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from src.queue.models.queue_models import (
    NotificationMethod,
    NotificationStatus,
    QueueNotification,
)
from src.queue.services.notification_service import NotificationService


@pytest.fixture
def notification_service():
    """Create a NotificationService instance"""
    service = NotificationService()
    # Set test credentials
    service.twilio_account_sid = "test_account_sid"
    service.twilio_auth_token = "test_auth_token"
    service.twilio_from_number = "+15551234567"
    service.whatsapp_api_url = "https://api.whatsapp.test/v1/messages"
    service.whatsapp_token = "test_whatsapp_token"
    return service


@pytest.fixture
def mock_aiohttp_session():
    """Mock aiohttp ClientSession"""
    mock_session = AsyncMock()
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json = AsyncMock(return_value={"sid": "test_message_sid"})
    mock_response.text = AsyncMock(return_value="Success")

    mock_session.post = AsyncMock(return_value=mock_response)
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock()

    return mock_session, mock_response


class TestNotificationService:
    """Test suite for NotificationService"""

    @pytest.mark.asyncio
    async def test_send_sms_success(self, notification_service, mock_aiohttp_session):
        """Test successfully sending an SMS"""
        # Arrange
        queue_entry_id = str(uuid4())
        phone = "11999998888"
        message = "Your table is ready!"
        mock_session, mock_response = mock_aiohttp_session

        with patch('aiohttp.ClientSession', return_value=mock_session):
            # Act
            result = await notification_service.send_notification(
                queue_entry_id=queue_entry_id,
                method=NotificationMethod.SMS,
                phone=phone,
                message=message
            )

            # Assert
            assert result.status == NotificationStatus.SENT
            assert result.notification_type == NotificationMethod.SMS
            assert result.message == message
            assert result.sent_at is not None
            assert result.delivered_at is not None
            assert result.error_message is None
            mock_session.post.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_sms_failure(self, notification_service, mock_aiohttp_session):
        """Test SMS sending failure"""
        # Arrange
        queue_entry_id = str(uuid4())
        phone = "11999998888"
        message = "Your table is ready!"
        mock_session, mock_response = mock_aiohttp_session
        mock_response.status = 400
        mock_response.text = AsyncMock(return_value="Invalid phone number")

        with patch('aiohttp.ClientSession', return_value=mock_session):
            with patch('asyncio.create_task') as mock_create_task:
                # Act
                result = await notification_service.send_notification(
                    queue_entry_id=queue_entry_id,
                    method=NotificationMethod.SMS,
                    phone=phone,
                    message=message
                )

                # Assert
                assert result.status == NotificationStatus.FAILED
                assert result.error_message is not None
                # Verify retry task was created
                mock_create_task.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_sms_simulation(self):
        """Test SMS simulation when credentials not configured"""
        # Arrange
        service = NotificationService()  # No credentials
        service.twilio_account_sid = ""
        queue_entry_id = str(uuid4())
        phone = "11999998888"
        message = "Your table is ready!"

        # Act
        result = await service.send_notification(
            queue_entry_id=queue_entry_id,
            method=NotificationMethod.SMS,
            phone=phone,
            message=message
        )

        # Assert
        assert result.status == NotificationStatus.SENT
        assert result.notification_type == NotificationMethod.SMS

    @pytest.mark.asyncio
    async def test_send_whatsapp_success(self, notification_service, mock_aiohttp_session):
        """Test successfully sending a WhatsApp message"""
        # Arrange
        queue_entry_id = str(uuid4())
        phone = "11999998888"
        message = "Your table is ready!"
        mock_session, mock_response = mock_aiohttp_session
        mock_response.json = AsyncMock(return_value={"message_id": "test_whatsapp_id"})

        with patch('aiohttp.ClientSession', return_value=mock_session):
            # Act
            result = await notification_service.send_notification(
                queue_entry_id=queue_entry_id,
                method=NotificationMethod.WHATSAPP,
                phone=phone,
                message=message
            )

            # Assert
            assert result.status == NotificationStatus.SENT
            assert result.notification_type == NotificationMethod.WHATSAPP
            assert result.message == message
            assert result.sent_at is not None
            mock_session.post.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_whatsapp_simulation(self):
        """Test WhatsApp simulation when API not configured"""
        # Arrange
        service = NotificationService()
        service.whatsapp_api_url = ""
        queue_entry_id = str(uuid4())
        phone = "11999998888"
        message = "Your table is ready!"

        # Act
        result = await service.send_notification(
            queue_entry_id=queue_entry_id,
            method=NotificationMethod.WHATSAPP,
            phone=phone,
            message=message
        )

        # Assert
        assert result.status == NotificationStatus.SENT
        assert result.notification_type == NotificationMethod.WHATSAPP

    @pytest.mark.asyncio
    async def test_send_announcement(self, notification_service):
        """Test sending an announcement"""
        # Arrange
        queue_entry_id = str(uuid4())
        phone = "11999998888"  # Not used for announcements
        message = "Table 5 is ready!"

        # Act
        result = await notification_service.send_notification(
            queue_entry_id=queue_entry_id,
            method=NotificationMethod.ANNOUNCEMENT,
            phone=phone,
            message=message
        )

        # Assert
        assert result.status == NotificationStatus.SENT
        assert result.notification_type == NotificationMethod.ANNOUNCEMENT
        assert result.message == message

    @pytest.mark.asyncio
    async def test_send_none_method(self, notification_service):
        """Test NONE notification method"""
        # Arrange
        queue_entry_id = str(uuid4())
        phone = "11999998888"
        message = "No notification needed"

        # Act
        result = await notification_service.send_notification(
            queue_entry_id=queue_entry_id,
            method=NotificationMethod.NONE,
            phone=phone,
            message=message
        )

        # Assert
        assert result.status == NotificationStatus.SENT
        assert result.notification_type == NotificationMethod.NONE

    @pytest.mark.asyncio
    async def test_retry_notification(self, notification_service):
        """Test retry logic for failed notifications"""
        # Arrange
        notification = QueueNotification(
            id=uuid4(),
            queue_entry_id=uuid4(),
            notification_type=NotificationMethod.SMS,
            status=NotificationStatus.FAILED,
            message="Test retry",
            created_at=datetime.utcnow(),
            retry_count=0
        )
        phone = "11999998888"

        # Mock successful retry
        with patch.object(notification_service, '_send_sms', return_value=True):
            # Act
            await notification_service._retry_notification(notification, phone)

            # Assert
            assert notification.status == NotificationStatus.DELIVERED
            assert notification.delivered_at is not None
            assert notification.retry_count == 1

    @pytest.mark.asyncio
    async def test_max_retries_reached(self, notification_service):
        """Test behavior when max retries is reached"""
        # Arrange
        notification = QueueNotification(
            id=uuid4(),
            queue_entry_id=uuid4(),
            notification_type=NotificationMethod.SMS,
            status=NotificationStatus.FAILED,
            message="Test max retries",
            created_at=datetime.utcnow(),
            retry_count=notification_service.max_retries
        )
        phone = "11999998888"

        # Mock failed retry
        with patch.object(notification_service, '_send_sms', return_value=False):
            # Act
            await notification_service._retry_notification(notification, phone)

            # Assert
            assert notification.status == NotificationStatus.FAILED
            assert notification.retry_count == notification_service.max_retries + 1

    def test_format_phone_number(self, notification_service):
        """Test phone number formatting"""
        # Test various input formats
        test_cases = [
            ("11999998888", "+5511999998888"),
            ("5511999998888", "+5511999998888"),
            ("+5511999998888", "+5511999998888"),
            ("(11) 99999-8888", "+5511999998888"),
            ("11 9 9999 8888", "+5511999998888"),
        ]

        for input_phone, expected in test_cases:
            result = notification_service._format_phone_number(input_phone)
            assert result == expected

    @pytest.mark.asyncio
    async def test_send_bulk_notifications(self, notification_service):
        """Test sending bulk notifications"""
        # Arrange
        entries = [
            {
                "id": str(uuid4()),
                "customer_name": "John Doe",
                "customer_phone": "11999998888",
                "position": 1,
                "estimated_wait_minutes": 15,
                "notification_method": NotificationMethod.SMS
            },
            {
                "id": str(uuid4()),
                "customer_name": "Jane Smith",
                "customer_phone": "11888887777",
                "position": 2,
                "estimated_wait_minutes": 20,
                "notification_method": NotificationMethod.WHATSAPP
            }
        ]
        message_template = "Hi {name}, you are position {position}. Wait time: {wait_time} minutes."

        # Mock notification sending
        with patch.object(notification_service, 'send_notification') as mock_send:
            mock_send.return_value = QueueNotification(
                id=uuid4(),
                queue_entry_id=uuid4(),
                notification_type=NotificationMethod.SMS,
                status=NotificationStatus.SENT,
                message="Test",
                created_at=datetime.utcnow()
            )

            # Act
            results = await notification_service.send_bulk_notifications(
                entries,
                message_template
            )

            # Assert
            assert len(results) == len(entries)
            assert all(entry["id"] in results for entry in entries)
            assert mock_send.call_count == len(entries)

            # Verify message formatting
            first_call = mock_send.call_args_list[0]
            assert "John Doe" in first_call.kwargs['message']
            assert "position 1" in first_call.kwargs['message']
            assert "15 minutes" in first_call.kwargs['message']

    @pytest.mark.asyncio
    async def test_test_notification_success(self, notification_service):
        """Test the test_notification method"""
        # Arrange
        phone = "11999998888"

        # Mock successful notification
        with patch.object(notification_service, 'send_notification') as mock_send:
            mock_send.return_value = QueueNotification(
                id=uuid4(),
                queue_entry_id=uuid4(),
                notification_type=NotificationMethod.SMS,
                status=NotificationStatus.SENT,
                message="Test",
                created_at=datetime.utcnow()
            )

            # Act
            result = await notification_service.test_notification(
                NotificationMethod.SMS,
                phone
            )

            # Assert
            assert result is True
            mock_send.assert_called_once()
            assert mock_send.call_args.kwargs['queue_entry_id'] == "test"
            assert "Teste de notificação" in mock_send.call_args.kwargs['message']

    @pytest.mark.asyncio
    async def test_test_notification_failure(self, notification_service):
        """Test the test_notification method with failure"""
        # Arrange
        phone = "11999998888"

        # Mock failed notification
        with patch.object(notification_service, 'send_notification') as mock_send:
            mock_send.return_value = QueueNotification(
                id=uuid4(),
                queue_entry_id=uuid4(),
                notification_type=NotificationMethod.SMS,
                status=NotificationStatus.FAILED,
                message="Test",
                created_at=datetime.utcnow()
            )

            # Act
            result = await notification_service.test_notification(
                NotificationMethod.SMS,
                phone
            )

            # Assert
            assert result is False

    @pytest.mark.asyncio
    async def test_exception_handling(self, notification_service):
        """Test exception handling in send_notification"""
        # Arrange
        queue_entry_id = str(uuid4())
        phone = "11999998888"
        message = "Test message"

        # Mock exception
        with patch.object(notification_service, '_send_sms', side_effect=Exception("Network error")):
            with patch('asyncio.create_task') as mock_create_task:
                # Act
                result = await notification_service.send_notification(
                    queue_entry_id=queue_entry_id,
                    method=NotificationMethod.SMS,
                    phone=phone,
                    message=message
                )

                # Assert
                assert result.status == NotificationStatus.FAILED
                assert "Network error" in result.error_message
                # Verify retry was scheduled
                mock_create_task.assert_called_once()


class TestNotificationServiceIntegration:
    """Integration tests for NotificationService"""

    @pytest.mark.asyncio
    async def test_complete_notification_flow_with_retry(self, notification_service):
        """Test complete notification flow including retry"""
        # Arrange
        queue_entry_id = str(uuid4())
        phone = "11999998888"
        message = "Your table is ready!"

        # First attempt fails, retry succeeds
        call_count = 0

        async def mock_send_sms(phone, message):
            nonlocal call_count
            call_count += 1
            return call_count > 1  # Fail first, succeed on retry

        notification_service._send_sms = mock_send_sms
        notification_service.retry_delay = 0.1  # Speed up test

        # Act
        result = await notification_service.send_notification(
            queue_entry_id=queue_entry_id,
            method=NotificationMethod.SMS,
            phone=phone,
            message=message
        )

        # Wait for retry to complete
        await asyncio.sleep(0.2)

        # Assert
        assert result.status == NotificationStatus.FAILED  # Initial status
        assert result.retry_count == 0  # Initial retry count
        # Note: In real scenario, we'd need to track the notification object through retries

    @pytest.mark.asyncio
    async def test_multiple_notification_methods(self, notification_service):
        """Test sending notifications through multiple methods"""
        # Arrange
        queue_entry_id = str(uuid4())
        phone = "11999998888"
        message = "Your table is ready!"

        methods = [
            NotificationMethod.SMS,
            NotificationMethod.WHATSAPP,
            NotificationMethod.ANNOUNCEMENT,
            NotificationMethod.NONE
        ]

        # Mock successful sends
        notification_service._send_sms = AsyncMock(return_value=True)
        notification_service._send_whatsapp = AsyncMock(return_value=True)

        results = []

        # Act
        for method in methods:
            result = await notification_service.send_notification(
                queue_entry_id=queue_entry_id,
                method=method,
                phone=phone,
                message=message
            )
            results.append(result)

        # Assert
        assert all(r.status == NotificationStatus.SENT for r in results)
        assert results[0].notification_type == NotificationMethod.SMS
        assert results[1].notification_type == NotificationMethod.WHATSAPP
        assert results[2].notification_type == NotificationMethod.ANNOUNCEMENT
        assert results[3].notification_type == NotificationMethod.NONE
