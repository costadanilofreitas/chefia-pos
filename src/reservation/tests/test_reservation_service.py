"""
Tests for Reservation Service
"""

from datetime import date, datetime, time, timedelta
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.core.exceptions import BusinessException, ConflictException
from src.reservation.models.reservation_models import (
    RecurrenceType,
    Reservation,
    ReservationCreate,
    ReservationSettings,
    ReservationSlot,
    ReservationSource,
    ReservationStatus,
    ReservationUpdate,
    TableAllocation,
    TablePreference,
)
from src.reservation.services.reservation_service import ReservationService


@pytest.fixture
def mock_dependencies():
    """Create mock dependencies for ReservationService"""
    db_service = AsyncMock()
    table_service = AsyncMock()
    queue_service = AsyncMock()
    event_bus = AsyncMock()

    return db_service, table_service, queue_service, event_bus


@pytest.fixture
def reservation_service(mock_dependencies):
    """Create a ReservationService instance with mocked dependencies"""
    db_service, table_service, queue_service, event_bus = mock_dependencies
    service = ReservationService(db_service, table_service, queue_service, event_bus)
    return service


@pytest.fixture
def sample_reservation_data():
    """Sample data for creating a reservation"""
    return ReservationCreate(
        customer_name="John Doe",
        customer_phone="11999998888",
        customer_email="john@example.com",
        party_size=4,
        reservation_date=date.today() + timedelta(days=1),
        reservation_time=time(19, 0),
        duration_minutes=120,
        table_preferences=[TablePreference.WINDOW, TablePreference.QUIET],
        special_requests="Birthday celebration",
        source=ReservationSource.WEBSITE
    )


@pytest.fixture
def sample_reservation():
    """Sample reservation object"""
    res_id = uuid4()
    return Reservation(
        id=res_id,
        store_id="store-123",
        customer_name="John Doe",
        customer_phone="11999998888",
        customer_email="john@example.com",
        party_size=4,
        reservation_date=date.today() + timedelta(days=1),
        reservation_time=time(19, 0),
        duration_minutes=120,
        table_preferences=[TablePreference.WINDOW],
        special_requests="Birthday celebration",
        source=ReservationSource.WEBSITE,
        status=ReservationStatus.CONFIRMED,
        confirmation_code="ABC123",
        assigned_tables=[],
        created_at=datetime.now(),
        updated_at=datetime.now(),
        version=1
    )


@pytest.fixture
def sample_settings():
    """Sample reservation settings"""
    return ReservationSettings(
        enabled=True,
        min_advance_hours=2,
        max_advance_days=30,
        min_party_size=1,
        max_party_size=20,
        default_duration_minutes=120,
        require_confirmation=False,
        require_deposit=False,
        no_show_grace_minutes=15,
        operating_hours={
            "monday": {"open": "11:00", "close": "23:00"},
            "tuesday": {"open": "11:00", "close": "23:00"},
            "wednesday": {"open": "11:00", "close": "23:00"},
            "thursday": {"open": "11:00", "close": "23:00"},
            "friday": {"open": "11:00", "close": "23:00"},
            "saturday": {"open": "11:00", "close": "23:00"},
            "sunday": {"open": "11:00", "close": "22:00"}
        },
        slot_duration_minutes=30
    )


class TestReservationService:
    """Test suite for ReservationService"""

    @pytest.mark.asyncio
    async def test_create_reservation_success(
        self, reservation_service, sample_reservation_data, sample_settings
    ):
        """Test successfully creating a reservation"""
        # Arrange
        store_id = "store-123"

        # Mock settings
        reservation_service._get_settings = AsyncMock(return_value=sample_settings)

        # Mock availability check
        reservation_service._check_availability = AsyncMock(return_value=True)

        # Mock table finding
        allocation = TableAllocation(
            reservation_id=uuid4(),
            table_ids=[uuid4()],
            table_numbers=[1],
            combined=False,
            score=0.9,
            reasons=["Perfect match"]
        )
        reservation_service._find_best_tables = AsyncMock(return_value=allocation)

        # Mock save
        reservation_service._save_reservation = AsyncMock()

        # Mock confirmation sending
        reservation_service._send_confirmation = AsyncMock()

        # Act
        result = await reservation_service.create_reservation(store_id, sample_reservation_data)

        # Assert
        assert result is not None
        assert result.customer_name == sample_reservation_data.customer_name
        assert result.party_size == sample_reservation_data.party_size
        assert result.status == ReservationStatus.CONFIRMED
        assert result.confirmation_code is not None
        assert len(result.assigned_tables) > 0

        # Verify calls
        reservation_service._save_reservation.assert_called()
        reservation_service._send_confirmation.assert_called()
        reservation_service.event_bus.publish.assert_called()

    @pytest.mark.asyncio
    async def test_create_reservation_disabled_system(
        self, reservation_service, sample_reservation_data, sample_settings
    ):
        """Test creating reservation when system is disabled"""
        # Arrange
        store_id = "store-123"
        sample_settings.enabled = False
        reservation_service._get_settings = AsyncMock(return_value=sample_settings)

        # Act & Assert
        with pytest.raises(BusinessException) as exc_info:
            await reservation_service.create_reservation(store_id, sample_reservation_data)

        assert "disabled" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_create_reservation_advance_time_violation(
        self, reservation_service, sample_reservation_data, sample_settings
    ):
        """Test creating reservation with invalid advance time"""
        # Arrange
        store_id = "store-123"
        sample_reservation_data.reservation_date = date.today()
        sample_reservation_data.reservation_time = time.now().replace(microsecond=0)

        reservation_service._get_settings = AsyncMock(return_value=sample_settings)

        # Act & Assert
        with pytest.raises(BusinessException) as exc_info:
            await reservation_service.create_reservation(store_id, sample_reservation_data)

        assert "advance" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_create_reservation_party_size_violation(
        self, reservation_service, sample_reservation_data, sample_settings
    ):
        """Test creating reservation with invalid party size"""
        # Arrange
        store_id = "store-123"
        sample_reservation_data.party_size = 25  # Exceeds max

        reservation_service._get_settings = AsyncMock(return_value=sample_settings)

        # Act & Assert
        with pytest.raises(BusinessException) as exc_info:
            await reservation_service.create_reservation(store_id, sample_reservation_data)

        assert "party size" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_create_reservation_no_availability(
        self, reservation_service, sample_reservation_data, sample_settings
    ):
        """Test creating reservation when no tables available"""
        # Arrange
        store_id = "store-123"

        reservation_service._get_settings = AsyncMock(return_value=sample_settings)
        reservation_service._check_availability = AsyncMock(return_value=False)

        # Act & Assert
        with pytest.raises(ConflictException) as exc_info:
            await reservation_service.create_reservation(store_id, sample_reservation_data)

        assert "No tables available" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_update_reservation_success(
        self, reservation_service, sample_reservation
    ):
        """Test successfully updating a reservation"""
        # Arrange
        reservation_id = str(sample_reservation.id)
        update_data = ReservationUpdate(
            party_size=6,
            special_requests="Birthday celebration for 6"
        )

        reservation_service._get_reservation = AsyncMock(return_value=sample_reservation)
        reservation_service._save_reservation = AsyncMock()

        # Act
        result = await reservation_service.update_reservation(reservation_id, update_data)

        # Assert
        assert result is not None
        assert result.party_size == 6
        assert "for 6" in result.special_requests
        assert result.version == 2

        reservation_service._save_reservation.assert_called()
        reservation_service.event_bus.publish.assert_called()

    @pytest.mark.asyncio
    async def test_update_reservation_not_found(
        self, reservation_service
    ):
        """Test updating non-existent reservation"""
        # Arrange
        reservation_id = str(uuid4())
        update_data = ReservationUpdate(party_size=6)

        reservation_service._get_reservation = AsyncMock(return_value=None)

        # Act
        result = await reservation_service.update_reservation(reservation_id, update_data)

        # Assert
        assert result is None

    @pytest.mark.asyncio
    async def test_update_reservation_completed_status(
        self, reservation_service, sample_reservation
    ):
        """Test updating completed reservation"""
        # Arrange
        reservation_id = str(sample_reservation.id)
        sample_reservation.status = ReservationStatus.COMPLETED
        update_data = ReservationUpdate(party_size=6)

        reservation_service._get_reservation = AsyncMock(return_value=sample_reservation)

        # Act & Assert
        with pytest.raises(BusinessException) as exc_info:
            await reservation_service.update_reservation(reservation_id, update_data)

        assert "Cannot modify completed" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_update_status_success(
        self, reservation_service, sample_reservation
    ):
        """Test successfully updating reservation status"""
        # Arrange
        reservation_id = str(sample_reservation.id)
        new_status = ReservationStatus.ARRIVED

        reservation_service._get_reservation = AsyncMock(return_value=sample_reservation)
        reservation_service._save_reservation = AsyncMock()
        reservation_service._seat_reservation = AsyncMock()

        # Act
        result = await reservation_service.update_status(
            reservation_id,
            new_status,
            reason=None
        )

        # Assert
        assert result is True
        assert sample_reservation.status == new_status
        assert sample_reservation.arrived_at is not None

        reservation_service._seat_reservation.assert_called_once()
        reservation_service.event_bus.publish.assert_called()

    @pytest.mark.asyncio
    async def test_update_status_no_show_tracking(
        self, reservation_service, sample_reservation
    ):
        """Test updating status to no-show with tracking"""
        # Arrange
        reservation_id = str(sample_reservation.id)
        sample_reservation.customer_id = uuid4()

        reservation_service._get_reservation = AsyncMock(return_value=sample_reservation)
        reservation_service._save_reservation = AsyncMock()
        reservation_service._track_no_show = AsyncMock()

        # Act
        result = await reservation_service.update_status(
            reservation_id,
            ReservationStatus.NO_SHOW,
            reason="Customer didn't show up"
        )

        # Assert
        assert result is True
        assert sample_reservation.status == ReservationStatus.NO_SHOW
        reservation_service._track_no_show.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_reservations_by_date(
        self, reservation_service, mock_dependencies
    ):
        """Test getting reservations by date"""
        # Arrange
        store_id = "store-123"
        test_date = date.today()
        db_service = mock_dependencies[0]

        mock_results = [
            {
                "id": str(uuid4()),
                "customer_name": f"Customer {i}",
                "reservation_time": time(18 + i, 0).isoformat(),
                "party_size": i + 2
            }
            for i in range(3)
        ]

        db_service.query.return_value = mock_results

        # Act
        result = await reservation_service.get_reservations_by_date(
            store_id,
            test_date,
            ReservationStatus.CONFIRMED
        )

        # Assert
        assert len(result) == 3
        db_service.query.assert_called_once()

        # Verify query parameters
        call_args = db_service.query.call_args
        assert call_args[0][0] == "reservations"
        assert call_args[0][1]["store_id"] == store_id
        assert call_args[0][1]["reservation_date"] == test_date.isoformat()

    @pytest.mark.asyncio
    async def test_check_availability_success(
        self, reservation_service, sample_settings
    ):
        """Test checking availability for a date"""
        # Arrange
        store_id = "store-123"
        check_date = date.today() + timedelta(days=1)
        party_size = 4

        reservation_service._get_settings = AsyncMock(return_value=sample_settings)

        # Mock slot generation
        mock_slots = [
            ReservationSlot(
                date=check_date,
                time=time(18, 0),
                available_tables=5,
                total_tables=10,
                is_available=True,
                min_party_size=1,
                max_party_size=20
            ),
            ReservationSlot(
                date=check_date,
                time=time(19, 0),
                available_tables=3,
                total_tables=10,
                is_available=True,
                min_party_size=1,
                max_party_size=20
            )
        ]
        reservation_service._generate_time_slots = AsyncMock(return_value=mock_slots)

        # Act
        result = await reservation_service.check_availability(
            store_id,
            check_date,
            party_size
        )

        # Assert
        assert result is not None
        assert result.date == check_date
        assert len(result.slots) == 2
        assert not result.fully_booked
        assert all(s.is_available for s in result.slots)

    @pytest.mark.asyncio
    async def test_check_availability_closed_day(
        self, reservation_service, sample_settings
    ):
        """Test checking availability for a closed day"""
        # Arrange
        store_id = "store-123"
        check_date = date.today() + timedelta(days=1)
        party_size = 4

        # Remove the day from operating hours
        day_name = check_date.strftime("%A").lower()
        sample_settings.operating_hours.pop(day_name, None)

        reservation_service._get_settings = AsyncMock(return_value=sample_settings)

        # Act
        result = await reservation_service.check_availability(
            store_id,
            check_date,
            party_size
        )

        # Assert
        assert result.fully_booked is True
        assert len(result.slots) == 0
        assert "Closed on this day" in str(result.restrictions)

    @pytest.mark.asyncio
    async def test_assign_tables_success(
        self, reservation_service, sample_reservation
    ):
        """Test manually assigning tables to a reservation"""
        # Arrange
        reservation_id = str(sample_reservation.id)
        table_ids = [str(uuid4()), str(uuid4())]

        reservation_service._get_reservation = AsyncMock(return_value=sample_reservation)
        reservation_service._is_table_available = AsyncMock(return_value=True)
        reservation_service._save_reservation = AsyncMock()

        # Act
        result = await reservation_service.assign_tables(
            reservation_id,
            table_ids
        )

        # Assert
        assert result is True
        assert len(sample_reservation.assigned_tables) == 2
        reservation_service._save_reservation.assert_called()
        reservation_service.event_bus.publish.assert_called()

    @pytest.mark.asyncio
    async def test_assign_tables_unavailable(
        self, reservation_service, sample_reservation
    ):
        """Test assigning unavailable tables"""
        # Arrange
        reservation_id = str(sample_reservation.id)
        table_ids = [str(uuid4())]

        reservation_service._get_reservation = AsyncMock(return_value=sample_reservation)
        reservation_service._is_table_available = AsyncMock(return_value=False)

        # Act & Assert
        with pytest.raises(ConflictException) as exc_info:
            await reservation_service.assign_tables(reservation_id, table_ids)

        assert "not available" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_statistics(
        self, reservation_service, mock_dependencies
    ):
        """Test getting reservation statistics"""
        # Arrange
        store_id = "store-123"
        db_service = mock_dependencies[0]

        # Mock reservation data
        mock_results = [
            {
                "id": str(uuid4()),
                "status": ReservationStatus.CONFIRMED.value,
                "party_size": 4,
                "duration_minutes": 120,
                "reservation_date": date.today().isoformat(),
                "reservation_time": "19:00",
                "deposit_amount": 50,
                "deposit_paid": True
            },
            {
                "id": str(uuid4()),
                "status": ReservationStatus.NO_SHOW.value,
                "party_size": 2,
                "duration_minutes": 90,
                "reservation_date": date.today().isoformat(),
                "reservation_time": "18:00"
            },
            {
                "id": str(uuid4()),
                "status": ReservationStatus.CANCELLED.value,
                "party_size": 6,
                "duration_minutes": 120,
                "reservation_date": date.today().isoformat(),
                "reservation_time": "20:00"
            }
        ]

        db_service.query.return_value = mock_results

        # Act
        result = await reservation_service.get_statistics(store_id)

        # Assert
        assert result.total_reservations == 3
        assert result.confirmed == 1
        assert result.no_shows == 1
        assert result.cancelled == 1
        assert result.no_show_rate > 0
        assert result.cancellation_rate > 0
        assert result.average_party_size == 4  # (4+2+6)/3
        assert result.total_deposits == 50

    @pytest.mark.asyncio
    async def test_process_no_shows(
        self, reservation_service, sample_settings, mock_dependencies
    ):
        """Test processing no-shows for past reservations"""
        # Arrange
        store_id = "store-123"
        db_service = mock_dependencies[0]

        reservation_service._get_settings = AsyncMock(return_value=sample_settings)

        # Mock past confirmed reservations
        past_time = datetime.now() - timedelta(hours=1)
        mock_results = [
            {
                "id": str(uuid4()),
                "status": ReservationStatus.CONFIRMED.value,
                "reservation_datetime": past_time.isoformat()
            }
            for _ in range(2)
        ]

        db_service.query.return_value = mock_results

        # Mock update_status
        reservation_service.update_status = AsyncMock(return_value=True)

        # Act
        result = await reservation_service.process_no_shows(store_id)

        # Assert
        assert result == 2
        assert reservation_service.update_status.call_count == 2

    def test_generate_confirmation_code(self, reservation_service):
        """Test confirmation code generation"""
        # Act
        code = reservation_service._generate_confirmation_code()

        # Assert
        assert len(code) == 6
        assert code.isalnum()
        assert code.isupper()


class TestReservationServiceIntegration:
    """Integration tests for ReservationService"""

    @pytest.mark.asyncio
    async def test_complete_reservation_flow(
        self, reservation_service, sample_reservation_data, sample_settings
    ):
        """Test complete reservation flow from creation to seating"""
        # Arrange
        store_id = "store-123"

        # Setup mocks
        reservation_service._get_settings = AsyncMock(return_value=sample_settings)
        reservation_service._check_availability = AsyncMock(return_value=True)
        reservation_service._find_best_tables = AsyncMock(return_value=None)
        reservation_service._save_reservation = AsyncMock()
        reservation_service._send_confirmation = AsyncMock()
        reservation_service._seat_reservation = AsyncMock()
        reservation_service._get_reservation = AsyncMock()

        # 1. Create reservation
        reservation = await reservation_service.create_reservation(
            store_id, sample_reservation_data
        )
        assert reservation.status == ReservationStatus.CONFIRMED

        # 2. Update reservation
        reservation_service._get_reservation.return_value = reservation
        update_data = ReservationUpdate(party_size=5)
        updated = await reservation_service.update_reservation(
            str(reservation.id), update_data
        )
        assert updated.party_size == 5

        # 3. Customer arrives
        reservation_service._get_reservation.return_value = updated
        success = await reservation_service.update_status(
            str(reservation.id),
            ReservationStatus.ARRIVED
        )
        assert success is True
        assert updated.status == ReservationStatus.ARRIVED

    @pytest.mark.asyncio
    async def test_recurring_reservations(
        self, reservation_service, sample_reservation_data, sample_settings
    ):
        """Test creating recurring reservations"""
        # Arrange
        store_id = "store-123"
        sample_reservation_data.recurrence = RecurrenceType.WEEKLY
        sample_reservation_data.recurrence_end_date = date.today() + timedelta(weeks=4)

        reservation_service._get_settings = AsyncMock(return_value=sample_settings)
        reservation_service._check_availability = AsyncMock(return_value=True)
        reservation_service._find_best_tables = AsyncMock(return_value=None)
        reservation_service._save_reservation = AsyncMock()
        reservation_service._send_confirmation = AsyncMock()

        # Mock recurring creation
        reservation_service._create_recurring_reservations = AsyncMock()

        # Act
        reservation = await reservation_service.create_reservation(
            store_id, sample_reservation_data
        )

        # Assert
        assert reservation.recurrence == RecurrenceType.WEEKLY
        reservation_service._create_recurring_reservations.assert_called_once()
