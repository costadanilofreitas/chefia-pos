# Employee module database models for PostgreSQL

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy import Enum as SqlEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ...core.database.connection import Base


# Enums
class EmployeeRoleEnum(str, enum.Enum):
    MANAGER = "manager"
    CASHIER = "cashier"
    COOK = "cook"
    WAITER = "waiter"
    DELIVERY = "delivery"
    CLEANER = "cleaner"
    SECURITY = "security"
    MAINTENANCE = "maintenance"
    ADMIN = "admin"


class EmploymentTypeEnum(str, enum.Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    INTERN = "intern"
    FREELANCER = "freelancer"
    TEMPORARY = "temporary"


class PaymentFrequencyEnum(str, enum.Enum):
    MONTHLY = "monthly"
    WEEKLY = "weekly"
    DAILY = "daily"
    PER_DELIVERY = "per_delivery"
    PER_HOUR = "per_hour"


class SalaryComponentTypeEnum(str, enum.Enum):
    EARNING = "earning"
    DEDUCTION = "deduction"


class DeliveryAssignmentStatusEnum(str, enum.Enum):
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EmployeeDB(Base):
    """Database model for employees."""

    __tablename__ = "employees"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Personal information
    name = Column(String, nullable=False, index=True)
    document_number = Column(String, nullable=True, unique=True, index=True)  # CPF/CNPJ
    email = Column(String, nullable=True, index=True)
    phone = Column(String, nullable=True, index=True)
    birth_date = Column(Date, nullable=True)

    # Address
    address = Column(Text, nullable=True)

    # Employment details
    role = Column(SqlEnum(EmployeeRoleEnum), nullable=False, index=True)
    employment_type = Column(
        SqlEnum(EmploymentTypeEnum),
        nullable=False,
        default=EmploymentTypeEnum.FULL_TIME,
    )
    hire_date = Column(Date, nullable=False, index=True)
    termination_date = Column(Date, nullable=True, index=True)
    is_active = Column(Boolean, default=True, index=True)

    # Salary information
    base_salary = Column(Float, nullable=False, default=0.0)
    payment_frequency = Column(
        SqlEnum(PaymentFrequencyEnum),
        nullable=False,
        default=PaymentFrequencyEnum.MONTHLY,
    )

    # Bank information
    bank_account = Column(
        JSON
    )  # {"bank": "", "agency": "", "account": "", "pix_key": ""}

    # Emergency contact
    emergency_contact = Column(JSON)  # {"name": "", "phone": "", "relationship": ""}

    # Additional information
    notes = Column(Text)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    salary_components = relationship(
        "SalaryComponentDB", back_populates="employee", cascade="all, delete-orphan"
    )
    delivery_assignments = relationship(
        "DeliveryAssignmentDB", back_populates="employee", cascade="all, delete-orphan"
    )
    attendance_records = relationship(
        "EmployeeAttendanceDB", back_populates="employee", cascade="all, delete-orphan"
    )
    performance_evaluations = relationship(
        "EmployeePerformanceDB", back_populates="employee", cascade="all, delete-orphan"
    )


class SalaryComponentDB(Base):
    """Database model for employee salary components."""

    __tablename__ = "employee_salary_components"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    employee_id = Column(
        UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True
    )

    # Component details
    name = Column(String, nullable=False)
    description = Column(Text)
    type = Column(
        SqlEnum(SalaryComponentTypeEnum), nullable=False
    )  # earning or deduction
    amount = Column(Float, nullable=False)
    is_percentage = Column(Boolean, default=False)
    reference = Column(String, nullable=True)  # What the percentage is based on

    # Status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationship
    employee = relationship("EmployeeDB", back_populates="salary_components")


class DeliveryAssignmentDB(Base):
    """Database model for delivery assignments."""

    __tablename__ = "employee_delivery_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    employee_id = Column(
        UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True
    )

    # Assignment details
    order_id = Column(String, nullable=False, index=True)  # Reference to main order
    customer_name = Column(String, nullable=True)
    customer_address = Column(Text, nullable=True)
    customer_phone = Column(String, nullable=True)

    # Delivery details
    delivery_fee = Column(Float, nullable=False, default=0.0)
    tip_amount = Column(Float, nullable=True)
    distance_km = Column(Float, nullable=True)

    # Status and timing
    status = Column(
        SqlEnum(DeliveryAssignmentStatusEnum),
        nullable=False,
        default=DeliveryAssignmentStatusEnum.ASSIGNED,
        index=True,
    )
    assigned_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Notes
    notes = Column(Text)

    # Relationship
    employee = relationship("EmployeeDB", back_populates="delivery_assignments")


class EmployeeAttendanceDB(Base):
    """Database model for employee attendance records."""

    __tablename__ = "employee_attendance"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    employee_id = Column(
        UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True
    )

    # Date and times
    date = Column(Date, nullable=False, index=True)
    clock_in = Column(DateTime, nullable=False)
    clock_out = Column(DateTime, nullable=True)
    break_start = Column(DateTime, nullable=True)
    break_end = Column(DateTime, nullable=True)

    # Calculated values
    total_hours = Column(Float, nullable=True)  # Total worked hours
    break_duration = Column(Integer, nullable=True)  # Break duration in minutes
    overtime_hours = Column(Float, nullable=True)  # Overtime hours
    is_overtime = Column(Boolean, default=False)

    # Status and validation
    is_valid = Column(Boolean, default=True)  # For marking invalid records
    validation_notes = Column(Text)

    # Location (optional GPS tracking)
    clock_in_location = Column(JSON)  # {"lat": float, "lng": float, "address": ""}
    clock_out_location = Column(JSON)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationship
    employee = relationship("EmployeeDB", back_populates="attendance_records")


class EmployeePerformanceDB(Base):
    """Database model for employee performance evaluations."""

    __tablename__ = "employee_performance"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    employee_id = Column(
        UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True
    )
    evaluator_id = Column(
        UUID(as_uuid=True), nullable=True
    )  # Who conducted the evaluation

    # Evaluation details
    evaluation_date = Column(Date, nullable=False, index=True)
    evaluation_period_start = Column(Date, nullable=False)
    evaluation_period_end = Column(Date, nullable=False)
    evaluation_type = Column(
        String, nullable=False
    )  # annual, quarterly, probation, etc.

    # Overall rating
    overall_rating = Column(Float, nullable=False)  # 1.0 to 5.0 scale

    # Performance areas (JSON structure for flexibility)
    performance_areas = Column(
        JSON
    )  # {"quality": 4.5, "punctuality": 4.0, "teamwork": 3.5, ...}

    # Goals and objectives
    goals_met = Column(Integer, nullable=True)  # Number of goals achieved
    total_goals = Column(Integer, nullable=True)  # Total number of goals
    goals_details = Column(JSON)  # Detailed goal information

    # Feedback
    strengths = Column(Text)  # What the employee does well
    areas_for_improvement = Column(Text)  # Areas that need work
    development_plan = Column(Text)  # Action plan for improvement
    employee_comments = Column(Text)  # Employee's self-assessment or response

    # Next evaluation
    next_evaluation_date = Column(Date, nullable=True)

    # Status
    is_final = Column(Boolean, default=False)  # Whether the evaluation is finalized
    approved_by = Column(UUID(as_uuid=True), nullable=True)  # Manager who approved
    approved_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationship
    employee = relationship("EmployeeDB", back_populates="performance_evaluations")


class EmployeeTrainingDB(Base):
    """Database model for employee training records."""

    __tablename__ = "employee_training"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    employee_id = Column(
        UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True
    )

    # Training details
    training_name = Column(String, nullable=False, index=True)
    training_category = Column(
        String, nullable=True
    )  # safety, skills, compliance, etc.
    description = Column(Text)
    provider = Column(String, nullable=True)  # Who provided the training

    # Dates and duration
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=True)
    duration_hours = Column(Float, nullable=True)

    # Completion and certification
    completion_status = Column(
        String, nullable=False, default="scheduled"
    )  # scheduled, in_progress, completed, cancelled
    completion_date = Column(Date, nullable=True)
    certificate_number = Column(String, nullable=True)
    certificate_expires = Column(Date, nullable=True)

    # Cost and results
    cost = Column(Float, nullable=True)
    final_score = Column(Float, nullable=True)
    passed = Column(Boolean, nullable=True)

    # Files and documentation
    materials = Column(JSON)  # Links to training materials, certificates, etc.
    notes = Column(Text)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationship
    employee = relationship("EmployeeDB")


class EmployeeDocumentDB(Base):
    """Database model for employee documents."""

    __tablename__ = "employee_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    employee_id = Column(
        UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True
    )

    # Document details
    document_type = Column(
        String, nullable=False, index=True
    )  # contract, id_copy, resume, certificate, etc.
    document_name = Column(String, nullable=False)
    description = Column(Text)

    # File information
    file_path = Column(String, nullable=True)  # Path to stored file
    file_size = Column(Integer, nullable=True)  # File size in bytes
    file_type = Column(String, nullable=True)  # MIME type

    # Document metadata
    issue_date = Column(Date, nullable=True)
    expiry_date = Column(
        Date, nullable=True, index=True
    )  # For certificates, licenses, etc.
    document_number = Column(String, nullable=True)
    issuing_authority = Column(String, nullable=True)

    # Status
    is_verified = Column(Boolean, default=False)
    verified_by = Column(UUID(as_uuid=True), nullable=True)
    verified_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationship
    employee = relationship("EmployeeDB")


class EmployeePayrollDB(Base):
    """Database model for employee payroll records."""

    __tablename__ = "employee_payroll"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    employee_id = Column(
        UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True
    )

    # Payroll period
    payroll_period = Column(
        String, nullable=False, index=True
    )  # "2023-12" for monthly, "2023-W52" for weekly
    pay_date = Column(Date, nullable=False, index=True)

    # Base amounts
    base_salary = Column(Float, nullable=False)
    gross_salary = Column(Float, nullable=False)
    net_salary = Column(Float, nullable=False)

    # Earnings breakdown
    regular_hours = Column(Float, nullable=True)
    overtime_hours = Column(Float, nullable=True)
    overtime_pay = Column(Float, nullable=True)
    bonus = Column(Float, nullable=True)
    commission = Column(Float, nullable=True)

    # Deductions breakdown
    tax_deductions = Column(Float, nullable=True)
    social_security = Column(Float, nullable=True)
    health_insurance = Column(Float, nullable=True)
    other_deductions = Column(Float, nullable=True)

    # Detailed breakdown (JSON for flexibility)
    earnings_detail = Column(JSON)  # Detailed earnings breakdown
    deductions_detail = Column(JSON)  # Detailed deductions breakdown

    # Payment information
    payment_method = Column(String, nullable=True)  # bank_transfer, cash, check
    payment_reference = Column(String, nullable=True)  # Bank transaction reference
    payment_status = Column(String, default="pending")  # pending, paid, cancelled

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationship
    employee = relationship("EmployeeDB")
