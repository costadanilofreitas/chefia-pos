import { apiInterceptor } from './ApiInterceptor';
import { API_ENDPOINTS } from '../config/api';
import logger, { LogSource } from './LocalLoggerService';

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
    try {
      await logger.debug('Listando funcionários', { role, is_active, search }, 'EmployeeService', LogSource.POS);
      
      const params: Record<string, string | boolean> = {};
      if (role) params.role = role;
      if (is_active !== undefined) params.is_active = is_active;
      if (search) params.search = search;

      const response = await apiInterceptor.get<Employee[]>(API_ENDPOINTS.EMPLOYEES.LIST, { params });
      
      await logger.debug(`${response.data.length} funcionários encontrados`, { count: response.data.length }, 'EmployeeService', LogSource.POS);
      return response.data;
    } catch (error) {
      await logger.error('Erro ao listar funcionários', { role, is_active, search, error }, 'EmployeeService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Busca um funcionário por ID
   */
  async getEmployee(employeeId: string): Promise<Employee> {
    try {
      await logger.debug('Buscando funcionário', { employeeId }, 'EmployeeService', LogSource.POS);
      
      const response = await apiInterceptor.get<Employee>(
        API_ENDPOINTS.EMPLOYEES.GET.replace(':id', employeeId)
      );
      
      return response.data;
    } catch (error) {
      await logger.error('Erro ao buscar funcionário', { employeeId, error }, 'EmployeeService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Cria um novo funcionário
   */
  async createEmployee(employeeData: EmployeeCreate): Promise<Employee> {
    try {
      await logger.info('Criando novo funcionário', 
        { name: employeeData.name, role: employeeData.role }, 
        'EmployeeService', 
        LogSource.POS
      );
      
      const response = await apiInterceptor.post<Employee>(
        API_ENDPOINTS.EMPLOYEES.CREATE,
        employeeData
      );
      
      await logger.info('Funcionário criado com sucesso', 
        { employeeId: response.data.id, name: response.data.name }, 
        'EmployeeService', 
        LogSource.POS
      );
      return response.data;
    } catch (error) {
      await logger.error('Erro ao criar funcionário', { employeeData, error }, 'EmployeeService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Atualiza um funcionário existente
   */
  async updateEmployee(employeeId: string, employeeData: EmployeeUpdate): Promise<Employee> {
    try {
      await logger.info('Atualizando funcionário', { employeeId, ...employeeData }, 'EmployeeService', LogSource.POS);
      
      const response = await apiInterceptor.put<Employee>(
        API_ENDPOINTS.EMPLOYEES.UPDATE.replace(':id', employeeId),
        employeeData
      );
      
      await logger.info('Funcionário atualizado com sucesso', { employeeId }, 'EmployeeService', LogSource.POS);
      return response.data;
    } catch (error) {
      await logger.error('Erro ao atualizar funcionário', { employeeId, employeeData, error }, 'EmployeeService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Remove um funcionário
   */
  async deleteEmployee(employeeId: string): Promise<void> {
    try {
      await logger.warn('Removendo funcionário', { employeeId }, 'EmployeeService', LogSource.POS);
      
      await apiInterceptor.delete(
        API_ENDPOINTS.EMPLOYEES.DELETE.replace(':id', employeeId)
      );
      
      await logger.info('Funcionário removido com sucesso', { employeeId }, 'EmployeeService', LogSource.POS);
    } catch (error) {
      await logger.error('Erro ao remover funcionário', { employeeId, error }, 'EmployeeService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Ativa um funcionário
   */
  async activateEmployee(employeeId: string): Promise<Employee> {
    try {
      await logger.info('Ativando funcionário', { employeeId }, 'EmployeeService', LogSource.POS);
      
      const response = await apiInterceptor.post<Employee>(
        API_ENDPOINTS.EMPLOYEES.ACTIVATE.replace(':id', employeeId)
      );
      
      await logger.info('Funcionário ativado com sucesso', { employeeId }, 'EmployeeService', LogSource.POS);
      return response.data;
    } catch (error) {
      await logger.error('Erro ao ativar funcionário', { employeeId, error }, 'EmployeeService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Desativa um funcionário
   */
  async deactivateEmployee(employeeId: string): Promise<Employee> {
    try {
      await logger.warn('Desativando funcionário', { employeeId }, 'EmployeeService', LogSource.POS);
      
      const response = await apiInterceptor.post<Employee>(
        API_ENDPOINTS.EMPLOYEES.DEACTIVATE.replace(':id', employeeId)
      );
      
      await logger.info('Funcionário desativado com sucesso', { employeeId }, 'EmployeeService', LogSource.POS);
      return response.data;
    } catch (error) {
      await logger.error('Erro ao desativar funcionário', { employeeId, error }, 'EmployeeService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Reseta a senha de um funcionário
   */
  async resetPassword(employeeId: string, newPassword: string): Promise<void> {
    try {
      await logger.warn('Resetando senha de funcionário', { employeeId }, 'EmployeeService', LogSource.SECURITY);
      
      await apiInterceptor.post(
        API_ENDPOINTS.EMPLOYEES.RESET_PASSWORD.replace(':id', employeeId),
        { password: newPassword }
      );
      
      await logger.info('Senha resetada com sucesso', { employeeId }, 'EmployeeService', LogSource.SECURITY);
    } catch (error) {
      await logger.critical('Erro ao resetar senha de funcionário', { employeeId, error }, 'EmployeeService', LogSource.SECURITY);
      throw error;
    }
  }

  /**
   * Registra ponto de entrada
   */
  async clockIn(employeeId: string): Promise<EmployeeAttendance> {
    try {
      await logger.info('Registrando ponto de entrada', { employeeId }, 'EmployeeService', LogSource.POS);
      
      const response = await apiInterceptor.post<EmployeeAttendance>(
        `/api/v1/employees/${employeeId}/attendance/clock-in`
      );
      
      await logger.info('Ponto de entrada registrado', 
        { employeeId, clockIn: response.data.clock_in }, 
        'EmployeeService', 
        LogSource.POS
      );
      return response.data;
    } catch (error) {
      await logger.error('Erro ao registrar ponto de entrada', { employeeId, error }, 'EmployeeService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Registra ponto de saída
   */
  async clockOut(employeeId: string): Promise<EmployeeAttendance> {
    try {
      await logger.info('Registrando ponto de saída', { employeeId }, 'EmployeeService', LogSource.POS);
      
      const response = await apiInterceptor.post<EmployeeAttendance>(
        `/api/v1/employees/${employeeId}/attendance/clock-out`
      );
      
      await logger.info('Ponto de saída registrado', 
        { employeeId, clockOut: response.data.clock_out, totalHours: response.data.total_hours }, 
        'EmployeeService', 
        LogSource.POS
      );
      return response.data;
    } catch (error) {
      await logger.error('Erro ao registrar ponto de saída', { employeeId, error }, 'EmployeeService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Busca histórico de presença
   */
  async getAttendanceHistory(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Promise<EmployeeAttendance[]> {
    try {
      await logger.debug('Buscando histórico de presença', { employeeId, startDate, endDate }, 'EmployeeService', LogSource.POS);
      
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await apiInterceptor.get<EmployeeAttendance[]>(
        `/api/v1/employees/${employeeId}/attendance`,
        { params }
      );
      
      await logger.debug(`${response.data.length} registros de presença encontrados`, 
        { employeeId, count: response.data.length }, 
        'EmployeeService', 
        LogSource.POS
      );
      return response.data;
    } catch (error) {
      await logger.error('Erro ao buscar histórico de presença', { employeeId, startDate, endDate, error }, 'EmployeeService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Busca funcionários por cargo
   */
  async getEmployeesByRole(role: EmployeeRole): Promise<Employee[]> {
    try {
      return await this.listEmployees(role);
    } catch (error) {
      await logger.error('Erro ao buscar funcionários por cargo', { role, error }, 'EmployeeService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Busca funcionários ativos
   */
  async getActiveEmployees(): Promise<Employee[]> {
    try {
      return await this.listEmployees(undefined, true);
    } catch (error) {
      await logger.error('Erro ao buscar funcionários ativos', error, 'EmployeeService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Busca funcionários por nome ou email
   */
  async searchEmployees(search: string): Promise<Employee[]> {
    try {
      return await this.listEmployees(undefined, undefined, search);
    } catch (error) {
      await logger.error('Erro ao buscar funcionários', { search, error }, 'EmployeeService', LogSource.POS);
      throw error;
    }
  }
}

// Instância singleton do serviço
export const employeeService = new EmployeeService();

