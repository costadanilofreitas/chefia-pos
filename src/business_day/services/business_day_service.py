import json
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from src.business_day.events.business_day_events import (
    publish_business_day_closed,
    publish_business_day_opened,
    publish_business_day_updated,
)
from src.business_day.models.business_day import (
    BusinessDay,
    BusinessDaySummary,
    DailySalesReport,
    DayStatus,
)

logger = logging.getLogger(__name__)

# Simulação de banco de dados com arquivo JSON
DATA_DIR = Path("/home/ubuntu/chefia-pos/data")
BUSINESS_DAYS_FILE = DATA_DIR / "business_days.json"

# Garantir que o diretório de dados existe
os.makedirs(DATA_DIR, exist_ok=True)

# Inicializar arquivo de dados se não existir
if not BUSINESS_DAYS_FILE.exists():
    with open(BUSINESS_DAYS_FILE, "w") as f:
        json.dump([], f)


class BusinessDayService:
    """Serviço para gerenciamento de dias de operação."""

    async def create_business_day(self, business_day: BusinessDay) -> BusinessDay:
        """Cria um novo dia de operação."""
        # Carregar dados existentes
        business_days = self._load_business_days()

        # Verificar se já existe um dia aberto
        open_day = next(
            (day for day in business_days if day["status"] == DayStatus.OPEN), None
        )
        if open_day:
            raise ValueError(
                f"Já existe um dia aberto com data {open_day['date']}. Feche-o antes de abrir um novo dia."
            )

        # Adicionar novo dia
        business_day_dict = business_day.dict()
        business_days.append(business_day_dict)

        # Salvar dados
        self._save_business_days(business_days)

        # Publicar evento
        await publish_business_day_opened(business_day)

        return business_day

    async def openBusinessDay(
        self, opened_by: str, notes: Optional[str] = None
    ) -> BusinessDay:
        """Abre um novo dia de operação (função compatível com frontend)."""
        # Verificar se já existe um dia aberto
        open_day = await self.get_open_business_day()
        if open_day:
            raise ValueError(
                f"Já existe um dia aberto com data {open_day.date}. Feche-o antes de abrir um novo dia."
            )

        # Criar novo dia de operação
        now = datetime.now()
        business_day = BusinessDay(
            id=str(uuid.uuid4()),
            date=now.strftime("%Y-%m-%d"),
            opened_by=opened_by,
            opened_at=now.isoformat(),
            status=DayStatus.OPEN,
            notes=notes or "",
            closed_by=None,
            closed_at=None,
            total_sales=0.0,
            total_orders=0,
            created_at=now.isoformat(),
            updated_at=now.isoformat(),
        )

        return await self.create_business_day(business_day)

    async def get_business_day(self, business_day_id: str) -> Optional[BusinessDay]:
        """Busca um dia de operação pelo ID."""
        business_days = self._load_business_days()

        business_day_dict = next(
            (day for day in business_days if day["id"] == business_day_id), None
        )
        if not business_day_dict:
            return None

        return BusinessDay(**business_day_dict)

    async def get_open_business_day(self) -> Optional[BusinessDay]:
        """Busca o dia de operação aberto, se houver."""
        business_days = self._load_business_days()

        open_day_dict = next(
            (day for day in business_days if day["status"] == DayStatus.OPEN), None
        )
        if not open_day_dict:
            return None

        return BusinessDay(**open_day_dict)

    async def list_business_days(
        self,
        status: Optional[DayStatus] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 10,
        offset: int = 0,
    ) -> List[BusinessDaySummary]:
        """Lista dias de operação com filtros."""
        business_days = self._load_business_days()

        # Aplicar filtros
        if status:
            business_days = [day for day in business_days if day["status"] == status]

        if start_date:
            business_days = [day for day in business_days if day["date"] >= start_date]

        if end_date:
            business_days = [day for day in business_days if day["date"] <= end_date]

        # Ordenar por data (mais recente primeiro)
        business_days.sort(key=lambda x: x["date"], reverse=True)

        # Aplicar paginação
        paginated_days = business_days[offset : offset + limit]

        # Converter para modelo de resumo
        return [BusinessDaySummary(**day) for day in paginated_days]

    async def update_business_day(
        self, business_day_id: str, update_data: Dict[str, Any]
    ) -> BusinessDay:
        """Atualiza um dia de operação."""
        business_days = self._load_business_days()

        # Encontrar o dia a ser atualizado
        day_index = next(
            (i for i, day in enumerate(business_days) if day["id"] == business_day_id),
            None,
        )
        if day_index is None:
            raise ValueError(
                f"Dia de operação com ID {business_day_id} não encontrado."
            )

        # Atualizar campos
        business_days[day_index].update(update_data)
        business_days[day_index]["updated_at"] = datetime.now().isoformat()

        # Salvar dados
        self._save_business_days(business_days)

        # Criar objeto BusinessDay
        updated_day = BusinessDay(**business_days[day_index])

        # Publicar evento
        await publish_business_day_updated(updated_day, update_data)

        return updated_day

    async def close_business_day(
        self, business_day_id: str, closed_by: str, notes: Optional[str] = None
    ) -> BusinessDay:
        """Fecha um dia de operação."""
        business_days = self._load_business_days()

        # Encontrar o dia a ser fechado
        day_index = next(
            (i for i, day in enumerate(business_days) if day["id"] == business_day_id),
            None,
        )
        if day_index is None:
            raise ValueError(
                f"Dia de operação com ID {business_day_id} não encontrado."
            )

        # Verificar se o dia já está fechado
        if business_days[day_index]["status"] == DayStatus.CLOSED:
            raise ValueError("O dia de operação já está fechado.")

        # Verificar se todos os caixas estão fechados
        open_cashiers = await self.get_open_cashiers(business_day_id)
        if open_cashiers:
            raise ValueError(
                f"Existem {len(open_cashiers)} caixas abertos. Feche todos os caixas antes de fechar o dia."
            )

        # Calcular totais finais
        total_sales, total_orders = await self._calculate_day_totals(business_day_id)

        # Atualizar dados do dia
        now = datetime.now().isoformat()
        business_days[day_index].update(
            {
                "status": DayStatus.CLOSED,
                "closed_by": closed_by,
                "closed_at": now,
                "total_sales": total_sales,
                "total_orders": total_orders,
                "updated_at": now,
            }
        )

        if notes:
            business_days[day_index]["notes"] = notes

        # Salvar dados
        self._save_business_days(business_days)

        # Criar objeto BusinessDay
        closed_day = BusinessDay(**business_days[day_index])

        # Publicar evento
        await publish_business_day_closed(closed_day)

        return closed_day

    async def get_open_cashiers(self, business_day_id: str) -> List[Dict[str, Any]]:
        """
        Retorna os caixas abertos para um dia de operação.

        Esta é uma implementação simulada que será substituída pela integração
        com o módulo de caixa quando ele for implementado.
        """
        # Simulação - em produção, isso consultaria o módulo de caixa
        # Por enquanto, retornamos uma lista vazia para permitir o fechamento do dia
        return []

    async def _calculate_day_totals(self, business_day_id: str) -> tuple:
        """
        Calcula os totais de vendas e pedidos para um dia de operação.

        Esta é uma implementação simulada que será substituída pela integração
        com o módulo de vendas quando ele for implementado.
        """
        # Simulação - em produção, isso consultaria o módulo de vendas
        # Por enquanto, retornamos valores simulados
        return 0.0, 0

    async def generate_daily_sales_report(
        self, business_day_id: str
    ) -> DailySalesReport:
        """
        Gera um relatório de vendas para um dia de operação.

        Esta é uma implementação simulada que será substituída pela integração
        com o módulo de relatórios quando ele for implementado.
        """
        # Buscar o dia de operação
        business_day = await self.get_business_day(business_day_id)
        if not business_day:
            raise ValueError(
                f"Dia de operação com ID {business_day_id} não encontrado."
            )

        # Simulação de dados de relatório
        # Em produção, isso consultaria o módulo de vendas para obter dados reais
        return DailySalesReport(
            business_day_id=business_day.id,
            date=business_day.date,
            total_sales=business_day.total_sales,
            total_orders=business_day.total_orders,
            sales_by_payment_method={
                "credit_card": business_day.total_sales * 0.6,
                "debit_card": business_day.total_sales * 0.3,
                "cash": business_day.total_sales * 0.1,
            },
            sales_by_hour={
                "08:00": business_day.total_sales * 0.1,
                "09:00": business_day.total_sales * 0.15,
                "10:00": business_day.total_sales * 0.1,
                "11:00": business_day.total_sales * 0.2,
                "12:00": business_day.total_sales * 0.25,
                "13:00": business_day.total_sales * 0.2,
            },
            top_selling_products=[
                {
                    "product_id": "p1",
                    "name": "X-Burger",
                    "quantity": 25,
                    "total": business_day.total_sales * 0.3,
                },
                {
                    "product_id": "p2",
                    "name": "Batata Frita",
                    "quantity": 20,
                    "total": business_day.total_sales * 0.15,
                },
                {
                    "product_id": "p3",
                    "name": "Refrigerante",
                    "quantity": 30,
                    "total": business_day.total_sales * 0.1,
                },
            ],
            average_ticket=business_day.total_sales / max(business_day.total_orders, 1),
        )

    def _load_business_days(self) -> List[Dict[str, Any]]:
        """Carrega os dias de operação do arquivo JSON."""
        try:
            with open(BUSINESS_DAYS_FILE, "r") as f:
                return json.load(f)
        except json.JSONDecodeError:
            logger.error(
                "Erro ao decodificar arquivo JSON de dias de operação. Iniciando com lista vazia."
            )
            return []

    def _save_business_days(self, business_days: List[Dict[str, Any]]) -> None:
        """Salva os dias de operação no arquivo JSON."""
        with open(BUSINESS_DAYS_FILE, "w") as f:
            json.dump(business_days, f, indent=2)


# Singleton para o serviço de dia de operação
_business_day_service_instance = None


def get_business_day_service() -> BusinessDayService:
    """Retorna a instância singleton do serviço de dia de operação."""
    global _business_day_service_instance
    if _business_day_service_instance is None:
        _business_day_service_instance = BusinessDayService()
    return _business_day_service_instance
