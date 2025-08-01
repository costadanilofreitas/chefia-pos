import { apiInterceptor } from './ApiInterceptor';
import { API_ENDPOINTS } from '../config/api';

// Types para Employee
export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  document: string;
  role: EmployeeRole;
  employment_type: EmploymentType;
  hire_date: string;
  salary?: number;
  is_active: boolean;
  permissions: string[];
  address?: Address;
  emergency_contact?: EmergencyContact;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCreate {
  name: string;
  email: string;
  phone?: string;
  document: string;
  role: EmployeeRole;
  employment_type: EmploymentType;
  hire_date: string;
  salary?: number;
  permissions?: string[];
  address?: Address;
  emergency_contact?: EmergencyContact;
  password: string;
}

export interface EmployeeUpdate {
  name?: string;
  email?: string;
  phone?: string;
  role?: EmployeeRole;
  employment_type?: EmploymentType;
  salary?: number;
  permissions?: string[];
  address?: Address;
  emergency_contact?: EmergencyContact;
  is_active?: boolean;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export enum EmployeeRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  CASHIER = 'cashier',
  WAITER = 'waiter',
  KITCHEN = 'kitchen',
  DELIVERY = 'delivery'
}

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERN = 'intern'
}

export interface EmployeeAttendance {
  id: string;
  employee_id: string;
  date: string;
  clock_in?: string;
  clock_out?: string;
  break_start?: string;
  break_end?: string;
  total_hours?: number;
  status: AttendanceStatus;
}

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  HALF_DAY = 'half_day'
}

export class EmployeeService {
  /**
   * Lista todos os funcionários
   */
  async listEmployees(
    role?: EmployeeRole,
    is_active?: boolean,
    search?: string
  ): Promise<Employee[]> {
    const params: any = {};
    if (role) params.role = role;
    if (is_active !== undefined) params.is_active = is_active;
    if (search) params.search = search;

    const response = await apiInterceptor.get(API_ENDPOINTS.EMPLOYEES.LIST, { params });
    return response.data;
  }

  /**
   * Busca um funcionário por ID
   */
  async getEmployee(employeeId: string): Promise<Employee> {
    const response = await apiInterceptor.get(
      API_ENDPOINTS.EMPLOYEES.GET.replace(':id', employeeId)
    );
    return response.data;
  }

  /**
   * Cria um novo funcionário
   */
  async createEmployee(employeeData: EmployeeCreate): Promise<Employee> {
    const response = await apiInterceptor.post(
      API_ENDPOINTS.EMPLOYEES.CREATE,
      employeeData
    );
    return response.data;
  }

  /**
   * Atualiza um funcionário existente
   */
  async updateEmployee(employeeId: string, employeeData: EmployeeUpdate): Promise<Employee> {
    const response = await apiInterceptor.put(
      API_ENDPOINTS.EMPLOYEES.UPDATE.replace(':id', employeeId),
      employeeData
    );
    return response.data;
  }

  /**
   * Remove um funcionário
   */
  async deleteEmployee(employeeId: string): Promise<void> {
    await apiInterceptor.delete(
      API_ENDPOINTS.EMPLOYEES.DELETE.replace(':id', employeeId)
    );
  }

  /**
   * Ativa um funcionário
   */
  async activateEmployee(employeeId: string): Promise<Employee> {
    const response = await apiInterceptor.post(
      API_ENDPOINTS.EMPLOYEES.ACTIVATE.replace(':id', employeeId)
    );
    return response.data;
  }

  /**
   * Desativa um funcionário
   */
  async deactivateEmployee(employeeId: string): Promise<Employee> {
    const response = await apiInterceptor.post(
      API_ENDPOINTS.EMPLOYEES.DEACTIVATE.replace(':id', employeeId)
    );
    return response.data;
  }

  /**
   * Reseta a senha de um funcionário
   */
  async resetPassword(employeeId: string, newPassword: string): Promise<void> {
    await apiInterceptor.post(
      API_ENDPOINTS.EMPLOYEES.RESET_PASSWORD.replace(':id', employeeId),
      { password: newPassword }
    );
  }

  /**
   * Registra ponto de entrada
   */
  async clockIn(employeeId: string): Promise<EmployeeAttendance> {
    const response = await apiInterceptor.post(
      `/api/v1/employees/${employeeId}/attendance/clock-in`
    );
    return response.data;
  }

  /**
   * Registra ponto de saída
   */
  async clockOut(employeeId: string): Promise<EmployeeAttendance> {
    const response = await apiInterceptor.post(
      `/api/v1/employees/${employeeId}/attendance/clock-out`
    );
    return response.data;
  }

  /**
   * Busca histórico de presença
   */
  async getAttendanceHistory(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Promise<EmployeeAttendance[]> {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await apiInterceptor.get(
      `/api/v1/employees/${employeeId}/attendance`,
      { params }
    );
    return response.data;
  }

  /**
   * Busca funcionários por cargo
   */
  async getEmployeesByRole(role: EmployeeRole): Promise<Employee[]> {
    return this.listEmployees(role);
  }

  /**
   * Busca funcionários ativos
   */
  async getActiveEmployees(): Promise<Employee[]> {
    return this.listEmployees(undefined, true);
  }

  /**
   * Busca funcionários por nome ou email
   */
  async searchEmployees(search: string): Promise<Employee[]> {
    return this.listEmployees(undefined, undefined, search);
  }
}

// Instância singleton do serviço
export const employeeService = new EmployeeService();

