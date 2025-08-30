"""
Reservation Notification Service
Handles notifications for reservations (confirmations, reminders, cancellations)
"""

import asyncio
import logging
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional

from src.core.events.event_bus import EventBus
from src.reservation.models.reservation_models import Reservation, ReservationStatus

logger = logging.getLogger(__name__)


class NotificationType(Enum):
    """Types of reservation notifications"""
    CONFIRMATION = "CONFIRMATION"
    REMINDER = "REMINDER"
    CANCELLATION = "CANCELLATION"
    TABLE_READY = "TABLE_READY"
    NO_SHOW_WARNING = "NO_SHOW_WARNING"


class ReservationNotificationService:
    """Service for managing reservation notifications"""

    def __init__(self, event_bus: EventBus):
        self.event_bus = event_bus
        self.sms_enabled = False  # Would be configured from settings
        self.email_enabled = False
        self.whatsapp_enabled = False

    async def send_confirmation(
        self,
        reservation: Reservation,
        method: Optional[str] = None
    ) -> bool:
        """Send reservation confirmation"""
        try:
            # Prepare confirmation message
            message = self._build_confirmation_message(reservation)

            # Determine notification method
            if not method:
                method = self._determine_method(reservation)

            # Send notification
            success = await self._send_notification(
                reservation.customer_phone,
                reservation.customer_email,
                message,
                method,
                NotificationType.CONFIRMATION
            )

            if success:
                logger.info(f"Sent confirmation for reservation {reservation.id}")

                # Publish event
                await self.event_bus.publish("reservation.notification_sent", {
                    "reservation_id": str(reservation.id),
                    "type": "CONFIRMATION",
                    "method": method
                })

            return success

        except Exception as e:
            logger.error(f"Error sending confirmation: {e}")
            return False

    async def send_reminder(
        self,
        reservation: Reservation,
        advance_minutes: int = 60
    ) -> bool:
        """Send reservation reminder"""
        try:
            # Check if it's time to send reminder
            now = datetime.now()
            reminder_time = reservation.reservation_datetime - timedelta(minutes=advance_minutes)

            if now < reminder_time:
                # Schedule for later
                delay = (reminder_time - now).total_seconds()
                asyncio.create_task(self._delayed_reminder(reservation, delay))
                return True

            # Send reminder now
            message = self._build_reminder_message(reservation)

            success = await self._send_notification(
                reservation.customer_phone,
                reservation.customer_email,
                message,
                self._determine_method(reservation),
                NotificationType.REMINDER
            )

            if success:
                logger.info(f"Sent reminder for reservation {reservation.id}")

                await self.event_bus.publish("reservation.reminder_sent", {
                    "reservation_id": str(reservation.id)
                })

            return success

        except Exception as e:
            logger.error(f"Error sending reminder: {e}")
            return False

    async def send_cancellation(
        self,
        reservation: Reservation,
        reason: Optional[str] = None
    ) -> bool:
        """Send cancellation notification"""
        try:
            message = self._build_cancellation_message(reservation, reason)

            success = await self._send_notification(
                reservation.customer_phone,
                reservation.customer_email,
                message,
                self._determine_method(reservation),
                NotificationType.CANCELLATION
            )

            if success:
                logger.info(f"Sent cancellation for reservation {reservation.id}")

                await self.event_bus.publish("reservation.cancellation_sent", {
                    "reservation_id": str(reservation.id),
                    "reason": reason
                })

            return success

        except Exception as e:
            logger.error(f"Error sending cancellation: {e}")
            return False

    async def send_table_ready(
        self,
        reservation: Reservation,
        table_number: Optional[int] = None
    ) -> bool:
        """Notify that table is ready"""
        try:
            message = self._build_table_ready_message(reservation, table_number)

            # Use faster method for table ready (SMS/WhatsApp preferred)
            method = "SMS" if reservation.customer_phone else "EMAIL"

            success = await self._send_notification(
                reservation.customer_phone,
                reservation.customer_email,
                message,
                method,
                NotificationType.TABLE_READY
            )

            if success:
                logger.info(f"Sent table ready for reservation {reservation.id}")

                await self.event_bus.publish("reservation.table_ready_sent", {
                    "reservation_id": str(reservation.id),
                    "table_number": table_number
                })

            return success

        except Exception as e:
            logger.error(f"Error sending table ready: {e}")
            return False

    async def send_batch_reminders(
        self,
        reservations: List[Reservation],
        advance_minutes: int = 60
    ) -> Dict[str, bool]:
        """Send reminders for multiple reservations"""
        results = {}

        for reservation in reservations:
            if not reservation.reminder_sent:
                success = await self.send_reminder(reservation, advance_minutes)
                results[str(reservation.id)] = success

                # Small delay between notifications
                await asyncio.sleep(0.5)

        return results

    async def schedule_notifications(
        self,
        reservation: Reservation
    ) -> None:
        """Schedule all notifications for a reservation"""
        try:
            # Schedule confirmation if needed
            if reservation.status == ReservationStatus.PENDING:
                await self.send_confirmation(reservation)

            # Schedule reminder
            if reservation.status == ReservationStatus.CONFIRMED:
                await self.send_reminder(reservation, 60)  # 1 hour before

                # Schedule no-show warning
                warning_time = reservation.reservation_datetime + timedelta(minutes=15)
                delay = (warning_time - datetime.now()).total_seconds()

                if delay > 0:
                    asyncio.create_task(
                        self._delayed_no_show_warning(reservation, delay)
                    )

        except Exception as e:
            logger.error(f"Error scheduling notifications: {e}")

    # Private helper methods

    def _build_confirmation_message(self, reservation: Reservation) -> str:
        """Build confirmation message"""
        date_str = reservation.reservation_date.strftime("%d/%m/%Y")
        time_str = reservation.reservation_time.strftime("%H:%M")

        message = f"""
Reserva Confirmada!

Nome: {reservation.customer_name}
Data: {date_str}
Hora: {time_str}
Pessoas: {reservation.party_size}
Código: {reservation.confirmation_code}

Para cancelar ou modificar, use o código acima.
"""

        if reservation.special_requests:
            message += f"\nObservações: {reservation.special_requests}"

        if reservation.deposit_amount and reservation.deposit_amount > 0:
            message += f"\nDepósito: R$ {reservation.deposit_amount:.2f}"

        return message.strip()

    def _build_reminder_message(self, reservation: Reservation) -> str:
        """Build reminder message"""
        time_str = reservation.reservation_time.strftime("%H:%M")

        message = f"""
Lembrete de Reserva!

Sua mesa está reservada para hoje às {time_str}.
Pessoas: {reservation.party_size}
Código: {reservation.confirmation_code}

Chegue com 10 minutos de antecedência.
"""

        if reservation.assigned_tables:
            message += f"\nMesa(s): {', '.join(str(t) for t in reservation.assigned_tables)}"

        return message.strip()

    def _build_cancellation_message(
        self,
        reservation: Reservation,
        reason: Optional[str] = None
    ) -> str:
        """Build cancellation message"""
        date_str = reservation.reservation_date.strftime("%d/%m/%Y")
        time_str = reservation.reservation_time.strftime("%H:%M")

        message = f"""
Reserva Cancelada

Sua reserva para {date_str} às {time_str} foi cancelada.
"""

        if reason:
            message += f"\nMotivo: {reason}"

        if reservation.deposit_amount and reservation.deposit_amount > 0:
            if reservation.deposit_refunded:
                message += f"\nSeu depósito de R$ {reservation.deposit_amount:.2f} será reembolsado."
            else:
                message += "\nEntre em contato para informações sobre reembolso."

        return message.strip()

    def _build_table_ready_message(
        self,
        reservation: Reservation,
        table_number: Optional[int] = None
    ) -> str:
        """Build table ready message"""
        message = f"""
Mesa Pronta!

{reservation.customer_name}, sua mesa está pronta.
"""

        if table_number:
            message += f"\nMesa número: {table_number}"

        message += f"\nCódigo: {reservation.confirmation_code}"
        message += "\n\nPor favor, dirija-se à recepção."

        return message.strip()

    def _determine_method(self, reservation: Reservation) -> str:
        """Determine best notification method"""
        if reservation.customer_phone and self.sms_enabled:
            return "SMS"
        elif reservation.customer_phone and self.whatsapp_enabled:
            return "WHATSAPP"
        elif reservation.customer_email and self.email_enabled:
            return "EMAIL"
        else:
            return "NONE"

    async def _send_notification(
        self,
        phone: Optional[str],
        email: Optional[str],
        message: str,
        method: str,
        notification_type: NotificationType
    ) -> bool:
        """Send notification via specified method"""
        try:
            if method == "SMS" and phone:
                return await self._send_sms(phone, message)
            elif method == "WHATSAPP" and phone:
                return await self._send_whatsapp(phone, message)
            elif method == "EMAIL" and email:
                return await self._send_email(email, message, notification_type)
            else:
                logger.warning(f"No valid method for sending notification: {method}")
                return False

        except Exception as e:
            logger.error(f"Error sending {method} notification: {e}")
            return False

    async def _send_sms(self, phone: str, message: str) -> bool:
        """Send SMS notification"""
        try:
            # Integration with SMS service (Twilio, etc.)
            logger.info(f"SMS would be sent to {phone}: {message[:50]}...")

            # In production:
            # from twilio.rest import Client
            # client = Client(account_sid, auth_token)
            # client.messages.create(
            #     to=phone,
            #     from_=sender_number,
            #     body=message
            # )

            return True

        except Exception as e:
            logger.error(f"SMS send error: {e}")
            return False

    async def _send_whatsapp(self, phone: str, message: str) -> bool:
        """Send WhatsApp notification"""
        try:
            # Integration with WhatsApp Business API
            logger.info(f"WhatsApp would be sent to {phone}: {message[:50]}...")

            # In production:
            # Use WhatsApp Business API or Twilio WhatsApp
            # await whatsapp_client.send_message(phone, message)

            return True

        except Exception as e:
            logger.error(f"WhatsApp send error: {e}")
            return False

    async def _send_email(
        self,
        email: str,
        message: str,
        notification_type: NotificationType
    ) -> bool:
        """Send email notification"""
        try:
            # Integration with email service
            subject = self._get_email_subject(notification_type)

            logger.info(f"Email would be sent to {email}: {subject}")

            # In production:
            # import smtplib
            # from email.mime.text import MIMEText
            # msg = MIMEText(message)
            # msg['Subject'] = subject
            # msg['From'] = sender_email
            # msg['To'] = email
            # smtp.send_message(msg)

            return True

        except Exception as e:
            logger.error(f"Email send error: {e}")
            return False

    def _get_email_subject(self, notification_type: NotificationType) -> str:
        """Get email subject based on notification type"""
        subjects = {
            NotificationType.CONFIRMATION: "Confirmação de Reserva",
            NotificationType.REMINDER: "Lembrete de Reserva - Hoje",
            NotificationType.CANCELLATION: "Reserva Cancelada",
            NotificationType.TABLE_READY: "Sua Mesa Está Pronta!",
            NotificationType.NO_SHOW_WARNING: "Confirmação de Presença Necessária"
        }
        return subjects.get(notification_type, "Notificação de Reserva")

    async def _delayed_reminder(
        self,
        reservation: Reservation,
        delay: float
    ) -> None:
        """Send reminder after delay"""
        await asyncio.sleep(delay)
        await self.send_reminder(reservation, 0)

    async def _delayed_no_show_warning(
        self,
        reservation: Reservation,
        delay: float
    ) -> None:
        """Send no-show warning after delay"""
        await asyncio.sleep(delay)

        # Check if customer arrived
        if reservation.status not in [ReservationStatus.ARRIVED, ReservationStatus.SEATED]:
            message = f"""
Aguardando sua chegada!

{reservation.customer_name}, sua reserva estava marcada para {reservation.reservation_time.strftime("%H:%M")}.

Se ainda pretende comparecer, por favor nos informe.
Código: {reservation.confirmation_code}
"""

            await self._send_notification(
                reservation.customer_phone,
                reservation.customer_email,
                message,
                "SMS",  # Priority for urgent notifications
                NotificationType.NO_SHOW_WARNING
            )
