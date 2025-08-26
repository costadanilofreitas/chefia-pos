import { apiInterceptor } from './ApiInterceptor';
import { API_ENDPOINTS } from '../config/api';
import logger, { LogSource } from './LocalLoggerService';

export interface BusinessDay {
  id: string;
  date: string;
  status: 'OPEN' | 'CLOSED';
  opened_at: string;
  closed_at?: string;
  opened_by: string;
  closed_by?: string;
  total_sales?: number;
  total_orders?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessDayCreate {
  store_id: string;
  date: string;
  opened_by: string;
  notes?: string;
}

export interface BusinessDayClose {
  closed_by: string;
  notes?: string;
}

export interface BusinessDaySummary {
  total_sales: number;
  total_orders: number;
  cash_sales: number;
  card_sales: number;
  pix_sales: number;
  average_ticket: number;
  top_products: Array<{
    product_name: string;
    quantity: number;
    total: number;
  }>;
}

class BusinessDayService {
  /**
   * Abrir dia operacional
   */
  async openBusinessDay(data: BusinessDayCreate): Promise<BusinessDay> {
    try {
      await logger.info('Abrindo dia operacional', data, 'BusinessDayService', LogSource.POS);
      
      const response = await apiInterceptor.post<BusinessDay>(
        API_ENDPOINTS.BUSINESS_DAY.OPEN,
        data
      );
      
      await logger.info('Dia operacional aberto com sucesso', 
        { businessDayId: response.data.id, date: response.data.date }, 
        'BusinessDayService', 
        LogSource.POS
      );
      return response.data;
    } catch (error) {
      await logger.critical('Erro crítico ao abrir dia operacional', { data, error }, 'BusinessDayService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Fechar dia operacional
   */
  async closeBusinessDay(businessDayId: string, data: BusinessDayClose): Promise<BusinessDay> {
    try {
      await logger.info('Fechando dia operacional', { businessDayId, ...data }, 'BusinessDayService', LogSource.POS);
      
      const response = await apiInterceptor.put<BusinessDay>(
        `${API_ENDPOINTS.BUSINESS_DAY.CLOSE}/${businessDayId}`,
        data
      );
      
      await logger.info('Dia operacional fechado com sucesso', 
        { businessDayId, totalSales: response.data.total_sales, totalOrders: response.data.total_orders }, 
        'BusinessDayService', 
        LogSource.POS
      );
      return response.data;
    } catch (error) {
      await logger.critical('Erro crítico ao fechar dia operacional', { businessDayId, data, error }, 'BusinessDayService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Obter dia operacional atual
   */
  async getCurrentBusinessDay(): Promise<BusinessDay | null> {
    try {
      await logger.debug('Buscando dia operacional atual', {}, 'BusinessDayService', LogSource.POS);
      
      const response = await apiInterceptor.get<BusinessDay>(
        API_ENDPOINTS.BUSINESS_DAY.CURRENT
      );
      
      await logger.debug('Dia operacional atual encontrado', { businessDayId: response.data.id }, 'BusinessDayService', LogSource.POS);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        await logger.debug('Nenhum dia operacional aberto', {}, 'BusinessDayService', LogSource.POS);
        return null; // Nenhum dia aberto
      }
      await logger.error('Erro ao buscar dia operacional atual', error, 'BusinessDayService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Obter dia operacional por ID
   */
  async getBusinessDay(businessDayId: string): Promise<BusinessDay> {
    try {
      await logger.debug('Buscando dia operacional por ID', { businessDayId }, 'BusinessDayService', LogSource.POS);
      
      const response = await apiInterceptor.get<BusinessDay>(
        `${API_ENDPOINTS.BUSINESS_DAY.BASE}/${businessDayId}`
      );
      
      return response.data;
    } catch (error) {
      await logger.error('Erro ao buscar dia operacional', { businessDayId, error }, 'BusinessDayService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Listar dias operacionais
   */
  async listBusinessDays(
    startDate?: string,
    endDate?: string,
    status?: 'OPEN' | 'CLOSED'
  ): Promise<BusinessDay[]> {
    try {
      await logger.debug('Listando dias operacionais', { startDate, endDate, status }, 'BusinessDayService', LogSource.POS);
      
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (status) params.append('status', status);

      const response = await apiInterceptor.get<BusinessDay[]>(
        `${API_ENDPOINTS.BUSINESS_DAY.BASE}?${params.toString()}`
      );
      
      await logger.debug(`${response.data.length} dias operacionais encontrados`, { count: response.data.length }, 'BusinessDayService', LogSource.POS);
      return response.data;
    } catch (error) {
      await logger.error('Erro ao listar dias operacionais', { startDate, endDate, status, error }, 'BusinessDayService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Obter resumo do dia operacional
   */
  async getBusinessDaySummary(businessDayId: string): Promise<BusinessDaySummary> {
    try {
      await logger.debug('Obtendo resumo do dia operacional', { businessDayId }, 'BusinessDayService', LogSource.POS);
      
      const response = await apiInterceptor.get<BusinessDaySummary>(
        `${API_ENDPOINTS.BUSINESS_DAY.BASE}/${businessDayId}/summary`
      );
      
      await logger.info('Resumo do dia operacional obtido', 
        { businessDayId, totalSales: response.data.total_sales, totalOrders: response.data.total_orders }, 
        'BusinessDayService', 
        LogSource.POS
      );
      return response.data;
    } catch (error) {
      await logger.error('Erro ao obter resumo do dia operacional', { businessDayId, error }, 'BusinessDayService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Verificar se há dia operacional aberto
   */
  async hasOpenBusinessDay(): Promise<boolean> {
    try {
      const currentDay = await this.getCurrentBusinessDay();
      const hasOpen = currentDay !== null && currentDay.status === 'OPEN';
      
      await logger.debug('Verificação de dia operacional aberto', { hasOpen }, 'BusinessDayService', LogSource.POS);
      return hasOpen;
    } catch (error) {
      await logger.error('Erro ao verificar dia operacional aberto', error, 'BusinessDayService', LogSource.POS);
      throw error;
    }
  }

  /**
   * Obter status do dia operacional
   */
  async getBusinessDayStatus(): Promise<'OPEN' | 'CLOSED' | 'NONE'> {
    try {
      const currentDay = await this.getCurrentBusinessDay();
      const status = !currentDay ? 'NONE' : currentDay.status;
      
      await logger.debug('Status do dia operacional', { status }, 'BusinessDayService', LogSource.POS);
      return status;
    } catch (error) {
      await logger.error('Erro ao obter status do dia operacional', error, 'BusinessDayService', LogSource.POS);
      throw error;
    }
  }
}

export const businessDayService = new BusinessDayService();
export default businessDayService;

