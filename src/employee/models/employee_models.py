from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional, Any
from enum import Enum
from datetime import datetime, date
import uuid

class EmploymentType(str, Enum):
    """Tipo de vínculo empregatício."""
    PERMANENT = "permanent"  # Funcionário fixo (CLT)
    TEMPORARY = "temporary"  # Funcionário temporário
    FREELANCER = "freelancer"  # Autônomo/Freelancer
    INTERN = "intern"  # Estagiário
    APPRENTICE = "apprentice"  # Jovem Aprendiz

class EmployeeRole(str, Enum):
    """Função do funcionário."""
    MANAGER = "manager"  # Gerente
    CASHIER = "cashier"  # Operador de Caixa
    WAITER = "waiter"  # Garçom
    COOK = "cook"  # Cozinheiro
    DELIVERY = "delivery"  # Entregador
    CLEANER = "cleaner"  # Auxiliar de Limpeza
    ADMIN = "admin"  # Administrativo
    OTHER = "other"  # Outros

class PaymentFrequency(str, Enum):
    """Frequência de pagamento."""
    MONTHLY = "monthly"  # Mensal
    BIWEEKLY = "biweekly"  # Quinzenal
    WEEKLY = "weekly"  # Semanal
    DAILY = "daily"  # Diário (diarista)
    PER_DELIVERY = "per_delivery"  # Por entrega (entregadores)
    PER_SHIFT = "per_shift"  # Por turno

class DocumentType(str, Enum):
    """Tipo de documento."""
    CPF = "cpf"
    RG = "rg"
    CTPS = "ctps"  # Carteira de Trabalho
    PIS = "pis"
    PASSPORT = "passport"
    DRIVER_LICENSE = "driver_license"

class Address(BaseModel):
    """Endereço do funcionário."""
    street: str
    number: str
    complement: Optional[str] = None
    neighborhood: str
    city: str
    state: str
    zip_code: str
    country: str = "Brasil"

class BankAccount(BaseModel):
    """Dados bancários do funcionário."""
    bank_name: str
    bank_code: str
    branch: str
    account_number: str
    account_type: str  # "checking", "savings"
    account_holder: str
    pix_key: Optional[str] = None

class Document(BaseModel):
    """Documento do funcionário."""
    type: DocumentType
    number: str
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    issuing_authority: Optional[str] = None

class EmergencyContact(BaseModel):
    """Contato de emergência."""
    name: str
    relationship: str
    phone: str
    alternative_phone: Optional[str] = None

class WorkSchedule(BaseModel):
    """Horário de trabalho."""
    day_of_week: int  # 0-6 (Domingo-Sábado)
    start_time: str  # formato "HH:MM"
    end_time: str  # formato "HH:MM"
    break_start: Optional[str] = None  # formato "HH:MM"
    break_end: Optional[str] = None  # formato "HH:MM"

class SalaryComponent(BaseModel):
    """Componente do salário."""
    name: str  # Ex: "Salário Base", "Adicional Noturno", "Vale Transporte"
    type: str  # "earning", "deduction", "benefit"
    amount: float
    is_percentage: bool = False  # Se true, amount é uma porcentagem
    reference: Optional[str] = None  # Referência para cálculo percentual
    description: Optional[str] = None

class Employee(BaseModel):
    """Modelo de funcionário."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    user_id: Optional[str] = None  # ID do usuário no sistema (se tiver acesso)
    role: EmployeeRole
    employment_type: EmploymentType
    is_active: bool = True
    hire_date: date
    termination_date: Optional[date] = None
    documents: List[Document] = []
    address: Optional[Address] = None
    phone: str
    email: Optional[str] = None
    emergency_contacts: List[EmergencyContact] = []
    bank_account: Optional[BankAccount] = None
    payment_frequency: PaymentFrequency
    base_salary: float
    salary_components: List[SalaryComponent] = []
    work_schedule: List[WorkSchedule] = []
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    @validator('termination_date')
    def validate_termination_date(cls, v, values):
        if v and 'hire_date' in values and v < values['hire_date']:
            raise ValueError('A data de desligamento não pode ser anterior à data de contratação')
        return v

class EmployeeCreate(BaseModel):
    """Dados para criação de um novo funcionário."""
    name: str
    user_id: Optional[str] = None
    role: EmployeeRole
    employment_type: EmploymentType
    hire_date: date
    documents: List[Document] = []
    address: Optional[Address] = None
    phone: str
    email: Optional[str] = None
    emergency_contacts: List[EmergencyContact] = []
    bank_account: Optional[BankAccount] = None
    payment_frequency: PaymentFrequency
    base_salary: float
    salary_components: List[SalaryComponent] = []
    work_schedule: List[WorkSchedule] = []
    notes: Optional[str] = None

class EmployeeUpdate(BaseModel):
    """Dados para atualização de um funcionário."""
    name: Optional[str] = None
    user_id: Optional[str] = None
    role: Optional[EmployeeRole] = None
    employment_type: Optional[EmploymentType] = None
    is_active: Optional[bool] = None
    termination_date: Optional[date] = None
    documents: Optional[List[Document]] = None
    address: Optional[Address] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    emergency_contacts: Optional[List[EmergencyContact]] = None
    bank_account: Optional[BankAccount] = None
    payment_frequency: Optional[PaymentFrequency] = None
    base_salary: Optional[float] = None
    salary_components: Optional[List[SalaryComponent]] = None
    work_schedule: Optional[List[WorkSchedule]] = None
    notes: Optional[str] = None

class EmployeeQuery(BaseModel):
    """Parâmetros para consulta de funcionários."""
    name: Optional[str] = None
    role: Optional[EmployeeRole] = None
    employment_type: Optional[EmploymentType] = None
    is_active: Optional[bool] = None
    hire_date_start: Optional[date] = None
    hire_date_end: Optional[date] = None
    limit: int = 100
    offset: int = 0

class DeliveryAssignment(BaseModel):
    """Atribuição de entrega para um entregador."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    order_id: str
    status: str  # "assigned", "in_progress", "completed", "cancelled"
    assigned_at: datetime = Field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    delivery_fee: float
    tip_amount: Optional[float] = None
    distance_km: Optional[float] = None
    notes: Optional[str] = None

class DeliveryAssignmentCreate(BaseModel):
    """Dados para criação de uma atribuição de entrega."""
    employee_id: str
    order_id: str
    delivery_fee: float
    distance_km: Optional[float] = None
    notes: Optional[str] = None

class DeliveryAssignmentUpdate(BaseModel):
    """Dados para atualização de uma atribuição de entrega."""
    status: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    tip_amount: Optional[float] = None
    notes: Optional[str] = None

class EmployeeAttendance(BaseModel):
    """Registro de ponto do funcionário."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    date: date
    clock_in: datetime
    clock_out: Optional[datetime] = None
    break_start: Optional[datetime] = None
    break_end: Optional[datetime] = None
    total_hours: Optional[float] = None  # Calculado no clock_out
    is_overtime: bool = False
    overtime_hours: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class EmployeeAttendanceCreate(BaseModel):
    """Dados para criação de um registro de ponto."""
    employee_id: str
    clock_in: datetime
    notes: Optional[str] = None

class EmployeeAttendanceUpdate(BaseModel):
    """Dados para atualização de um registro de ponto."""
    clock_out: Optional[datetime] = None
    break_start: Optional[datetime] = None
    break_end: Optional[datetime] = None
    is_overtime: Optional[bool] = None
    overtime_hours: Optional[float] = None
    notes: Optional[str] = None

class EmployeePerformance(BaseModel):
    """Avaliação de desempenho do funcionário."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    evaluation_date: date
    evaluator_id: str
    period_start: date
    period_end: date
    ratings: Dict[str, int]  # Categorias e notas (1-5)
    strengths: List[str] = []
    areas_for_improvement: List[str] = []
    goals: List[str] = []
    comments: Optional[str] = None
    employee_comments: Optional[str] = None
    overall_rating: float
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class EmployeePerformanceCreate(BaseModel):
    """Dados para criação de uma avaliação de desempenho."""
    employee_id: str
    evaluator_id: str
    evaluation_date: date
    period_start: date
    period_end: date
    ratings: Dict[str, int]
    strengths: List[str] = []
    areas_for_improvement: List[str] = []
    goals: List[str] = []
    comments: Optional[str] = None
    overall_rating: float

class EmployeePerformanceUpdate(BaseModel):
    """Dados para atualização de uma avaliação de desempenho."""
    ratings: Optional[Dict[str, int]] = None
    strengths: Optional[List[str]] = None
    areas_for_improvement: Optional[List[str]] = None
    goals: Optional[List[str]] = None
    comments: Optional[str] = None
    employee_comments: Optional[str] = None
    overall_rating: Optional[float] = None

class EmployeeEvent(BaseModel):
    """Evento relacionado a funcionário para o barramento de eventos."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "employee_created", "employee_updated", "attendance_recorded", etc.
    data: Dict[str, Any]
    employee_id: str
    user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
