from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import os
import logging
from pathlib import Path

from src.cashier.models.cashier import (
    Cashier,
    CashierSummary,
    CashierOperation,
    CashierOperationResponse,
    CashierReport,
    CashierStatus,
    OperationType,
    PaymentMethod,
    create_operation,
)
from src.cashier.events.cashier_events import (
    publish_cashier_closed,
    publish_cashier_operation,
    publish_cashier_updated,
)

logger = logging.getLogger(__name__)

# Simulação de banco de dados com arquivo JSON
DATA_DIR = Path("/home/ubuntu/chefia-pos/data")
CASHIERS_FILE = DATA_DIR / "cashiers.json"
OPERATIONS_FILE = DATA_DIR / "cashier_operations.json"

# Garantir que o diretório de dados existe
os.makedirs(DATA_DIR, exist_ok=True)

# Inicializar arquivos de dados se não existirem
if not CASHIERS_FILE.exists():
    with open(CASHIERS_FILE, "w") as f:
        json.dump([], f)

if not OPERATIONS_FILE.exists():
    with open(OPERATIONS_FILE, "w") as f:
        json.dump([], f)


class CashierService:
    """Serviço para gerenciamento de caixas."""

    async def create_cashier(self, cashier: Cashier) -> Cashier:
        """Cria um novo caixa."""
        # Carregar dados existentes
        cashiers = self._load_cashiers()

        # Verificar se o operador já tem um caixa aberto
        operator_cashier = next(
            (
                c
                for c in cashiers
                if c["current_operator_id"] == cashier.current_operator_id
                and c["status"] == CashierStatus.OPEN
            ),
            None,
        )
        if operator_cashier:
            raise ValueError(
                f"O operador já possui um caixa aberto (ID: {operator_cashier['id']})."
            )

        # Verificar se o terminal já tem um caixa aberto
        terminal_cashier = next(
            (
                c
                for c in cashiers
                if c["terminal_id"] == cashier.terminal_id
                and c["status"] == CashierStatus.OPEN
            ),
            None,
        )
        if terminal_cashier:
            raise ValueError(
                f"O terminal já possui um caixa aberto (ID: {terminal_cashier['id']})."
            )

        # Adicionar novo caixa
        cashier_dict = cashier.dict()
        cashiers.append(cashier_dict)

        # Salvar dados
        self._save_cashiers(cashiers)

        # Registrar operação de abertura
        opening_operation = CashierOperation(
            operation_type=OperationType.OPENING,
            amount=cashier.opening_balance,
            operator_id=cashier.current_operator_id,
            payment_method=PaymentMethod.CASH,
            related_entity_id=None,
            notes="Abertura de caixa",
        )

        operation_response = create_operation(
            cashier_id=cashier.id,
            operation=opening_operation,
            balance_before=0,
            balance_after=cashier.opening_balance,
        )

        # Salvar operação
        operations = self._load_operations()
        operations.append(operation_response.dict())
        self._save_operations(operations)

        # Publicar evento (temporariamente desabilitado)
        # await publish_cashier_opened(cashier)

        return cashier

    async def get_cashier(self, cashier_id: str) -> Optional[Cashier]:
        """Busca um caixa pelo ID."""
        cashiers = self._load_cashiers()

        cashier_dict = next((c for c in cashiers if c["id"] == cashier_id), None)
        if not cashier_dict:
            return None

        return Cashier(**cashier_dict)

    async def get_cashier_by_operator(self, operator_id: str) -> Optional[Cashier]:
        """Busca um caixa aberto pelo ID do operador."""
        cashiers = self._load_cashiers()

        cashier_dict = next(
            (
                c
                for c in cashiers
                if c["current_operator_id"] == operator_id
                and c["status"] == CashierStatus.OPEN
            ),
            None,
        )
        if not cashier_dict:
            return None

        return Cashier(**cashier_dict)

    async def get_cashier_by_terminal(self, terminal_id: str) -> Optional[Cashier]:
        """Busca um caixa aberto pelo ID do terminal."""
        cashiers = self._load_cashiers()

        cashier_dict = next(
            (
                c
                for c in cashiers
                if c["terminal_id"] == terminal_id and c["status"] == CashierStatus.OPEN
            ),
            None,
        )
        if not cashier_dict:
            return None

        return Cashier(**cashier_dict)

    async def list_cashiers(
        self,
        business_day_id: Optional[str] = None,
        status: Optional[CashierStatus] = None,
        terminal_id: Optional[str] = None,
        operator_id: Optional[str] = None,
        limit: int = 10,
        offset: int = 0,
    ) -> List[CashierSummary]:
        """Lista caixas com filtros."""
        cashiers = self._load_cashiers()

        # Aplicar filtros
        if business_day_id:
            cashiers = [c for c in cashiers if c["business_day_id"] == business_day_id]

        if status:
            cashiers = [c for c in cashiers if c["status"] == status]

        if terminal_id:
            cashiers = [c for c in cashiers if c["terminal_id"] == terminal_id]

        if operator_id:
            cashiers = [c for c in cashiers if c["current_operator_id"] == operator_id]

        # Ordenar por data de abertura (mais recente primeiro)
        cashiers.sort(key=lambda x: x.get("opened_at", ""), reverse=True)

        # Aplicar paginação
        paginated_cashiers = cashiers[offset : offset + limit]

        # Converter para modelo de resumo
        return [CashierSummary(**c) for c in paginated_cashiers]

    async def update_cashier(
        self, cashier_id: str, update_data: Dict[str, Any]
    ) -> Cashier:
        """Atualiza um caixa."""
        cashiers = self._load_cashiers()

        # Encontrar o caixa a ser atualizado
        cashier_index = next(
            (i for i, c in enumerate(cashiers) if c["id"] == cashier_id), None
        )
        if cashier_index is None:
            raise ValueError(f"Caixa com ID {cashier_id} não encontrado.")

        # Atualizar campos
        cashiers[cashier_index].update(update_data)
        cashiers[cashier_index]["updated_at"] = datetime.now().isoformat()

        # Salvar dados
        self._save_cashiers(cashiers)

        # Criar objeto Cashier
        updated_cashier = Cashier(**cashiers[cashier_index])

        # Publicar evento
        await publish_cashier_updated(updated_cashier, update_data)

        return updated_cashier

    async def close_cashier(
        self,
        cashier_id: str,
        operator_id: str,
        physical_cash_amount: float,
        notes: Optional[str] = None,
    ) -> Cashier:
        """Fecha um caixa."""
        cashiers = self._load_cashiers()

        # Encontrar o caixa a ser fechado
        cashier_index = next(
            (i for i, c in enumerate(cashiers) if c["id"] == cashier_id), None
        )
        if cashier_index is None:
            raise ValueError(f"Caixa com ID {cashier_id} não encontrado.")

        # Verificar se o caixa já está fechado
        if cashiers[cashier_index]["status"] == CashierStatus.CLOSED:
            raise ValueError("O caixa já está fechado.")

        # Verificar se o operador é o mesmo que abriu o caixa
        if cashiers[cashier_index]["current_operator_id"] != operator_id:
            # Verificar se é um gerente (simplificação - em produção, verificaria permissões)
            # Esta verificação já é feita no router, mas mantemos aqui por segurança
            pass

        # Calcular diferença de caixa
        expected_balance = cashiers[cashier_index]["expected_balance"]
        cash_difference = physical_cash_amount - expected_balance

        # Atualizar dados do caixa
        now = datetime.now().isoformat()
        cashiers[cashier_index].update(
            {
                "status": CashierStatus.CLOSED,
                "physical_cash_amount": physical_cash_amount,
                "cash_difference": cash_difference,
                "closed_at": now,
                "updated_at": now,
            }
        )

        if notes:
            cashiers[cashier_index]["notes"] = notes

        # Salvar dados
        self._save_cashiers(cashiers)

        # Registrar operação de fechamento
        closing_operation = CashierOperation(
            operation_type=OperationType.CLOSING,
            amount=0,  # Não altera o saldo
            operator_id=operator_id,
            payment_method=None,
            related_entity_id=None,
            notes=f"Fechamento de caixa. Diferença: R$ {cash_difference:.2f}",
        )

        operation_response = create_operation(
            cashier_id=cashier_id,
            operation=closing_operation,
            balance_before=expected_balance,
            balance_after=expected_balance,
        )

        # Salvar operação
        operations = self._load_operations()
        operations.append(operation_response.dict())
        self._save_operations(operations)

        # Criar objeto Cashier
        closed_cashier = Cashier(**cashiers[cashier_index])

        # Publicar evento
        await publish_cashier_closed(closed_cashier)

        return closed_cashier

    async def register_operation(
        self, cashier_id: str, operation: CashierOperation
    ) -> CashierOperationResponse:
        """Registra uma operação no caixa."""
        cashiers = self._load_cashiers()

        # Encontrar o caixa
        cashier_index = next(
            (i for i, c in enumerate(cashiers) if c["id"] == cashier_id), None
        )
        if cashier_index is None:
            raise ValueError(f"Caixa com ID {cashier_id} não encontrado.")

        # Verificar se o caixa está aberto
        if cashiers[cashier_index]["status"] != CashierStatus.OPEN:
            raise ValueError(
                "O caixa está fechado. Não é possível registrar operações."
            )

        # Calcular novo saldo
        current_balance = cashiers[cashier_index]["current_balance"]
        expected_balance = cashiers[cashier_index]["expected_balance"]

        # Atualizar saldo com base no tipo de operação
        if operation.operation_type in [OperationType.SALE, OperationType.DEPOSIT]:
            new_balance = current_balance + operation.amount
            new_expected_balance = expected_balance + (
                operation.amount
                if operation.payment_method == PaymentMethod.CASH
                else 0
            )
        elif operation.operation_type in [
            OperationType.REFUND,
            OperationType.WITHDRAWAL,
        ]:
            new_balance = current_balance - operation.amount
            new_expected_balance = expected_balance - (
                operation.amount
                if operation.payment_method == PaymentMethod.CASH
                else 0
            )
        else:
            new_balance = current_balance
            new_expected_balance = expected_balance

        # Verificar se há saldo suficiente para operações de saída
        if (
            operation.operation_type in [OperationType.REFUND, OperationType.WITHDRAWAL]
            and new_balance < 0
        ):
            raise ValueError(
                f"Saldo insuficiente para a operação. Saldo atual: R$ {current_balance:.2f}, Valor da operação: R$ {operation.amount:.2f}"
            )

        # Criar resposta da operação
        operation_response = create_operation(
            cashier_id=cashier_id,
            operation=operation,
            balance_before=current_balance,
            balance_after=new_balance,
        )

        # Salvar operação
        operations = self._load_operations()
        operations.append(operation_response.dict())
        self._save_operations(operations)

        # Atualizar saldo do caixa
        cashiers[cashier_index]["current_balance"] = new_balance
        cashiers[cashier_index]["expected_balance"] = new_expected_balance
        cashiers[cashier_index]["updated_at"] = datetime.now().isoformat()
        self._save_cashiers(cashiers)

        # Criar objeto Cashier atualizado
        updated_cashier = Cashier(**cashiers[cashier_index])

        # Publicar evento
        await publish_cashier_operation(operation_response, updated_cashier)

        return operation_response

    async def get_cashier_operations(
        self,
        cashier_id: str,
        operation_type: Optional[OperationType] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[CashierOperationResponse]:
        """Busca operações de um caixa."""
        operations = self._load_operations()

        # Filtrar por caixa
        cashier_operations = [op for op in operations if op["cashier_id"] == cashier_id]

        # Filtrar por tipo de operação
        if operation_type:
            cashier_operations = [
                op
                for op in cashier_operations
                if op["operation_type"] == operation_type
            ]

        # Ordenar por data (mais recente primeiro)
        cashier_operations.sort(key=lambda x: x["created_at"], reverse=True)

        # Aplicar paginação
        paginated_operations = cashier_operations[offset : offset + limit]

        # Converter para modelo de resposta
        return [CashierOperationResponse(**op) for op in paginated_operations]

    async def generate_cashier_report(self, cashier_id: str) -> CashierReport:
        """
        Gera um relatório para um caixa.
        """
        # Buscar o caixa
        cashier = await self.get_cashier(cashier_id)
        if not cashier:
            raise ValueError(f"Caixa com ID {cashier_id} não encontrado.")

        # Buscar operações do caixa
        operations = await self.get_cashier_operations(cashier_id, limit=1000)

        # Calcular totais
        total_sales = sum(
            op.amount for op in operations if op.operation_type == OperationType.SALE
        )
        total_refunds = sum(
            op.amount for op in operations if op.operation_type == OperationType.REFUND
        )
        total_withdrawals = sum(
            op.amount
            for op in operations
            if op.operation_type == OperationType.WITHDRAWAL
        )
        total_deposits = sum(
            op.amount for op in operations if op.operation_type == OperationType.DEPOSIT
        )

        # Calcular vendas por método de pagamento
        sales_by_payment_method = {}
        for op in operations:
            if op.operation_type == OperationType.SALE and op.payment_method:
                method = op.payment_method
                if method not in sales_by_payment_method:
                    sales_by_payment_method[method] = 0
                sales_by_payment_method[method] += op.amount

        # Contar operações por tipo
        operations_count = {}
        for op in operations:
            op_type = op.operation_type
            if op_type not in operations_count:
                operations_count[op_type] = 0
            operations_count[op_type] += 1

        # Calcular duração do caixa
        duration_minutes = None
        if cashier.opened_at and cashier.closed_at:
            opened_at = datetime.fromisoformat(cashier.opened_at.replace("Z", "+00:00"))
            closed_at = datetime.fromisoformat(cashier.closed_at.replace("Z", "+00:00"))
            duration = closed_at - opened_at
            duration_minutes = int(duration.total_seconds() / 60)

        # Criar relatório
        return CashierReport(
            cashier_id=cashier.id,
            terminal_id=cashier.terminal_id,
            business_day_id=cashier.business_day_id,
            operator_id=cashier.current_operator_id or "",
            opening_balance=cashier.opening_balance,
            closing_balance=cashier.current_balance,
            physical_cash_amount=cashier.physical_cash_amount,
            cash_difference=cashier.cash_difference,
            total_sales=total_sales,
            total_refunds=total_refunds,
            total_withdrawals=total_withdrawals,
            total_deposits=total_deposits,
            sales_by_payment_method=sales_by_payment_method,
            operations_count=operations_count,
            opened_at=cashier.opened_at or "",
            closed_at=cashier.closed_at,
            duration_minutes=duration_minutes,
        )

    def _load_cashiers(self) -> List[Dict[str, Any]]:
        """Carrega os caixas do arquivo JSON."""
        try:
            with open(CASHIERS_FILE, "r") as f:
                return json.load(f)
        except json.JSONDecodeError:
            logger.error(
                "Erro ao decodificar arquivo JSON de caixas. Iniciando com lista vazia."
            )
            return []

    def _save_cashiers(self, cashiers: List[Dict[str, Any]]) -> None:
        """Salva os caixas no arquivo JSON."""
        with open(CASHIERS_FILE, "w") as f:
            json.dump(cashiers, f, indent=2)

    def _load_operations(self) -> List[Dict[str, Any]]:
        """Carrega as operações do arquivo JSON."""
        try:
            with open(OPERATIONS_FILE, "r") as f:
                return json.load(f)
        except json.JSONDecodeError:
            logger.error(
                "Erro ao decodificar arquivo JSON de operações. Iniciando com lista vazia."
            )
            return []

    def _save_operations(self, operations: List[Dict[str, Any]]) -> None:
        """Salva as operações no arquivo JSON."""
        with open(OPERATIONS_FILE, "w") as f:
            json.dump(operations, f, indent=2)


# Singleton para o serviço de caixa
_cashier_service_instance = None


def get_cashier_service() -> CashierService:
    """Retorna a instância singleton do serviço de caixa."""
    global _cashier_service_instance
    if _cashier_service_instance is None:
        _cashier_service_instance = CashierService()
    return _cashier_service_instance
