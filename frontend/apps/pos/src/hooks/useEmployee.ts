import { useState, useEffect, useCallback } from 'react';
import {
  employeeService, 
  Employee, 
  EmployeeCreate, 
  EmployeeUpdate, 
  EmployeeRole,
  EmployeeAttendance 
} from '../services/EmployeeService';

interface UseEmployeeState {
  employees: Employee[];
  currentEmployee: Employee | null;
  attendance: EmployeeAttendance[];
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  clockingIn: boolean;
  clockingOut: boolean;
  error: string | null;
}

interface UseEmployeeActions {
  // CRUD operations
  loadEmployees: (role?: EmployeeRole, isActive?: boolean, search?: string) => Promise<void>;
  getEmployee: (employeeId: string) => Promise<Employee | null>;
  createEmployee: (employeeData: EmployeeCreate) => Promise<Employee | null>;
  updateEmployee: (employeeId: string, employeeData: EmployeeUpdate) => Promise<Employee | null>;
  deleteEmployee: (employeeId: string) => Promise<boolean>;
  
  // Status operations
  activateEmployee: (employeeId: string) => Promise<Employee | null>;
  deactivateEmployee: (employeeId: string) => Promise<Employee | null>;
  resetPassword: (employeeId: string, newPassword: string) => Promise<boolean>;
  
  // Attendance operations
  clockIn: (employeeId: string) => Promise<EmployeeAttendance | null>;
  clockOut: (employeeId: string) => Promise<EmployeeAttendance | null>;
  loadAttendanceHistory: (employeeId: string, startDate?: string, endDate?: string) => Promise<void>;
  
  // Search operations
  searchEmployees: (_search: string) => Promise<Employee[]>;
  getEmployeesByRole: (role: EmployeeRole) => Promise<Employee[]>;
  getActiveEmployees: () => Promise<Employee[]>;
  
  // State management
  setCurrentEmployee: (employee: Employee | null) => void;
  clearError: () => void;
  refreshEmployees: () => Promise<void>;
}

export const useEmployee = (): UseEmployeeState & UseEmployeeActions => {
  const [state, setState] = useState<UseEmployeeState>({
    employees: [],
    currentEmployee: null,
    attendance: [],
    loading: false,
    creating: false,
    updating: false,
    deleting: false,
    clockingIn: false,
    clockingOut: false,
    error: null
  });

  // Load employees with filters
  const loadEmployees = useCallback(async (
    role?: EmployeeRole, 
    isActive?: boolean, 
    search?: string
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const employees = await employeeService.listEmployees(role, isActive, search);
      setState(prev => ({ 
        ...prev, 
        employees,
        loading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: (error instanceof Error ? error.message : 'Erro ao carregar funcionários') 
      }));
    }
  }, []);

  // Get specific employee
  const getEmployee = useCallback(async (employeeId: string): Promise<Employee | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const employee = await employeeService.getEmployee(employeeId);
      setState(prev => ({ 
        ...prev, 
        currentEmployee: employee,
        loading: false 
      }));
      return employee;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: (error instanceof Error ? error.message : 'Erro ao buscar funcionário') 
      }));
      return null;
    }
  }, []);

  // Create new employee
  const createEmployee = useCallback(async (employeeData: EmployeeCreate): Promise<Employee | null> => {
    setState(prev => ({ ...prev, creating: true, error: null }));
    
    try {
      const newEmployee = await employeeService.createEmployee(employeeData);
      setState(prev => ({ 
        ...prev, 
        employees: [...prev.employees, newEmployee],
        creating: false 
      }));
      return newEmployee;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        creating: false, 
        error: (error instanceof Error ? error.message : 'Erro ao criar funcionário') 
      }));
      return null;
    }
  }, []);

  // Update existing employee
  const updateEmployee = useCallback(async (
    employeeId: string, 
    employeeData: EmployeeUpdate
  ): Promise<Employee | null> => {
    setState(prev => ({ ...prev, updating: true, error: null }));
    
    try {
      const updatedEmployee = await employeeService.updateEmployee(employeeId, employeeData);
      setState(prev => ({ 
        ...prev, 
        employees: prev.employees.map(e => e.id === employeeId ? updatedEmployee : e),
        currentEmployee: prev.currentEmployee?.id === employeeId ? updatedEmployee : prev.currentEmployee,
        updating: false 
      }));
      return updatedEmployee;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        updating: false, 
        error: (error instanceof Error ? error.message : 'Erro ao atualizar funcionário') 
      }));
      return null;
    }
  }, []);

  // Delete employee
  const deleteEmployee = useCallback(async (employeeId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, deleting: true, error: null }));
    
    try {
      await employeeService.deleteEmployee(employeeId);
      setState(prev => ({ 
        ...prev, 
        employees: prev.employees.filter(e => e.id !== employeeId),
        currentEmployee: prev.currentEmployee?.id === employeeId ? null : prev.currentEmployee,
        deleting: false 
      }));
      return true;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        deleting: false, 
        error: (error instanceof Error ? error.message : 'Erro ao excluir funcionário') 
      }));
      return false;
    }
  }, []);

  // Activate employee
  const activateEmployee = useCallback(async (employeeId: string): Promise<Employee | null> => {
    setState(prev => ({ ...prev, updating: true, error: null }));
    
    try {
      const updatedEmployee = await employeeService.activateEmployee(employeeId);
      setState(prev => ({ 
        ...prev, 
        employees: prev.employees.map(e => e.id === employeeId ? updatedEmployee : e),
        currentEmployee: prev.currentEmployee?.id === employeeId ? updatedEmployee : prev.currentEmployee,
        updating: false 
      }));
      return updatedEmployee;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        updating: false, 
        error: (error instanceof Error ? error.message : 'Erro ao ativar funcionário') 
      }));
      return null;
    }
  }, []);

  // Deactivate employee
  const deactivateEmployee = useCallback(async (employeeId: string): Promise<Employee | null> => {
    setState(prev => ({ ...prev, updating: true, error: null }));
    
    try {
      const updatedEmployee = await employeeService.deactivateEmployee(employeeId);
      setState(prev => ({ 
        ...prev, 
        employees: prev.employees.map(e => e.id === employeeId ? updatedEmployee : e),
        currentEmployee: prev.currentEmployee?.id === employeeId ? updatedEmployee : prev.currentEmployee,
        updating: false 
      }));
      return updatedEmployee;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        updating: false, 
        error: (error instanceof Error ? error.message : 'Erro ao desativar funcionário') 
      }));
      return null;
    }
  }, []);

  // Reset password
  const resetPassword = useCallback(async (employeeId: string, newPassword: string): Promise<boolean> => {
    setState(prev => ({ ...prev, updating: true, error: null }));
    
    try {
      await employeeService.resetPassword(employeeId, newPassword);
      setState(prev => ({ ...prev, updating: false }));
      return true;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        updating: false, 
        error: (error instanceof Error ? error.message : 'Erro ao resetar senha') 
      }));
      return false;
    }
  }, []);

  // Clock in
  const clockIn = useCallback(async (employeeId: string): Promise<EmployeeAttendance | null> => {
    setState(prev => ({ ...prev, clockingIn: true, error: null }));
    
    try {
      const attendance = await employeeService.clockIn(employeeId);
      setState(prev => ({ 
        ...prev, 
        attendance: [attendance, ...prev.attendance],
        clockingIn: false 
      }));
      return attendance;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        clockingIn: false, 
        error: (error instanceof Error ? error.message : 'Erro ao registrar entrada') 
      }));
      return null;
    }
  }, []);

  // Clock out
  const clockOut = useCallback(async (employeeId: string): Promise<EmployeeAttendance | null> => {
    setState(prev => ({ ...prev, clockingOut: true, error: null }));
    
    try {
      const attendance = await employeeService.clockOut(employeeId);
      setState(prev => ({ 
        ...prev, 
        attendance: prev.attendance.map(a => a.id === attendance.id ? attendance : a),
        clockingOut: false 
      }));
      return attendance;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        clockingOut: false, 
        error: (error instanceof Error ? error.message : 'Erro ao registrar saída') 
      }));
      return null;
    }
  }, []);

  // Load attendance history
  const loadAttendanceHistory = useCallback(async (
    employeeId: string, 
    startDate?: string, 
    endDate?: string
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const attendance = await employeeService.getAttendanceHistory(employeeId, startDate, endDate);
      setState(prev => ({ 
        ...prev, 
        attendance,
        loading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: (error instanceof Error ? error.message : 'Erro ao carregar histórico de presença') 
      }));
    }
  }, []);

  // Search employees
  const searchEmployees = useCallback(async (search: string): Promise<Employee[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const employees = await employeeService.searchEmployees(search);
      setState(prev => ({ ...prev, loading: false }));
      return employees;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: (error instanceof Error ? error.message : 'Erro ao buscar funcionários') 
      }));
      return [];
    }
  }, []);

  // Get employees by role
  const getEmployeesByRole = useCallback(async (role: EmployeeRole): Promise<Employee[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const employees = await employeeService.getEmployeesByRole(role);
      setState(prev => ({ ...prev, loading: false }));
      return employees;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: (error instanceof Error ? error.message : 'Erro ao buscar funcionários por cargo') 
      }));
      return [];
    }
  }, []);

  // Get active employees
  const getActiveEmployees = useCallback(async (): Promise<Employee[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const employees = await employeeService.getActiveEmployees();
      setState(prev => ({ ...prev, loading: false }));
      return employees;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: (error instanceof Error ? error.message : 'Erro ao buscar funcionários ativos') 
      }));
      return [];
    }
  }, []);

  // Set current employee
  const setCurrentEmployee = useCallback((employee: Employee | null) => {
    setState(prev => ({ ...prev, currentEmployee: employee }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Refresh employees
  const refreshEmployees = useCallback(async () => {
    await loadEmployees();
  }, [loadEmployees]);

  // Load employees on mount
  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  return {
    ...state,
    loadEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    activateEmployee,
    deactivateEmployee,
    resetPassword,
    clockIn,
    clockOut,
    loadAttendanceHistory,
    searchEmployees,
    getEmployeesByRole,
    getActiveEmployees,
    setCurrentEmployee,
    clearError,
    refreshEmployees
  };
};

