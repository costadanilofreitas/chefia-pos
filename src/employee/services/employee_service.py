import os
import json
from typing import List, Dict, Optional, Any, Union
from datetime import datetime, date, timedelta
import uuid

from ..models.employee_models import (
    Employee,
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeQuery,
    EmployeeRole,
    EmploymentType,
    DeliveryAssignment,
    DeliveryAssignmentCreate,
    DeliveryAssignmentUpdate,
    EmployeeAttendance,
    EmployeeAttendanceCreate,
    EmployeeAttendanceUpdate,
    EmployeePerformance,
    EmployeePerformanceCreate,
    EmployeePerformanceUpdate,
    EmployeeEvent
)

from src.logging.services.log_service import log_info, log_error, LogSource
from src.core.events.event_bus import get_event_bus, Event, EventType
from src.accounts.services.accounts_service import accounts_service

# Configuração
EMPLOYEES_DATA_FILE = os.path.join("/home/ubuntu/pos-modern/data", "employees.json")
DELIVERY_ASSIGNMENTS_DATA_FILE = os.path.join("/home/ubuntu/pos-modern/data", "delivery_assignments.json")
ATTENDANCE_DATA_FILE = os.path.join("/home/ubuntu/pos-modern/data", "employee_attendance.json")
PERFORMANCE_DATA_FILE = os.path.join("/home/ubuntu/pos-modern/data", "employee_performance.json")

# Ensure data directory exists
os.makedirs(os.path.dirname(EMPLOYEES_DATA_FILE), exist_ok=True)

class EmployeeService:
    """Serviço para gerenciamento de funcionários."""
    
    def __init__(self):
        """Inicializa o serviço de funcionários."""
        self._load_or_create_data()
        self.event_bus = get_event_bus()
    
    def _load_or_create_data(self) -> None:
        """Carrega dados existentes ou cria novos dados se não existirem."""
        # Carrega funcionários
        if os.path.exists(EMPLOYEES_DATA_FILE):
            with open(EMPLOYEES_DATA_FILE, 'r') as f:
                self.employees = json.load(f)
        else:
            self.employees = []
            self._save_employees()
        
        # Carrega atribuições de entrega
        if os.path.exists(DELIVERY_ASSIGNMENTS_DATA_FILE):
            with open(DELIVERY_ASSIGNMENTS_DATA_FILE, 'r') as f:
                self.delivery_assignments = json.load(f)
        else:
            self.delivery_assignments = []
            self._save_delivery_assignments()
        
        # Carrega registros de ponto
        if os.path.exists(ATTENDANCE_DATA_FILE):
            with open(ATTENDANCE_DATA_FILE, 'r') as f:
                self.attendance_records = json.load(f)
        else:
            self.attendance_records = []
            self._save_attendance_records()
        
        # Carrega avaliações de desempenho
        if os.path.exists(PERFORMANCE_DATA_FILE):
            with open(PERFORMANCE_DATA_FILE, 'r') as f:
                self.performance_records = json.load(f)
        else:
            self.performance_records = []
            self._save_performance_records()
    
    def _save_employees(self) -> None:
        """Salva dados de funcionários no arquivo."""
        with open(EMPLOYEES_DATA_FILE, 'w') as f:
            json.dump(self.employees, f, indent=2, default=str)
    
    def _save_delivery_assignments(self) -> None:
        """Salva dados de atribuições de entrega no arquivo."""
        with open(DELIVERY_ASSIGNMENTS_DATA_FILE, 'w') as f:
            json.dump(self.delivery_assignments, f, indent=2, default=str)
    
    def _save_attendance_records(self) -> None:
        """Salva registros de ponto no arquivo."""
        with open(ATTENDANCE_DATA_FILE, 'w') as f:
            json.dump(self.attendance_records, f, indent=2, default=str)
    
    def _save_performance_records(self) -> None:
        """Salva avaliações de desempenho no arquivo."""
        with open(PERFORMANCE_DATA_FILE, 'w') as f:
            json.dump(self.performance_records, f, indent=2, default=str)
    
    async def create_employee(self, employee_data: EmployeeCreate, user_id: str, user_name: str) -> Employee:
        """
        Cria um novo funcionário.
        
        Args:
            employee_data: Dados do funcionário
            user_id: ID do usuário criando o funcionário
            user_name: Nome do usuário criando o funcionário
            
        Returns:
            Employee: O funcionário criado
        """
        # Cria um novo funcionário com ID
        employee = Employee(
            **employee_data.dict(),
            id=str(uuid.uuid4()),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Adiciona à lista de funcionários
        self.employees.append(employee.dict())
        self._save_employees()
        
        # Registra o evento
        await self._publish_employee_event(
            event_type="employee_created",
            employee_id=employee.id,
            user_id=user_id,
            data=employee.dict()
        )
        
        # Registra o log
        await log_info(
            message=f"Funcionário criado: {employee.name}",
            source=LogSource.EMPLOYEE,
            module="employee",
            user_id=user_id,
            user_name=user_name,
            details={"employee_id": employee.id, "employee_name": employee.name}
        )
        
        return employee
    
    async def get_employee(self, employee_id: str) -> Optional[Employee]:
        """
        Obtém um funcionário pelo ID.
        
        Args:
            employee_id: ID do funcionário
            
        Returns:
            Employee ou None: O funcionário se encontrado, None caso contrário
        """
        for employee_data in self.employees:
            if employee_data.get("id") == employee_id:
                return Employee(**employee_data)
        
        return None
    
    async def update_employee(self, employee_id: str, employee_data: EmployeeUpdate, user_id: str, user_name: str) -> Optional[Employee]:
        """
        Atualiza um funcionário.
        
        Args:
            employee_id: ID do funcionário
            employee_data: Dados atualizados do funcionário
            user_id: ID do usuário atualizando o funcionário
            user_name: Nome do usuário atualizando o funcionário
            
        Returns:
            Employee ou None: O funcionário atualizado se encontrado, None caso contrário
        """
        for i, employee in enumerate(self.employees):
            if employee.get("id") == employee_id:
                # Obtém dados atuais do funcionário
                current_employee = Employee(**employee)
                
                # Atualiza com novos dados
                update_data = employee_data.dict(exclude_unset=True)
                updated_employee = current_employee.copy(update=update_data)
                updated_employee.updated_at = datetime.now()
                
                # Substitui na lista
                self.employees[i] = updated_employee.dict()
                self._save_employees()
                
                # Registra o evento
                await self._publish_employee_event(
                    event_type="employee_updated",
                    employee_id=employee_id,
                    user_id=user_id,
                    data={
                        "employee": updated_employee.dict(),
                        "updated_fields": list(update_data.keys())
                    }
                )
                
                # Registra o log
                await log_info(
                    message=f"Funcionário atualizado: {updated_employee.name}",
                    source=LogSource.EMPLOYEE,
                    module="employee",
                    user_id=user_id,
                    user_name=user_name,
                    details={
                        "employee_id": employee_id,
                        "employee_name": updated_employee.name,
                        "updated_fields": list(update_data.keys())
                    }
                )
                
                return updated_employee
        
        return None
    
    async def delete_employee(self, employee_id: str, user_id: str, user_name: str) -> bool:
        """
        Exclui um funcionário (marca como inativo).
        
        Args:
            employee_id: ID do funcionário
            user_id: ID do usuário excluindo o funcionário
            user_name: Nome do usuário excluindo o funcionário
            
        Returns:
            bool: True se excluído, False caso contrário
        """
        for i, employee in enumerate(self.employees):
            if employee.get("id") == employee_id:
                # Em vez de excluir, marca como inativo
                employee_obj = Employee(**employee)
                employee_obj.is_active = False
                employee_obj.termination_date = date.today()
                employee_obj.updated_at = datetime.now()
                self.employees[i] = employee_obj.dict()
                self._save_employees()
                
                # Registra o evento
                await self._publish_employee_event(
                    event_type="employee_terminated",
                    employee_id=employee_id,
                    user_id=user_id,
                    data={
                        "employee_id": employee_id,
                        "termination_date": str(date.today())
                    }
                )
                
                # Registra o log
                await log_info(
                    message=f"Funcionário desligado: {employee_obj.name}",
                    source=LogSource.EMPLOYEE,
                    module="employee",
                    user_id=user_id,
                    user_name=user_name,
                    details={
                        "employee_id": employee_id,
                        "employee_name": employee_obj.name,
                        "termination_date": str(date.today())
                    }
                )
                
                return True
        
        return False
    
    async def query_employees(self, query: EmployeeQuery) -> List[Employee]:
        """
        Consulta funcionários com base em critérios.
        
        Args:
            query: Parâmetros de consulta
            
        Returns:
            List[Employee]: Funcionários correspondentes
        """
        results = []
        
        for employee_data in self.employees:
            if self._employee_matches_query(employee_data, query):
                results.append(Employee(**employee_data))
        
        # Ordena por nome
        results.sort(key=lambda e: e.name)
        
        # Aplica paginação
        paginated_results = results[query.offset:query.offset + query.limit]
        
        return paginated_results
    
    def _employee_matches_query(self, employee_data: Dict[str, Any], query: EmployeeQuery) -> bool:
        """
        Verifica se um funcionário corresponde aos critérios de consulta.
        
        Args:
            employee_data: Dados do funcionário
            query: Parâmetros de consulta
            
        Returns:
            bool: True se o funcionário corresponde à consulta, False caso contrário
        """
        # Verifica nome
        if query.name and query.name.lower() not in employee_data.get("name", "").lower():
            return False
        
        # Verifica função
        if query.role and query.role != employee_data.get("role"):
            return False
        
        # Verifica tipo de vínculo
        if query.employment_type and query.employment_type != employee_data.get("employment_type"):
            return False
        
        # Verifica status ativo
        if query.is_active is not None and query.is_active != employee_data.get("is_active", True):
            return False
        
        # Verifica data de contratação (início)
        if query.hire_date_start:
            hire_date = datetime.strptime(employee_data.get("hire_date"), "%Y-%m-%d").date() if isinstance(employee_data.get("hire_date"), str) else employee_data.get("hire_date")
            if hire_date < query.hire_date_start:
                return False
        
        # Verifica data de contratação (fim)
        if query.hire_date_end:
            hire_date = datetime.strptime(employee_data.get("hire_date"), "%Y-%m-%d").date() if isinstance(employee_data.get("hire_date"), str) else employee_data.get("hire_date")
            if hire_date > query.hire_date_end:
                return False
        
        return True
    
    async def create_delivery_assignment(self, assignment_data: DeliveryAssignmentCreate, user_id: str, user_name: str) -> DeliveryAssignment:
        """
        Cria uma nova atribuição de entrega.
        
        Args:
            assignment_data: Dados da atribuição
            user_id: ID do usuário criando a atribuição
            user_name: Nome do usuário criando a atribuição
            
        Returns:
            DeliveryAssignment: A atribuição criada
        """
        # Verifica se o funcionário existe e é um entregador
        employee = await self.get_employee(assignment_data.employee_id)
        if not employee:
            raise ValueError(f"Funcionário não encontrado: {assignment_data.employee_id}")
        
        if employee.role != EmployeeRole.DELIVERY:
            raise ValueError(f"Funcionário não é um entregador: {employee.name}")
        
        # Cria uma nova atribuição com ID
        assignment = DeliveryAssignment(
            **assignment_data.dict(),
            id=str(uuid.uuid4()),
            status="assigned",
            assigned_at=datetime.now()
        )
        
        # Adiciona à lista de atribuições
        self.delivery_assignments.append(assignment.dict())
        self._save_delivery_assignments()
        
        # Registra o evento
        await self._publish_employee_event(
            event_type="delivery_assigned",
            employee_id=assignment.employee_id,
            user_id=user_id,
            data=assignment.dict()
        )
        
        # Registra o log
        await log_info(
            message=f"Entrega atribuída ao entregador: {employee.name}",
            source=LogSource.EMPLOYEE,
            module="delivery",
            user_id=user_id,
            user_name=user_name,
            details={
                "assignment_id": assignment.id,
                "employee_id": employee.id,
                "employee_name": employee.name,
                "order_id": assignment.order_id
            }
        )
        
        return assignment
    
    async def update_delivery_assignment(self, assignment_id: str, update_data: DeliveryAssignmentUpdate, user_id: str, user_name: str) -> Optional[DeliveryAssignment]:
        """
        Atualiza uma atribuição de entrega.
        
        Args:
            assignment_id: ID da atribuição
            update_data: Dados atualizados
            user_id: ID do usuário atualizando a atribuição
            user_name: Nome do usuário atualizando a atribuição
            
        Returns:
            DeliveryAssignment ou None: A atribuição atualizada se encontrada, None caso contrário
        """
        for i, assignment in enumerate(self.delivery_assignments):
            if assignment.get("id") == assignment_id:
                # Obtém dados atuais
                current_assignment = DeliveryAssignment(**assignment)
                
                # Atualiza com novos dados
                update_dict = update_data.dict(exclude_unset=True)
                
                # Lógica especial para mudanças de status
                if "status" in update_dict:
                    new_status = update_dict["status"]
                    
                    # Atualiza timestamps com base no status
                    if new_status == "in_progress" and not current_assignment.started_at:
                        update_dict["started_at"] = datetime.now()
                    
                    if new_status == "completed" and not current_assignment.completed_at:
                        update_dict["completed_at"] = datetime.now()
                        
                        # Se a entrega foi concluída, processa o pagamento ao entregador
                        if current_assignment.status != "completed":
                            await self._process_delivery_payment(current_assignment, update_dict.get("tip_amount"))
                
                updated_assignment = current_assignment.copy(update=update_dict)
                
                # Substitui na lista
                self.delivery_assignments[i] = updated_assignment.dict()
                self._save_delivery_assignments()
                
                # Registra o evento
                event_type = f"delivery_{updated_assignment.status}"
                await self._publish_employee_event(
                    event_type=event_type,
                    employee_id=updated_assignment.employee_id,
                    user_id=user_id,
                    data=updated_assignment.dict()
                )
                
                # Registra o log
                status_desc = {
                    "assigned": "atribuída",
                    "in_progress": "em andamento",
                    "completed": "concluída",
                    "cancelled": "cancelada"
                }.get(updated_assignment.status, updated_assignment.status)
                
                await log_info(
                    message=f"Entrega {status_desc}: {assignment_id}",
                    source=LogSource.EMPLOYEE,
                    module="delivery",
                    user_id=user_id,
                    user_name=user_name,
                    details={
                        "assignment_id": assignment_id,
                        "employee_id": updated_assignment.employee_id,
                        "status": updated_assignment.status,
                        "updated_fields": list(update_dict.keys())
                    }
                )
                
                return updated_assignment
        
        return None
    
    async def get_delivery_assignment(self, assignment_id: str) -> Optional[DeliveryAssignment]:
        """
        Obtém uma atribuição de entrega pelo ID.
        
        Args:
            assignment_id: ID da atribuição
            
        Returns:
            DeliveryAssignment ou None: A atribuição se encontrada, None caso contrário
        """
        for assignment_data in self.delivery_assignments:
            if assignment_data.get("id") == assignment_id:
                return DeliveryAssignment(**assignment_data)
        
        return None
    
    async def get_employee_delivery_assignments(self, employee_id: str, status: Optional[str] = None) -> List[DeliveryAssignment]:
        """
        Obtém atribuições de entrega de um funcionário.
        
        Args:
            employee_id: ID do funcionário
            status: Filtro por status
            
        Returns:
            List[DeliveryAssignment]: Lista de atribuições
        """
        results = []
        
        for assignment_data in self.delivery_assignments:
            if assignment_data.get("employee_id") == employee_id:
                if status is None or assignment_data.get("status") == status:
                    results.append(DeliveryAssignment(**assignment_data))
        
        # Ordena por data de atribuição (mais recente primeiro)
        results.sort(key=lambda a: a.assigned_at, reverse=True)
        
        return results
    
    async def _process_delivery_payment(self, assignment: DeliveryAssignment, tip_amount: Optional[float] = None) -> None:
        """
        Processa o pagamento ao entregador por uma entrega concluída.
        
        Args:
            assignment: A atribuição de entrega
            tip_amount: Valor da gorjeta (opcional)
        """
        # Obtém o funcionário
        employee = await self.get_employee(assignment.employee_id)
        if not employee:
            await log_error(
                message=f"Erro ao processar pagamento de entrega: Funcionário não encontrado",
                source=LogSource.EMPLOYEE,
                module="delivery",
                details={
                    "assignment_id": assignment.id,
                    "employee_id": assignment.employee_id
                }
            )
            return
        
        # Calcula o valor total (taxa de entrega + gorjeta)
        total_amount = assignment.delivery_fee
        if tip_amount:
            total_amount += tip_amount
        
        # Se o funcionário recebe por entrega, cria uma conta a pagar
        if employee.payment_frequency == "per_delivery":
            try:
                # Cria uma conta a pagar para o entregador
                await accounts_service.create_payable_for_employee(
                    employee_id=employee.id,
                    amount=total_amount,
                    description=f"Pagamento de entrega #{assignment.id}",
                    reference=assignment.id,
                    due_date=date.today() + timedelta(days=1),  # Pagamento no dia seguinte
                    created_by="system"
                )
            except Exception as e:
                await log_error(
                    message=f"Erro ao criar conta a pagar para entregador: {str(e)}",
                    source=LogSource.EMPLOYEE,
                    module="delivery",
                    details={
                        "assignment_id": assignment.id,
                        "employee_id": employee.id,
                        "amount": total_amount
                    }
                )
    
    async def record_attendance(self, attendance_data: EmployeeAttendanceCreate, user_id: str, user_name: str) -> EmployeeAttendance:
        """
        Registra ponto de um funcionário.
        
        Args:
            attendance_data: Dados do registro de ponto
            user_id: ID do usuário registrando o ponto
            user_name: Nome do usuário registrando o ponto
            
        Returns:
            EmployeeAttendance: O registro de ponto criado
        """
        # Verifica se o funcionário existe
        employee = await self.get_employee(attendance_data.employee_id)
        if not employee:
            raise ValueError(f"Funcionário não encontrado: {attendance_data.employee_id}")
        
        # Cria um novo registro com ID
        attendance = EmployeeAttendance(
            **attendance_data.dict(),
            id=str(uuid.uuid4()),
            date=attendance_data.clock_in.date(),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Adiciona à lista de registros
        self.attendance_records.append(attendance.dict())
        self._save_attendance_records()
        
        # Registra o evento
        await self._publish_employee_event(
            event_type="attendance_recorded",
            employee_id=attendance.employee_id,
            user_id=user_id,
            data=attendance.dict()
        )
        
        # Registra o log
        await log_info(
            message=f"Ponto registrado: {employee.name} (entrada)",
            source=LogSource.EMPLOYEE,
            module="attendance",
            user_id=user_id,
            user_name=user_name,
            details={
                "attendance_id": attendance.id,
                "employee_id": employee.id,
                "employee_name": employee.name,
                "clock_in": str(attendance.clock_in)
            }
        )
        
        return attendance
    
    async def update_attendance(self, attendance_id: str, update_data: EmployeeAttendanceUpdate, user_id: str, user_name: str) -> Optional[EmployeeAttendance]:
        """
        Atualiza um registro de ponto.
        
        Args:
            attendance_id: ID do registro
            update_data: Dados atualizados
            user_id: ID do usuário atualizando o registro
            user_name: Nome do usuário atualizando o registro
            
        Returns:
            EmployeeAttendance ou None: O registro atualizado se encontrado, None caso contrário
        """
        for i, attendance in enumerate(self.attendance_records):
            if attendance.get("id") == attendance_id:
                # Obtém dados atuais
                current_attendance = EmployeeAttendance(**attendance)
                
                # Atualiza com novos dados
                update_dict = update_data.dict(exclude_unset=True)
                
                # Se registrou saída, calcula horas trabalhadas
                if "clock_out" in update_dict and update_dict["clock_out"]:
                    clock_out = update_dict["clock_out"]
                    clock_in = current_attendance.clock_in
                    
                    # Calcula tempo total, descontando intervalo se houver
                    total_seconds = (clock_out - clock_in).total_seconds()
                    
                    if current_attendance.break_start and current_attendance.break_end:
                        break_seconds = (current_attendance.break_end - current_attendance.break_start).total_seconds()
                        total_seconds -= break_seconds
                    
                    total_hours = total_seconds / 3600  # Converte para horas
                    update_dict["total_hours"] = round(total_hours, 2)
                    
                    # Verifica se há horas extras
                    # Lógica simplificada: considera mais de 8 horas como hora extra
                    if total_hours > 8:
                        update_dict["is_overtime"] = True
                        update_dict["overtime_hours"] = round(total_hours - 8, 2)
                
                updated_attendance = current_attendance.copy(update=update_dict)
                updated_attendance.updated_at = datetime.now()
                
                # Substitui na lista
                self.attendance_records[i] = updated_attendance.dict()
                self._save_attendance_records()
                
                # Obtém o funcionário
                employee = await self.get_employee(updated_attendance.employee_id)
                employee_name = employee.name if employee else "Desconhecido"
                
                # Registra o evento
                event_type = "attendance_updated"
                if "clock_out" in update_dict:
                    event_type = "attendance_completed"
                
                await self._publish_employee_event(
                    event_type=event_type,
                    employee_id=updated_attendance.employee_id,
                    user_id=user_id,
                    data=updated_attendance.dict()
                )
                
                # Registra o log
                log_message = f"Ponto atualizado: {employee_name}"
                if "clock_out" in update_dict:
                    log_message = f"Ponto registrado: {employee_name} (saída)"
                
                await log_info(
                    message=log_message,
                    source=LogSource.EMPLOYEE,
                    module="attendance",
                    user_id=user_id,
                    user_name=user_name,
                    details={
                        "attendance_id": attendance_id,
                        "employee_id": updated_attendance.employee_id,
                        "employee_name": employee_name,
                        "updated_fields": list(update_dict.keys()),
                        "total_hours": updated_attendance.total_hours
                    }
                )
                
                return updated_attendance
        
        return None
    
    async def get_attendance(self, attendance_id: str) -> Optional[EmployeeAttendance]:
        """
        Obtém um registro de ponto pelo ID.
        
        Args:
            attendance_id: ID do registro
            
        Returns:
            EmployeeAttendance ou None: O registro se encontrado, None caso contrário
        """
        for attendance_data in self.attendance_records:
            if attendance_data.get("id") == attendance_id:
                return EmployeeAttendance(**attendance_data)
        
        return None
    
    async def get_employee_attendance(self, employee_id: str, start_date: Optional[date] = None, end_date: Optional[date] = None) -> List[EmployeeAttendance]:
        """
        Obtém registros de ponto de um funcionário.
        
        Args:
            employee_id: ID do funcionário
            start_date: Data inicial
            end_date: Data final
            
        Returns:
            List[EmployeeAttendance]: Lista de registros
        """
        results = []
        
        for attendance_data in self.attendance_records:
            if attendance_data.get("employee_id") == employee_id:
                attendance_date = datetime.strptime(attendance_data.get("date"), "%Y-%m-%d").date() if isinstance(attendance_data.get("date"), str) else attendance_data.get("date")
                
                if start_date and attendance_date < start_date:
                    continue
                
                if end_date and attendance_date > end_date:
                    continue
                
                results.append(EmployeeAttendance(**attendance_data))
        
        # Ordena por data (mais recente primeiro)
        results.sort(key=lambda a: a.date, reverse=True)
        
        return results
    
    async def create_performance_evaluation(self, evaluation_data: EmployeePerformanceCreate, user_id: str, user_name: str) -> EmployeePerformance:
        """
        Cria uma avaliação de desempenho.
        
        Args:
            evaluation_data: Dados da avaliação
            user_id: ID do usuário criando a avaliação
            user_name: Nome do usuário criando a avaliação
            
        Returns:
            EmployeePerformance: A avaliação criada
        """
        # Verifica se o funcionário existe
        employee = await self.get_employee(evaluation_data.employee_id)
        if not employee:
            raise ValueError(f"Funcionário não encontrado: {evaluation_data.employee_id}")
        
        # Cria uma nova avaliação com ID
        evaluation = EmployeePerformance(
            **evaluation_data.dict(),
            id=str(uuid.uuid4()),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Adiciona à lista de avaliações
        self.performance_records.append(evaluation.dict())
        self._save_performance_records()
        
        # Registra o evento
        await self._publish_employee_event(
            event_type="performance_evaluated",
            employee_id=evaluation.employee_id,
            user_id=user_id,
            data=evaluation.dict()
        )
        
        # Registra o log
        await log_info(
            message=f"Avaliação de desempenho criada: {employee.name}",
            source=LogSource.EMPLOYEE,
            module="performance",
            user_id=user_id,
            user_name=user_name,
            details={
                "evaluation_id": evaluation.id,
                "employee_id": employee.id,
                "employee_name": employee.name,
                "overall_rating": evaluation.overall_rating
            }
        )
        
        return evaluation
    
    async def update_performance_evaluation(self, evaluation_id: str, update_data: EmployeePerformanceUpdate, user_id: str, user_name: str) -> Optional[EmployeePerformance]:
        """
        Atualiza uma avaliação de desempenho.
        
        Args:
            evaluation_id: ID da avaliação
            update_data: Dados atualizados
            user_id: ID do usuário atualizando a avaliação
            user_name: Nome do usuário atualizando a avaliação
            
        Returns:
            EmployeePerformance ou None: A avaliação atualizada se encontrada, None caso contrário
        """
        for i, evaluation in enumerate(self.performance_records):
            if evaluation.get("id") == evaluation_id:
                # Obtém dados atuais
                current_evaluation = EmployeePerformance(**evaluation)
                
                # Atualiza com novos dados
                update_dict = update_data.dict(exclude_unset=True)
                updated_evaluation = current_evaluation.copy(update=update_dict)
                updated_evaluation.updated_at = datetime.now()
                
                # Substitui na lista
                self.performance_records[i] = updated_evaluation.dict()
                self._save_performance_records()
                
                # Obtém o funcionário
                employee = await self.get_employee(updated_evaluation.employee_id)
                employee_name = employee.name if employee else "Desconhecido"
                
                # Registra o evento
                await self._publish_employee_event(
                    event_type="performance_updated",
                    employee_id=updated_evaluation.employee_id,
                    user_id=user_id,
                    data=updated_evaluation.dict()
                )
                
                # Registra o log
                await log_info(
                    message=f"Avaliação de desempenho atualizada: {employee_name}",
                    source=LogSource.EMPLOYEE,
                    module="performance",
                    user_id=user_id,
                    user_name=user_name,
                    details={
                        "evaluation_id": evaluation_id,
                        "employee_id": updated_evaluation.employee_id,
                        "employee_name": employee_name,
                        "updated_fields": list(update_dict.keys())
                    }
                )
                
                return updated_evaluation
        
        return None
    
    async def get_performance_evaluation(self, evaluation_id: str) -> Optional[EmployeePerformance]:
        """
        Obtém uma avaliação de desempenho pelo ID.
        
        Args:
            evaluation_id: ID da avaliação
            
        Returns:
            EmployeePerformance ou None: A avaliação se encontrada, None caso contrário
        """
        for evaluation_data in self.performance_records:
            if evaluation_data.get("id") == evaluation_id:
                return EmployeePerformance(**evaluation_data)
        
        return None
    
    async def get_employee_performance_evaluations(self, employee_id: str) -> List[EmployeePerformance]:
        """
        Obtém avaliações de desempenho de um funcionário.
        
        Args:
            employee_id: ID do funcionário
            
        Returns:
            List[EmployeePerformance]: Lista de avaliações
        """
        results = []
        
        for evaluation_data in self.performance_records:
            if evaluation_data.get("employee_id") == employee_id:
                results.append(EmployeePerformance(**evaluation_data))
        
        # Ordena por data de avaliação (mais recente primeiro)
        results.sort(key=lambda e: e.evaluation_date, reverse=True)
        
        return results
    
    async def generate_salary_payables(self, payment_date: date, user_id: str, user_name: str) -> List[str]:
        """
        Gera contas a pagar para salários dos funcionários.
        
        Args:
            payment_date: Data de pagamento
            user_id: ID do usuário gerando os pagamentos
            user_name: Nome do usuário gerando os pagamentos
            
        Returns:
            List[str]: Lista de IDs das contas a pagar geradas
        """
        payable_ids = []
        
        # Obtém funcionários ativos
        active_employees = await self.query_employees(EmployeeQuery(is_active=True))
        
        for employee in active_employees:
            # Pula funcionários que recebem por entrega (já processados separadamente)
            if employee.payment_frequency == "per_delivery":
                continue
            
            # Calcula o valor do salário
            salary_amount = employee.base_salary
            
            # Adiciona componentes do salário
            for component in employee.salary_components:
                if component.type == "earning":
                    if component.is_percentage:
                        # Calcula valor percentual
                        reference_value = employee.base_salary  # Valor de referência padrão
                        if component.reference:
                            # Lógica para obter valor de referência específico
                            pass
                        
                        component_value = reference_value * (component.amount / 100)
                    else:
                        component_value = component.amount
                    
                    salary_amount += component_value
                elif component.type == "deduction":
                    if component.is_percentage:
                        reference_value = employee.base_salary
                        if component.reference:
                            pass
                        
                        component_value = reference_value * (component.amount / 100)
                    else:
                        component_value = component.amount
                    
                    salary_amount -= component_value
            
            try:
                # Cria uma conta a pagar para o salário
                payable_id = await accounts_service.create_payable_for_employee(
                    employee_id=employee.id,
                    amount=salary_amount,
                    description=f"Salário - {employee.name}",
                    reference=f"SALARY-{payment_date.strftime('%Y%m')}",
                    due_date=payment_date,
                    created_by=user_id
                )
                
                payable_ids.append(payable_id)
                
                # Registra o evento
                await self._publish_employee_event(
                    event_type="salary_payable_created",
                    employee_id=employee.id,
                    user_id=user_id,
                    data={
                        "employee_id": employee.id,
                        "amount": salary_amount,
                        "payment_date": str(payment_date),
                        "payable_id": payable_id
                    }
                )
                
                # Registra o log
                await log_info(
                    message=f"Conta a pagar de salário criada: {employee.name}",
                    source=LogSource.EMPLOYEE,
                    module="salary",
                    user_id=user_id,
                    user_name=user_name,
                    details={
                        "employee_id": employee.id,
                        "employee_name": employee.name,
                        "amount": salary_amount,
                        "payment_date": str(payment_date),
                        "payable_id": payable_id
                    }
                )
            except Exception as e:
                await log_error(
                    message=f"Erro ao criar conta a pagar de salário: {str(e)}",
                    source=LogSource.EMPLOYEE,
                    module="salary",
                    user_id=user_id,
                    user_name=user_name,
                    details={
                        "employee_id": employee.id,
                        "employee_name": employee.name,
                        "error": str(e)
                    }
                )
        
        return payable_ids
    
    async def get_employee_statistics(self) -> Dict[str, Any]:
        """
        Obtém estatísticas sobre funcionários.
        
        Returns:
            Dict[str, Any]: Estatísticas sobre funcionários
        """
        total_employees = len(self.employees)
        active_employees = sum(1 for e in self.employees if e.get("is_active", True))
        
        # Contagem por função
        roles = {}
        for employee in self.employees:
            role = employee.get("role")
            if role:
                roles[role] = roles.get(role, 0) + 1
        
        # Contagem por tipo de vínculo
        employment_types = {}
        for employee in self.employees:
            emp_type = employee.get("employment_type")
            if emp_type:
                employment_types[emp_type] = employment_types.get(emp_type, 0) + 1
        
        # Estatísticas de entregas (últimos 30 dias)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_deliveries = [
            d for d in self.delivery_assignments
            if (datetime.fromisoformat(d.get("assigned_at")) if isinstance(d.get("assigned_at"), str) else d.get("assigned_at")) >= thirty_days_ago
        ]
        
        total_deliveries = len(recent_deliveries)
        completed_deliveries = sum(1 for d in recent_deliveries if d.get("status") == "completed")
        cancelled_deliveries = sum(1 for d in recent_deliveries if d.get("status") == "cancelled")
        
        completion_rate = (completed_deliveries / total_deliveries * 100) if total_deliveries > 0 else 0
        
        # Estatísticas de presença (últimos 30 dias)
        recent_attendance = [
            a for a in self.attendance_records
            if (datetime.fromisoformat(a.get("date")) if isinstance(a.get("date"), str) else a.get("date")) >= thirty_days_ago.date()
        ]
        
        total_attendance = len(recent_attendance)
        overtime_count = sum(1 for a in recent_attendance if a.get("is_overtime", False))
        
        overtime_rate = (overtime_count / total_attendance * 100) if total_attendance > 0 else 0
        
        return {
            "total_employees": total_employees,
            "active_employees": active_employees,
            "inactive_employees": total_employees - active_employees,
            "by_role": roles,
            "by_employment_type": employment_types,
            "delivery_stats": {
                "total_deliveries": total_deliveries,
                "completed_deliveries": completed_deliveries,
                "cancelled_deliveries": cancelled_deliveries,
                "completion_rate": round(completion_rate, 2)
            },
            "attendance_stats": {
                "total_records": total_attendance,
                "overtime_count": overtime_count,
                "overtime_rate": round(overtime_rate, 2)
            }
        }
    
    async def _publish_employee_event(self, event_type: str, employee_id: str, user_id: str, data: Dict[str, Any]) -> None:
        """
        Publica um evento relacionado a funcionário no barramento de eventos.
        
        Args:
            event_type: Tipo do evento
            employee_id: ID do funcionário
            user_id: ID do usuário
            data: Dados do evento
        """
        event = EmployeeEvent(
            type=event_type,
            employee_id=employee_id,
            user_id=user_id,
            data=data
        )
        
        await self.event_bus.publish(
            Event(
                type=EventType.EMPLOYEE,
                data=event.dict()
            )
        )

# Cria uma instância singleton
employee_service = EmployeeService()
