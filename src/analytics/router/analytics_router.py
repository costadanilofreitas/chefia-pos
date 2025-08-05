"""
Router para dashboards analíticos personalizáveis
"""

from fastapi import APIRouter, Depends, Query, Path
from typing import List, Dict, Any, Optional, Union

from src.analytics.models.dashboard_models import (
    Dashboard,
    ChartConfiguration,
    DashboardFilter,
    DataSourceType,
    DashboardShare,
    DashboardAlert,
    DashboardExport,
    ScheduledReport,
)
from src.analytics.services.analytics_service import AnalyticsService
from src.core.auth.auth_service import get_current_user, User
from src.core.db.db_service import get_db_service
from src.core.config.config_service import get_config_service
from src.core.events.event_bus import get_event_bus

# Cria o router
router = APIRouter(
    prefix="/api/analytics",
    tags=["analytics"],
    responses={404: {"description": "Not found"}},
)


# Dependência para obter o serviço de analytics
def get_analytics_service():
    db_service = get_db_service()
    config_service = get_config_service()
    event_bus = get_event_bus()
    return AnalyticsService(db_service, config_service, event_bus)


# Rotas para o resumo de analytics
@router.get("/summary")
async def get_analytics_summary(
    restaurant_id: str = Query(..., description="ID do restaurante"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Obtém um resumo dos dados analíticos para um restaurante"""
    return analytics_service.get_analytics_summary(restaurant_id)


# Rotas para dashboards
@router.post("/dashboards", response_model=Dashboard)
async def create_dashboard(
    dashboard_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Cria um novo dashboard"""
    # Adiciona o usuário atual como proprietário
    dashboard_data["owner_id"] = current_user.id
    return analytics_service.dashboard_service.create_dashboard(dashboard_data)


@router.get("/dashboards/{dashboard_id}", response_model=Dashboard)
async def get_dashboard(
    dashboard_id: str = Path(..., description="ID do dashboard"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Obtém um dashboard pelo ID"""
    dashboard = analytics_service.dashboard_service.get_dashboard(dashboard_id)

    # Registra a visualização
    analytics_service.dashboard_service.record_dashboard_view(
        dashboard_id, current_user.id
    )

    return dashboard


@router.put("/dashboards/{dashboard_id}", response_model=Dashboard)
async def update_dashboard(
    dashboard_id: str = Path(..., description="ID do dashboard"),
    update_data: Dict[str, Any] = None,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Atualiza um dashboard existente"""
    return analytics_service.dashboard_service.update_dashboard(
        dashboard_id, update_data
    )


@router.delete("/dashboards/{dashboard_id}", response_model=bool)
async def delete_dashboard(
    dashboard_id: str = Path(..., description="ID do dashboard"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Exclui um dashboard"""
    return analytics_service.dashboard_service.delete_dashboard(dashboard_id)


@router.get("/dashboards", response_model=Dict[str, Any])
async def list_dashboards(
    restaurant_id: str = Query(..., description="ID do restaurante"),
    is_template: Optional[bool] = Query(None, description="Filtrar por templates"),
    is_public: Optional[bool] = Query(
        None, description="Filtrar por dashboards públicos"
    ),
    is_favorite: Optional[bool] = Query(
        None, description="Filtrar por dashboards favoritos"
    ),
    category: Optional[str] = Query(None, description="Filtrar por categoria"),
    page: int = Query(1, description="Número da página"),
    page_size: int = Query(20, description="Tamanho da página"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Lista dashboards com filtros e paginação"""
    # Constrói os filtros
    filters = {}
    if is_template is not None:
        filters["is_template"] = is_template
    if is_public is not None:
        filters["is_public"] = is_public
    if is_favorite is not None:
        filters["is_favorite"] = is_favorite
    if category:
        filters["category"] = category

    # Obtém os dashboards
    dashboards, total = analytics_service.dashboard_service.list_dashboards(
        restaurant_id, filters, page, page_size
    )

    return {
        "items": dashboards,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


@router.post("/dashboards/{dashboard_id}/share", response_model=DashboardShare)
async def share_dashboard(
    dashboard_id: str = Path(..., description="ID do dashboard"),
    share_data: Dict[str, Any] = None,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Compartilha um dashboard com usuários ou papéis"""
    # Adiciona o usuário atual como criador do compartilhamento
    share_data["created_by"] = current_user.id
    return analytics_service.dashboard_service.share_dashboard(dashboard_id, share_data)


@router.post("/dashboards/template/{template_id}", response_model=Dashboard)
async def create_dashboard_from_template(
    template_id: str = Path(..., description="ID do template"),
    restaurant_id: str = Query(..., description="ID do restaurante"),
    customizations: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Cria um novo dashboard a partir de um template"""
    return analytics_service.dashboard_service.create_dashboard_from_template(
        template_id, restaurant_id, current_user.id, customizations
    )


@router.post("/dashboards/{dashboard_id}/duplicate", response_model=Dashboard)
async def duplicate_dashboard(
    dashboard_id: str = Path(..., description="ID do dashboard"),
    new_name: Optional[str] = Query(
        None, description="Novo nome para o dashboard duplicado"
    ),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Duplica um dashboard existente"""
    return analytics_service.dashboard_service.duplicate_dashboard(
        dashboard_id, new_name
    )


# Rotas para fontes de dados
@router.get("/data-sources", response_model=List[Dict[str, Any]])
async def list_data_sources(
    restaurant_id: str = Query(..., description="ID do restaurante"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Lista as fontes de dados disponíveis para um restaurante"""
    return analytics_service.data_source_service.list_available_data_sources(
        restaurant_id
    )


@router.get("/data-sources/{data_source_type}", response_model=Dict[str, Any])
async def get_data_source_metadata(
    data_source_type: DataSourceType = Path(..., description="Tipo da fonte de dados"),
    restaurant_id: str = Query(..., description="ID do restaurante"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Obtém metadados de uma fonte de dados"""
    return analytics_service.data_source_service.get_data_source_metadata(
        data_source_type, restaurant_id
    )


@router.post("/charts/data", response_model=Dict[str, Any])
async def get_chart_data(
    chart_config: ChartConfiguration,
    filters: Optional[List[DashboardFilter]] = None,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Obtém dados para um gráfico específico"""
    return analytics_service.data_source_service.get_data_for_chart(
        chart_config, filters
    )


# Rotas para alertas
@router.post("/alerts", response_model=DashboardAlert)
async def create_alert(
    alert_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Cria um novo alerta"""
    # Adiciona o usuário atual como criador
    alert_data["created_by"] = current_user.id
    return analytics_service.alert_service.create_alert(alert_data)


@router.get("/alerts/{alert_id}", response_model=DashboardAlert)
async def get_alert(
    alert_id: str = Path(..., description="ID do alerta"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Obtém um alerta pelo ID"""
    return analytics_service.alert_service.get_alert(alert_id)


@router.put("/alerts/{alert_id}", response_model=DashboardAlert)
async def update_alert(
    alert_id: str = Path(..., description="ID do alerta"),
    update_data: Dict[str, Any] = None,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Atualiza um alerta existente"""
    # Adiciona o usuário atual como atualizador
    update_data["updated_by"] = current_user.id
    return analytics_service.alert_service.update_alert(alert_id, update_data)


@router.delete("/alerts/{alert_id}", response_model=bool)
async def delete_alert(
    alert_id: str = Path(..., description="ID do alerta"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Exclui um alerta"""
    return analytics_service.alert_service.delete_alert(alert_id)


@router.get("/alerts", response_model=Dict[str, Any])
async def list_alerts(
    dashboard_id: Optional[str] = Query(None, description="Filtrar por dashboard"),
    is_active: Optional[bool] = Query(None, description="Filtrar por alertas ativos"),
    page: int = Query(1, description="Número da página"),
    page_size: int = Query(20, description="Tamanho da página"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Lista alertas com filtros e paginação"""
    # Obtém os alertas
    alerts, total = analytics_service.alert_service.list_alerts(
        dashboard_id, current_user.id, is_active, page, page_size
    )

    return {
        "items": alerts,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


@router.post("/alerts/{alert_id}/trigger", response_model=bool)
async def trigger_alert(
    alert_id: str = Path(..., description="ID do alerta"),
    value: Union[int, float] = Query(..., description="Valor atual para o alerta"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Dispara um alerta manualmente"""
    return analytics_service.alert_service.trigger_alert(alert_id, value)


# Rotas para exportação
@router.post("/exports", response_model=DashboardExport)
async def export_dashboard(
    dashboard_id: str = Query(..., description="ID do dashboard"),
    format: str = Query(
        ..., description="Formato de exportação (pdf, excel, csv, image)"
    ),
    filters: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Exporta um dashboard para um formato específico"""
    return analytics_service.export_service.export_dashboard(
        dashboard_id, format, filters, current_user.id
    )


@router.get("/exports/{export_id}", response_model=DashboardExport)
async def get_export_status(
    export_id: str = Path(..., description="ID da exportação"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Obtém o status de uma exportação"""
    return analytics_service.export_service.get_export_status(export_id)


@router.get("/exports", response_model=Dict[str, Any])
async def list_exports(
    dashboard_id: Optional[str] = Query(None, description="Filtrar por dashboard"),
    status: Optional[str] = Query(None, description="Filtrar por status"),
    page: int = Query(1, description="Número da página"),
    page_size: int = Query(20, description="Tamanho da página"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Lista exportações com filtros e paginação"""
    # Obtém as exportações
    exports, total = analytics_service.export_service.list_exports(
        dashboard_id, current_user.id, status, page, page_size
    )

    return {
        "items": exports,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


# Rotas para relatórios agendados
@router.post("/reports", response_model=ScheduledReport)
async def create_scheduled_report(
    report_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Cria um novo relatório agendado"""
    # Adiciona o usuário atual como criador
    report_data["created_by"] = current_user.id
    return analytics_service.report_service.create_scheduled_report(report_data)


@router.get("/reports/{report_id}", response_model=ScheduledReport)
async def get_scheduled_report(
    report_id: str = Path(..., description="ID do relatório"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Obtém um relatório agendado pelo ID"""
    return analytics_service.report_service.get_scheduled_report(report_id)


@router.put("/reports/{report_id}", response_model=ScheduledReport)
async def update_scheduled_report(
    report_id: str = Path(..., description="ID do relatório"),
    update_data: Dict[str, Any] = None,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Atualiza um relatório agendado existente"""
    # Adiciona o usuário atual como atualizador
    update_data["updated_by"] = current_user.id
    return analytics_service.report_service.update_scheduled_report(
        report_id, update_data
    )


@router.delete("/reports/{report_id}", response_model=bool)
async def delete_scheduled_report(
    report_id: str = Path(..., description="ID do relatório"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Exclui um relatório agendado"""
    return analytics_service.report_service.delete_scheduled_report(report_id)


@router.get("/reports", response_model=Dict[str, Any])
async def list_scheduled_reports(
    dashboard_id: Optional[str] = Query(None, description="Filtrar por dashboard"),
    is_active: Optional[bool] = Query(
        None, description="Filtrar por relatórios ativos"
    ),
    page: int = Query(1, description="Número da página"),
    page_size: int = Query(20, description="Tamanho da página"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Lista relatórios agendados com filtros e paginação"""
    # Obtém os relatórios
    reports, total = analytics_service.report_service.list_scheduled_reports(
        dashboard_id, current_user.id, is_active, page, page_size
    )

    return {
        "items": reports,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


@router.post("/reports/{report_id}/run", response_model=bool)
async def run_scheduled_report(
    report_id: str = Path(..., description="ID do relatório"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    """Executa um relatório agendado manualmente"""
    return analytics_service.report_service.run_scheduled_report(report_id)
