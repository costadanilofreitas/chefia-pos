"""
Serviços para dashboards analíticos personalizáveis
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any, Union, Tuple
import uuid
import pandas as pd
import numpy as np
from fastapi import HTTPException, status

from src.analytics.models.dashboard_models import (
    Dashboard, DashboardItem, DashboardLayout, ChartConfiguration, 
    DashboardFilter, DataSourceType, ChartType, FilterOperator,
    DashboardShare, DataSourceConfig, DashboardPreset,
    UserDashboardPreference, DashboardAlert, DashboardExport,
    ScheduledReport
)
from src.core.config.config_service import ConfigService
from src.core.events.event_bus import EventBus


class AnalyticsService:
    """Serviço principal para analytics"""
    
    def __init__(self, config_service: ConfigService, event_bus: EventBus):
        # db_service removido
        self.config_service = config_service
        self.event_bus = event_bus
        self.logger = logging.getLogger(__name__)
        
        # Inicializa os serviços específicos
        self.dashboard_service = DashboardService(db_service, config_service, event_bus)
        self.data_source_service = DataSourceService(db_service, config_service, event_bus)
        self.alert_service = AlertService(db_service, config_service, event_bus)
        self.export_service = ExportService(db_service, config_service, event_bus)
        self.report_service = ReportService(db_service, config_service, event_bus)
        
    def get_analytics_summary(self, restaurant_id: str) -> Dict[str, Any]:
        """Obtém um resumo dos dados analíticos para um restaurante"""
        try:
            # Obtém contagens de dashboards, alertas, etc.
            dashboard_count = self.dashboard_service.count_dashboards(restaurant_id)
            alert_count = self.alert_service.count_alerts(restaurant_id)
            report_count = self.report_service.count_reports(restaurant_id)
            
            # Obtém os dashboards mais visualizados
            top_dashboards = self.dashboard_service.get_top_dashboards(restaurant_id, limit=5)
            
            # Obtém os alertas recentes
            recent_alerts = self.alert_service.get_recent_alerts(restaurant_id, limit=5)
            
            # Obtém estatísticas de uso
            usage_stats = self.get_usage_statistics(restaurant_id)
            
            return {
                "dashboard_count": dashboard_count,
                "alert_count": alert_count,
                "report_count": report_count,
                "top_dashboards": top_dashboards,
                "recent_alerts": recent_alerts,
                "usage_statistics": usage_stats,
                "last_updated": datetime.now().isoformat()
            }
        except Exception as e:
            self.logger.error(f"Error getting analytics summary: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error getting analytics summary: {str(e)}"
            )
    
    def get_usage_statistics(self, restaurant_id: str) -> Dict[str, Any]:
        """Obtém estatísticas de uso dos dashboards"""
        try:
            # Em um ambiente real, isso seria uma consulta ao banco de dados
            # Aqui estamos simulando dados de exemplo
            return {
                "views_last_7_days": 145,
                "exports_last_7_days": 23,
                "active_users": 8,
                "most_used_data_source": "sales",
                "most_viewed_chart_type": "bar",
                "peak_usage_time": "14:00-15:00"
            }
        except Exception as e:
            self.logger.error(f"Error getting usage statistics: {str(e)}")
            return {
                "error": str(e),
                "views_last_7_days": 0,
                "exports_last_7_days": 0,
                "active_users": 0
            }


class DashboardService:
    """Serviço para gerenciamento de dashboards"""
    
    def __init__(self, config_service: ConfigService, event_bus: EventBus):
        # db_service removido
        self.config_service = config_service
        self.event_bus = event_bus
        self.logger = logging.getLogger(__name__)
    
    def create_dashboard(self, dashboard_data: Dict[str, Any]) -> Dashboard:
        """Cria um novo dashboard"""
        try:
            # Gera um ID único para o dashboard
            dashboard_id = str(uuid.uuid4())
            
            # Define timestamps
            now = datetime.now()
            
            # Cria o objeto de dashboard
            dashboard = Dashboard(
                id=dashboard_id,
                name=dashboard_data.get("name", "Novo Dashboard"),
                description=dashboard_data.get("description"),
                owner_id=dashboard_data.get("owner_id"),
                restaurant_id=dashboard_data.get("restaurant_id"),
                is_template=dashboard_data.get("is_template", False),
                is_public=dashboard_data.get("is_public", False),
                is_favorite=dashboard_data.get("is_favorite", False),
                category=dashboard_data.get("category"),
                tags=dashboard_data.get("tags"),
                layout=dashboard_data.get("layout"),
                items=dashboard_data.get("items", []),
                filters=dashboard_data.get("filters"),
                created_at=now,
                updated_at=now,
                view_count=0,
                permissions=dashboard_data.get("permissions")
            )
            
            # Em um ambiente real, isso seria salvo no banco de dados
            # Aqui estamos simulando o salvamento
            
            # Emite evento de criação de dashboard
            self.event_bus.emit("dashboard.created", {
                "dashboard_id": dashboard_id,
                "restaurant_id": dashboard.restaurant_id,
                "owner_id": dashboard.owner_id,
                "timestamp": now.isoformat()
            })
            
            return dashboard
        except Exception as e:
            self.logger.error(f"Error creating dashboard: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating dashboard: {str(e)}"
            )
    
    def get_dashboard(self, dashboard_id: str) -> Dashboard:
        """Obtém um dashboard pelo ID"""
        try:
            # Em um ambiente real, isso seria uma consulta ao banco de dados
            # Aqui estamos simulando a busca
            
            # Se o dashboard não for encontrado
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dashboard with ID {dashboard_id} not found"
            )
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error getting dashboard: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error getting dashboard: {str(e)}"
            )
    
    def update_dashboard(self, dashboard_id: str, update_data: Dict[str, Any]) -> Dashboard:
        """Atualiza um dashboard existente"""
        try:
            # Obtém o dashboard existente
            dashboard = self.get_dashboard(dashboard_id)
            
            # Atualiza os campos
            for key, value in update_data.items():
                if hasattr(dashboard, key):
                    setattr(dashboard, key, value)
            
            # Atualiza o timestamp
            dashboard.updated_at = datetime.now()
            
            # Em um ambiente real, isso seria salvo no banco de dados
            # Aqui estamos simulando o salvamento
            
            # Emite evento de atualização de dashboard
            self.event_bus.emit("dashboard.updated", {
                "dashboard_id": dashboard_id,
                "restaurant_id": dashboard.restaurant_id,
                "owner_id": dashboard.owner_id,
                "timestamp": dashboard.updated_at.isoformat()
            })
            
            return dashboard
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error updating dashboard: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error updating dashboard: {str(e)}"
            )
    
    def delete_dashboard(self, dashboard_id: str) -> bool:
        """Exclui um dashboard"""
        try:
            # Obtém o dashboard existente
            dashboard = self.get_dashboard(dashboard_id)
            
            # Em um ambiente real, isso seria excluído do banco de dados
            # Aqui estamos simulando a exclusão
            
            # Emite evento de exclusão de dashboard
            self.event_bus.emit("dashboard.deleted", {
                "dashboard_id": dashboard_id,
                "restaurant_id": dashboard.restaurant_id,
                "owner_id": dashboard.owner_id,
                "timestamp": datetime.now().isoformat()
            })
            
            return True
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error deleting dashboard: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error deleting dashboard: {str(e)}"
            )
    
    def list_dashboards(self, restaurant_id: str, filters: Dict[str, Any] = None, 
                        page: int = 1, page_size: int = 20) -> Tuple[List[Dashboard], int]:
        """Lista dashboards com filtros e paginação"""
        try:
            # Em um ambiente real, isso seria uma consulta ao banco de dados
            # Aqui estamos simulando a listagem com dados de exemplo
            
            # Cria alguns dashboards de exemplo
            dashboards = [
                Dashboard(
                    id=str(uuid.uuid4()),
                    name=f"Dashboard de Vendas {i}",
                    description=f"Análise de vendas e desempenho {i}",
                    owner_id="user-123",
                    restaurant_id=restaurant_id,
                    is_template=False,
                    is_public=True,
                    is_favorite=i == 1,
                    category="sales",
                    tags=["vendas", "desempenho"],
                    layout=DashboardLayout(
                        id=str(uuid.uuid4()),
                        name="Layout Padrão",
                        grid_columns=12
                    ),
                    items=[],
                    created_at=datetime.now() - timedelta(days=i),
                    updated_at=datetime.now() - timedelta(days=i),
                    view_count=100 - i * 10
                )
                for i in range(1, 6)
            ]
            
            # Aplica filtros, se houver
            if filters:
                filtered_dashboards = []
                for dashboard in dashboards:
                    include = True
                    for key, value in filters.items():
                        if hasattr(dashboard, key):
                            if getattr(dashboard, key) != value:
                                include = False
                                break
                    if include:
                        filtered_dashboards.append(dashboard)
                dashboards = filtered_dashboards
            
            # Calcula a paginação
            total = len(dashboards)
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            
            # Retorna a página atual
            return dashboards[start_idx:end_idx], total
        except Exception as e:
            self.logger.error(f"Error listing dashboards: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error listing dashboards: {str(e)}"
            )
    
    def count_dashboards(self, restaurant_id: str) -> int:
        """Conta o número de dashboards para um restaurante"""
        try:
            # Em um ambiente real, isso seria uma consulta ao banco de dados
            # Aqui estamos retornando um valor de exemplo
            return 5
        except Exception as e:
            self.logger.error(f"Error counting dashboards: {str(e)}")
            return 0
    
    def get_top_dashboards(self, restaurant_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Obtém os dashboards mais visualizados"""
        try:
            # Em um ambiente real, isso seria uma consulta ao banco de dados
            # Aqui estamos retornando dados de exemplo
            return [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Dashboard de Vendas Diárias",
                    "view_count": 120,
                    "last_viewed_at": (datetime.now() - timedelta(hours=2)).isoformat()
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "Análise de Desempenho de Produtos",
                    "view_count": 98,
                    "last_viewed_at": (datetime.now() - timedelta(hours=5)).isoformat()
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "Métricas de Delivery",
                    "view_count": 87,
                    "last_viewed_at": (datetime.now() - timedelta(hours=8)).isoformat()
                }
            ][:limit]
        except Exception as e:
            self.logger.error(f"Error getting top dashboards: {str(e)}")
            return []
    
    def share_dashboard(self, dashboard_id: str, share_data: Dict[str, Any]) -> DashboardShare:
        """Compartilha um dashboard com usuários ou papéis"""
        try:
            # Verifica se o dashboard existe
            dashboard = self.get_dashboard(dashboard_id)
            
            # Cria o compartilhamento
            share_id = str(uuid.uuid4())
            now = datetime.now()
            
            share = DashboardShare(
                id=share_id,
                dashboard_id=dashboard_id,
                user_id=share_data.get("user_id"),
                role_id=share_data.get("role_id"),
                email=share_data.get("email"),
                permission=share_data.get("permission", "view"),
                created_at=now,
                expires_at=share_data.get("expires_at"),
                created_by=share_data.get("created_by"),
                is_active=True
            )
            
            # Em um ambiente real, isso seria salvo no banco de dados
            # Aqui estamos simulando o salvamento
            
            # Emite evento de compartilhamento
            self.event_bus.emit("dashboard.shared", {
                "share_id": share_id,
                "dashboard_id": dashboard_id,
                "restaurant_id": dashboard.restaurant_id,
                "shared_with": share_data.get("user_id") or share_data.get("role_id") or share_data.get("email"),
                "permission": share.permission,
                "timestamp": now.isoformat()
            })
            
            return share
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error sharing dashboard: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error sharing dashboard: {str(e)}"
            )
    
    def create_dashboard_from_template(self, template_id: str, restaurant_id: str, 
                                      owner_id: str, customizations: Dict[str, Any] = None) -> Dashboard:
        """Cria um novo dashboard a partir de um template"""
        try:
            # Obtém o template
            template = self.get_dashboard(template_id)
            
            if not template.is_template:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Dashboard with ID {template_id} is not a template"
                )
            
            # Cria uma cópia do template
            dashboard_data = template.dict()
            
            # Remove campos que não devem ser copiados
            dashboard_data.pop("id", None)
            dashboard_data.pop("created_at", None)
            dashboard_data.pop("updated_at", None)
            dashboard_data.pop("last_viewed_at", None)
            dashboard_data.pop("view_count", None)
            
            # Atualiza campos obrigatórios
            dashboard_data["restaurant_id"] = restaurant_id
            dashboard_data["owner_id"] = owner_id
            dashboard_data["is_template"] = False
            
            # Aplica customizações, se houver
            if customizations:
                for key, value in customizations.items():
                    if key in dashboard_data:
                        dashboard_data[key] = value
            
            # Cria o novo dashboard
            return self.create_dashboard(dashboard_data)
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error creating dashboard from template: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating dashboard from template: {str(e)}"
            )
    
    def duplicate_dashboard(self, dashboard_id: str, new_name: str = None) -> Dashboard:
        """Duplica um dashboard existente"""
        try:
            # Obtém o dashboard original
            original = self.get_dashboard(dashboard_id)
            
            # Cria uma cópia dos dados
            dashboard_data = original.dict()
            
            # Remove campos que não devem ser copiados
            dashboard_data.pop("id", None)
            dashboard_data.pop("created_at", None)
            dashboard_data.pop("updated_at", None)
            dashboard_data.pop("last_viewed_at", None)
            dashboard_data.pop("view_count", None)
            
            # Atualiza o nome, se fornecido
            if new_name:
                dashboard_data["name"] = new_name
            else:
                dashboard_data["name"] = f"Cópia de {original.name}"
            
            # Cria o novo dashboard
            return self.create_dashboard(dashboard_data)
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error duplicating dashboard: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error duplicating dashboard: {str(e)}"
            )
    
    def record_dashboard_view(self, dashboard_id: str, user_id: str) -> None:
        """Registra uma visualização de dashboard"""
        try:
            # Obtém o dashboard
            dashboard = self.get_dashboard(dashboard_id)
            
            # Atualiza o contador de visualizações e o timestamp
            dashboard.view_count += 1
            dashboard.last_viewed_at = datetime.now()
            
            # Em um ambiente real, isso seria salvo no banco de dados
            # Aqui estamos simulando o salvamento
            
            # Emite evento de visualização
            self.event_bus.emit("dashboard.viewed", {
                "dashboard_id": dashboard_id,
                "restaurant_id": dashboard.restaurant_id,
                "user_id": user_id,
                "timestamp": dashboard.last_viewed_at.isoformat()
            })
        except HTTPException:
            # Ignora erros de não encontrado para não interromper a experiência do usuário
            pass
        except Exception as e:
            self.logger.error(f"Error recording dashboard view: {str(e)}")
            # Não propaga o erro para não interromper a experiência do usuário


class DataSourceService:
    """Serviço para gerenciamento de fontes de dados"""
    
    def __init__(self, config_service: ConfigService, event_bus: EventBus):
        # db_service removido
        self.config_service = config_service
        self.event_bus = event_bus
        self.logger = logging.getLogger(__name__)
    
    def get_data_for_chart(self, chart_config: ChartConfiguration, filters: List[DashboardFilter] = None) -> Dict[str, Any]:
        """Obtém dados para um gráfico específico"""
        try:
            # Identifica a fonte de dados
            data_source = chart_config.data_source
            
            # Obtém os dados brutos
            raw_data = self._get_raw_data(data_source, filters)
            
            # Processa os dados conforme a configuração do gráfico
            processed_data = self._process_data_for_chart(raw_data, chart_config)
            
            return processed_data
        except Exception as e:
            self.logger.error(f"Error getting data for chart: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error getting data for chart: {str(e)}"
            )
    
    def _get_raw_data(self, data_source: DataSourceType, filters: List[DashboardFilter] = None) -> pd.DataFrame:
        """Obtém dados brutos de uma fonte de dados"""
        # Em um ambiente real, isso seria uma consulta ao banco de dados ou API
        # Aqui estamos gerando dados de exemplo
        
        # Gera dados diferentes com base no tipo de fonte
        if data_source == DataSourceType.SALES:
            # Dados de vendas
            dates = pd.date_range(start=datetime.now() - timedelta(days=30), end=datetime.now(), freq='D')
            data = {
                'date': dates,
                'total_sales': np.random.randint(5000, 15000, size=len(dates)),
                'order_count': np.random.randint(50, 150, size=len(dates)),
                'average_ticket': np.random.randint(80, 120, size=len(dates)),
                'category': np.random.choice(['Food', 'Beverage', 'Dessert'], size=len(dates))
            }
            df = pd.DataFrame(data)
            
        elif data_source == DataSourceType.INVENTORY:
            # Dados de inventário
            products = ['Product A', 'Product B', 'Product C', 'Product D', 'Product E']
            data = {
                'product': products,
                'current_stock': np.random.randint(10, 100, size=len(products)),
                'min_stock': np.random.randint(5, 20, size=len(products)),
                'max_stock': np.random.randint(80, 150, size=len(products)),
                'last_restock_date': [datetime.now() - timedelta(days=np.random.randint(1, 30)) for _ in products],
                'category': np.random.choice(['Meat', 'Produce', 'Dairy', 'Dry Goods'], size=len(products))
            }
            df = pd.DataFrame(data)
            
        elif data_source == DataSourceType.CUSTOMERS:
            # Dados de clientes
            dates = pd.date_range(start=datetime.now() - timedelta(days=90), end=datetime.now(), freq='D')
            data = {
                'date': dates,
                'new_customers': np.random.randint(0, 10, size=len(dates)),
                'returning_customers': np.random.randint(10, 50, size=len(dates)),
                'total_customers': np.random.randint(20, 100, size=len(dates)),
                'source': np.random.choice(['Direct', 'iFood', 'Website', 'Referral'], size=len(dates))
            }
            df = pd.DataFrame(data)
            
        elif data_source == DataSourceType.DELIVERY:
            # Dados de delivery
            dates = pd.date_range(start=datetime.now() - timedelta(days=30), end=datetime.now(), freq='D')
            data = {
                'date': dates,
                'delivery_orders': np.random.randint(10, 50, size=len(dates)),
                'delivery_sales': np.random.randint(1000, 5000, size=len(dates)),
                'average_delivery_time': np.random.randint(20, 60, size=len(dates)),
                'platform': np.random.choice(['iFood', 'Direct', 'Rappi', 'Uber Eats'], size=len(dates))
            }
            df = pd.DataFrame(data)
            
        elif data_source == DataSourceType.COSTS:
            # Dados de custos
            categories = ['Food', 'Beverage', 'Labor', 'Rent', 'Utilities', 'Marketing', 'Other']
            months = pd.date_range(start=datetime.now() - timedelta(days=180), end=datetime.now(), freq='M')
            data = []
            for month in months:
                for category in categories:
                    data.append({
                        'month': month,
                        'category': category,
                        'amount': np.random.randint(1000, 10000),
                        'percentage': np.random.uniform(0.05, 0.25)
                    })
            df = pd.DataFrame(data)
            
        else:
            # Dados genéricos
            dates = pd.date_range(start=datetime.now() - timedelta(days=30), end=datetime.now(), freq='D')
            data = {
                'date': dates,
                'value': np.random.randint(100, 1000, size=len(dates)),
                'category': np.random.choice(['A', 'B', 'C'], size=len(dates))
            }
            df = pd.DataFrame(data)
        
        # Aplica filtros, se houver
        if filters:
            for filter_item in filters:
                if filter_item.field in df.columns:
                    if filter_item.operator == FilterOperator.EQUALS:
                        df = df[df[filter_item.field] == filter_item.value.value]
                    elif filter_item.operator == FilterOperator.NOT_EQUALS:
                        df = df[df[filter_item.field] != filter_item.value.value]
                    elif filter_item.operator == FilterOperator.GREATER_THAN:
                        df = df[df[filter_item.field] > filter_item.value.value]
                    elif filter_item.operator == FilterOperator.LESS_THAN:
                        df = df[df[filter_item.field] < filter_item.value.value]
                    # Adicione mais operadores conforme necessário
        
        return df
    
    def _process_data_for_chart(self, df: pd.DataFrame, chart_config: ChartConfiguration) -> Dict[str, Any]:
        """Processa dados para um tipo específico de gráfico"""
        chart_type = chart_config.type
        series = chart_config.series
        
        result = {
            "type": chart_type,
            "title": chart_config.title,
            "subtitle": chart_config.subtitle,
            "series": []
        }
        
        # Processa cada série de dados
        for serie in series:
            if serie.field in df.columns:
                # Agrupa os dados se necessário
                if chart_config.axes and len(chart_config.axes) > 0:
                    x_axis = next((axis for axis in chart_config.axes if axis.position == "bottom"), None)
                    if x_axis and x_axis.field in df.columns:
                        # Agrupa por eixo X
                        if serie.aggregation == "sum":
                            grouped = df.groupby(x_axis.field)[serie.field].sum()
                        elif serie.aggregation == "avg":
                            grouped = df.groupby(x_axis.field)[serie.field].mean()
                        elif serie.aggregation == "min":
                            grouped = df.groupby(x_axis.field)[serie.field].min()
                        elif serie.aggregation == "max":
                            grouped = df.groupby(x_axis.field)[serie.field].max()
                        elif serie.aggregation == "count":
                            grouped = df.groupby(x_axis.field)[serie.field].count()
                        else:
                            grouped = df.groupby(x_axis.field)[serie.field].sum()
                        
                        # Converte para listas
                        categories = grouped.index.tolist()
                        values = grouped.values.tolist()
                        
                        # Adiciona à resposta
                        result["series"].append({
                            "name": serie.name,
                            "data": values
                        })
                        
                        # Adiciona categorias apenas uma vez
                        if "categories" not in result:
                            result["categories"] = categories
                    else:
                        # Sem eixo X definido, usa todos os valores
                        result["series"].append({
                            "name": serie.name,
                            "data": df[serie.field].tolist()
                        })
                else:
                    # Sem eixos definidos, usa todos os valores
                    result["series"].append({
                        "name": serie.name,
                        "data": df[serie.field].tolist()
                    })
        
        return result
    
    def list_available_data_sources(self, restaurant_id: str) -> List[Dict[str, Any]]:
        """Lista as fontes de dados disponíveis para um restaurante"""
        try:
            # Em um ambiente real, isso seria uma consulta ao banco de dados
            # Aqui estamos retornando dados de exemplo
            return [
                {
                    "type": DataSourceType.SALES,
                    "name": "Vendas",
                    "description": "Dados de vendas e faturamento",
                    "fields": ["date", "total_sales", "order_count", "average_ticket", "category"]
                },
                {
                    "type": DataSourceType.INVENTORY,
                    "name": "Inventário",
                    "description": "Dados de estoque e produtos",
                    "fields": ["product", "current_stock", "min_stock", "max_stock", "last_restock_date", "category"]
                },
                {
                    "type": DataSourceType.CUSTOMERS,
                    "name": "Clientes",
                    "description": "Dados de clientes e comportamento",
                    "fields": ["date", "new_customers", "returning_customers", "total_customers", "source"]
                },
                {
                    "type": DataSourceType.DELIVERY,
                    "name": "Delivery",
                    "description": "Dados de entregas e pedidos online",
                    "fields": ["date", "delivery_orders", "delivery_sales", "average_delivery_time", "platform"]
                },
                {
                    "type": DataSourceType.COSTS,
                    "name": "Custos",
                    "description": "Dados de custos e despesas",
                    "fields": ["month", "category", "amount", "percentage"]
                }
            ]
        except Exception as e:
            self.logger.error(f"Error listing data sources: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error listing data sources: {str(e)}"
            )
    
    def get_data_source_metadata(self, data_source_type: DataSourceType, restaurant_id: str) -> Dict[str, Any]:
        """Obtém metadados de uma fonte de dados"""
        try:
            # Lista todas as fontes de dados
            all_sources = self.list_available_data_sources(restaurant_id)
            
            # Encontra a fonte de dados solicitada
            for source in all_sources:
                if source["type"] == data_source_type:
                    return source
            
            # Se não encontrar
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Data source {data_source_type} not found"
            )
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error getting data source metadata: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error getting data source metadata: {str(e)}"
            )


class AlertService:
    """Serviço para gerenciamento de alertas"""
    
    def __init__(self, config_service: ConfigService, event_bus: EventBus):
        # db_service removido
        self.config_service = config_service
        self.event_bus = event_bus
        self.logger = logging.getLogger(__name__)
    
    def create_alert(self, alert_data: Dict[str, Any]) -> DashboardAlert:
        """Cria um novo alerta"""
        try:
            # Gera um ID único para o alerta
            alert_id = str(uuid.uuid4())
            
            # Define timestamps
            now = datetime.now()
            
            # Cria o objeto de alerta
            alert = DashboardAlert(
                id=alert_id,
                name=alert_data.get("name", "Novo Alerta"),
                description=alert_data.get("description"),
                dashboard_id=alert_data.get("dashboard_id"),
                chart_id=alert_data.get("chart_id"),
                metric=alert_data.get("metric"),
                condition=alert_data.get("condition"),
                threshold=alert_data.get("threshold"),
                frequency=alert_data.get("frequency", "realtime"),
                notification_channels=alert_data.get("notification_channels"),
                recipients=alert_data.get("recipients"),
                webhook_url=alert_data.get("webhook_url"),
                message_template=alert_data.get("message_template"),
                is_active=alert_data.get("is_active", True),
                created_at=now,
                updated_at=now,
                created_by=alert_data.get("created_by"),
                trigger_count=0
            )
            
            # Em um ambiente real, isso seria salvo no banco de dados
            # Aqui estamos simulando o salvamento
            
            # Emite evento de criação de alerta
            self.event_bus.emit("alert.created", {
                "alert_id": alert_id,
                "dashboard_id": alert.dashboard_id,
                "created_by": alert.created_by,
                "timestamp": now.isoformat()
            })
            
            return alert
        except Exception as e:
            self.logger.error(f"Error creating alert: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating alert: {str(e)}"
            )
    
    def get_alert(self, alert_id: str) -> DashboardAlert:
        """Obtém um alerta pelo ID"""
        try:
            # Em um ambiente real, isso seria uma consulta ao banco de dados
            # Aqui estamos simulando a busca
            
            # Se o alerta não for encontrado
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alert with ID {alert_id} not found"
            )
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error getting alert: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error getting alert: {str(e)}"
            )
    
    def update_alert(self, alert_id: str, update_data: Dict[str, Any]) -> DashboardAlert:
        """Atualiza um alerta existente"""
        try:
            # Obtém o alerta existente
            alert = self.get_alert(alert_id)
            
            # Atualiza os campos
            for key, value in update_data.items():
                if hasattr(alert, key):
                    setattr(alert, key, value)
            
            # Atualiza o timestamp
            alert.updated_at = datetime.now()
            
            # Em um ambiente real, isso seria salvo no banco de dados
            # Aqui estamos simulando o salvamento
            
            # Emite evento de atualização de alerta
            self.event_bus.emit("alert.updated", {
                "alert_id": alert_id,
                "dashboard_id": alert.dashboard_id,
                "updated_by": update_data.get("updated_by", "unknown"),
                "timestamp": alert.updated_at.isoformat()
            })
            
            return alert
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error updating alert: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error updating alert: {str(e)}"
            )
    
    def delete_alert(self, alert_id: str) -> bool:
        """Exclui um alerta"""
        try:
            # Obtém o alerta existente
            alert = self.get_alert(alert_id)
            
            # Em um ambiente real, isso seria excluído do banco de dados
            # Aqui estamos simulando a exclusão
            
            # Emite evento de exclusão de alerta
            self.event_bus.emit("alert.deleted", {
                "alert_id": alert_id,
                "dashboard_id": alert.dashboard_id,
                "deleted_by": "unknown",
                "timestamp": datetime.now().isoformat()
            })
            
            return True
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error deleting alert: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error deleting alert: {str(e)}"
            )
    
    def list_alerts(self, dashboard_id: str = None, restaurant_id: str = None, 
                   is_active: bool = None, page: int = 1, page_size: int = 20) -> Tuple[List[DashboardAlert], int]:
        """Lista alertas com filtros e paginação"""
        try:
            # Em um ambiente real, isso seria uma consulta ao banco de dados
            # Aqui estamos simulando a listagem com dados de exemplo
            
            # Cria alguns alertas de exemplo
            alerts = [
                DashboardAlert(
                    id=str(uuid.uuid4()),
                    name=f"Alerta de Vendas Baixas {i}",
                    description=f"Alerta quando as vendas diárias estão abaixo do limite {i}",
                    dashboard_id=str(uuid.uuid4()),
                    chart_id=str(uuid.uuid4()),
                    metric="total_sales",
                    condition=FilterOperator.LESS_THAN,
                    threshold=5000,
                    frequency="daily",
                    notification_channels=["email", "sms"],
                    recipients=["manager@restaurant.com"],
                    is_active=i % 2 == 0,
                    created_at=datetime.now() - timedelta(days=i),
                    updated_at=datetime.now() - timedelta(days=i),
                    created_by="user-123",
                    trigger_count=i
                )
                for i in range(1, 6)
            ]
            
            # Aplica filtros, se houver
            filtered_alerts = alerts
            
            if dashboard_id:
                filtered_alerts = [a for a in filtered_alerts if a.dashboard_id == dashboard_id]
            
            if is_active is not None:
                filtered_alerts = [a for a in filtered_alerts if a.is_active == is_active]
            
            # Calcula a paginação
            total = len(filtered_alerts)
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            
            # Retorna a página atual
            return filtered_alerts[start_idx:end_idx], total
        except Exception as e:
            self.logger.error(f"Error listing alerts: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error listing alerts: {str(e)}"
            )
    
    def count_alerts(self, restaurant_id: str) -> int:
        """Conta o número de alertas para um restaurante"""
        try:
            # Em um ambiente real, isso seria uma consulta ao banco de dados
            # Aqui estamos retornando um valor de exemplo
            return 5
        except Exception as e:
            self.logger.error(f"Error counting alerts: {str(e)}")
            return 0
    
    def get_recent_alerts(self, restaurant_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Obtém os alertas disparados recentemente"""
        try:
            # Em um ambiente real, isso seria uma consulta ao banco de dados
            # Aqui estamos retornando dados de exemplo
            return [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Alerta de Vendas Baixas",
                    "triggered_at": (datetime.now() - timedelta(hours=2)).isoformat(),
                    "metric": "total_sales",
                    "threshold": 5000,
                    "actual_value": 4500
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "Alerta de Estoque Baixo",
                    "triggered_at": (datetime.now() - timedelta(hours=5)).isoformat(),
                    "metric": "current_stock",
                    "threshold": 10,
                    "actual_value": 8
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "Alerta de Tempo de Entrega Alto",
                    "triggered_at": (datetime.now() - timedelta(hours=8)).isoformat(),
                    "metric": "average_delivery_time",
                    "threshold": 45,
                    "actual_value": 52
                }
            ][:limit]
        except Exception as e:
            self.logger.error(f"Error getting recent alerts: {str(e)}")
            return []
    
    def trigger_alert(self, alert_id: str, value: Union[int, float]) -> bool:
        """Dispara um alerta manualmente"""
        try:
            # Obtém o alerta
            alert = self.get_alert(alert_id)
            
            # Atualiza o contador e o timestamp
            alert.trigger_count += 1
            alert.last_triggered_at = datetime.now()
            
            # Em um ambiente real, isso seria salvo no banco de dados
            # Aqui estamos simulando o salvamento
            
            # Emite evento de disparo de alerta
            self.event_bus.emit("alert.triggered", {
                "alert_id": alert_id,
                "dashboard_id": alert.dashboard_id,
                "metric": alert.metric,
                "threshold": alert.threshold,
                "actual_value": value,
                "timestamp": alert.last_triggered_at.isoformat()
            })
            
            # Envia notificações
            self._send_alert_notifications(alert, value)
            
            return True
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error triggering alert: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error triggering alert: {str(e)}"
            )
    
    def _send_alert_notifications(self, alert: DashboardAlert, value: Union[int, float]) -> None:
        """Envia notificações para os canais configurados"""
        try:
            # Prepara a mensagem
            message = alert.message_template or f"Alerta: {alert.name} - Valor atual: {value}, Limite: {alert.threshold}"
            
            # Envia para cada canal configurado
            for channel in alert.notification_channels:
                if channel == "email" and alert.recipients:
                    # Simulação de envio de email
                    self.logger.info(f"Sending email alert to {alert.recipients}: {message}")
                
                elif channel == "sms" and alert.recipients:
                    # Simulação de envio de SMS
                    self.logger.info(f"Sending SMS alert to {alert.recipients}: {message}")
                
                elif channel == "push":
                    # Simulação de envio de push notification
                    self.logger.info(f"Sending push notification: {message}")
                
                elif channel == "webhook" and alert.webhook_url:
                    # Simulação de envio para webhook
                    self.logger.info(f"Sending webhook to {alert.webhook_url}: {message}")
        except Exception as e:
            self.logger.error(f"Error sending alert notifications: {str(e)}")
            # Não propaga o erro para não interromper o fluxo principal


class ExportService:
    """Serviço para exportação de dashboards"""
    
    def __init__(self, config_service: ConfigService, event_bus: EventBus):
        # db_service removido
        self.config_service = config_service
        self.event_bus = event_bus
        self.logger = logging.getLogger(__name__)
    
    def export_dashboard(self, dashboard_id: str, format: str, filters: Dict[str, Any] = None, 
                        user_id: str = None) -> DashboardExport:
        """Exporta um dashboard para um formato específico"""
        try:
            # Gera um ID único para a exportação
            export_id = str(uuid.uuid4())
            
            # Define timestamps
            now = datetime.now()
            
            # Cria o objeto de exportação
            export = DashboardExport(
                id=export_id,
                dashboard_id=dashboard_id,
                format=format,
                filters=filters,
                created_at=now,
                created_by=user_id or "unknown",
                status="pending"
            )
            
            # Em um ambiente real, isso seria salvo no banco de dados
            # Aqui estamos simulando o salvamento
            
            # Emite evento de exportação
            self.event_bus.emit("dashboard.export.requested", {
                "export_id": export_id,
                "dashboard_id": dashboard_id,
                "format": format,
                "user_id": user_id,
                "timestamp": now.isoformat()
            })
            
            # Inicia o processo de exportação em background
            # Em um ambiente real, isso seria feito por um worker
            self._process_export(export)
            
            return export
        except Exception as e:
            self.logger.error(f"Error exporting dashboard: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error exporting dashboard: {str(e)}"
            )
    
    def _process_export(self, export: DashboardExport) -> None:
        """Processa uma exportação em background"""
        try:
            # Atualiza o status
            export.status = "processing"
            
            # Em um ambiente real, isso seria salvo no banco de dados
            # Aqui estamos simulando o processamento
            
            # Simula um tempo de processamento
            # Em um ambiente real, isso seria o tempo real de geração do arquivo
            time.sleep(1)
            
            # Gera um nome de arquivo
            filename = f"dashboard_{export.dashboard_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            if export.format == "pdf":
                file_url = f"/exports/{filename}.pdf"
            elif export.format == "excel":
                file_url = f"/exports/{filename}.xlsx"
            elif export.format == "csv":
                file_url = f"/exports/{filename}.csv"
            elif export.format == "image":
                file_url = f"/exports/{filename}.png"
            else:
                file_url = f"/exports/{filename}.txt"
            
            # Atualiza o status e a URL do arquivo
            export.status = "completed"
            export.file_url = file_url
            
            # Em um ambiente real, isso seria salvo no banco de dados
            # Aqui estamos simulando o salvamento
            
            # Emite evento de exportação concluída
            self.event_bus.emit("dashboard.export.completed", {
                "export_id": export.id,
                "dashboard_id": export.dashboard_id,
                "format": export.format,
                "file_url": export.file_url,
                "timestamp": datetime.now().isoformat()
            })
        except Exception as e:
            self.logger.error(f"Error processing export: {str(e)}")
            
            # Atualiza o status e a mensagem de erro
            export.status = "failed"
            export.error_message = str(e)
            
            # Em um ambiente real, isso seria salvo no banco de dados
            # Aqui estamos simulando o salvamento
            
            # Emite evento de exportação falha
            self.event_bus.emit("dashboard.export.failed", {
                "export_id": export.id,
                "dashboard_id": export.dashboard_id,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
    
    def get_export_status(self, export_id: str) -> DashboardExport:
        """Obtém o status de uma exportação"""
        try:
            # Em um ambiente real, isso seria uma consulta ao banco de dados
            # Aqui estamos simulando a busca
            
            # Se a exportação não for encontrada
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Export with ID {export_id} not found"
            )
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error getting export status: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error getting export status: {str(e)}"
            )
    
    def list_exports(self, dashboard_id: str = None, user_id: str = None, 
                    status: str = None, page: int = 1, page_size: int = 20) -> Tuple[List[DashboardExport], int]:
        """Lista exportações com filtros e paginação"""
        try:
            # Em um ambiente real, isso seria uma consulta ao banco de dados
            # Aqui estamos simulando a listagem com dados de exemplo
            
            # Cria algumas exportações de exemplo
            exports = [
                DashboardExport(
                    id=str(uuid.uuid4()),
                    dashboard_id=str(uuid.uuid4()),
                    format=["pdf", "excel", "csv", "image"][i % 4],
                    created_at=datetime.now() - timedelta(hours=i),
                    created_by="user-123",
                    status=["pending", "processing", "completed", "failed"][i % 4],
                    file_url=f"/exports/dashboard_{i}.pdf" if i % 4 == 2 else None,
                    error_message="Error processing export" if i % 4 == 3 else None
                )
                for i in range(1, 10)
            ]
            
            # Aplica filtros, se houver
            filtered_exports = exports
            
            if dashboard_id:
                filtered_exports = [e for e in filtered_exports if e.dashboard_id == dashboard_id]
            
            if user_id:
                filtered_exports = [e for e in filtered_exports if e.created_by == user_id]
            
            if status:
                filtered_exports = [e for e in filtered_exports if e.status == status]
            
            # Calcula a paginação
            total = len(filtered_exports)
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            
            # Retorna a página atual
            return filtered_exports[start_idx:end_idx], total
        except Exception as e:
            self.logger.error(f"Error listing exports: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error listing exports: {str(e)}"
            )


class ReportService:
    """Serviço para relatórios agendados"""
    
    def __init__(self, config_service: ConfigService, event_bus: EventBus):
        # db_service removido
        self.config_service = config_service
        self.event_bus = event_bus
        self.logger = logging.getLogger(__name__)
    
    def create_scheduled_report(self, report_data: Dict[str, Any]) -> ScheduledReport:
        """Cria um novo relatório agendado"""
        try:
            # Gera um ID único para o relatório
            report_id = str(uuid.uuid4())
            
            # Define timestamps
            now = datetime.now()
            
            # Cria o objeto de relatório
            report = ScheduledReport(
                id=report_id,
                name=report_data.get("name", "Novo Relatório"),
                description=report_data.get("description"),
                dashboard_id=report_data.get("dashboard_id"),
                format=report_data.get("format", "pdf"),
                schedule=report_data.get("schedule"),
                recipients=report_data.get("recipients"),
                subject=report_data.get("subject", "Relatório Agendado"),
                message=report_data.get("message"),
                filters=report_data.get("filters"),
                is_active=report_data.get("is_active", True),
                created_at=now,
                updated_at=now,
                created_by=report_data.get("created_by")
            )
            
            # Em um ambiente real, isso seria salvo no banco de dados
            # Aqui estamos simulando o salvamento
            
            # Emite evento de criação de relatório
            self.event_bus.emit("report.created", {
                "report_id": report_id,
                "dashboard_id": report.dashboard_id,
                "created_by": report.created_by,
                "timestamp": now.isoformat()
            })
            
            return report
        except Exception as e:
            self.logger.error(f"Error creating scheduled report: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating scheduled report: {str(e)}"
            )
    
    def get_scheduled_report(self, report_id: str) -> ScheduledReport:
        """Obtém um relatório agendado pelo ID"""
        try:
            # Em um ambiente real, isso seria uma consulta ao banco de dados
            # Aqui estamos simulando a busca
            
            # Se o relatório não for encontrado
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scheduled report with ID {report_id} not found"
            )
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error getting scheduled report: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error getting scheduled report: {str(e)}"
            )
    
    def update_scheduled_report(self, report_id: str, update_data: Dict[str, Any]) -> ScheduledReport:
        """Atualiza um relatório agendado existente"""
        try:
            # Obtém o relatório existente
            report = self.get_scheduled_report(report_id)
            
            # Atualiza os campos
            for key, value in update_data.items():
                if hasattr(report, key):
                    setattr(report, key, value)
            
            # Atualiza o timestamp
            report.updated_at = datetime.now()
            
            # Em um ambiente real, isso seria salvo no banco de dados
            # Aqui estamos simulando o salvamento
            
            # Emite evento de atualização de relatório
            self.event_bus.emit("report.updated", {
                "report_id": report_id,
                "dashboard_id": report.dashboard_id,
                "updated_by": update_data.get("updated_by", "unknown"),
                "timestamp": report.updated_at.isoformat()
            })
            
            return report
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error updating scheduled report: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error updating scheduled report: {str(e)}"
            )
    
    def delete_scheduled_report(self, report_id: str) -> bool:
        """Exclui um relatório agendado"""
        try:
            # Obtém o relatório existente
            report = self.get_scheduled_report(report_id)
            
            # Em um ambiente real, isso seria excluído do banco de dados
            # Aqui estamos simulando a exclusão
            
            # Emite evento de exclusão de relatório
            self.event_bus.emit("report.deleted", {
                "report_id": report_id,
                "dashboard_id": report.dashboard_id,
                "deleted_by": "unknown",
                "timestamp": datetime.now().isoformat()
            })
            
            return True
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error deleting scheduled report: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error deleting scheduled report: {str(e)}"
            )
    
    def list_scheduled_reports(self, dashboard_id: str = None, user_id: str = None, 
                             is_active: bool = None, page: int = 1, page_size: int = 20) -> Tuple[List[ScheduledReport], int]:
        """Lista relatórios agendados com filtros e paginação"""
        try:
            # Em um ambiente real, isso seria uma consulta ao banco de dados
            # Aqui estamos simulando a listagem com dados de exemplo
            
            # Cria alguns relatórios de exemplo
            reports = [
                ScheduledReport(
                    id=str(uuid.uuid4()),
                    name=f"Relatório Diário de Vendas {i}",
                    description=f"Relatório diário com resumo de vendas {i}",
                    dashboard_id=str(uuid.uuid4()),
                    format=["pdf", "excel", "csv"][i % 3],
                    schedule="0 8 * * *",  # Todos os dias às 8h
                    recipients=["manager@restaurant.com", "owner@restaurant.com"],
                    subject=f"Relatório Diário de Vendas {i} - {datetime.now().strftime('%d/%m/%Y')}",
                    is_active=i % 2 == 0,
                    created_at=datetime.now() - timedelta(days=i),
                    updated_at=datetime.now() - timedelta(days=i),
                    created_by="user-123"
                )
                for i in range(1, 6)
            ]
            
            # Aplica filtros, se houver
            filtered_reports = reports
            
            if dashboard_id:
                filtered_reports = [r for r in filtered_reports if r.dashboard_id == dashboard_id]
            
            if user_id:
                filtered_reports = [r for r in filtered_reports if r.created_by == user_id]
            
            if is_active is not None:
                filtered_reports = [r for r in filtered_reports if r.is_active == is_active]
            
            # Calcula a paginação
            total = len(filtered_reports)
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            
            # Retorna a página atual
            return filtered_reports[start_idx:end_idx], total
        except Exception as e:
            self.logger.error(f"Error listing scheduled reports: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error listing scheduled reports: {str(e)}"
            )
    
    def count_reports(self, restaurant_id: str) -> int:
        """Conta o número de relatórios agendados para um restaurante"""
        try:
            # Em um ambiente real, isso seria uma consulta ao banco de dados
            # Aqui estamos retornando um valor de exemplo
            return 5
        except Exception as e:
            self.logger.error(f"Error counting reports: {str(e)}")
            return 0
    
    def run_scheduled_report(self, report_id: str) -> bool:
        """Executa um relatório agendado manualmente"""
        try:
            # Obtém o relatório
            report = self.get_scheduled_report(report_id)
            
            # Atualiza o timestamp
            report.last_run_at = datetime.now()
            report.last_run_status = "running"
            
            # Em um ambiente real, isso seria salvo no banco de dados
            # Aqui estamos simulando o salvamento
            
            # Emite evento de execução de relatório
            self.event_bus.emit("report.running", {
                "report_id": report_id,
                "dashboard_id": report.dashboard_id,
                "timestamp": report.last_run_at.isoformat()
            })
            
            # Inicia o processo de geração do relatório em background
            # Em um ambiente real, isso seria feito por um worker
            self._process_report(report)
            
            return True
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Error running scheduled report: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error running scheduled report: {str(e)}"
            )
    
    def _process_report(self, report: ScheduledReport) -> None:
        """Processa um relatório em background"""
        try:
            # Em um ambiente real, isso seria o processamento real do relatório
            # Aqui estamos simulando o processamento
            
            # Simula um tempo de processamento
            time.sleep(1)
            
            # Atualiza o status
            report.last_run_status = "completed"
            
            # Em um ambiente real, isso seria salvo no banco de dados
            # Aqui estamos simulando o salvamento
            
            # Emite evento de relatório concluído
            self.event_bus.emit("report.completed", {
                "report_id": report.id,
                "dashboard_id": report.dashboard_id,
                "timestamp": datetime.now().isoformat()
            })
            
            # Simula o envio do relatório
            self._send_report(report)
        except Exception as e:
            self.logger.error(f"Error processing report: {str(e)}")
            
            # Atualiza o status
            report.last_run_status = "failed"
            
            # Em um ambiente real, isso seria salvo no banco de dados
            # Aqui estamos simulando o salvamento
            
            # Emite evento de relatório falha
            self.event_bus.emit("report.failed", {
                "report_id": report.id,
                "dashboard_id": report.dashboard_id,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
    
    def _send_report(self, report: ScheduledReport) -> None:
        """Envia um relatório por email"""
        try:
            # Em um ambiente real, isso seria o envio real do relatório
            # Aqui estamos simulando o envio
            
            self.logger.info(f"Sending report {report.id} to {report.recipients}")
            
            # Emite evento de relatório enviado
            self.event_bus.emit("report.sent", {
                "report_id": report.id,
                "dashboard_id": report.dashboard_id,
                "recipients": report.recipients,
                "timestamp": datetime.now().isoformat()
            })
        except Exception as e:
            self.logger.error(f"Error sending report: {str(e)}")
            # Não propaga o erro para não interromper o fluxo principal
