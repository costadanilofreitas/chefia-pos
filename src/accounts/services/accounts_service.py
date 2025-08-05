import os
import json
from typing import List, Dict, Optional, Any
from datetime import datetime, date, timedelta
import uuid

from ..models.accounts_models import (
    Account,
    AccountCreate,
    AccountUpdate,
    Transaction,
    TransactionCreate,
    TransactionUpdate,
    Receivable,
    ReceivableCreate,
    ReceivableUpdate,
    Payable,
    PayableCreate,
    PayableUpdate,
    RecurringTransaction,
    RecurringTransactionCreate,
    RecurringTransactionUpdate,
    FinancialReport,
    FinancialReportCreate,
    AccountType,
    TransactionType,
    PaymentStatus,
    SourceType,
    AccountsEvent
)

from src.logs_module.services.log_service import log_info, log_error, LogSource
from src.core.events.event_bus import get_event_bus, Event, EventType

# Configuração
ACCOUNTS_DATA_FILE = os.path.join("/home/ubuntu/pos-modern/data", "accounts.json")
TRANSACTIONS_DATA_FILE = os.path.join("/home/ubuntu/pos-modern/data", "transactions.json")
RECEIVABLES_DATA_FILE = os.path.join("/home/ubuntu/pos-modern/data", "receivables.json")
PAYABLES_DATA_FILE = os.path.join("/home/ubuntu/pos-modern/data", "payables.json")
RECURRING_TRANSACTIONS_DATA_FILE = os.path.join("/home/ubuntu/pos-modern/data", "recurring_transactions.json")
REPORTS_DATA_FILE = os.path.join("/home/ubuntu/pos-modern/data", "financial_reports.json")

# Ensure data directory exists
os.makedirs(os.path.dirname(ACCOUNTS_DATA_FILE), exist_ok=True)

class AccountsService:
    """Serviço para gerenciamento de contas financeiras."""
    
    def __init__(self):
        """Inicializa o serviço de contas."""
        self._load_or_create_data()
        self.event_bus = get_event_bus()
    
    def _load_or_create_data(self) -> None:
        """Carrega dados existentes ou cria novos dados se não existirem."""
        # Carrega contas
        if os.path.exists(ACCOUNTS_DATA_FILE):
            with open(ACCOUNTS_DATA_FILE, 'r') as f:
                self.accounts = json.load(f)
        else:
            self.accounts = []
            self._save_accounts()
        
        # Carrega transações
        if os.path.exists(TRANSACTIONS_DATA_FILE):
            with open(TRANSACTIONS_DATA_FILE, 'r') as f:
                self.transactions = json.load(f)
        else:
            self.transactions = []
            self._save_transactions()
        
        # Carrega contas a receber
        if os.path.exists(RECEIVABLES_DATA_FILE):
            with open(RECEIVABLES_DATA_FILE, 'r') as f:
                self.receivables = json.load(f)
        else:
            self.receivables = []
            self._save_receivables()
        
        # Carrega contas a pagar
        if os.path.exists(PAYABLES_DATA_FILE):
            with open(PAYABLES_DATA_FILE, 'r') as f:
                self.payables = json.load(f)
        else:
            self.payables = []
            self._save_payables()
        
        # Carrega transações recorrentes
        if os.path.exists(RECURRING_TRANSACTIONS_DATA_FILE):
            with open(RECURRING_TRANSACTIONS_DATA_FILE, 'r') as f:
                self.recurring_transactions = json.load(f)
        else:
            self.recurring_transactions = []
            self._save_recurring_transactions()
        
        # Carrega relatórios financeiros
        if os.path.exists(REPORTS_DATA_FILE):
            with open(REPORTS_DATA_FILE, 'r') as f:
                self.reports = json.load(f)
        else:
            self.reports = []
            self._save_reports()
    
    def _save_accounts(self) -> None:
        """Salva dados de contas no arquivo."""
        with open(ACCOUNTS_DATA_FILE, 'w') as f:
            json.dump(self.accounts, f, indent=2, default=str)
    
    def _save_transactions(self) -> None:
        """Salva dados de transações no arquivo."""
        with open(TRANSACTIONS_DATA_FILE, 'w') as f:
            json.dump(self.transactions, f, indent=2, default=str)
    
    def _save_receivables(self) -> None:
        """Salva dados de contas a receber no arquivo."""
        with open(RECEIVABLES_DATA_FILE, 'w') as f:
            json.dump(self.receivables, f, indent=2, default=str)
    
    def _save_payables(self) -> None:
        """Salva dados de contas a pagar no arquivo."""
        with open(PAYABLES_DATA_FILE, 'w') as f:
            json.dump(self.payables, f, indent=2, default=str)
    
    def _save_recurring_transactions(self) -> None:
        """Salva dados de transações recorrentes no arquivo."""
        with open(RECURRING_TRANSACTIONS_DATA_FILE, 'w') as f:
            json.dump(self.recurring_transactions, f, indent=2, default=str)
    
    def _save_reports(self) -> None:
        """Salva dados de relatórios financeiros no arquivo."""
        with open(REPORTS_DATA_FILE, 'w') as f:
            json.dump(self.reports, f, indent=2, default=str)
    
    async def create_account(self, account_data: AccountCreate, user_id: str, user_name: str) -> Account:
        """
        Cria uma nova conta financeira.
        
        Args:
            account_data: Dados da conta
            user_id: ID do usuário criando a conta
            user_name: Nome do usuário criando a conta
            
        Returns:
            Account: A conta criada
        """
        # Cria uma nova conta com ID
        account = Account(
            **account_data.dict(),
            id=str(uuid.uuid4()),
            balance=account_data.initial_balance,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Adiciona à lista de contas
        self.accounts.append(account.dict())
        self._save_accounts()
        
        # Registra o evento
        await self._publish_accounts_event(
            event_type="account_created",
            account_id=account.id,
            user_id=user_id,
            data=account.dict()
        )
        
        # Registra o log
        await log_info(
            message=f"Conta financeira criada: {account.name}",
            source=LogSource.ACCOUNTS,
            module="accounts",
            user_id=user_id,
            user_name=user_name,
            details={"account_id": account.id, "account_name": account.name, "type": account.type}
        )
        
        return account
    
    async def get_account(self, account_id: str) -> Optional[Account]:
        """
        Obtém uma conta pelo ID.
        
        Args:
            account_id: ID da conta
            
        Returns:
            Account ou None: A conta se encontrada, None caso contrário
        """
        for account_data in self.accounts:
            if account_data.get("id") == account_id:
                return Account(**account_data)
        
        return None
    
    async def update_account(self, account_id: str, account_data: AccountUpdate, user_id: str, user_name: str) -> Optional[Account]:
        """
        Atualiza uma conta.
        
        Args:
            account_id: ID da conta
            account_data: Dados atualizados da conta
            user_id: ID do usuário atualizando a conta
            user_name: Nome do usuário atualizando a conta
            
        Returns:
            Account ou None: A conta atualizada se encontrada, None caso contrário
        """
        for i, account in enumerate(self.accounts):
            if account.get("id") == account_id:
                # Obtém dados atuais da conta
                current_account = Account(**account)
                
                # Atualiza com novos dados
                update_data = account_data.dict(exclude_unset=True)
                updated_account = current_account.copy(update=update_data)
                updated_account.updated_at = datetime.now()
                
                # Substitui na lista
                self.accounts[i] = updated_account.dict()
                self._save_accounts()
                
                # Registra o evento
                await self._publish_accounts_event(
                    event_type="account_updated",
                    account_id=account_id,
                    user_id=user_id,
                    data={
                        "account": updated_account.dict(),
                        "updated_fields": list(update_data.keys())
                    }
                )
                
                # Registra o log
                await log_info(
                    message=f"Conta financeira atualizada: {updated_account.name}",
                    source=LogSource.ACCOUNTS,
                    module="accounts",
                    user_id=user_id,
                    user_name=user_name,
                    details={
                        "account_id": account_id,
                        "account_name": updated_account.name,
                        "updated_fields": list(update_data.keys())
                    }
                )
                
                return updated_account
        
        return None
    
    async def list_accounts(self, account_type: Optional[AccountType] = None, is_active: Optional[bool] = None) -> List[Account]:
        """
        Lista contas com filtros opcionais.
        
        Args:
            account_type: Filtro por tipo de conta
            is_active: Filtro por status ativo
            
        Returns:
            List[Account]: Lista de contas
        """
        results = []
        
        for account_data in self.accounts:
            # Aplica filtros
            if account_type and account_data.get("type") != account_type:
                continue
            
            if is_active is not None and account_data.get("is_active", True) != is_active:
                continue
            
            results.append(Account(**account_data))
        
        # Ordena por nome
        results.sort(key=lambda a: a.name)
        
        return results
    
    async def update_account_balance(self, account_id: str, amount: float, operation: str, user_id: str, user_name: str) -> Optional[Account]:
        """
        Atualiza o saldo de uma conta.
        
        Args:
            account_id: ID da conta
            amount: Valor a ser adicionado ou subtraído
            operation: "add" para adicionar, "subtract" para subtrair
            user_id: ID do usuário atualizando o saldo
            user_name: Nome do usuário atualizando o saldo
            
        Returns:
            Account ou None: A conta atualizada se encontrada, None caso contrário
        """
        for i, account in enumerate(self.accounts):
            if account.get("id") == account_id:
                # Obtém dados atuais da conta
                current_account = Account(**account)
                
                # Atualiza o saldo
                old_balance = current_account.balance
                if operation == "add":
                    current_account.balance += amount
                elif operation == "subtract":
                    current_account.balance -= amount
                else:
                    raise ValueError(f"Operação inválida: {operation}")
                
                current_account.updated_at = datetime.now()
                
                # Substitui na lista
                self.accounts[i] = current_account.dict()
                self._save_accounts()
                
                # Registra o evento
                await self._publish_accounts_event(
                    event_type="account_balance_updated",
                    account_id=account_id,
                    user_id=user_id,
                    data={
                        "account_id": account_id,
                        "old_balance": old_balance,
                        "new_balance": current_account.balance,
                        "amount": amount,
                        "operation": operation
                    }
                )
                
                # Registra o log
                operation_desc = "adicionado a" if operation == "add" else "subtraído de"
                await log_info(
                    message=f"Saldo atualizado: {amount} {operation_desc} {current_account.name}",
                    source=LogSource.ACCOUNTS,
                    module="accounts",
                    user_id=user_id,
                    user_name=user_name,
                    details={
                        "account_id": account_id,
                        "account_name": current_account.name,
                        "old_balance": old_balance,
                        "new_balance": current_account.balance,
                        "amount": amount,
                        "operation": operation
                    }
                )
                
                return current_account
        
        return None
    
    async def create_transaction(self, transaction_data: TransactionCreate, user_id: str, user_name: str) -> Transaction:
        """
        Cria uma nova transação financeira.
        
        Args:
            transaction_data: Dados da transação
            user_id: ID do usuário criando a transação
            user_name: Nome do usuário criando a transação
            
        Returns:
            Transaction: A transação criada
        """
        # Verifica se a conta existe
        account = await self.get_account(transaction_data.account_id)
        if not account:
            raise ValueError(f"Conta não encontrada: {transaction_data.account_id}")
        
        # Cria uma nova transação com ID
        transaction = Transaction(
            **transaction_data.dict(),
            id=str(uuid.uuid4()),
            created_by=user_id,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Adiciona à lista de transações
        self.transactions.append(transaction.dict())
        self._save_transactions()
        
        # Atualiza o saldo da conta se a transação for paga
        if transaction.status == PaymentStatus.PAID:
            operation = "add" if transaction.type == TransactionType.INCOME else "subtract"
            await self.update_account_balance(
                account_id=transaction.account_id,
                amount=transaction.amount,
                operation=operation,
                user_id=user_id,
                user_name=user_name
            )
        
        # Registra o evento
        await self._publish_accounts_event(
            event_type="transaction_created",
            account_id=transaction.account_id,
            user_id=user_id,
            data=transaction.dict()
        )
        
        # Registra o log
        await log_info(
            message=f"Transação criada: {transaction.description}",
            source=LogSource.ACCOUNTS,
            module="transactions",
            user_id=user_id,
            user_name=user_name,
            details={
                "transaction_id": transaction.id,
                "account_id": transaction.account_id,
                "type": transaction.type,
                "amount": transaction.amount,
                "status": transaction.status
            }
        )
        
        return transaction
    
    async def update_transaction(self, transaction_id: str, update_data: TransactionUpdate, user_id: str, user_name: str) -> Optional[Transaction]:
        """
        Atualiza uma transação.
        
        Args:
            transaction_id: ID da transação
            update_data: Dados atualizados da transação
            user_id: ID do usuário atualizando a transação
            user_name: Nome do usuário atualizando a transação
            
        Returns:
            Transaction ou None: A transação atualizada se encontrada, None caso contrário
        """
        for i, transaction in enumerate(self.transactions):
            if transaction.get("id") == transaction_id:
                # Obtém dados atuais da transação
                current_transaction = Transaction(**transaction)
                
                # Atualiza com novos dados
                update_dict = update_data.dict(exclude_unset=True)
                
                # Lógica especial para mudança de status
                old_status = current_transaction.status
                new_status = update_dict.get("status", old_status)
                
                # Se o status mudou para PAID, atualiza o saldo da conta
                if old_status != PaymentStatus.PAID and new_status == PaymentStatus.PAID:
                    operation = "add" if current_transaction.type == TransactionType.INCOME else "subtract"
                    amount = update_dict.get("amount", current_transaction.amount)
                    
                    await self.update_account_balance(
                        account_id=current_transaction.account_id,
                        amount=amount,
                        operation=operation,
                        user_id=user_id,
                        user_name=user_name
                    )
                
                # Se o status mudou de PAID para outro, reverte o saldo
                elif old_status == PaymentStatus.PAID and new_status != PaymentStatus.PAID:
                    operation = "subtract" if current_transaction.type == TransactionType.INCOME else "add"
                    
                    await self.update_account_balance(
                        account_id=current_transaction.account_id,
                        amount=current_transaction.amount,
                        operation=operation,
                        user_id=user_id,
                        user_name=user_name
                    )
                
                updated_transaction = current_transaction.copy(update=update_dict)
                updated_transaction.updated_at = datetime.now()
                
                # Substitui na lista
                self.transactions[i] = updated_transaction.dict()
                self._save_transactions()
                
                # Registra o evento
                await self._publish_accounts_event(
                    event_type="transaction_updated",
                    account_id=updated_transaction.account_id,
                    user_id=user_id,
                    data={
                        "transaction": updated_transaction.dict(),
                        "updated_fields": list(update_dict.keys()),
                        "old_status": old_status,
                        "new_status": new_status
                    }
                )
                
                # Registra o log
                await log_info(
                    message=f"Transação atualizada: {updated_transaction.description}",
                    source=LogSource.ACCOUNTS,
                    module="transactions",
                    user_id=user_id,
                    user_name=user_name,
                    details={
                        "transaction_id": transaction_id,
                        "account_id": updated_transaction.account_id,
                        "updated_fields": list(update_dict.keys()),
                        "old_status": old_status,
                        "new_status": new_status
                    }
                )
                
                return updated_transaction
        
        return None
    
    async def get_transaction(self, transaction_id: str) -> Optional[Transaction]:
        """
        Obtém uma transação pelo ID.
        
        Args:
            transaction_id: ID da transação
            
        Returns:
            Transaction ou None: A transação se encontrada, None caso contrário
        """
        for transaction_data in self.transactions:
            if transaction_data.get("id") == transaction_id:
                return Transaction(**transaction_data)
        
        return None
    
    async def list_transactions(
        self,
        account_id: Optional[str] = None,
        transaction_type: Optional[TransactionType] = None,
        status: Optional[PaymentStatus] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        source_type: Optional[SourceType] = None,
        source_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Transaction]:
        """
        Lista transações com filtros.
        
        Args:
            account_id: Filtro por conta
            transaction_type: Filtro por tipo de transação
            status: Filtro por status
            start_date: Data inicial
            end_date: Data final
            source_type: Filtro por tipo de origem
            source_id: Filtro por ID de origem
            limit: Limite de resultados
            offset: Deslocamento para paginação
            
        Returns:
            List[Transaction]: Lista de transações
        """
        results = []
        
        for transaction_data in self.transactions:
            # Aplica filtros
            if account_id and transaction_data.get("account_id") != account_id:
                continue
            
            if transaction_type and transaction_data.get("type") != transaction_type:
                continue
            
            if status and transaction_data.get("status") != status:
                continue
            
            if source_type and transaction_data.get("source_type") != source_type:
                continue
            
            if source_id and transaction_data.get("source_id") != source_id:
                continue
            
            transaction_date = datetime.strptime(transaction_data.get("date"), "%Y-%m-%d").date() if isinstance(transaction_data.get("date"), str) else transaction_data.get("date")
            
            if start_date and transaction_date < start_date:
                continue
            
            if end_date and transaction_date > end_date:
                continue
            
            results.append(Transaction(**transaction_data))
        
        # Ordena por data (mais recente primeiro)
        results.sort(key=lambda t: t.date, reverse=True)
        
        # Aplica paginação
        paginated_results = results[offset:offset + limit]
        
        return paginated_results
    
    async def create_receivable(self, receivable_data: ReceivableCreate, user_id: str, user_name: str) -> Receivable:
        """
        Cria uma nova conta a receber.
        
        Args:
            receivable_data: Dados da conta a receber
            user_id: ID do usuário criando a conta a receber
            user_name: Nome do usuário criando a conta a receber
            
        Returns:
            Receivable: A conta a receber criada
        """
        # Cria uma nova conta a receber com ID
        receivable = Receivable(
            **receivable_data.dict(),
            id=str(uuid.uuid4()),
            created_by=user_id,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Adiciona à lista de contas a receber
        self.receivables.append(receivable.dict())
        self._save_receivables()
        
        # Registra o evento
        await self._publish_accounts_event(
            event_type="receivable_created",
            account_id=None,
            user_id=user_id,
            data=receivable.dict()
        )
        
        # Registra o log
        await log_info(
            message=f"Conta a receber criada: {receivable.description}",
            source=LogSource.ACCOUNTS,
            module="receivables",
            user_id=user_id,
            user_name=user_name,
            details={
                "receivable_id": receivable.id,
                "customer_id": receivable.customer_id,
                "amount": receivable.amount,
                "due_date": str(receivable.due_date),
                "status": receivable.status
            }
        )
        
        return receivable
    
    async def update_receivable(self, receivable_id: str, update_data: ReceivableUpdate, user_id: str, user_name: str) -> Optional[Receivable]:
        """
        Atualiza uma conta a receber.
        
        Args:
            receivable_id: ID da conta a receber
            update_data: Dados atualizados da conta a receber
            user_id: ID do usuário atualizando a conta a receber
            user_name: Nome do usuário atualizando a conta a receber
            
        Returns:
            Receivable ou None: A conta a receber atualizada se encontrada, None caso contrário
        """
        for i, receivable in enumerate(self.receivables):
            if receivable.get("id") == receivable_id:
                # Obtém dados atuais da conta a receber
                current_receivable = Receivable(**receivable)
                
                # Atualiza com novos dados
                update_dict = update_data.dict(exclude_unset=True)
                
                # Lógica especial para mudança de status
                old_status = current_receivable.status
                new_status = update_dict.get("status", old_status)
                
                # Se o status mudou para PAID, cria uma transação
                if old_status != PaymentStatus.PAID and new_status == PaymentStatus.PAID:
                    # Verifica se há uma conta padrão para recebimentos
                    default_accounts = await self.list_accounts(account_type=AccountType.CASH)
                    if not default_accounts:
                        default_accounts = await self.list_accounts(account_type=AccountType.BANK)
                    
                    if default_accounts:
                        default_account = default_accounts[0]
                        
                        # Cria uma transação para o recebimento
                        payment_amount = update_dict.get("payment_amount", current_receivable.amount)
                        payment_date = update_dict.get("payment_date", date.today())
                        
                        try:
                            await self.create_transaction(
                                transaction_data=TransactionCreate(
                                    account_id=default_account.id,
                                    type=TransactionType.INCOME,
                                    amount=payment_amount,
                                    description=f"Recebimento: {current_receivable.description}",
                                    date=payment_date,
                                    status=PaymentStatus.PAID,
                                    payment_date=payment_date,
                                    category="Recebimentos",
                                    reference=current_receivable.reference,
                                    source_type=SourceType.ORDER if current_receivable.source_type == SourceType.ORDER else SourceType.MANUAL,
                                    source_id=current_receivable.source_id,
                                    created_by=user_id
                                ),
                                user_id=user_id,
                                user_name=user_name
                            )
                        except Exception as e:
                            await log_error(
                                message=f"Erro ao criar transação para recebimento: {str(e)}",
                                source=LogSource.ACCOUNTS,
                                module="receivables",
                                details={
                                    "receivable_id": receivable_id,
                                    "error": str(e)
                                }
                            )
                
                updated_receivable = current_receivable.copy(update=update_dict)
                updated_receivable.updated_at = datetime.now()
                
                # Substitui na lista
                self.receivables[i] = updated_receivable.dict()
                self._save_receivables()
                
                # Registra o evento
                event_type = "receivable_updated"
                if old_status != PaymentStatus.PAID and new_status == PaymentStatus.PAID:
                    event_type = "receivable_paid"
                
                await self._publish_accounts_event(
                    event_type=event_type,
                    account_id=None,
                    user_id=user_id,
                    data={
                        "receivable": updated_receivable.dict(),
                        "updated_fields": list(update_dict.keys()),
                        "old_status": old_status,
                        "new_status": new_status
                    }
                )
                
                # Registra o log
                status_desc = {
                    PaymentStatus.PENDING: "pendente",
                    PaymentStatus.PAID: "paga",
                    PaymentStatus.PARTIALLY_PAID: "parcialmente paga",
                    PaymentStatus.OVERDUE: "atrasada",
                    PaymentStatus.CANCELLED: "cancelada"
                }.get(new_status, str(new_status))
                
                await log_info(
                    message=f"Conta a receber atualizada: {updated_receivable.description} ({status_desc})",
                    source=LogSource.ACCOUNTS,
                    module="receivables",
                    user_id=user_id,
                    user_name=user_name,
                    details={
                        "receivable_id": receivable_id,
                        "updated_fields": list(update_dict.keys()),
                        "old_status": old_status,
                        "new_status": new_status
                    }
                )
                
                return updated_receivable
        
        return None
    
    async def get_receivable(self, receivable_id: str) -> Optional[Receivable]:
        """
        Obtém uma conta a receber pelo ID.
        
        Args:
            receivable_id: ID da conta a receber
            
        Returns:
            Receivable ou None: A conta a receber se encontrada, None caso contrário
        """
        for receivable_data in self.receivables:
            if receivable_data.get("id") == receivable_id:
                return Receivable(**receivable_data)
        
        return None
    
    async def list_receivables(
        self,
        customer_id: Optional[str] = None,
        status: Optional[PaymentStatus] = None,
        start_due_date: Optional[date] = None,
        end_due_date: Optional[date] = None,
        source_type: Optional[SourceType] = None,
        source_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Receivable]:
        """
        Lista contas a receber com filtros.
        
        Args:
            customer_id: Filtro por cliente
            status: Filtro por status
            start_due_date: Data de vencimento inicial
            end_due_date: Data de vencimento final
            source_type: Filtro por tipo de origem
            source_id: Filtro por ID de origem
            limit: Limite de resultados
            offset: Deslocamento para paginação
            
        Returns:
            List[Receivable]: Lista de contas a receber
        """
        results = []
        
        for receivable_data in self.receivables:
            # Aplica filtros
            if customer_id and receivable_data.get("customer_id") != customer_id:
                continue
            
            if status and receivable_data.get("status") != status:
                continue
            
            if source_type and receivable_data.get("source_type") != source_type:
                continue
            
            if source_id and receivable_data.get("source_id") != source_id:
                continue
            
            due_date = datetime.strptime(receivable_data.get("due_date"), "%Y-%m-%d").date() if isinstance(receivable_data.get("due_date"), str) else receivable_data.get("due_date")
            
            if start_due_date and due_date < start_due_date:
                continue
            
            if end_due_date and due_date > end_due_date:
                continue
            
            results.append(Receivable(**receivable_data))
        
        # Ordena por data de vencimento (mais próxima primeiro)
        results.sort(key=lambda r: r.due_date)
        
        # Aplica paginação
        paginated_results = results[offset:offset + limit]
        
        return paginated_results
    
    async def create_payable(self, payable_data: PayableCreate, user_id: str, user_name: str) -> Payable:
        """
        Cria uma nova conta a pagar.
        
        Args:
            payable_data: Dados da conta a pagar
            user_id: ID do usuário criando a conta a pagar
            user_name: Nome do usuário criando a conta a pagar
            
        Returns:
            Payable: A conta a pagar criada
        """
        # Cria uma nova conta a pagar com ID
        payable = Payable(
            **payable_data.dict(),
            id=str(uuid.uuid4()),
            created_by=user_id,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Adiciona à lista de contas a pagar
        self.payables.append(payable.dict())
        self._save_payables()
        
        # Registra o evento
        await self._publish_accounts_event(
            event_type="payable_created",
            account_id=None,
            user_id=user_id,
            data=payable.dict()
        )
        
        # Registra o log
        await log_info(
            message=f"Conta a pagar criada: {payable.description}",
            source=LogSource.ACCOUNTS,
            module="payables",
            user_id=user_id,
            user_name=user_name,
            details={
                "payable_id": payable.id,
                "supplier_id": payable.supplier_id,
                "employee_id": payable.employee_id,
                "amount": payable.amount,
                "due_date": str(payable.due_date),
                "status": payable.status
            }
        )
        
        return payable
    
    async def create_payable_for_employee(
        self,
        employee_id: str,
        amount: float,
        description: str,
        reference: str,
        due_date: date,
        created_by: str
    ) -> str:
        """
        Cria uma conta a pagar para um funcionário.
        
        Args:
            employee_id: ID do funcionário
            amount: Valor a pagar
            description: Descrição do pagamento
            reference: Referência do pagamento
            due_date: Data de vencimento
            created_by: ID do usuário criando a conta a pagar
            
        Returns:
            str: ID da conta a pagar criada
        """
        payable = await self.create_payable(
            payable_data=PayableCreate(
                employee_id=employee_id,
                description=description,
                amount=amount,
                issue_date=date.today(),
                due_date=due_date,
                status=PaymentStatus.PENDING,
                reference=reference,
                source_type=SourceType.EMPLOYEE,
                source_id=employee_id,
                notes=f"Pagamento automático para funcionário ID {employee_id}",
                attachments=[],
                created_by=created_by
            ),
            user_id=created_by,
            user_name="Sistema"
        )
        
        return payable.id
    
    async def update_payable(self, payable_id: str, update_data: PayableUpdate, user_id: str, user_name: str) -> Optional[Payable]:
        """
        Atualiza uma conta a pagar.
        
        Args:
            payable_id: ID da conta a pagar
            update_data: Dados atualizados da conta a pagar
            user_id: ID do usuário atualizando a conta a pagar
            user_name: Nome do usuário atualizando a conta a pagar
            
        Returns:
            Payable ou None: A conta a pagar atualizada se encontrada, None caso contrário
        """
        for i, payable in enumerate(self.payables):
            if payable.get("id") == payable_id:
                # Obtém dados atuais da conta a pagar
                current_payable = Payable(**payable)
                
                # Atualiza com novos dados
                update_dict = update_data.dict(exclude_unset=True)
                
                # Lógica especial para mudança de status
                old_status = current_payable.status
                new_status = update_dict.get("status", old_status)
                
                # Se o status mudou para PAID, cria uma transação
                if old_status != PaymentStatus.PAID and new_status == PaymentStatus.PAID:
                    # Verifica se há uma conta padrão para pagamentos
                    default_accounts = await self.list_accounts(account_type=AccountType.CASH)
                    if not default_accounts:
                        default_accounts = await self.list_accounts(account_type=AccountType.BANK)
                    
                    if default_accounts:
                        default_account = default_accounts[0]
                        
                        # Cria uma transação para o pagamento
                        payment_amount = update_dict.get("payment_amount", current_payable.amount)
                        payment_date = update_dict.get("payment_date", date.today())
                        
                        try:
                            await self.create_transaction(
                                transaction_data=TransactionCreate(
                                    account_id=default_account.id,
                                    type=TransactionType.EXPENSE,
                                    amount=payment_amount,
                                    description=f"Pagamento: {current_payable.description}",
                                    date=payment_date,
                                    status=PaymentStatus.PAID,
                                    payment_date=payment_date,
                                    category="Pagamentos",
                                    reference=current_payable.reference,
                                    source_type=current_payable.source_type,
                                    source_id=current_payable.source_id,
                                    created_by=user_id
                                ),
                                user_id=user_id,
                                user_name=user_name
                            )
                        except Exception as e:
                            await log_error(
                                message=f"Erro ao criar transação para pagamento: {str(e)}",
                                source=LogSource.ACCOUNTS,
                                module="payables",
                                details={
                                    "payable_id": payable_id,
                                    "error": str(e)
                                }
                            )
                
                updated_payable = current_payable.copy(update=update_dict)
                updated_payable.updated_at = datetime.now()
                
                # Substitui na lista
                self.payables[i] = updated_payable.dict()
                self._save_payables()
                
                # Registra o evento
                event_type = "payable_updated"
                if old_status != PaymentStatus.PAID and new_status == PaymentStatus.PAID:
                    event_type = "payable_paid"
                
                await self._publish_accounts_event(
                    event_type=event_type,
                    account_id=None,
                    user_id=user_id,
                    data={
                        "payable": updated_payable.dict(),
                        "updated_fields": list(update_dict.keys()),
                        "old_status": old_status,
                        "new_status": new_status
                    }
                )
                
                # Registra o log
                status_desc = {
                    PaymentStatus.PENDING: "pendente",
                    PaymentStatus.PAID: "paga",
                    PaymentStatus.PARTIALLY_PAID: "parcialmente paga",
                    PaymentStatus.OVERDUE: "atrasada",
                    PaymentStatus.CANCELLED: "cancelada"
                }.get(new_status, str(new_status))
                
                await log_info(
                    message=f"Conta a pagar atualizada: {updated_payable.description} ({status_desc})",
                    source=LogSource.ACCOUNTS,
                    module="payables",
                    user_id=user_id,
                    user_name=user_name,
                    details={
                        "payable_id": payable_id,
                        "updated_fields": list(update_dict.keys()),
                        "old_status": old_status,
                        "new_status": new_status
                    }
                )
                
                return updated_payable
        
        return None
    
    async def get_payable(self, payable_id: str) -> Optional[Payable]:
        """
        Obtém uma conta a pagar pelo ID.
        
        Args:
            payable_id: ID da conta a pagar
            
        Returns:
            Payable ou None: A conta a pagar se encontrada, None caso contrário
        """
        for payable_data in self.payables:
            if payable_data.get("id") == payable_id:
                return Payable(**payable_data)
        
        return None
    
    async def list_payables(
        self,
        supplier_id: Optional[str] = None,
        employee_id: Optional[str] = None,
        status: Optional[PaymentStatus] = None,
        start_due_date: Optional[date] = None,
        end_due_date: Optional[date] = None,
        source_type: Optional[SourceType] = None,
        source_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Payable]:
        """
        Lista contas a pagar com filtros.
        
        Args:
            supplier_id: Filtro por fornecedor
            employee_id: Filtro por funcionário
            status: Filtro por status
            start_due_date: Data de vencimento inicial
            end_due_date: Data de vencimento final
            source_type: Filtro por tipo de origem
            source_id: Filtro por ID de origem
            limit: Limite de resultados
            offset: Deslocamento para paginação
            
        Returns:
            List[Payable]: Lista de contas a pagar
        """
        results = []
        
        for payable_data in self.payables:
            # Aplica filtros
            if supplier_id and payable_data.get("supplier_id") != supplier_id:
                continue
            
            if employee_id and payable_data.get("employee_id") != employee_id:
                continue
            
            if status and payable_data.get("status") != status:
                continue
            
            if source_type and payable_data.get("source_type") != source_type:
                continue
            
            if source_id and payable_data.get("source_id") != source_id:
                continue
            
            due_date = datetime.strptime(payable_data.get("due_date"), "%Y-%m-%d").date() if isinstance(payable_data.get("due_date"), str) else payable_data.get("due_date")
            
            if start_due_date and due_date < start_due_date:
                continue
            
            if end_due_date and due_date > end_due_date:
                continue
            
            results.append(Payable(**payable_data))
        
        # Ordena por data de vencimento (mais próxima primeiro)
        results.sort(key=lambda p: p.due_date)
        
        # Aplica paginação
        paginated_results = results[offset:offset + limit]
        
        return paginated_results
    
    async def create_receivable_from_order(
        self,
        order_id: str,
        customer_id: Optional[str],
        amount: float,
        description: str,
        issue_date: date,
        due_date: date,
        status: PaymentStatus,
        payment_method: Optional[str] = None,
        created_by: str = "system"
    ) -> str:
        """
        Cria uma conta a receber a partir de um pedido.
        
        Args:
            order_id: ID do pedido
            customer_id: ID do cliente
            amount: Valor a receber
            description: Descrição do recebimento
            issue_date: Data de emissão
            due_date: Data de vencimento
            status: Status inicial
            payment_method: Método de pagamento
            created_by: ID do usuário criando a conta a receber
            
        Returns:
            str: ID da conta a receber criada
        """
        receivable = await self.create_receivable(
            receivable_data=ReceivableCreate(
                customer_id=customer_id,
                description=description,
                amount=amount,
                issue_date=issue_date,
                due_date=due_date,
                status=status,
                reference=f"ORDER-{order_id}",
                source_type=SourceType.ORDER,
                source_id=order_id,
                notes=f"Gerado automaticamente a partir do pedido {order_id}",
                attachments=[],
                created_by=created_by
            ),
            user_id=created_by,
            user_name="Sistema"
        )
        
        # Se já estiver pago, registra o pagamento
        if status == PaymentStatus.PAID:
            await self.update_receivable(
                receivable_id=receivable.id,
                update_data=ReceivableUpdate(
                    status=PaymentStatus.PAID,
                    payment_date=issue_date,
                    payment_amount=amount,
                    payment_method=payment_method
                ),
                user_id=created_by,
                user_name="Sistema"
            )
        
        return receivable.id
    
    async def create_payable_from_purchase(
        self,
        purchase_id: str,
        supplier_id: str,
        amount: float,
        description: str,
        issue_date: date,
        due_date: date,
        created_by: str = "system"
    ) -> str:
        """
        Cria uma conta a pagar a partir de uma compra.
        
        Args:
            purchase_id: ID da compra
            supplier_id: ID do fornecedor
            amount: Valor a pagar
            description: Descrição do pagamento
            issue_date: Data de emissão
            due_date: Data de vencimento
            created_by: ID do usuário criando a conta a pagar
            
        Returns:
            str: ID da conta a pagar criada
        """
        payable = await self.create_payable(
            payable_data=PayableCreate(
                supplier_id=supplier_id,
                description=description,
                amount=amount,
                issue_date=issue_date,
                due_date=due_date,
                status=PaymentStatus.PENDING,
                reference=f"PURCHASE-{purchase_id}",
                source_type=SourceType.SUPPLIER,
                source_id=purchase_id,
                notes=f"Gerado automaticamente a partir da compra {purchase_id}",
                attachments=[],
                created_by=created_by
            ),
            user_id=created_by,
            user_name="Sistema"
        )
        
        return payable.id
    
    async def create_recurring_transaction(self, transaction_data: RecurringTransactionCreate, user_id: str, user_name: str) -> RecurringTransaction:
        """
        Cria uma nova transação recorrente.
        
        Args:
            transaction_data: Dados da transação recorrente
            user_id: ID do usuário criando a transação recorrente
            user_name: Nome do usuário criando a transação recorrente
            
        Returns:
            RecurringTransaction: A transação recorrente criada
        """
        # Verifica se a conta existe
        account = await self.get_account(transaction_data.account_id)
        if not account:
            raise ValueError(f"Conta não encontrada: {transaction_data.account_id}")
        
        # Cria uma nova transação recorrente com ID
        transaction = RecurringTransaction(
            **transaction_data.dict(),
            id=str(uuid.uuid4()),
            created_by=user_id,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Adiciona à lista de transações recorrentes
        self.recurring_transactions.append(transaction.dict())
        self._save_recurring_transactions()
        
        # Registra o evento
        await self._publish_accounts_event(
            event_type="recurring_transaction_created",
            account_id=transaction.account_id,
            user_id=user_id,
            data=transaction.dict()
        )
        
        # Registra o log
        await log_info(
            message=f"Transação recorrente criada: {transaction.description}",
            source=LogSource.ACCOUNTS,
            module="recurring_transactions",
            user_id=user_id,
            user_name=user_name,
            details={
                "transaction_id": transaction.id,
                "account_id": transaction.account_id,
                "type": transaction.type,
                "amount": transaction.amount,
                "recurrence_type": transaction.recurrence_type
            }
        )
        
        return transaction
    
    async def update_recurring_transaction(self, transaction_id: str, update_data: RecurringTransactionUpdate, user_id: str, user_name: str) -> Optional[RecurringTransaction]:
        """
        Atualiza uma transação recorrente.
        
        Args:
            transaction_id: ID da transação recorrente
            update_data: Dados atualizados da transação recorrente
            user_id: ID do usuário atualizando a transação recorrente
            user_name: Nome do usuário atualizando a transação recorrente
            
        Returns:
            RecurringTransaction ou None: A transação recorrente atualizada se encontrada, None caso contrário
        """
        for i, transaction in enumerate(self.recurring_transactions):
            if transaction.get("id") == transaction_id:
                # Obtém dados atuais da transação recorrente
                current_transaction = RecurringTransaction(**transaction)
                
                # Atualiza com novos dados
                update_dict = update_data.dict(exclude_unset=True)
                updated_transaction = current_transaction.copy(update=update_dict)
                updated_transaction.updated_at = datetime.now()
                
                # Substitui na lista
                self.recurring_transactions[i] = updated_transaction.dict()
                self._save_recurring_transactions()
                
                # Registra o evento
                await self._publish_accounts_event(
                    event_type="recurring_transaction_updated",
                    account_id=updated_transaction.account_id,
                    user_id=user_id,
                    data={
                        "transaction": updated_transaction.dict(),
                        "updated_fields": list(update_dict.keys())
                    }
                )
                
                # Registra o log
                await log_info(
                    message=f"Transação recorrente atualizada: {updated_transaction.description}",
                    source=LogSource.ACCOUNTS,
                    module="recurring_transactions",
                    user_id=user_id,
                    user_name=user_name,
                    details={
                        "transaction_id": transaction_id,
                        "account_id": updated_transaction.account_id,
                        "updated_fields": list(update_dict.keys())
                    }
                )
                
                return updated_transaction
        
        return None
    
    async def get_recurring_transaction(self, transaction_id: str) -> Optional[RecurringTransaction]:
        """
        Obtém uma transação recorrente pelo ID.
        
        Args:
            transaction_id: ID da transação recorrente
            
        Returns:
            RecurringTransaction ou None: A transação recorrente se encontrada, None caso contrário
        """
        for transaction_data in self.recurring_transactions:
            if transaction_data.get("id") == transaction_id:
                return RecurringTransaction(**transaction_data)
        
        return None
    
    async def list_recurring_transactions(
        self,
        account_id: Optional[str] = None,
        transaction_type: Optional[TransactionType] = None,
        is_active: Optional[bool] = None
    ) -> List[RecurringTransaction]:
        """
        Lista transações recorrentes com filtros.
        
        Args:
            account_id: Filtro por conta
            transaction_type: Filtro por tipo de transação
            is_active: Filtro por status ativo
            
        Returns:
            List[RecurringTransaction]: Lista de transações recorrentes
        """
        results = []
        
        for transaction_data in self.recurring_transactions:
            # Aplica filtros
            if account_id and transaction_data.get("account_id") != account_id:
                continue
            
            if transaction_type and transaction_data.get("type") != transaction_type:
                continue
            
            if is_active is not None and transaction_data.get("is_active", True) != is_active:
                continue
            
            results.append(RecurringTransaction(**transaction_data))
        
        # Ordena por data de início
        results.sort(key=lambda t: t.start_date)
        
        return results
    
    async def process_recurring_transactions(self, current_date: date = None) -> List[str]:
        """
        Processa transações recorrentes, gerando transações para a data atual.
        
        Args:
            current_date: Data atual (padrão: hoje)
            
        Returns:
            List[str]: Lista de IDs das transações geradas
        """
        if current_date is None:
            current_date = date.today()
        
        generated_transaction_ids = []
        
        # Obtém transações recorrentes ativas
        active_transactions = await self.list_recurring_transactions(is_active=True)
        
        for recurring in active_transactions:
            # Verifica se a transação recorrente está dentro do período válido
            if recurring.start_date > current_date:
                continue
            
            if recurring.end_date and recurring.end_date < current_date:
                continue
            
            # Verifica se já foi gerada para o período atual
            if recurring.last_generated:
                last_generated = recurring.last_generated if isinstance(recurring.last_generated, date) else datetime.strptime(recurring.last_generated, "%Y-%m-%d").date()
                
                # Verifica se já foi gerada para o período atual com base no tipo de recorrência
                if recurring.recurrence_type == "daily" and last_generated >= current_date:
                    continue
                elif recurring.recurrence_type == "weekly":
                    days_since_last = (current_date - last_generated).days
                    if days_since_last < 7:
                        continue
                elif recurring.recurrence_type == "biweekly":
                    days_since_last = (current_date - last_generated).days
                    if days_since_last < 14:
                        continue
                elif recurring.recurrence_type == "monthly":
                    # Verifica se estamos no mesmo mês
                    if last_generated.year == current_date.year and last_generated.month == current_date.month:
                        continue
                    
                    # Verifica se é o dia correto do mês
                    if recurring.day_of_month and current_date.day != recurring.day_of_month:
                        continue
                elif recurring.recurrence_type == "quarterly":
                    # Verifica se passaram 3 meses
                    months_diff = (current_date.year - last_generated.year) * 12 + current_date.month - last_generated.month
                    if months_diff < 3:
                        continue
                    
                    # Verifica se é o dia correto do mês
                    if recurring.day_of_month and current_date.day != recurring.day_of_month:
                        continue
                elif recurring.recurrence_type == "semiannual":
                    # Verifica se passaram 6 meses
                    months_diff = (current_date.year - last_generated.year) * 12 + current_date.month - last_generated.month
                    if months_diff < 6:
                        continue
                    
                    # Verifica se é o dia correto do mês
                    if recurring.day_of_month and current_date.day != recurring.day_of_month:
                        continue
                elif recurring.recurrence_type == "annual":
                    # Verifica se passaram 12 meses
                    months_diff = (current_date.year - last_generated.year) * 12 + current_date.month - last_generated.month
                    if months_diff < 12:
                        continue
                    
                    # Verifica se é o dia correto do mês
                    if recurring.day_of_month and current_date.day != recurring.day_of_month:
                        continue
            
            # Verifica se é o dia correto da semana (para recorrências semanais)
            if recurring.recurrence_type in ["weekly", "biweekly"] and recurring.day_of_week is not None:
                if current_date.weekday() != recurring.day_of_week:
                    continue
            
            # Gera a transação
            try:
                transaction = await self.create_transaction(
                    transaction_data=TransactionCreate(
                        account_id=recurring.account_id,
                        type=recurring.type,
                        amount=recurring.amount,
                        description=recurring.description,
                        date=current_date,
                        status=PaymentStatus.PENDING,
                        category=recurring.category,
                        source_type=recurring.source_type,
                        source_id=recurring.source_id,
                        reference=f"RECURRING-{recurring.id}",
                        notes=f"Gerado automaticamente da transação recorrente {recurring.id}",
                        created_by=recurring.created_by
                    ),
                    user_id=recurring.created_by,
                    user_name="Sistema"
                )
                
                generated_transaction_ids.append(transaction.id)
                
                # Atualiza a data da última geração
                await self.update_recurring_transaction(
                    transaction_id=recurring.id,
                    update_data=RecurringTransactionUpdate(
                        last_generated=current_date
                    ),
                    user_id=recurring.created_by,
                    user_name="Sistema"
                )
            except Exception as e:
                await log_error(
                    message=f"Erro ao gerar transação recorrente: {str(e)}",
                    source=LogSource.ACCOUNTS,
                    module="recurring_transactions",
                    details={
                        "recurring_id": recurring.id,
                        "error": str(e)
                    }
                )
        
        return generated_transaction_ids
    
    async def create_financial_report(self, report_data: FinancialReportCreate, user_id: str, user_name: str) -> FinancialReport:
        """
        Cria um novo relatório financeiro.
        
        Args:
            report_data: Dados do relatório
            user_id: ID do usuário criando o relatório
            user_name: Nome do usuário criando o relatório
            
        Returns:
            FinancialReport: O relatório criado
        """
        # Gera os dados do relatório com base no tipo
        report_data_dict = await self._generate_report_data(
            report_type=report_data.type,
            start_date=report_data.start_date,
            end_date=report_data.end_date
        )
        
        # Cria um novo relatório com ID
        report = FinancialReport(
            **report_data.dict(),
            id=str(uuid.uuid4()),
            data=report_data_dict,
            created_by=user_id,
            created_at=datetime.now()
        )
        
        # Adiciona à lista de relatórios
        self.reports.append(report.dict())
        self._save_reports()
        
        # Registra o log
        await log_info(
            message=f"Relatório financeiro criado: {report.type}",
            source=LogSource.ACCOUNTS,
            module="reports",
            user_id=user_id,
            user_name=user_name,
            details={
                "report_id": report.id,
                "type": report.type,
                "start_date": str(report.start_date),
                "end_date": str(report.end_date)
            }
        )
        
        return report
    
    async def _generate_report_data(self, report_type: str, start_date: date, end_date: date) -> Dict[str, Any]:
        """
        Gera dados para um relatório financeiro.
        
        Args:
            report_type: Tipo do relatório
            start_date: Data inicial
            end_date: Data final
            
        Returns:
            Dict[str, Any]: Dados do relatório
        """
        if report_type == "cash_flow":
            return await self._generate_cash_flow_report(start_date, end_date)
        elif report_type == "receivables":
            return await self._generate_receivables_report(start_date, end_date)
        elif report_type == "payables":
            return await self._generate_payables_report(start_date, end_date)
        elif report_type == "income_statement":
            return await self._generate_income_statement_report(start_date, end_date)
        else:
            raise ValueError(f"Tipo de relatório não suportado: {report_type}")
    
    async def _generate_cash_flow_report(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """
        Gera dados para um relatório de fluxo de caixa.
        
        Args:
            start_date: Data inicial
            end_date: Data final
            
        Returns:
            Dict[str, Any]: Dados do relatório
        """
        # Obtém transações no período
        transactions = await self.list_transactions(
            start_date=start_date,
            end_date=end_date,
            status=PaymentStatus.PAID
        )
        
        # Agrupa por data e tipo
        daily_flow = {}
        for transaction in transactions:
            transaction_date = transaction.date.isoformat()
            
            if transaction_date not in daily_flow:
                daily_flow[transaction_date] = {
                    "income": 0.0,
                    "expense": 0.0,
                    "balance": 0.0
                }
            
            if transaction.type == TransactionType.INCOME:
                daily_flow[transaction_date]["income"] += transaction.amount
            elif transaction.type == TransactionType.EXPENSE:
                daily_flow[transaction_date]["expense"] += transaction.amount
            
            daily_flow[transaction_date]["balance"] = daily_flow[transaction_date]["income"] - daily_flow[transaction_date]["expense"]
        
        # Calcula totais
        total_income = sum(day["income"] for day in daily_flow.values())
        total_expense = sum(day["expense"] for day in daily_flow.values())
        total_balance = total_income - total_expense
        
        # Obtém saldos das contas
        accounts = await self.list_accounts(is_active=True)
        account_balances = {account.name: account.balance for account in accounts}
        total_account_balance = sum(account.balance for account in accounts)
        
        return {
            "daily_flow": daily_flow,
            "summary": {
                "total_income": total_income,
                "total_expense": total_expense,
                "total_balance": total_balance
            },
            "accounts": account_balances,
            "total_account_balance": total_account_balance
        }
    
    async def _generate_receivables_report(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """
        Gera dados para um relatório de contas a receber.
        
        Args:
            start_date: Data inicial
            end_date: Data final
            
        Returns:
            Dict[str, Any]: Dados do relatório
        """
        # Obtém contas a receber no período
        receivables = await self.list_receivables(
            start_due_date=start_date,
            end_due_date=end_date
        )
        
        # Agrupa por status
        by_status = {
            "pending": [],
            "paid": [],
            "partially_paid": [],
            "overdue": [],
            "cancelled": []
        }
        
        for receivable in receivables:
            if receivable.status == PaymentStatus.PENDING:
                if receivable.due_date < date.today():
                    by_status["overdue"].append(receivable.dict())
                else:
                    by_status["pending"].append(receivable.dict())
            elif receivable.status == PaymentStatus.PAID:
                by_status["paid"].append(receivable.dict())
            elif receivable.status == PaymentStatus.PARTIALLY_PAID:
                by_status["partially_paid"].append(receivable.dict())
            elif receivable.status == PaymentStatus.CANCELLED:
                by_status["cancelled"].append(receivable.dict())
        
        # Calcula totais
        total_pending = sum(r["amount"] for r in by_status["pending"])
        total_paid = sum(r["amount"] for r in by_status["paid"])
        total_partially_paid = sum(r["amount"] for r in by_status["partially_paid"])
        total_overdue = sum(r["amount"] for r in by_status["overdue"])
        
        # Agrupa por cliente
        by_customer = {}
        for receivable in receivables:
            customer_id = receivable.customer_id or "unknown"
            
            if customer_id not in by_customer:
                by_customer[customer_id] = {
                    "total": 0.0,
                    "pending": 0.0,
                    "paid": 0.0,
                    "overdue": 0.0
                }
            
            by_customer[customer_id]["total"] += receivable.amount
            
            if receivable.status == PaymentStatus.PENDING:
                if receivable.due_date < date.today():
                    by_customer[customer_id]["overdue"] += receivable.amount
                else:
                    by_customer[customer_id]["pending"] += receivable.amount
            elif receivable.status == PaymentStatus.PAID:
                by_customer[customer_id]["paid"] += receivable.amount
        
        return {
            "by_status": by_status,
            "by_customer": by_customer,
            "summary": {
                "total_pending": total_pending,
                "total_paid": total_paid,
                "total_partially_paid": total_partially_paid,
                "total_overdue": total_overdue,
                "total_receivables": total_pending + total_partially_paid + total_overdue
            }
        }
    
    async def _generate_payables_report(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """
        Gera dados para um relatório de contas a pagar.
        
        Args:
            start_date: Data inicial
            end_date: Data final
            
        Returns:
            Dict[str, Any]: Dados do relatório
        """
        # Obtém contas a pagar no período
        payables = await self.list_payables(
            start_due_date=start_date,
            end_due_date=end_date
        )
        
        # Agrupa por status
        by_status = {
            "pending": [],
            "paid": [],
            "partially_paid": [],
            "overdue": [],
            "cancelled": []
        }
        
        for payable in payables:
            if payable.status == PaymentStatus.PENDING:
                if payable.due_date < date.today():
                    by_status["overdue"].append(payable.dict())
                else:
                    by_status["pending"].append(payable.dict())
            elif payable.status == PaymentStatus.PAID:
                by_status["paid"].append(payable.dict())
            elif payable.status == PaymentStatus.PARTIALLY_PAID:
                by_status["partially_paid"].append(payable.dict())
            elif payable.status == PaymentStatus.CANCELLED:
                by_status["cancelled"].append(payable.dict())
        
        # Calcula totais
        total_pending = sum(p["amount"] for p in by_status["pending"])
        total_paid = sum(p["amount"] for p in by_status["paid"])
        total_partially_paid = sum(p["amount"] for p in by_status["partially_paid"])
        total_overdue = sum(p["amount"] for p in by_status["overdue"])
        
        # Agrupa por fornecedor
        by_supplier = {}
        for payable in payables:
            if payable.supplier_id:
                supplier_id = payable.supplier_id
                
                if supplier_id not in by_supplier:
                    by_supplier[supplier_id] = {
                        "total": 0.0,
                        "pending": 0.0,
                        "paid": 0.0,
                        "overdue": 0.0
                    }
                
                by_supplier[supplier_id]["total"] += payable.amount
                
                if payable.status == PaymentStatus.PENDING:
                    if payable.due_date < date.today():
                        by_supplier[supplier_id]["overdue"] += payable.amount
                    else:
                        by_supplier[supplier_id]["pending"] += payable.amount
                elif payable.status == PaymentStatus.PAID:
                    by_supplier[supplier_id]["paid"] += payable.amount
        
        # Agrupa por funcionário
        by_employee = {}
        for payable in payables:
            if payable.employee_id:
                employee_id = payable.employee_id
                
                if employee_id not in by_employee:
                    by_employee[employee_id] = {
                        "total": 0.0,
                        "pending": 0.0,
                        "paid": 0.0,
                        "overdue": 0.0
                    }
                
                by_employee[employee_id]["total"] += payable.amount
                
                if payable.status == PaymentStatus.PENDING:
                    if payable.due_date < date.today():
                        by_employee[employee_id]["overdue"] += payable.amount
                    else:
                        by_employee[employee_id]["pending"] += payable.amount
                elif payable.status == PaymentStatus.PAID:
                    by_employee[employee_id]["paid"] += payable.amount
        
        return {
            "by_status": by_status,
            "by_supplier": by_supplier,
            "by_employee": by_employee,
            "summary": {
                "total_pending": total_pending,
                "total_paid": total_paid,
                "total_partially_paid": total_partially_paid,
                "total_overdue": total_overdue,
                "total_payables": total_pending + total_partially_paid + total_overdue
            }
        }
    
    async def _generate_income_statement_report(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """
        Gera dados para um relatório de demonstrativo de resultados.
        
        Args:
            start_date: Data inicial
            end_date: Data final
            
        Returns:
            Dict[str, Any]: Dados do relatório
        """
        # Obtém transações no período
        transactions = await self.list_transactions(
            start_date=start_date,
            end_date=end_date,
            status=PaymentStatus.PAID
        )
        
        # Agrupa por categoria
        income_by_category = {}
        expense_by_category = {}
        
        for transaction in transactions:
            category = transaction.category or "Sem categoria"
            
            if transaction.type == TransactionType.INCOME:
                if category not in income_by_category:
                    income_by_category[category] = 0.0
                
                income_by_category[category] += transaction.amount
            elif transaction.type == TransactionType.EXPENSE:
                if category not in expense_by_category:
                    expense_by_category[category] = 0.0
                
                expense_by_category[category] += transaction.amount
        
        # Calcula totais
        total_income = sum(income_by_category.values())
        total_expense = sum(expense_by_category.values())
        net_result = total_income - total_expense
        
        # Calcula percentuais
        income_percentage = {}
        for category, amount in income_by_category.items():
            income_percentage[category] = (amount / total_income * 100) if total_income > 0 else 0
        
        expense_percentage = {}
        for category, amount in expense_by_category.items():
            expense_percentage[category] = (amount / total_expense * 100) if total_expense > 0 else 0
        
        return {
            "income": {
                "by_category": income_by_category,
                "percentage": income_percentage,
                "total": total_income
            },
            "expense": {
                "by_category": expense_by_category,
                "percentage": expense_percentage,
                "total": total_expense
            },
            "summary": {
                "total_income": total_income,
                "total_expense": total_expense,
                "net_result": net_result,
                "profit_margin": (net_result / total_income * 100) if total_income > 0 else 0
            }
        }
    
    async def get_report(self, report_id: str) -> Optional[FinancialReport]:
        """
        Obtém um relatório financeiro pelo ID.
        
        Args:
            report_id: ID do relatório
            
        Returns:
            FinancialReport ou None: O relatório se encontrado, None caso contrário
        """
        for report_data in self.reports:
            if report_data.get("id") == report_id:
                return FinancialReport(**report_data)
        
        return None
    
    async def list_reports(
        self,
        report_type: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[FinancialReport]:
        """
        Lista relatórios financeiros com filtros.
        
        Args:
            report_type: Filtro por tipo de relatório
            start_date: Data inicial
            end_date: Data final
            limit: Limite de resultados
            offset: Deslocamento para paginação
            
        Returns:
            List[FinancialReport]: Lista de relatórios
        """
        results = []
        
        for report_data in self.reports:
            # Aplica filtros
            if report_type and report_data.get("type") != report_type:
                continue
            
            report_start_date = datetime.strptime(report_data.get("start_date"), "%Y-%m-%d").date() if isinstance(report_data.get("start_date"), str) else report_data.get("start_date")
            report_end_date = datetime.strptime(report_data.get("end_date"), "%Y-%m-%d").date() if isinstance(report_data.get("end_date"), str) else report_data.get("end_date")
            
            if start_date and report_end_date < start_date:
                continue
            
            if end_date and report_start_date > end_date:
                continue
            
            results.append(FinancialReport(**report_data))
        
        # Ordena por data de criação (mais recente primeiro)
        results.sort(key=lambda r: r.created_at, reverse=True)
        
        # Aplica paginação
        paginated_results = results[offset:offset + limit]
        
        return paginated_results
    
    async def get_financial_summary(self) -> Dict[str, Any]:
        """
        Obtém um resumo financeiro.
        
        Returns:
            Dict[str, Any]: Resumo financeiro
        """
        # Obtém saldos das contas
        accounts = await self.list_accounts(is_active=True)
        account_balances = {account.name: account.balance for account in accounts}
        total_account_balance = sum(account.balance for account in accounts)
        
        # Obtém contas a receber pendentes
        pending_receivables = await self.list_receivables(status=PaymentStatus.PENDING)
        overdue_receivables = [r for r in pending_receivables if r.due_date < date.today()]
        
        total_pending_receivables = sum(r.amount for r in pending_receivables)
        total_overdue_receivables = sum(r.amount for r in overdue_receivables)
        
        # Obtém contas a pagar pendentes
        pending_payables = await self.list_payables(status=PaymentStatus.PENDING)
        overdue_payables = [p for p in pending_payables if p.due_date < date.today()]
        
        total_pending_payables = sum(p.amount for p in pending_payables)
        total_overdue_payables = sum(p.amount for p in overdue_payables)
        
        # Calcula fluxo de caixa dos últimos 30 dias
        thirty_days_ago = date.today() - timedelta(days=30)
        transactions = await self.list_transactions(
            start_date=thirty_days_ago,
            end_date=date.today(),
            status=PaymentStatus.PAID
        )
        
        total_income_30d = sum(t.amount for t in transactions if t.type == TransactionType.INCOME)
        total_expense_30d = sum(t.amount for t in transactions if t.type == TransactionType.EXPENSE)
        net_result_30d = total_income_30d - total_expense_30d
        
        # Calcula projeção para os próximos 30 dias
        next_30_days = date.today() + timedelta(days=30)
        
        future_receivables = await self.list_receivables(
            start_due_date=date.today(),
            end_due_date=next_30_days,
            status=PaymentStatus.PENDING
        )
        
        future_payables = await self.list_payables(
            start_due_date=date.today(),
            end_due_date=next_30_days,
            status=PaymentStatus.PENDING
        )
        
        projected_income_30d = sum(r.amount for r in future_receivables)
        projected_expense_30d = sum(p.amount for p in future_payables)
        projected_net_30d = projected_income_30d - projected_expense_30d
        
        return {
            "current_balance": {
                "accounts": account_balances,
                "total": total_account_balance
            },
            "receivables": {
                "pending": total_pending_receivables,
                "overdue": total_overdue_receivables,
                "count_pending": len(pending_receivables),
                "count_overdue": len(overdue_receivables)
            },
            "payables": {
                "pending": total_pending_payables,
                "overdue": total_overdue_payables,
                "count_pending": len(pending_payables),
                "count_overdue": len(overdue_payables)
            },
            "last_30_days": {
                "income": total_income_30d,
                "expense": total_expense_30d,
                "net_result": net_result_30d
            },
            "next_30_days": {
                "projected_income": projected_income_30d,
                "projected_expense": projected_expense_30d,
                "projected_net": projected_net_30d,
                "projected_balance": total_account_balance + projected_net_30d
            }
        }
    
    async def _publish_accounts_event(self, event_type: str, account_id: Optional[str], user_id: str, data: Dict[str, Any]) -> None:
        """
        Publica um evento relacionado a contas no barramento de eventos.
        
        Args:
            event_type: Tipo do evento
            account_id: ID da conta (opcional)
            user_id: ID do usuário
            data: Dados do evento
        """
        event = AccountsEvent(
            type=event_type,
            account_id=account_id,
            user_id=user_id,
            data=data
        )
        
        await self.event_bus.publish(
            Event(
                type=EventType.ACCOUNTS,
                data=event.dict()
            )
        )

# Cria uma instância singleton
accounts_service = AccountsService()
