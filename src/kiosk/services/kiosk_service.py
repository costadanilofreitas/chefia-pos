# /home/ubuntu/pos-modern/src/kiosk/services/kiosk_service.py

from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import json
import os

from ..models.kiosk_models import KioskConfig, KioskSession, KioskOrder, KioskAnalytics
from src.core.events.event_bus import get_event_bus, Event, EventType

# Simulação de banco de dados com arquivo JSON
DATA_DIR = os.path.join("/home/ubuntu/pos-modern/data")
KIOSK_CONFIG_FILE = os.path.join(DATA_DIR, "kiosk_config.json")
KIOSK_SESSIONS_FILE = os.path.join(DATA_DIR, "kiosk_sessions.json")
KIOSK_ANALYTICS_FILE = os.path.join(DATA_DIR, "kiosk_analytics.json")

# Garantir que os diretórios existem
os.makedirs(DATA_DIR, exist_ok=True)

# Inicializar arquivos de dados se não existirem
for file_path in [KIOSK_CONFIG_FILE, KIOSK_SESSIONS_FILE, KIOSK_ANALYTICS_FILE]:
    if not os.path.exists(file_path):
        with open(file_path, "w") as f:
            json.dump([], f)


class KioskService:
    """Service for managing self-service kiosk operations."""

    def _load_data(self, file_path: str) -> List[Dict[str, Any]]:
        """Loads data from a JSON file."""
        try:
            with open(file_path, "r") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _save_data(self, file_path: str, data: List[Dict[str, Any]]) -> None:
        """Saves data to a JSON file."""
        with open(file_path, "w") as f:
            json.dump(data, f, indent=4)

    async def create_kiosk_config(self, config_data: KioskConfig) -> KioskConfig:
        """Creates a new kiosk configuration."""
        configs = self._load_data(KIOSK_CONFIG_FILE)

        # Generate ID if not provided
        if not config_data.id:
            config_data.id = str(uuid.uuid4())

        config_dict = config_data.dict()
        configs.append(config_dict)
        self._save_data(KIOSK_CONFIG_FILE, configs)

        event_bus = get_event_bus()
        await event_bus.publish(
            Event(event_type=EventType.KIOSK_CONFIG_CREATED, data=config_dict)
        )

        return config_data

    async def get_kiosk_config(self, kiosk_id: str) -> Optional[KioskConfig]:
        """Gets a kiosk configuration by ID."""
        configs = self._load_data(KIOSK_CONFIG_FILE)
        config_dict = next((c for c in configs if c["id"] == kiosk_id), None)

        if not config_dict:
            return None

        return KioskConfig(**config_dict)

    async def list_kiosk_configs(self) -> List[KioskConfig]:
        """Lists all kiosk configurations."""
        configs = self._load_data(KIOSK_CONFIG_FILE)
        return [KioskConfig(**c) for c in configs]

    async def update_kiosk_config(
        self, kiosk_id: str, config_data: Dict[str, Any]
    ) -> Optional[KioskConfig]:
        """Updates a kiosk configuration."""
        configs = self._load_data(KIOSK_CONFIG_FILE)
        config_index = next(
            (i for i, c in enumerate(configs) if c["id"] == kiosk_id), None
        )

        if config_index is None:
            return None

        # Update only provided fields
        for key, value in config_data.items():
            configs[config_index][key] = value

        configs[config_index]["updated_at"] = datetime.utcnow().isoformat()
        self._save_data(KIOSK_CONFIG_FILE, configs)

        updated_config = KioskConfig(**configs[config_index])

        event_bus = get_event_bus()
        await event_bus.publish(
            Event(event_type=EventType.KIOSK_CONFIG_UPDATED, data=updated_config.dict())
        )

        return updated_config

    async def delete_kiosk_config(self, kiosk_id: str) -> bool:
        """Deletes a kiosk configuration."""
        configs = self._load_data(KIOSK_CONFIG_FILE)
        initial_length = len(configs)

        configs = [c for c in configs if c["id"] != kiosk_id]

        if len(configs) == initial_length:
            return False

        self._save_data(KIOSK_CONFIG_FILE, configs)

        event_bus = get_event_bus()
        await event_bus.publish(
            Event(
                event_type=EventType.KIOSK_CONFIG_DELETED, data={"kiosk_id": kiosk_id}
            )
        )

        return True

    async def start_kiosk_session(self, kiosk_id: str) -> KioskSession:
        """Starts a new kiosk session."""
        # Verify kiosk exists
        kiosk = await self.get_kiosk_config(kiosk_id)
        if not kiosk:
            raise ValueError(f"Kiosk with ID {kiosk_id} not found")

        sessions = self._load_data(KIOSK_SESSIONS_FILE)

        session = KioskSession(
            kiosk_id=kiosk_id,
            started_at=datetime.utcnow(),
            last_activity_at=datetime.utcnow(),
        )

        session_dict = session.dict()
        sessions.append(session_dict)
        self._save_data(KIOSK_SESSIONS_FILE, sessions)

        event_bus = get_event_bus()
        await event_bus.publish(
            Event(event_type=EventType.KIOSK_SESSION_STARTED, data=session_dict)
        )

        return session

    async def update_session_activity(self, session_id: str) -> Optional[KioskSession]:
        """Updates the last activity timestamp for a session."""
        sessions = self._load_data(KIOSK_SESSIONS_FILE)
        session_index = next(
            (i for i, s in enumerate(sessions) if s["id"] == session_id), None
        )

        if session_index is None:
            return None

        sessions[session_index]["last_activity_at"] = datetime.utcnow().isoformat()
        self._save_data(KIOSK_SESSIONS_FILE, sessions)

        return KioskSession(**sessions[session_index])

    async def end_kiosk_session(
        self, session_id: str, order_id: Optional[str] = None, completed: bool = False
    ) -> Optional[KioskSession]:
        """Ends a kiosk session."""
        sessions = self._load_data(KIOSK_SESSIONS_FILE)
        session_index = next(
            (i for i, s in enumerate(sessions) if s["id"] == session_id), None
        )

        if session_index is None:
            return None

        sessions[session_index]["ended_at"] = datetime.utcnow().isoformat()

        if order_id:
            sessions[session_index]["order_id"] = order_id

        sessions[session_index]["session_completed"] = completed
        self._save_data(KIOSK_SESSIONS_FILE, sessions)

        ended_session = KioskSession(**sessions[session_index])

        # Update analytics
        await self._update_analytics(ended_session)

        event_bus = get_event_bus()
        await event_bus.publish(
            Event(event_type=EventType.KIOSK_SESSION_ENDED, data=ended_session.dict())
        )

        return ended_session

    async def _update_analytics(self, session: KioskSession) -> None:
        """Updates analytics based on a completed session."""
        analytics_list = self._load_data(KIOSK_ANALYTICS_FILE)

        # Get today's date in ISO format (YYYY-MM-DD)
        today = datetime.utcnow().date().isoformat()

        # Find analytics for this kiosk and date
        analytics_index = next(
            (
                i
                for i, a in enumerate(analytics_list)
                if a["kiosk_id"] == session.kiosk_id and a["date"] == today
            ),
            None,
        )

        if analytics_index is None:
            # Create new analytics entry
            analytics = KioskAnalytics(
                kiosk_id=session.kiosk_id,
                date=datetime.utcnow().date(),
                total_sessions=1,
                completed_orders=1 if session.session_completed else 0,
                abandoned_sessions=0 if session.session_completed else 1,
            )

            # Calculate session time if session was ended
            if session.ended_at:
                start = datetime.fromisoformat(session.started_at.isoformat())
                end = datetime.fromisoformat(session.ended_at.isoformat())
                session_time = (end - start).total_seconds()
                analytics.average_session_time_seconds = session_time

            analytics_list.append(analytics.dict())
        else:
            # Update existing analytics
            analytics_list[analytics_index]["total_sessions"] += 1

            if session.session_completed:
                analytics_list[analytics_index]["completed_orders"] += 1
            else:
                analytics_list[analytics_index]["abandoned_sessions"] += 1

            # Update average session time
            if session.ended_at:
                start = datetime.fromisoformat(session.started_at.isoformat())
                end = datetime.fromisoformat(session.ended_at.isoformat())
                session_time = (end - start).total_seconds()

                current_avg = analytics_list[analytics_index][
                    "average_session_time_seconds"
                ]
                current_total = (
                    analytics_list[analytics_index]["total_sessions"] - 1
                )  # Exclude current session

                if current_total > 0:
                    new_avg = ((current_avg * current_total) + session_time) / (
                        current_total + 1
                    )
                    analytics_list[analytics_index][
                        "average_session_time_seconds"
                    ] = new_avg
                else:
                    analytics_list[analytics_index][
                        "average_session_time_seconds"
                    ] = session_time

        self._save_data(KIOSK_ANALYTICS_FILE, analytics_list)

    async def get_kiosk_analytics(
        self,
        kiosk_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[KioskAnalytics]:
        """Gets analytics for a kiosk within a date range."""
        analytics_list = self._load_data(KIOSK_ANALYTICS_FILE)

        # Filter by kiosk ID
        filtered_analytics = [a for a in analytics_list if a["kiosk_id"] == kiosk_id]

        # Filter by date range if provided
        if start_date:
            filtered_analytics = [
                a for a in filtered_analytics if a["date"] >= start_date
            ]

        if end_date:
            filtered_analytics = [
                a for a in filtered_analytics if a["date"] <= end_date
            ]

        return [KioskAnalytics(**a) for a in filtered_analytics]

    async def create_order_from_kiosk(
        self, session_id: str, order_data: KioskOrder
    ) -> Dict[str, Any]:
        """Creates an order from a kiosk session."""
        # Get the session
        sessions = self._load_data(KIOSK_SESSIONS_FILE)
        session = next((s for s in sessions if s["id"] == session_id), None)

        if not session:
            raise ValueError(f"Session with ID {session_id} not found")

        # Convert kiosk order to regular order format
        from src.order.services.order_service import order_service
        from src.product.models.product import (
            OrderCreate,
            OrderItemCreate,
            OrderItemCustomization,
            OrderType,
        )

        # Create order items
        order_items = []
        for item in order_data.items:
            customizations = [
                OrderItemCustomization(
                    name=c["name"], price_adjustment=c["price_adjustment"]
                )
                for c in item.customizations
            ]

            order_item = OrderItemCreate(
                product_id=item.product_id,
                quantity=item.quantity,
                customizations=customizations,
                notes=item.notes,
            )
            order_items.append(order_item)

        # Create order
        order_create = OrderCreate(
            customer_id=None,  # Anonymous order from kiosk
            customer_name="Cliente Kiosk",
            cashier_id=None,
            table_number=None,
            order_type=OrderType.TAKEOUT,  # Default to takeout for kiosk orders
            notes=f"Pedido do Kiosk {session['kiosk_id']}",
            items=order_items,
        )

        # Create the order using the order service
        order = await order_service.create_order(order_create)

        # Update the session with the order ID
        await self.end_kiosk_session(session_id, order.id, completed=True)

        # Return the created order
        return order.dict()


# Instantiate the service
kiosk_service = KioskService()
