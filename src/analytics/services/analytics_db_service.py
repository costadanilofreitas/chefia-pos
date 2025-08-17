"""
Database-backed analytics service for dashboards and reporting
"""

import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple, Union, cast
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...core.database.connection import get_db_session
from ..repositories.analytics_repository import AnalyticsRepository


class AnalyticsDatabaseService:
    """Database-backed service for analytics operations."""

    def __init__(self, db: Session = Depends(get_db_session)):
        self.repository = AnalyticsRepository(db)
        self.logger = logging.getLogger(__name__)

    # Dashboard operations
    async def create_dashboard(self, dashboard_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new dashboard."""
        try:
            # Validate required fields
            if not dashboard_data.get("name"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Dashboard name is required",
                )

            if not dashboard_data.get("owner_id"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Owner ID is required",
                )

            if not dashboard_data.get("restaurant_id"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Restaurant ID is required",
                )

            # Default layout if not provided
            if not dashboard_data.get("layout"):
                dashboard_data["layout"] = {
                    "id": str(uuid.uuid4()),
                    "name": "Default Layout",
                    "grid_columns": 12,
                    "is_fluid": True,
                    "is_responsive": True,
                    "gap": 16,
                }

            # Default items if not provided
            if not dashboard_data.get("items"):
                dashboard_data["items"] = []

            db_dashboard = self.repository.create_dashboard(
                name=dashboard_data["name"],
                owner_id=dashboard_data["owner_id"],
                restaurant_id=dashboard_data["restaurant_id"],
                layout=dashboard_data["layout"],
                description=dashboard_data.get("description"),
                is_template=dashboard_data.get("is_template", False),
                is_public=dashboard_data.get("is_public", False),
                is_favorite=dashboard_data.get("is_favorite", False),
                category=dashboard_data.get("category"),
                tags=dashboard_data.get("tags"),
                items=dashboard_data["items"],
                filters=dashboard_data.get("filters"),
                permissions=dashboard_data.get("permissions"),
            )

            return self._convert_dashboard_to_dict(db_dashboard)

        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error creating dashboard: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating dashboard: {str(e)}",
            ) from e

    async def get_dashboard(self, dashboard_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Get dashboard by ID."""
        try:
            db_dashboard = self.repository.get_dashboard_by_id(dashboard_id)
            if not db_dashboard:
                return None

            return self._convert_dashboard_to_dict(db_dashboard)

        except Exception as e:
            self.logger.error(f"Error getting dashboard: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error getting dashboard: {str(e)}",
            ) from e

    async def update_dashboard(
        self, dashboard_id: uuid.UUID, update_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update dashboard."""
        try:
            db_dashboard = self.repository.update_dashboard(dashboard_id, update_data)
            if not db_dashboard:
                return None

            return self._convert_dashboard_to_dict(db_dashboard)

        except Exception as e:
            self.logger.error(f"Error updating dashboard: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error updating dashboard: {str(e)}",
            ) from e

    async def delete_dashboard(self, dashboard_id: uuid.UUID) -> bool:
        """Delete dashboard."""
        try:
            return self.repository.delete_dashboard(dashboard_id)

        except Exception as e:
            self.logger.error(f"Error deleting dashboard: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error deleting dashboard: {str(e)}",
            ) from e

    async def list_dashboards(
        self,
        restaurant_id: str,
        filters: Dict[str, Any] = None,
        page: int = 1,
        page_size: int = 20,
        order_by: str = "updated_at",
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List dashboards with filters and pagination."""
        try:
            offset = (page - 1) * page_size

            # Extract filters
            owner_id = filters.get("owner_id") if filters else None
            is_template = filters.get("is_template") if filters else None
            is_public = filters.get("is_public") if filters else None
            category = filters.get("category") if filters else None
            tags = filters.get("tags") if filters else None

            dashboards, total = self.repository.list_dashboards(
                restaurant_id=restaurant_id,
                owner_id=owner_id,
                is_template=is_template,
                is_public=is_public,
                category=category,
                tags=tags,
                limit=page_size,
                offset=offset,
                order_by=order_by,
            )

            dashboard_dicts = [
                self._convert_dashboard_to_dict(dashboard) for dashboard in dashboards
            ]

            return dashboard_dicts, total

        except Exception as e:
            self.logger.error(f"Error listing dashboards: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error listing dashboards: {str(e)}",
            ) from e

    async def record_dashboard_view(
        self,
        dashboard_id: uuid.UUID,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        """Record dashboard view."""
        try:
            # Increment view count
            self.repository.increment_dashboard_view_count(dashboard_id)

            # Log the view
            self.repository.log_dashboard_view(
                dashboard_id=dashboard_id,
                user_id=user_id,
                session_id=session_id,
                ip_address=ip_address,
                user_agent=user_agent,
            )

        except Exception as e:
            self.logger.error(f"Error recording dashboard view: {str(e)}")
            # Don't raise exception to avoid interrupting user experience

    # Dashboard sharing operations
    async def share_dashboard(
        self, dashboard_id: uuid.UUID, share_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Share dashboard with users or roles."""
        try:
            # Verify dashboard exists
            dashboard = await self.get_dashboard(dashboard_id)
            if not dashboard:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found"
                )

            db_share = self.repository.create_dashboard_share(
                dashboard_id=dashboard_id,
                created_by=share_data["created_by"],
                permission=share_data.get("permission", "view"),
                user_id=share_data.get("user_id"),
                role_id=share_data.get("role_id"),
                email=share_data.get("email"),
                expires_at=share_data.get("expires_at"),
            )

            return {
                "id": str(db_share.id),
                "dashboard_id": str(db_share.dashboard_id),
                "user_id": db_share.user_id,
                "role_id": db_share.role_id,
                "email": db_share.email,
                "permission": db_share.permission,
                "created_at": db_share.created_at.isoformat(),
                "expires_at": (
                    db_share.expires_at.isoformat() if db_share.expires_at else None
                ),
                "created_by": db_share.created_by,
                "is_active": db_share.is_active,
            }

        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error sharing dashboard: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error sharing dashboard: {str(e)}",
            ) from e

    # Chart configuration operations
    async def create_chart_configuration(
        self, chart_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create chart configuration."""
        try:
            # Validate required fields
            required_fields = ["name", "title", "chart_type", "data_source", "series"]
            for field in required_fields:
                if not chart_data.get(field):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Chart {field} is required",
                    )

            db_chart = self.repository.create_chart_configuration(
                name=chart_data["name"],
                title=chart_data["title"],
                chart_type=chart_data["chart_type"],
                data_source=chart_data["data_source"],
                series=chart_data["series"],
                dashboard_id=chart_data.get("dashboard_id"),
                subtitle=chart_data.get("subtitle"),
                description=chart_data.get("description"),
                axes=chart_data.get("axes"),
                filters=chart_data.get("filters"),
                options=chart_data.get("options"),
                height=chart_data.get("height", 300),
                width=chart_data.get("width"),
                is_responsive=chart_data.get("is_responsive", True),
                refresh_interval=chart_data.get("refresh_interval"),
                drill_down_enabled=chart_data.get("drill_down_enabled", False),
                drill_down_config=chart_data.get("drill_down_config"),
            )

            return self._convert_chart_to_dict(db_chart)

        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error creating chart configuration: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating chart configuration: {str(e)}",
            ) from e

    # Alert operations
    async def create_dashboard_alert(
        self, alert_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create dashboard alert."""
        try:
            # Validate required fields
            required_fields = [
                "dashboard_id",
                "name",
                "metric",
                "condition",
                "threshold",
                "notification_channels",
                "created_by",
            ]
            for field in required_fields:
                if not alert_data.get(field):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Alert {field} is required",
                    )

            db_alert = self.repository.create_dashboard_alert(
                dashboard_id=uuid.UUID(alert_data["dashboard_id"]),
                name=alert_data["name"],
                metric=alert_data["metric"],
                condition=alert_data["condition"],
                threshold=float(alert_data["threshold"]),
                notification_channels=alert_data["notification_channels"],
                created_by=alert_data["created_by"],
                description=alert_data.get("description"),
                chart_id=(
                    uuid.UUID(alert_data["chart_id"])
                    if alert_data.get("chart_id")
                    else None
                ),
                frequency=alert_data.get("frequency", "realtime"),
                recipients=alert_data.get("recipients"),
                webhook_url=alert_data.get("webhook_url"),
                message_template=alert_data.get("message_template"),
                is_active=alert_data.get("is_active", True),
            )

            return self._convert_alert_to_dict(db_alert)

        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error creating dashboard alert: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating dashboard alert: {str(e)}",
            ) from e

    async def trigger_alert(
        self, alert_id: uuid.UUID, value: Union[int, float]
    ) -> bool:
        """Trigger alert and send notifications."""
        try:
            db_alert = self.repository.get_dashboard_alert_by_id(alert_id)
            if not db_alert:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found"
                )

            # Increment trigger count
            self.repository.increment_alert_trigger_count(alert_id)

            # Send notifications (simulated)
            self._send_alert_notifications(db_alert, value)

            return True

        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error triggering alert: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error triggering alert: {str(e)}",
            ) from e

    # Export operations
    async def export_dashboard(
        self,
        dashboard_id: uuid.UUID,
        format: str,
        created_by: str,
        filters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Export dashboard."""
        try:
            # Verify dashboard exists
            dashboard = await self.get_dashboard(dashboard_id)
            if not dashboard:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found"
                )

            db_export = self.repository.create_dashboard_export(
                dashboard_id=dashboard_id,
                format=format,
                created_by=created_by,
                filters=filters,
            )

            # In a real implementation, this would trigger background processing
            # For now, we'll simulate immediate completion
            export_id = cast(UUID, db_export.id)
            self._process_export_async(export_id)

            return self._convert_export_to_dict(db_export)

        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error exporting dashboard: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error exporting dashboard: {str(e)}",
            ) from e

    async def get_export_status(self, export_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Get export status."""
        try:
            db_export = self.repository.get_dashboard_export_by_id(export_id)
            if not db_export:
                return None

            return self._convert_export_to_dict(db_export)

        except Exception as e:
            self.logger.error(f"Error getting export status: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error getting export status: {str(e)}",
            ) from e

    # Scheduled report operations
    async def create_scheduled_report(
        self, report_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create scheduled report."""
        try:
            # Validate required fields
            required_fields = [
                "dashboard_id",
                "name",
                "format",
                "schedule",
                "recipients",
                "subject",
                "created_by",
            ]
            for field in required_fields:
                if not report_data.get(field):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Report {field} is required",
                    )

            db_report = self.repository.create_scheduled_report(
                dashboard_id=uuid.UUID(report_data["dashboard_id"]),
                name=report_data["name"],
                format=report_data["format"],
                schedule=report_data["schedule"],
                recipients=report_data["recipients"],
                subject=report_data["subject"],
                created_by=report_data["created_by"],
                description=report_data.get("description"),
                message=report_data.get("message"),
                filters=report_data.get("filters"),
                is_active=report_data.get("is_active", True),
            )

            return self._convert_report_to_dict(db_report)

        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error creating scheduled report: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating scheduled report: {str(e)}",
            ) from e

    # Analytics operations
    async def get_analytics_summary(self, restaurant_id: str) -> Dict[str, Any]:
        """Get analytics summary for a restaurant."""
        try:
            usage_stats = self.repository.get_dashboard_usage_stats(restaurant_id)
            export_stats = self.repository.get_export_stats(restaurant_id)

            # Count alerts and reports
            all_dashboards, _ = self.repository.list_dashboards(
                restaurant_id, limit=1000
            )
            dashboard_ids = [dashboard.id for dashboard in all_dashboards]

            alert_count = 0
            report_count = 0

            for db_id in dashboard_ids:
                # Cast to UUID type for mypy
                dashboard_uuid = cast(Optional[UUID], db_id)
                alerts = self.repository.list_dashboard_alerts(dashboard_uuid)
                reports = self.repository.list_scheduled_reports(dashboard_uuid)
                alert_count += len(alerts)
                report_count += len(reports)

            return {
                "dashboard_count": usage_stats["total_dashboards"],
                "alert_count": alert_count,
                "report_count": report_count,
                "export_count": export_stats["total_exports"],
                "total_views": usage_stats["total_views"],
                "unique_users": usage_stats["unique_users"],
                "active_dashboards": usage_stats["active_dashboards"],
                "top_dashboards": usage_stats["top_dashboards"],
                "exports_by_format": export_stats["exports_by_format"],
                "last_updated": datetime.now().isoformat(),
            }

        except Exception as e:
            self.logger.error(f"Error getting analytics summary: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error getting analytics summary: {str(e)}",
            ) from e

    # Helper methods
    def _convert_dashboard_to_dict(self, db_dashboard) -> Dict[str, Any]:
        """Convert database dashboard to dictionary."""
        return {
            "id": str(db_dashboard.id),
            "name": db_dashboard.name,
            "description": db_dashboard.description,
            "owner_id": db_dashboard.owner_id,
            "restaurant_id": db_dashboard.restaurant_id,
            "is_template": db_dashboard.is_template,
            "is_public": db_dashboard.is_public,
            "is_favorite": db_dashboard.is_favorite,
            "category": db_dashboard.category,
            "tags": db_dashboard.tags,
            "layout": db_dashboard.layout,
            "items": db_dashboard.items,
            "filters": db_dashboard.filters,
            "view_count": db_dashboard.view_count,
            "last_viewed_at": (
                db_dashboard.last_viewed_at.isoformat()
                if db_dashboard.last_viewed_at
                else None
            ),
            "thumbnail_url": db_dashboard.thumbnail_url,
            "permissions": db_dashboard.permissions,
            "created_at": db_dashboard.created_at.isoformat(),
            "updated_at": db_dashboard.updated_at.isoformat(),
        }

    def _convert_chart_to_dict(self, db_chart) -> Dict[str, Any]:
        """Convert database chart to dictionary."""
        return {
            "id": str(db_chart.id),
            "dashboard_id": (
                str(db_chart.dashboard_id) if db_chart.dashboard_id else None
            ),
            "name": db_chart.name,
            "title": db_chart.title,
            "subtitle": db_chart.subtitle,
            "description": db_chart.description,
            "chart_type": db_chart.chart_type.value,
            "data_source": db_chart.data_source.value,
            "series": db_chart.series,
            "axes": db_chart.axes,
            "filters": db_chart.filters,
            "options": db_chart.options,
            "height": db_chart.height,
            "width": db_chart.width,
            "is_responsive": db_chart.is_responsive,
            "refresh_interval": db_chart.refresh_interval,
            "drill_down_enabled": db_chart.drill_down_enabled,
            "drill_down_config": db_chart.drill_down_config,
            "created_at": db_chart.created_at.isoformat(),
            "updated_at": db_chart.updated_at.isoformat(),
        }

    def _convert_alert_to_dict(self, db_alert) -> Dict[str, Any]:
        """Convert database alert to dictionary."""
        return {
            "id": str(db_alert.id),
            "dashboard_id": str(db_alert.dashboard_id),
            "chart_id": str(db_alert.chart_id) if db_alert.chart_id else None,
            "name": db_alert.name,
            "description": db_alert.description,
            "metric": db_alert.metric,
            "condition": db_alert.condition.value,
            "threshold": db_alert.threshold,
            "frequency": db_alert.frequency,
            "notification_channels": db_alert.notification_channels,
            "recipients": db_alert.recipients,
            "webhook_url": db_alert.webhook_url,
            "message_template": db_alert.message_template,
            "is_active": db_alert.is_active,
            "trigger_count": db_alert.trigger_count,
            "last_triggered_at": (
                db_alert.last_triggered_at.isoformat()
                if db_alert.last_triggered_at
                else None
            ),
            "created_at": db_alert.created_at.isoformat(),
            "updated_at": db_alert.updated_at.isoformat(),
            "created_by": db_alert.created_by,
        }

    def _convert_export_to_dict(self, db_export) -> Dict[str, Any]:
        """Convert database export to dictionary."""
        return {
            "id": str(db_export.id),
            "dashboard_id": str(db_export.dashboard_id),
            "format": db_export.format,
            "filters": db_export.filters,
            "status": db_export.status,
            "file_url": db_export.file_url,
            "error_message": db_export.error_message,
            "file_size": db_export.file_size,
            "filename": db_export.filename,
            "created_at": db_export.created_at.isoformat(),
            "created_by": db_export.created_by,
            "completed_at": (
                db_export.completed_at.isoformat() if db_export.completed_at else None
            ),
        }

    def _convert_report_to_dict(self, db_report) -> Dict[str, Any]:
        """Convert database report to dictionary."""
        return {
            "id": str(db_report.id),
            "dashboard_id": str(db_report.dashboard_id),
            "name": db_report.name,
            "description": db_report.description,
            "format": db_report.format,
            "schedule": db_report.schedule,
            "recipients": db_report.recipients,
            "subject": db_report.subject,
            "message": db_report.message,
            "filters": db_report.filters,
            "is_active": db_report.is_active,
            "last_run_at": (
                db_report.last_run_at.isoformat() if db_report.last_run_at else None
            ),
            "last_run_status": db_report.last_run_status,
            "next_run_at": (
                db_report.next_run_at.isoformat() if db_report.next_run_at else None
            ),
            "run_count": db_report.run_count,
            "created_at": db_report.created_at.isoformat(),
            "updated_at": db_report.updated_at.isoformat(),
            "created_by": db_report.created_by,
        }

    def _send_alert_notifications(self, alert, value: Union[int, float]) -> None:
        """Send alert notifications (simulated)."""
        message = (
            alert.message_template
            or f"Alert: {alert.name} - Current value: {value}, Threshold: {alert.threshold}"
        )

        for channel in alert.notification_channels:
            if channel == "email" and alert.recipients:
                self.logger.info(
                    f"Sending email alert to {alert.recipients}: {message}"
                )
            elif channel == "sms" and alert.recipients:
                self.logger.info(f"Sending SMS alert to {alert.recipients}: {message}")
            elif channel == "push":
                self.logger.info(f"Sending push notification: {message}")
            elif channel == "webhook" and alert.webhook_url:
                self.logger.info(f"Sending webhook to {alert.webhook_url}: {message}")

    def _process_export_async(self, export_id: uuid.UUID) -> None:
        """Process export asynchronously (simulated)."""
        try:
            # Simulate processing
            import time

            time.sleep(0.1)  # Simulate processing time

            # Generate mock file URL
            filename = f"dashboard_export_{export_id}_{int(datetime.now().timestamp())}"
            file_url = f"/exports/{filename}.pdf"

            # Update export status
            self.repository.update_export_status(
                export_id=export_id,
                status="completed",
                file_url=file_url,
                filename=f"{filename}.pdf",
                file_size=1024 * 100,  # 100KB mock size
            )

        except Exception as e:
            self.logger.error(f"Error processing export {export_id}: {str(e)}")
            self.repository.update_export_status(
                export_id=export_id, status="failed", error_message=str(e)
            )


# Dependency function to get the service
def get_analytics_service(db: Session = Depends(get_db_session)) -> AnalyticsDatabaseService:
    """Get AnalyticsDatabaseService instance with database session."""
    return AnalyticsDatabaseService(db)
