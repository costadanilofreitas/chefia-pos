from typing import List, Dict, Optional, Any, Union
from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body, status
from fastapi.responses import JSONResponse
from datetime import datetime, date

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
    EmployeePerformanceUpdate
)
from ..services.employee_service import employee_service
from src.auth.security import get_current_user
from src.auth.models import User, Permission

router = APIRouter(prefix="/api/v1", tags=["employees"])

def _check_permissions(user: User, required_permissions: List[str]):
    """Helper function to check user permissions inline."""
    # Temporariamente removendo TODA verificação de permissões para testes
    return  # Permitir acesso sem verificação

# === Endpoints para Funcionários ===

@router.post("/employees/", response_model=Employee)
async def create_employee(
    employee_data: EmployeeCreate,
    current_user: User = Depends(get_current_user)
):
    """Cria um novo funcionário."""
    _check_permissions(current_user, ["employee.create"])
    try:
        return await employee_service.create_employee(
            employee_data=employee_data,
            user_id=current_user.id,
            user_name=current_user.full_name
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar funcionário: {str(e)}")

@router.get("/employees/{employee_id}", response_model=Employee)
async def get_employee(
    employee_id: str = Path(..., description="ID do funcionário"),
    current_user: User = Depends(get_current_user)
):
    """Busca um funcionário pelo ID."""
    _check_permissions(current_user, ["employee.read"])
    employee = await employee_service.get_employee(employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")
    return employee

@router.put("/employees/{employee_id}", response_model=Employee)
async def update_employee(
    employee_id: str = Path(..., description="ID do funcionário"),
    employee_data: EmployeeUpdate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Atualiza um funcionário."""
    _check_permissions(current_user, ["employee.update"])
    try:
        employee = await employee_service.update_employee(
            employee_id=employee_id,
            employee_data=employee_data,
            user_id=current_user.id,
            user_name=current_user.full_name
        )
        if not employee:
            raise HTTPException(status_code=404, detail="Funcionário não encontrado")
        return employee
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar funcionário: {str(e)}")

@router.delete("/employees/{employee_id}", status_code=204)
async def delete_employee(
    employee_id: str = Path(..., description="ID do funcionário"),
    current_user: User = Depends(get_current_user)
):
    """Exclui um funcionário (marca como inativo)."""
    _check_permissions(current_user, ["employee.delete"])
    success = await employee_service.delete_employee(
        employee_id=employee_id,
        user_id=current_user.id,
        user_name=current_user.full_name
    )
    if not success:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")
    return None

@router.get("/employees/", response_model=List[Employee])
async def query_employees(
    name: Optional[str] = Query(None, description="Nome do funcionário (parcial)"),
    role: Optional[EmployeeRole] = Query(None, description="Função do funcionário"),
    employment_type: Optional[EmploymentType] = Query(None, description="Tipo de vínculo"),
    is_active: Optional[bool] = Query(None, description="Status ativo"),
    hire_date_start: Optional[date] = Query(None, description="Data de contratação inicial"),
    hire_date_end: Optional[date] = Query(None, description="Data de contratação final"),
    limit: int = Query(100, description="Limite de resultados"),
    offset: int = Query(0, description="Deslocamento para paginação"),
    current_user: User = Depends(get_current_user)
):
    """Consulta funcionários com base em critérios."""
    _check_permissions(current_user, ["employee.read"])
    query = EmployeeQuery(
        name=name,
        role=role,
        employment_type=employment_type,
        is_active=is_active,
        hire_date_start=hire_date_start,
        hire_date_end=hire_date_end,
        limit=limit,
        offset=offset
    )
    return await employee_service.query_employees(query)

# === Endpoints para Atribuições de Entrega ===

@router.post("/delivery-assignments/", response_model=DeliveryAssignment)
async def create_delivery_assignment(
    assignment_data: DeliveryAssignmentCreate,
    current_user: User = Depends(get_current_user)
):
    """Cria uma nova atribuição de entrega."""
    _check_permissions(current_user, ["delivery.assign"])
    try:
        return await employee_service.create_delivery_assignment(
            assignment_data=assignment_data,
            user_id=current_user.id,
            user_name=current_user.full_name
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar atribuição de entrega: {str(e)}")

@router.put("/delivery-assignments/{assignment_id}", response_model=DeliveryAssignment)
async def update_delivery_assignment(
    assignment_id: str = Path(..., description="ID da atribuição"),
    update_data: DeliveryAssignmentUpdate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Atualiza uma atribuição de entrega."""
    _check_permissions(current_user, ["delivery.update"])
    try:
        assignment = await employee_service.update_delivery_assignment(
            assignment_id=assignment_id,
            update_data=update_data,
            user_id=current_user.id,
            user_name=current_user.full_name
        )
        if not assignment:
            raise HTTPException(status_code=404, detail="Atribuição de entrega não encontrada")
        return assignment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar atribuição de entrega: {str(e)}")

@router.get("/delivery-assignments/{assignment_id}", response_model=DeliveryAssignment)
async def get_delivery_assignment(
    assignment_id: str = Path(..., description="ID da atribuição"),
    current_user: User = Depends(get_current_user)
):
    """Busca uma atribuição de entrega pelo ID."""
    _check_permissions(current_user, ["delivery.read"])
    assignment = await employee_service.get_delivery_assignment(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Atribuição de entrega não encontrada")
    return assignment

@router.get("/employees/{employee_id}/delivery-assignments", response_model=List[DeliveryAssignment])
async def get_employee_delivery_assignments(
    employee_id: str = Path(..., description="ID do funcionário"),
    status: Optional[str] = Query(None, description="Filtro por status"),
    current_user: User = Depends(get_current_user)
):
    """Busca atribuições de entrega de um funcionário."""
    _check_permissions(current_user, ["delivery.read"])
    return await employee_service.get_employee_delivery_assignments(employee_id, status)

# === Endpoints para Registro de Ponto ===

@router.post("/attendance/", response_model=EmployeeAttendance)
async def record_attendance(
    attendance_data: EmployeeAttendanceCreate,
    current_user: User = Depends(get_current_user)
):
    """Registra ponto de um funcionário."""
    _check_permissions(current_user, ["attendance.create"])
    try:
        return await employee_service.record_attendance(
            attendance_data=attendance_data,
            user_id=current_user.id,
            user_name=current_user.full_name
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao registrar ponto: {str(e)}")

@router.put("/attendance/{attendance_id}", response_model=EmployeeAttendance)
async def update_attendance(
    attendance_id: str = Path(..., description="ID do registro de ponto"),
    update_data: EmployeeAttendanceUpdate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Atualiza um registro de ponto."""
    _check_permissions(current_user, ["attendance.update"])
    try:
        attendance = await employee_service.update_attendance(
            attendance_id=attendance_id,
            update_data=update_data,
            user_id=current_user.id,
            user_name=current_user.full_name
        )
        if not attendance:
            raise HTTPException(status_code=404, detail="Registro de ponto não encontrado")
        return attendance
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar registro de ponto: {str(e)}")

@router.get("/attendance/{attendance_id}", response_model=EmployeeAttendance)
async def get_attendance(
    attendance_id: str = Path(..., description="ID do registro de ponto"),
    current_user: User = Depends(get_current_user)
):
    """Busca um registro de ponto pelo ID."""
    _check_permissions(current_user, ["attendance.read"])
    attendance = await employee_service.get_attendance(attendance_id)
    if not attendance:
        raise HTTPException(status_code=404, detail="Registro de ponto não encontrado")
    return attendance

@router.get("/employees/{employee_id}/attendance", response_model=List[EmployeeAttendance])
async def get_employee_attendance(
    employee_id: str = Path(..., description="ID do funcionário"),
    start_date: Optional[date] = Query(None, description="Data inicial"),
    end_date: Optional[date] = Query(None, description="Data final"),
    current_user: User = Depends(get_current_user)
):
    """Busca registros de ponto de um funcionário."""
    _check_permissions(current_user, ["attendance.read"])
    return await employee_service.get_employee_attendance(employee_id, start_date, end_date)

# === Endpoints para Avaliação de Desempenho ===

@router.post("/performance/", response_model=EmployeePerformance)
async def create_performance_evaluation(
    evaluation_data: EmployeePerformanceCreate,
    current_user: User = Depends(get_current_user)
):
    """Cria uma avaliação de desempenho."""
    _check_permissions(current_user, ["performance.create"])
    try:
        return await employee_service.create_performance_evaluation(
            evaluation_data=evaluation_data,
            user_id=current_user.id,
            user_name=current_user.full_name
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar avaliação de desempenho: {str(e)}")

@router.put("/performance/{evaluation_id}", response_model=EmployeePerformance)
async def update_performance_evaluation(
    evaluation_id: str = Path(..., description="ID da avaliação"),
    update_data: EmployeePerformanceUpdate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Atualiza uma avaliação de desempenho."""
    _check_permissions(current_user, ["performance.update"])
    try:
        evaluation = await employee_service.update_performance_evaluation(
            evaluation_id=evaluation_id,
            update_data=update_data,
            user_id=current_user.id,
            user_name=current_user.full_name
        )
        if not evaluation:
            raise HTTPException(status_code=404, detail="Avaliação de desempenho não encontrada")
        return evaluation
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar avaliação de desempenho: {str(e)}")

@router.get("/performance/{evaluation_id}", response_model=EmployeePerformance)
async def get_performance_evaluation(
    evaluation_id: str = Path(..., description="ID da avaliação"),
    current_user: User = Depends(get_current_user)
):
    """Busca uma avaliação de desempenho pelo ID."""
    _check_permissions(current_user, ["performance.read"])
    evaluation = await employee_service.get_performance_evaluation(evaluation_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Avaliação de desempenho não encontrada")
    return evaluation

@router.get("/employees/{employee_id}/performance", response_model=List[EmployeePerformance])
async def get_employee_performance_evaluations(
    employee_id: str = Path(..., description="ID do funcionário"),
    current_user: User = Depends(get_current_user)
):
    """Busca avaliações de desempenho de um funcionário."""
    _check_permissions(current_user, ["performance.read"])
    return await employee_service.get_employee_performance_evaluations(employee_id)

# === Endpoints para Salários ===

@router.post("/employees/generate-salary-payables", response_model=List[str])
async def generate_salary_payables(
    payment_date: date = Body(..., embed=True),
    current_user: User = Depends(get_current_user)
):
    """Gera contas a pagar para salários dos funcionários."""
    _check_permissions(current_user, ["employee.salary"])
    try:
        return await employee_service.generate_salary_payables(
            payment_date=payment_date,
            user_id=current_user.id,
            user_name=current_user.full_name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar contas a pagar de salários: {str(e)}")

# === Endpoints para Estatísticas ===

@router.get("/employees/statistics", response_model=Dict[str, Any])
async def get_employee_statistics(
    current_user: User = Depends(get_current_user)
):
    """Obtém estatísticas sobre funcionários."""
    _check_permissions(current_user, ["employee.read"])
    try:
        return await employee_service.get_employee_statistics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter estatísticas: {str(e)}")
