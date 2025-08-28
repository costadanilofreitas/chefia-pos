# Analytics repository for database operations

import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import asc, desc, func, or_
from sqlalchemy.orm import Session, joinedload

from ..models.db_models import (
    ChartConfigurationDB,
    ChartTypeEnum,
    DashboardAlertDB,
    DashboardDB,
    DashboardExportDB,
    DashboardShareDB,
    DashboardViewLogDB,
    DataSourceConfigDB,
    DataSourceTypeEnum,
    FilterOperatorEnum,
    ScheduledReportDB,
    UserDashboardPreferenceDB,
)


class AnalyticsRepository:
    """Repository for analytics-related database operations."""

    def __init__(self, db: Session):
        self.db = db

    # Dashboard operations
    def create_dashboard(
        self,
        name: str,
        owner_id: str,
        restaurant_id: str,
        layout: Dict[str, Any],
        **kwargs,
    ) -> DashboardDB:
        """Create a new dashboard."""

        db_dashboard = DashboardDB(
            name=name,
            owner_id=owner_id,
            restaurant_id=restaurant_id,
            layout=layout,
            **kwargs,
        )

        self.db.add(db_dashboard)
        self.db.commit()
        self.db.refresh(db_dashboard)
        return db_dashboard

    def get_dashboard_by_id(self, dashboard_id: uuid.UUID) -> Optional[DashboardDB]:
        """Get dashboard by ID with related data."""
        return (
            self.db.query(DashboardDB)
            .options(
                joinedload(DashboardDB.shares),
                joinedload(DashboardDB.alerts),
                joinedload(DashboardDB.exports),
                joinedload(DashboardDB.reports),
            )
            .filter(DashboardDB.id == dashboard_id)
            .first()
        )

    def list_dashboards(
        self,
        restaurant_id: str,
        owner_id: Optional[str] = None,
        is_template: Optional[bool] = None,
        is_public: Optional[bool] = None,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        limit: int = 50,
        offset: int = 0,
        order_by: str = "updated_at",
    ) -> Tuple[List[DashboardDB], int]:
        """List dashboards with filters and pagination."""

        query = self.db.query(DashboardDB).filter(
            DashboardDB.restaurant_id == restaurant_id
        )

        if owner_id:
            query = query.filter(DashboardDB.owner_id == owner_id)

        if is_template is not None:
            query = query.filter(DashboardDB.is_template == is_template)

        if is_public is not None:
            query = query.filter(DashboardDB.is_public == is_public)

        if category:
            query = query.filter(DashboardDB.category == category)

        if tags:
            # Filter by tags (JSON array contains any of the specified tags)
            tag_conditions = []
            for tag in tags:
                tag_conditions.append(
                    func.json_array_length(
                        func.json_extract_path(DashboardDB.tags, tag)
                    )
                    > 0
                )
            if tag_conditions:
                query = query.filter(or_(*tag_conditions))

        # Get total count
        total = query.count()

        # Apply ordering
        if order_by == "name":
            query = query.order_by(asc(DashboardDB.name))
        elif order_by == "view_count":
            query = query.order_by(desc(DashboardDB.view_count))
        elif order_by == "created_at":
            query = query.order_by(desc(DashboardDB.created_at))
        else:  # default to updated_at
            query = query.order_by(desc(DashboardDB.updated_at))

        # Apply pagination
        dashboards = query.offset(offset).limit(limit).all()

        return dashboards, total

    def update_dashboard(
        self, dashboard_id: uuid.UUID, updates: Dict[str, Any]
    ) -> Optional[DashboardDB]:
        """Update dashboard."""

        db_dashboard = (
            self.db.query(DashboardDB).filter(DashboardDB.id == dashboard_id).first()
        )

        if not db_dashboard:
            return None

        for field, value in updates.items():
            if hasattr(db_dashboard, field):
                setattr(db_dashboard, field, value)

        db_dashboard.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_dashboard)
        return db_dashboard

    def delete_dashboard(self, dashboard_id: uuid.UUID) -> bool:
        """Delete dashboard."""
        db_dashboard = (
            self.db.query(DashboardDB).filter(DashboardDB.id == dashboard_id).first()
        )

        if not db_dashboard:
            return False

        self.db.delete(db_dashboard)
        self.db.commit()
        return True

    def increment_dashboard_view_count(
        self, dashboard_id: uuid.UUID
    ) -> Optional[DashboardDB]:
        """Increment dashboard view count and update last viewed timestamp."""
        db_dashboard = (
            self.db.query(DashboardDB).filter(DashboardDB.id == dashboard_id).first()
        )

        if not db_dashboard:
            return None

        db_dashboard.view_count = db_dashboard.view_count + 1
        db_dashboard.last_viewed_at = datetime.utcnow()
        db_dashboard.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_dashboard)
        return db_dashboard

    # Dashboard sharing operations
    def create_dashboard_share(
        self,
        dashboard_id: uuid.UUID,
        created_by: str,
        permission: str = "view",
        user_id: Optional[str] = None,
        role_id: Optional[str] = None,
        email: Optional[str] = None,
        **kwargs,
    ) -> DashboardShareDB:
        """Create dashboard share."""

        db_share = DashboardShareDB(
            dashboard_id=dashboard_id,
            created_by=created_by,
            permission=permission,
            user_id=user_id,
            role_id=role_id,
            email=email,
            **kwargs,
        )

        self.db.add(db_share)
        self.db.commit()
        self.db.refresh(db_share)
        return db_share

    def get_dashboard_shares(self, dashboard_id: uuid.UUID) -> List[DashboardShareDB]:
        """Get all shares for a dashboard."""
        return (
            self.db.query(DashboardShareDB)
            .filter(
                DashboardShareDB.dashboard_id == dashboard_id,
                DashboardShareDB.is_active,
            )
            .all()
        )

    # Chart configuration operations
    def create_chart_configuration(
        self,
        name: str,
        title: str,
        chart_type: ChartTypeEnum,
        data_source: DataSourceTypeEnum,
        series: List[Dict[str, Any]],
        dashboard_id: Optional[uuid.UUID] = None,
        **kwargs,
    ) -> ChartConfigurationDB:
        """Create chart configuration."""

        db_chart = ChartConfigurationDB(
            name=name,
            title=title,
            chart_type=chart_type,
            data_source=data_source,
            series=series,
            dashboard_id=dashboard_id,
            **kwargs,
        )

        self.db.add(db_chart)
        self.db.commit()
        self.db.refresh(db_chart)
        return db_chart

    def get_chart_configuration_by_id(
        self, chart_id: uuid.UUID
    ) -> Optional[ChartConfigurationDB]:
        """Get chart configuration by ID."""
        return (
            self.db.query(ChartConfigurationDB)
            .filter(ChartConfigurationDB.id == chart_id)
            .first()
        )

    def list_chart_configurations(
        self,
        dashboard_id: Optional[uuid.UUID] = None,
        data_source: Optional[DataSourceTypeEnum] = None,
        chart_type: Optional[ChartTypeEnum] = None,
    ) -> List[ChartConfigurationDB]:
        """List chart configurations with filters."""

        query = self.db.query(ChartConfigurationDB)

        if dashboard_id:
            query = query.filter(ChartConfigurationDB.dashboard_id == dashboard_id)

        if data_source:
            query = query.filter(ChartConfigurationDB.data_source == data_source)

        if chart_type:
            query = query.filter(ChartConfigurationDB.chart_type == chart_type)

        return query.order_by(desc(ChartConfigurationDB.created_at)).all()

    # Alert operations
    def create_dashboard_alert(
        self,
        dashboard_id: uuid.UUID,
        name: str,
        metric: str,
        condition: FilterOperatorEnum,
        threshold: float,
        notification_channels: List[str],
        created_by: str,
        **kwargs,
    ) -> DashboardAlertDB:
        """Create dashboard alert."""

        db_alert = DashboardAlertDB(
            dashboard_id=dashboard_id,
            name=name,
            metric=metric,
            condition=condition,
            threshold=threshold,
            notification_channels=notification_channels,
            created_by=created_by,
            **kwargs,
        )

        self.db.add(db_alert)
        self.db.commit()
        self.db.refresh(db_alert)
        return db_alert

    def get_dashboard_alert_by_id(
        self, alert_id: uuid.UUID
    ) -> Optional[DashboardAlertDB]:
        """Get dashboard alert by ID."""
        return (
            self.db.query(DashboardAlertDB)
            .filter(DashboardAlertDB.id == alert_id)
            .first()
        )

    def list_dashboard_alerts(
        self,
        dashboard_id: Optional[uuid.UUID] = None,
        is_active: Optional[bool] = None,
        frequency: Optional[str] = None,
    ) -> List[DashboardAlertDB]:
        """List dashboard alerts with filters."""

        query = self.db.query(DashboardAlertDB)

        if dashboard_id:
            query = query.filter(DashboardAlertDB.dashboard_id == dashboard_id)

        if is_active is not None:
            query = query.filter(DashboardAlertDB.is_active == is_active)

        if frequency:
            query = query.filter(DashboardAlertDB.frequency == frequency)

        return query.order_by(desc(DashboardAlertDB.created_at)).all()

    def increment_alert_trigger_count(
        self, alert_id: uuid.UUID
    ) -> Optional[DashboardAlertDB]:
        """Increment alert trigger count and update timestamp."""
        db_alert = (
            self.db.query(DashboardAlertDB)
            .filter(DashboardAlertDB.id == alert_id)
            .first()
        )

        if not db_alert:
            return None

        db_alert.trigger_count = db_alert.trigger_count + 1
        db_alert.last_triggered_at = datetime.utcnow()
        db_alert.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_alert)
        return db_alert

    # Export operations
    def create_dashboard_export(
        self,
        dashboard_id: uuid.UUID,
        format: str,
        created_by: str,
        filters: Optional[Dict[str, Any]] = None,
        **kwargs,
    ) -> DashboardExportDB:
        """Create dashboard export."""

        db_export = DashboardExportDB(
            dashboard_id=dashboard_id,
            format=format,
            created_by=created_by,
            filters=filters,
            **kwargs,
        )

        self.db.add(db_export)
        self.db.commit()
        self.db.refresh(db_export)
        return db_export

    def get_dashboard_export_by_id(
        self, export_id: uuid.UUID
    ) -> Optional[DashboardExportDB]:
        """Get dashboard export by ID."""
        return (
            self.db.query(DashboardExportDB)
            .filter(DashboardExportDB.id == export_id)
            .first()
        )

    def update_export_status(
        self,
        export_id: uuid.UUID,
        status: str,
        file_url: Optional[str] = None,
        error_message: Optional[str] = None,
        **kwargs,
    ) -> Optional[DashboardExportDB]:
        """Update export status."""

        db_export = (
            self.db.query(DashboardExportDB)
            .filter(DashboardExportDB.id == export_id)
            .first()
        )

        if not db_export:
            return None

        db_export.status = status
        if file_url:
            db_export.file_url = file_url
        if error_message:
            db_export.error_message = error_message
        if status == "completed":
            db_export.completed_at = datetime.utcnow()

        for key, value in kwargs.items():
            if hasattr(db_export, key):
                setattr(db_export, key, value)

        self.db.commit()
        self.db.refresh(db_export)
        return db_export

    def list_dashboard_exports(
        self,
        dashboard_id: Optional[uuid.UUID] = None,
        created_by: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[DashboardExportDB], int]:
        """List dashboard exports with filters and pagination."""

        query = self.db.query(DashboardExportDB)

        if dashboard_id:
            query = query.filter(DashboardExportDB.dashboard_id == dashboard_id)

        if created_by:
            query = query.filter(DashboardExportDB.created_by == created_by)

        if status:
            query = query.filter(DashboardExportDB.status == status)

        # Get total count
        total = query.count()

        # Apply pagination
        exports = (
            query.order_by(desc(DashboardExportDB.created_at))
            .offset(offset)
            .limit(limit)
            .all()
        )

        return exports, total

    # Scheduled report operations
    def create_scheduled_report(
        self,
        dashboard_id: uuid.UUID,
        name: str,
        format: str,
        schedule: str,
        recipients: List[str],
        subject: str,
        created_by: str,
        **kwargs,
    ) -> ScheduledReportDB:
        """Create scheduled report."""

        db_report = ScheduledReportDB(
            dashboard_id=dashboard_id,
            name=name,
            format=format,
            schedule=schedule,
            recipients=recipients,
            subject=subject,
            created_by=created_by,
            **kwargs,
        )

        self.db.add(db_report)
        self.db.commit()
        self.db.refresh(db_report)
        return db_report

    def get_scheduled_report_by_id(
        self, report_id: uuid.UUID
    ) -> Optional[ScheduledReportDB]:
        """Get scheduled report by ID."""
        return (
            self.db.query(ScheduledReportDB)
            .filter(ScheduledReportDB.id == report_id)
            .first()
        )

    def list_scheduled_reports(
        self,
        dashboard_id: Optional[uuid.UUID] = None,
        created_by: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> List[ScheduledReportDB]:
        """List scheduled reports with filters."""

        query = self.db.query(ScheduledReportDB)

        if dashboard_id:
            query = query.filter(ScheduledReportDB.dashboard_id == dashboard_id)

        if created_by:
            query = query.filter(ScheduledReportDB.created_by == created_by)

        if is_active is not None:
            query = query.filter(ScheduledReportDB.is_active == is_active)

        return query.order_by(desc(ScheduledReportDB.created_at)).all()

    def update_report_run_status(
        self, report_id: uuid.UUID, status: str, next_run_at: Optional[datetime] = None
    ) -> Optional[ScheduledReportDB]:
        """Update report run status."""

        db_report = (
            self.db.query(ScheduledReportDB)
            .filter(ScheduledReportDB.id == report_id)
            .first()
        )

        if not db_report:
            return None

        db_report.last_run_at = datetime.utcnow()
        db_report.last_run_status = status
        db_report.run_count = db_report.run_count + 1

        if next_run_at:
            db_report.next_run_at = next_run_at

        self.db.commit()
        self.db.refresh(db_report)
        return db_report

    # Data source operations
    def create_data_source_config(
        self,
        restaurant_id: str,
        name: str,
        data_source_type: DataSourceTypeEnum,
        created_by: str,
        **kwargs,
    ) -> DataSourceConfigDB:
        """Create data source configuration."""

        db_config = DataSourceConfigDB(
            restaurant_id=restaurant_id,
            name=name,
            data_source_type=data_source_type,
            created_by=created_by,
            **kwargs,
        )

        self.db.add(db_config)
        self.db.commit()
        self.db.refresh(db_config)
        return db_config

    def get_data_source_config_by_id(
        self, config_id: uuid.UUID
    ) -> Optional[DataSourceConfigDB]:
        """Get data source configuration by ID."""
        return (
            self.db.query(DataSourceConfigDB)
            .filter(DataSourceConfigDB.id == config_id)
            .first()
        )

    def list_data_source_configs(
        self,
        restaurant_id: str,
        data_source_type: Optional[DataSourceTypeEnum] = None,
        is_active: Optional[bool] = None,
    ) -> List[DataSourceConfigDB]:
        """List data source configurations with filters."""

        query = self.db.query(DataSourceConfigDB).filter(
            DataSourceConfigDB.restaurant_id == restaurant_id
        )

        if data_source_type:
            query = query.filter(
                DataSourceConfigDB.data_source_type == data_source_type
            )

        if is_active is not None:
            query = query.filter(DataSourceConfigDB.is_active == is_active)

        return query.order_by(desc(DataSourceConfigDB.created_at)).all()

    # User preferences operations
    def get_user_dashboard_preferences(
        self, user_id: str
    ) -> Optional[UserDashboardPreferenceDB]:
        """Get user dashboard preferences."""
        return (
            self.db.query(UserDashboardPreferenceDB)
            .filter(UserDashboardPreferenceDB.user_id == user_id)
            .first()
        )

    def create_or_update_user_preferences(
        self, user_id: str, preferences: Dict[str, Any]
    ) -> UserDashboardPreferenceDB:
        """Create or update user dashboard preferences."""

        db_prefs = self.get_user_dashboard_preferences(user_id)

        if db_prefs:
            # Update existing preferences
            for key, value in preferences.items():
                if hasattr(db_prefs, key):
                    setattr(db_prefs, key, value)
            db_prefs.updated_at = datetime.utcnow()
        else:
            # Create new preferences
            db_prefs = UserDashboardPreferenceDB(user_id=user_id, **preferences)
            self.db.add(db_prefs)

        self.db.commit()
        self.db.refresh(db_prefs)
        return db_prefs

    # View logging operations
    def log_dashboard_view(
        self,
        dashboard_id: uuid.UUID,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        **kwargs,
    ) -> DashboardViewLogDB:
        """Log dashboard view."""

        db_log = DashboardViewLogDB(
            dashboard_id=dashboard_id,
            user_id=user_id,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            **kwargs,
        )

        self.db.add(db_log)
        self.db.commit()
        self.db.refresh(db_log)
        return db_log

    # Analytics operations
    def get_dashboard_usage_stats(
        self,
        restaurant_id: str,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Get dashboard usage statistics."""

        # Base query for dashboards in the restaurant
        dashboard_query = self.db.query(DashboardDB).filter(
            DashboardDB.restaurant_id == restaurant_id
        )

        # Total dashboards
        total_dashboards = dashboard_query.count()

        # Active dashboards (viewed in the last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        active_dashboards = dashboard_query.filter(
            DashboardDB.last_viewed_at >= thirty_days_ago
        ).count()

        # Most viewed dashboards
        top_dashboards = (
            dashboard_query.order_by(desc(DashboardDB.view_count)).limit(10).all()
        )

        # View logs query
        view_query = (
            self.db.query(DashboardViewLogDB)
            .join(DashboardDB, DashboardViewLogDB.dashboard_id == DashboardDB.id)
            .filter(DashboardDB.restaurant_id == restaurant_id)
        )

        if from_date:
            view_query = view_query.filter(DashboardViewLogDB.viewed_at >= from_date)

        if to_date:
            view_query = view_query.filter(DashboardViewLogDB.viewed_at <= to_date)

        # Total views
        total_views = view_query.count()

        # Unique users
        unique_users = (
            view_query.filter(DashboardViewLogDB.user_id.isnot(None))
            .distinct(DashboardViewLogDB.user_id)
            .count()
        )

        return {
            "total_dashboards": total_dashboards,
            "active_dashboards": active_dashboards,
            "total_views": total_views,
            "unique_users": unique_users,
            "top_dashboards": [
                {
                    "id": str(dashboard.id),
                    "name": dashboard.name,
                    "view_count": dashboard.view_count,
                    "last_viewed_at": (
                        dashboard.last_viewed_at.isoformat()
                        if dashboard.last_viewed_at
                        else None
                    ),
                }
                for dashboard in top_dashboards
            ],
        }

    def get_export_stats(self, restaurant_id: str) -> Dict[str, Any]:
        """Get export statistics for a restaurant."""

        # Get exports for dashboards in this restaurant
        export_query = (
            self.db.query(DashboardExportDB)
            .join(DashboardDB, DashboardExportDB.dashboard_id == DashboardDB.id)
            .filter(DashboardDB.restaurant_id == restaurant_id)
        )

        # Total exports
        total_exports = export_query.count()

        # Exports by status
        exports_by_status = {}
        status_counts = (
            export_query.group_by(DashboardExportDB.status)
            .with_entities(DashboardExportDB.status, func.count(DashboardExportDB.id))
            .all()
        )

        for status, count in status_counts:
            exports_by_status[status] = count

        # Exports by format
        exports_by_format = {}
        format_counts = (
            export_query.group_by(DashboardExportDB.format)
            .with_entities(DashboardExportDB.format, func.count(DashboardExportDB.id))
            .all()
        )

        for format, count in format_counts:
            exports_by_format[format] = count

        # Recent exports
        recent_exports = (
            export_query.order_by(desc(DashboardExportDB.created_at)).limit(10).all()
        )

        return {
            "total_exports": total_exports,
            "exports_by_status": exports_by_status,
            "exports_by_format": exports_by_format,
            "recent_exports": [
                {
                    "id": str(export.id),
                    "dashboard_name": (
                        export.dashboard.name if export.dashboard else "Unknown"
                    ),
                    "format": export.format,
                    "status": export.status,
                    "created_at": export.created_at.isoformat(),
                }
                for export in recent_exports
            ],
        }
