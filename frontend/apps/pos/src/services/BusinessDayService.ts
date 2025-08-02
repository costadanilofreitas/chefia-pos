import { apiInterceptor } from './ApiInterceptor';
import { API_ENDPOINTS } from '../config/api';

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
    const response = await apiInterceptor.post(
      API_ENDPOINTS.BUSINESS_DAY.OPEN,
      data
    );
    return response.data;
  }

  /**
   * Fechar dia operacional
   */
  async closeBusinessDay(businessDayId: string, data: BusinessDayClose): Promise<BusinessDay> {
    const response = await apiInterceptor.put(
      `${API_ENDPOINTS.BUSINESS_DAY.CLOSE}/${businessDayId}`,
      data
    );
    return response.data;
  }

  /**
   * Obter dia operacional atual
   */
  async getCurrentBusinessDay(): Promise<BusinessDay | null> {
    try {
      const response = await apiInterceptor.get(
        API_ENDPOINTS.BUSINESS_DAY.CURRENT
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // Nenhum dia aberto
      }
      throw error;
    }
  }

  /**
   * Obter dia operacional por ID
   */
  async getBusinessDay(businessDayId: string): Promise<BusinessDay> {
    const response = await apiInterceptor.get(
      `${API_ENDPOINTS.BUSINESS_DAY.BASE}/${businessDayId}`
    );
    return response.data;
  }

  /**
   * Listar dias operacionais
   */
  async listBusinessDays(
    startDate?: string,
    endDate?: string,
    status?: 'OPEN' | 'CLOSED'
  ): Promise<BusinessDay[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (status) params.append('status', status);

    const response = await apiInterceptor.get(
      `${API_ENDPOINTS.BUSINESS_DAY.BASE}?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obter resumo do dia operacional
   */
  async getBusinessDaySummary(businessDayId: string): Promise<BusinessDaySummary> {
    const response = await apiInterceptor.get(
      `${API_ENDPOINTS.BUSINESS_DAY.BASE}/${businessDayId}/summary`
    );
    return response.data;
  }

  /**
   * Verificar se há dia operacional aberto
   */
  async hasOpenBusinessDay(): Promise<boolean> {
    const currentDay = await this.getCurrentBusinessDay();
    return currentDay !== null && currentDay.status === 'OPEN';
  }

  /**
   * Obter status do dia operacional
   */
  async getBusinessDayStatus(): Promise<'OPEN' | 'CLOSED' | 'NONE'> {
    const currentDay = await this.getCurrentBusinessDay();
    if (!currentDay) return 'NONE';
    return currentDay.status;
  }
}

export const businessDayService = new BusinessDayService();
export default businessDayService;

