import { apiInterceptor } from './ApiInterceptor';
import { API_ENDPOINTS } from '../config/api';
import logger, { LogSource } from './LocalLoggerService';
import realtimeSync from './RealtimeSyncService';
import eventBus from '../utils/EventBus';
import {
  Cashier,
  CashierOperation,
  CashierWithdrawal,
  TerminalStatus
} from '../types/cashier';

// Re-export types for backward compatibility
export type { Cashier, TerminalStatus, CashierOperation, CashierWithdrawal } from '../types/cashier';

// Tipos específicos do serviço
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

// CashierWithdrawal type is imported from types/cashier.ts

// NOTE: Cashier, CashierOperation, and TerminalStatus types are imported from types/cashier.ts

export class CashierService {
  /**
   * Verifica o status do caixa para um terminal específico
   */
  async getTerminalStatus(terminalId: string): Promise<TerminalStatus> {
    try {
      const endpoint = API_ENDPOINTS.CASHIER.STATUS(terminalId);
      await logger.debug('Verificando status do terminal', { terminalId, endpoint }, 'CashierService', LogSource.POS);
      
      const response = await apiInterceptor.get<TerminalStatus>(endpoint);
      
      await logger.debug('Status do terminal obtido', { terminalId, status: response.data }, 'CashierService', LogSource.POS);
      return response.data;
    } catch (error) {
      await logger.error('Erro ao obter status do terminal', { terminalId, error }, 'CashierService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Abre um novo caixa
   */
  async openCashier(cashierData: CashierCreate): Promise<Cashier> {
    try {
      await logger.info('Abrindo caixa', 
        { terminalId: cashierData.terminal_id, operatorId: cashierData.operator_id, openingBalance: cashierData.opening_balance }, 
        'CashierService', 
        LogSource.POS
      );
      
      const response = await apiInterceptor.post<Cashier>(
        API_ENDPOINTS.CASHIER.OPEN,
        cashierData
      );
      
      await logger.info('Caixa aberto com sucesso', 
        { cashierId: response.data.id, terminalId: cashierData.terminal_id }, 
        'CashierService', 
        LogSource.POS
      );
      
      // Notificar outros terminais sobre abertura de caixa
      realtimeSync.notifyCreate('cashier', response.data);
      eventBus.emit('cashier:opened', response.data);
      
      return response.data;
    } catch (error) {
      await logger.critical('Erro ao abrir caixa', { cashierData, error }, 'CashierService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Fecha um caixa
   */
  async closeCashier(cashierId: string, closeData: CashierClose): Promise<Cashier> {
    try {
      await logger.info('Fechando caixa', 
        { cashierId, operatorId: closeData.operator_id, physicalCash: closeData.physical_cash_amount }, 
        'CashierService', 
        LogSource.POS
      );
      
      const response = await apiInterceptor.put<Cashier>(
        API_ENDPOINTS.CASHIER.CLOSE(cashierId),
        closeData
      );
      
      await logger.info('Caixa fechado com sucesso', 
        { cashierId, finalBalance: response.data.final_balance }, 
        'CashierService', 
        LogSource.POS
      );
      
      // Notificar outros terminais sobre fechamento de caixa
      realtimeSync.notifyUpdate('cashier', cashierId, response.data);
      eventBus.emit('cashier:closed', response.data);
      
      return response.data;
    } catch (error) {
      await logger.critical('Erro ao fechar caixa', { cashierId, error }, 'CashierService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Registra uma operação no caixa
   */
  async registerOperation(cashierId: string, operation: CashierOperation): Promise<unknown> {
    
    const response = await apiInterceptor.post(
      `/api/v1/cashier/${cashierId}/operation`,
      operation
    );
    
    // Notificar outros terminais sobre operação no caixa
    realtimeSync.notifyUpdate('cashier', cashierId, { operation: response.data });
    eventBus.emit('cashier:operation', { cashierId, operation: response.data });
    
    return response.data;
  
  }

  /**
   * Registra uma retirada (ruptura) no caixa
   */
  async registerWithdrawal(cashierId: string, withdrawal: CashierWithdrawal): Promise<CashierOperation> {
    
    const response = await apiInterceptor.post<CashierOperation>(
      API_ENDPOINTS.CASHIER.WITHDRAW(cashierId),
      withdrawal
    );
    
    // Notificar outros terminais sobre retirada
    realtimeSync.notifyUpdate('cashier', cashierId, { withdrawal: response.data });
    eventBus.emit('cashier:withdrawal', { cashierId, withdrawal: response.data });
    
    return response.data;
  
  }

  /**
   * Busca um caixa específico pelo ID
   */
  async getCashier(cashierId: string): Promise<Cashier> {
    try {
      const response = await apiInterceptor.get<Cashier>(`/api/v1/cashier/${cashierId}`);
      return response.data;
    } catch (error) {
      await logger.error('Erro ao buscar caixa', { cashierId, error }, 'CashierService', LogSource.POS);
      throw error;
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
    
    const params = new URLSearchParams();
    
    if (filters?.business_day_id) params.append('business_day_id', filters.business_day_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.terminal_id) params.append('terminal_id', filters.terminal_id);
    if (filters?.operator_id) params.append('operator_id', filters.operator_id);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await apiInterceptor.get<Cashier[]>(
      `/api/v1/cashier?${params.toString()}`
    );
    return response.data;
  
  }

  /**
   * Busca caixas abertos no dia atual
   */
  async getCurrentCashiers(): Promise<Cashier[]> {
    
    const response = await apiInterceptor.get<Cashier[]>('/api/v1/cashier/current');
    return response.data;
  
  }

  /**
   * Busca operações de um caixa específico
   */
  async getCashierOperations(cashierId: string, filters?: {
    operation_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<CashierOperation[]> {
    
    const params = new URLSearchParams();
    
    if (filters?.operation_type) params.append('operation_type', filters.operation_type);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await apiInterceptor.get<CashierOperation[]>(
      `/api/v1/cashier/${cashierId}/operations?${params.toString()}`
    );
    return response.data;
  
  }
}

// Instância singleton do serviço
export const cashierService = new CashierService();

