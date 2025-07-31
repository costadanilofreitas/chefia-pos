import { apiInterceptor } from './ApiInterceptor';
import { API_ENDPOINTS } from '../config/api';

// Tipos baseados no backend
export interface CashierCreate {
  terminal_id: string;
  operator_id: string;
  opening_balance: number;
  business_day_id: string;
  notes?: string;
}

export interface CashierClose {
  operator_id: string;
  physical_cash_amount: number;
  notes?: string;
}

export interface CashierOperation {
  operation_type: 'SALE' | 'WITHDRAWAL' | 'DEPOSIT' | 'OPENING' | 'CLOSING';
  amount: number;
  operator_id: string;
  payment_method?: string;
  related_entity_id?: string;
  notes?: string;
}

export interface CashierWithdrawal {
  operator_id: string;
  amount: number;
  reason: string;
  notes?: string;
}

export interface Cashier {
  id: string;
  terminal_id: string;
  operator_id: string;
  operator_name: string;
  business_day_id: string;
  opened_at: string;
  closed_at?: string;
  initial_balance: number;
  current_balance: number;
  final_balance?: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
  current_operator_id: string;
  current_operator_name: string;
}

export interface TerminalStatus {
  has_open_cashier: boolean;
  terminal_id: string;
  cashier_id?: string;
  operator_id?: string;
  operator_name?: string;
  opened_at?: string;
  initial_balance?: number;
  current_balance?: number;
  business_day_id?: string;
  business_day_date?: string;
  status?: string;
  message?: string;
}

export class CashierService {
  /**
   * Verifica o status do caixa para um terminal específico
   */
  async getTerminalStatus(terminalId: string): Promise<TerminalStatus> {
    try {
      const response = await apiInterceptor.get(
        API_ENDPOINTS.CASHIER.STATUS(terminalId)
      );
      return response.data;
    } catch (error: any) {
      console.error('Erro ao verificar status do terminal:', error);
      throw new Error(error.response?.data?.message || 'Erro ao verificar status do terminal');
    }
  }

  /**
   * Abre um novo caixa
   */
  async openCashier(cashierData: CashierCreate): Promise<Cashier> {
    try {
      const response = await apiInterceptor.post(
        API_ENDPOINTS.CASHIER.OPEN,
        cashierData
      );
      return response.data;
    } catch (error: any) {
      console.error('Erro ao abrir caixa:', error);
      throw new Error(error.response?.data?.message || 'Erro ao abrir caixa');
    }
  }

  /**
   * Fecha um caixa
   */
  async closeCashier(cashierId: string, closeData: CashierClose): Promise<Cashier> {
    try {
      const response = await apiInterceptor.put(
        API_ENDPOINTS.CASHIER.CLOSE(cashierId),
        closeData
      );
      return response.data;
    } catch (error: any) {
      console.error('Erro ao fechar caixa:', error);
      throw new Error(error.response?.data?.message || 'Erro ao fechar caixa');
    }
  }

  /**
   * Registra uma operação no caixa
   */
  async registerOperation(cashierId: string, operation: CashierOperation): Promise<any> {
    try {
      const response = await apiInterceptor.post(
        `/api/v1/cashier/${cashierId}/operation`,
        operation
      );
      return response.data;
    } catch (error: any) {
      console.error('Erro ao registrar operação:', error);
      throw new Error(error.response?.data?.message || 'Erro ao registrar operação');
    }
  }

  /**
   * Registra uma retirada (ruptura) no caixa
   */
  async registerWithdrawal(cashierId: string, withdrawal: CashierWithdrawal): Promise<any> {
    try {
      const response = await apiInterceptor.post(
        API_ENDPOINTS.CASHIER.WITHDRAW(cashierId),
        withdrawal
      );
      return response.data;
    } catch (error: any) {
      console.error('Erro ao registrar retirada:', error);
      throw new Error(error.response?.data?.message || 'Erro ao registrar retirada');
    }
  }

  /**
   * Busca um caixa específico pelo ID
   */
  async getCashier(cashierId: string): Promise<Cashier> {
    try {
      const response = await apiInterceptor.get(`/api/v1/cashier/${cashierId}`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar caixa:', error);
      throw new Error(error.response?.data?.message || 'Erro ao buscar caixa');
    }
  }

  /**
   * Lista caixas com filtros opcionais
   */
  async listCashiers(filters?: {
    business_day_id?: string;
    status?: 'OPEN' | 'CLOSED';
    terminal_id?: string;
    operator_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<Cashier[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.business_day_id) params.append('business_day_id', filters.business_day_id);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.terminal_id) params.append('terminal_id', filters.terminal_id);
      if (filters?.operator_id) params.append('operator_id', filters.operator_id);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await apiInterceptor.get(
        `/api/v1/cashier?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Erro ao listar caixas:', error);
      throw new Error(error.response?.data?.message || 'Erro ao listar caixas');
    }
  }

  /**
   * Busca caixas abertos no dia atual
   */
  async getCurrentCashiers(): Promise<Cashier[]> {
    try {
      const response = await apiInterceptor.get('/api/v1/cashier/current');
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar caixas atuais:', error);
      throw new Error(error.response?.data?.message || 'Erro ao buscar caixas atuais');
    }
  }

  /**
   * Busca operações de um caixa específico
   */
  async getCashierOperations(cashierId: string, filters?: {
    operation_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.operation_type) params.append('operation_type', filters.operation_type);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await apiInterceptor.get(
        `/api/v1/cashier/${cashierId}/operations?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar operações do caixa:', error);
      throw new Error(error.response?.data?.message || 'Erro ao buscar operações do caixa');
    }
  }
}

// Instância singleton do serviço
export const cashierService = new CashierService();

