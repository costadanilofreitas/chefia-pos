"""
Modelos de dados para dashboards analíticos personalizáveis
"""

from enum import Enum
from datetime import datetime
from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel, Field


class ChartType(str, Enum):
    """Tipos de gráficos disponíveis para visualização"""

    BAR = "bar"
    LINE = "line"
    PIE = "pie"
    AREA = "area"
    SCATTER = "scatter"
    HEATMAP = "heatmap"
    TABLE = "table"
    GAUGE = "gauge"
    CARD = "card"
    FUNNEL = "funnel"


class TimeGranularity(str, Enum):
    """Granularidade temporal para agregação de dados"""

    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"


class FilterOperator(str, Enum):
    """Operadores para filtros de dashboard"""

    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    GREATER_THAN_OR_EQUALS = "greater_than_or_equals"
    LESS_THAN_OR_EQUALS = "less_than_or_equals"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    STARTS_WITH = "starts_with"
    ENDS_WITH = "ends_with"
    BETWEEN = "between"
    IN = "in"
    NOT_IN = "not_in"
    IS_NULL = "is_null"
    IS_NOT_NULL = "is_not_null"


class DataSourceType(str, Enum):
    """Tipos de fontes de dados para dashboards"""

    SALES = "sales"
    INVENTORY = "inventory"
    CUSTOMERS = "customers"
    ORDERS = "orders"
    DELIVERY = "delivery"
    EMPLOYEES = "employees"
    TABLES = "tables"
    KIOSK = "kiosk"
    COSTS = "costs"
    PRODUCTS = "products"
    FEEDBACK = "feedback"


class FilterValue(BaseModel):
    """Valor de filtro, que pode ser de diferentes tipos"""

    value: Union[str, int, float, bool, List[Union[str, int, float]], Dict[str, Any]]


class DashboardFilter(BaseModel):
    """Filtro aplicado a um dashboard"""

    id: str = Field(..., description="ID único do filtro")
    name: str = Field(..., description="Nome do filtro")
    field: str = Field(..., description="Campo ao qual o filtro se aplica")
    operator: FilterOperator = Field(..., description="Operador do filtro")
    value: Optional[FilterValue] = Field(None, description="Valor do filtro")
    data_source: DataSourceType = Field(..., description="Fonte de dados do filtro")
    is_global: bool = Field(
        False, description="Se o filtro é global para todo o dashboard"
    )
    is_required: bool = Field(False, description="Se o filtro é obrigatório")
    is_visible: bool = Field(True, description="Se o filtro é visível para o usuário")
    default_value: Optional[FilterValue] = Field(
        None, description="Valor padrão do filtro"
    )


class ChartSeries(BaseModel):
    """Série de dados para um gráfico"""

    id: str = Field(..., description="ID único da série")
    name: str = Field(..., description="Nome da série")
    field: str = Field(..., description="Campo de dados para a série")
    color: Optional[str] = Field(None, description="Cor da série")
    type: Optional[ChartType] = Field(
        None, description="Tipo de gráfico para esta série específica"
    )
    axis: Optional[str] = Field("left", description="Eixo para a série (left/right)")
    aggregation: Optional[str] = Field(
        "sum", description="Função de agregação (sum, avg, min, max, count)"
    )
    format: Optional[str] = Field(
        None, description="Formato de exibição (currency, percentage, number, date)"
    )
    format_options: Optional[Dict[str, Any]] = Field(
        None, description="Opções de formatação"
    )


class ChartAxis(BaseModel):
    """Configuração de eixo para gráficos"""

    id: str = Field(..., description="ID único do eixo")
    name: str = Field(..., description="Nome do eixo")
    field: str = Field(..., description="Campo de dados para o eixo")
    type: str = Field("category", description="Tipo do eixo (category, value, time)")
    position: str = Field(
        "bottom", description="Posição do eixo (bottom, left, top, right)"
    )
    format: Optional[str] = Field(None, description="Formato de exibição")
    format_options: Optional[Dict[str, Any]] = Field(
        None, description="Opções de formatação"
    )
    time_granularity: Optional[TimeGranularity] = Field(
        None, description="Granularidade temporal para eixos de tempo"
    )


class ChartConfiguration(BaseModel):
    """Configuração de um gráfico"""

    id: str = Field(..., description="ID único da configuração")
    type: ChartType = Field(..., description="Tipo de gráfico")
    title: str = Field(..., description="Título do gráfico")
    subtitle: Optional[str] = Field(None, description="Subtítulo do gráfico")
    description: Optional[str] = Field(None, description="Descrição do gráfico")
    data_source: DataSourceType = Field(..., description="Fonte de dados do gráfico")
    series: List[ChartSeries] = Field(..., description="Séries de dados do gráfico")
    axes: Optional[List[ChartAxis]] = Field(None, description="Configuração dos eixos")
    filters: Optional[List[DashboardFilter]] = Field(
        None, description="Filtros específicos do gráfico"
    )
    options: Optional[Dict[str, Any]] = Field(
        None, description="Opções adicionais do gráfico"
    )
    height: Optional[int] = Field(300, description="Altura do gráfico em pixels")
    width: Optional[int] = Field(None, description="Largura do gráfico em pixels")
    is_responsive: bool = Field(True, description="Se o gráfico é responsivo")
    refresh_interval: Optional[int] = Field(
        None, description="Intervalo de atualização em segundos"
    )
    drill_down_enabled: bool = Field(
        False, description="Se o drill-down está habilitado"
    )
    drill_down_config: Optional[Dict[str, Any]] = Field(
        None, description="Configuração de drill-down"
    )


class DashboardLayout(BaseModel):
    """Layout de um dashboard"""

    id: str = Field(..., description="ID único do layout")
    name: str = Field(..., description="Nome do layout")
    description: Optional[str] = Field(None, description="Descrição do layout")
    grid_columns: int = Field(12, description="Número de colunas no grid")
    grid_rows: Optional[int] = Field(None, description="Número de linhas no grid")
    is_fluid: bool = Field(True, description="Se o layout é fluido ou fixo")
    is_responsive: bool = Field(True, description="Se o layout é responsivo")
    breakpoints: Optional[Dict[str, int]] = Field(
        None, description="Breakpoints para responsividade"
    )
    gap: Optional[int] = Field(16, description="Espaçamento entre os itens em pixels")


class DashboardItem(BaseModel):
    """Item em um dashboard (gráfico, texto, etc.)"""

    id: str = Field(..., description="ID único do item")
    type: str = Field(..., description="Tipo do item (chart, text, image, etc.)")
    title: Optional[str] = Field(None, description="Título do item")
    chart_id: Optional[str] = Field(
        None, description="ID da configuração do gráfico, se aplicável"
    )
    content: Optional[str] = Field(None, description="Conteúdo do item, se aplicável")
    position: Dict[str, Any] = Field(..., description="Posição do item no grid")
    is_visible: bool = Field(True, description="Se o item é visível")
    is_collapsible: bool = Field(False, description="Se o item pode ser recolhido")
    is_draggable: bool = Field(True, description="Se o item pode ser arrastado")
    is_resizable: bool = Field(True, description="Se o item pode ser redimensionado")
    min_width: Optional[int] = Field(None, description="Largura mínima em colunas")
    min_height: Optional[int] = Field(None, description="Altura mínima em linhas")
    max_width: Optional[int] = Field(None, description="Largura máxima em colunas")
    max_height: Optional[int] = Field(None, description="Altura máxima em linhas")
    style: Optional[Dict[str, Any]] = Field(
        None, description="Estilo personalizado do item"
    )


class Dashboard(BaseModel):
    """Modelo de dashboard completo"""

    id: str = Field(..., description="ID único do dashboard")
    name: str = Field(..., description="Nome do dashboard")
    description: Optional[str] = Field(None, description="Descrição do dashboard")
    owner_id: str = Field(..., description="ID do proprietário do dashboard")
    restaurant_id: str = Field(..., description="ID do restaurante")
    is_template: bool = Field(False, description="Se é um template de dashboard")
    is_public: bool = Field(False, description="Se o dashboard é público")
    is_favorite: bool = Field(False, description="Se o dashboard é favorito")
    category: Optional[str] = Field(None, description="Categoria do dashboard")
    tags: Optional[List[str]] = Field(None, description="Tags do dashboard")
    layout: DashboardLayout = Field(..., description="Layout do dashboard")
    items: List[DashboardItem] = Field(..., description="Itens do dashboard")
    filters: Optional[List[DashboardFilter]] = Field(
        None, description="Filtros globais do dashboard"
    )
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data de atualização")
    last_viewed_at: Optional[datetime] = Field(
        None, description="Data da última visualização"
    )
    view_count: int = Field(0, description="Contador de visualizações")
    thumbnail_url: Optional[str] = Field(
        None, description="URL da miniatura do dashboard"
    )
    permissions: Optional[Dict[str, Any]] = Field(
        None, description="Permissões do dashboard"
    )


class DashboardShare(BaseModel):
    """Compartilhamento de dashboard"""

    id: str = Field(..., description="ID único do compartilhamento")
    dashboard_id: str = Field(..., description="ID do dashboard compartilhado")
    user_id: Optional[str] = Field(
        None, description="ID do usuário com quem foi compartilhado"
    )
    role_id: Optional[str] = Field(
        None, description="ID do papel com quem foi compartilhado"
    )
    email: Optional[str] = Field(None, description="Email com quem foi compartilhado")
    permission: str = Field("view", description="Permissão (view, edit, manage)")
    created_at: datetime = Field(..., description="Data de criação")
    expires_at: Optional[datetime] = Field(None, description="Data de expiração")
    created_by: str = Field(
        ..., description="ID do usuário que criou o compartilhamento"
    )
    is_active: bool = Field(True, description="Se o compartilhamento está ativo")


class DataSourceConfig(BaseModel):
    """Configuração de fonte de dados"""

    id: str = Field(..., description="ID único da configuração")
    type: DataSourceType = Field(..., description="Tipo da fonte de dados")
    name: str = Field(..., description="Nome da fonte de dados")
    description: Optional[str] = Field(None, description="Descrição da fonte de dados")
    connection_string: Optional[str] = Field(
        None, description="String de conexão, se aplicável"
    )
    query: Optional[str] = Field(None, description="Query para obtenção dos dados")
    refresh_interval: Optional[int] = Field(
        None, description="Intervalo de atualização em segundos"
    )
    parameters: Optional[Dict[str, Any]] = Field(
        None, description="Parâmetros da fonte de dados"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None, description="Metadados da fonte de dados"
    )
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data de atualização")
    created_by: str = Field(..., description="ID do usuário que criou a configuração")
    is_active: bool = Field(True, description="Se a configuração está ativa")


class DashboardPreset(BaseModel):
    """Preset de dashboard para diferentes tipos de negócio"""

    id: str = Field(..., description="ID único do preset")
    name: str = Field(..., description="Nome do preset")
    description: Optional[str] = Field(None, description="Descrição do preset")
    business_type: str = Field(
        ..., description="Tipo de negócio (restaurant, bar, cafe, etc.)"
    )
    dashboard_template_id: str = Field(..., description="ID do template de dashboard")
    is_default: bool = Field(
        False, description="Se é o preset padrão para o tipo de negócio"
    )
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data de atualização")
    created_by: str = Field(..., description="ID do usuário que criou o preset")
    is_active: bool = Field(True, description="Se o preset está ativo")


class UserDashboardPreference(BaseModel):
    """Preferências de dashboard do usuário"""

    id: str = Field(..., description="ID único da preferência")
    user_id: str = Field(..., description="ID do usuário")
    default_dashboard_id: Optional[str] = Field(
        None, description="ID do dashboard padrão"
    )
    favorite_dashboards: Optional[List[str]] = Field(
        None, description="IDs dos dashboards favoritos"
    )
    theme: Optional[str] = Field("light", description="Tema preferido (light/dark)")
    refresh_interval: Optional[int] = Field(
        None, description="Intervalo de atualização em segundos"
    )
    notifications_enabled: bool = Field(
        True, description="Se as notificações estão habilitadas"
    )
    email_reports_enabled: bool = Field(
        False, description="Se os relatórios por email estão habilitados"
    )
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data de atualização")


class DashboardAlert(BaseModel):
    """Alerta baseado em métricas de dashboard"""

    id: str = Field(..., description="ID único do alerta")
    name: str = Field(..., description="Nome do alerta")
    description: Optional[str] = Field(None, description="Descrição do alerta")
    dashboard_id: str = Field(..., description="ID do dashboard")
    chart_id: str = Field(..., description="ID do gráfico")
    metric: str = Field(..., description="Métrica monitorada")
    condition: FilterOperator = Field(..., description="Condição do alerta")
    threshold: Union[int, float] = Field(..., description="Valor limite para o alerta")
    frequency: str = Field(
        "realtime",
        description="Frequência de verificação (realtime, hourly, daily, weekly)",
    )
    notification_channels: List[str] = Field(
        ..., description="Canais de notificação (email, sms, push, webhook)"
    )
    recipients: Optional[List[str]] = Field(
        None, description="Destinatários das notificações"
    )
    webhook_url: Optional[str] = Field(
        None, description="URL do webhook para notificação"
    )
    message_template: Optional[str] = Field(
        None, description="Template da mensagem de alerta"
    )
    is_active: bool = Field(True, description="Se o alerta está ativo")
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data de atualização")
    created_by: str = Field(..., description="ID do usuário que criou o alerta")
    last_triggered_at: Optional[datetime] = Field(
        None, description="Data do último disparo"
    )
    trigger_count: int = Field(0, description="Contador de disparos")


class DashboardExport(BaseModel):
    """Exportação de dashboard"""

    id: str = Field(..., description="ID único da exportação")
    dashboard_id: str = Field(..., description="ID do dashboard")
    format: str = Field(
        ..., description="Formato da exportação (pdf, excel, csv, image)"
    )
    filters: Optional[Dict[str, Any]] = Field(
        None, description="Filtros aplicados na exportação"
    )
    created_at: datetime = Field(..., description="Data de criação")
    created_by: str = Field(..., description="ID do usuário que criou a exportação")
    file_url: Optional[str] = Field(None, description="URL do arquivo exportado")
    status: str = Field(
        "pending",
        description="Status da exportação (pending, processing, completed, failed)",
    )
    error_message: Optional[str] = Field(
        None, description="Mensagem de erro, se houver"
    )


class ScheduledReport(BaseModel):
    """Relatório agendado"""

    id: str = Field(..., description="ID único do agendamento")
    name: str = Field(..., description="Nome do agendamento")
    description: Optional[str] = Field(None, description="Descrição do agendamento")
    dashboard_id: str = Field(..., description="ID do dashboard")
    format: str = Field(..., description="Formato do relatório (pdf, excel, csv)")
    schedule: str = Field(..., description="Expressão cron para agendamento")
    recipients: List[str] = Field(..., description="Destinatários do relatório")
    subject: str = Field(..., description="Assunto do email")
    message: Optional[str] = Field(None, description="Mensagem do email")
    filters: Optional[Dict[str, Any]] = Field(
        None, description="Filtros aplicados no relatório"
    )
    is_active: bool = Field(True, description="Se o agendamento está ativo")
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data de atualização")
    created_by: str = Field(..., description="ID do usuário que criou o agendamento")
    last_run_at: Optional[datetime] = Field(None, description="Data da última execução")
    last_run_status: Optional[str] = Field(
        None, description="Status da última execução"
    )
