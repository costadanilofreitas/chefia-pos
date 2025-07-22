import { ApiClient } from '@common/services/apiClient';

export interface Order {
  id: number;
  order_number: string;
  source: string;
  priority: 'high' | 'medium' | 'normal';
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  customer_name?: string;
  table_number?: string;
}

export interface OrderItem {
  item_id: string;
  name: string;
  quantity: number;
  status: string;
  station: string;
  notes?: string;
  preparation_time?: number;
}

/**
 * Service for managing KDS orders and kitchen operations
 */
export class KDSService {
  private apiClient: ApiClient;

  constructor() {
    // Use the base URL from environment or default to /api
    const baseURL = process.env['REACT_APP_API_URL'] || '/api';
    this.apiClient = new ApiClient(`${baseURL}/kds`);
  }

  /**
   * Get all pending orders
   * @returns Promise with orders data
   */
  async getOrders(): Promise<Order[]> {
    try {
      const response = await this.apiClient.get<{success: boolean, data: Order[]}>('/orders');
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch orders');
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  /**
   * Get all kitchen stations
   * @returns Promise with stations data
   */
  async getStations(): Promise<{id: string, name: string}[]> {
    try {
      const response = await this.apiClient.get<{success: boolean, data: {id: string, name: string}[]}>('/stations');
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch stations');
    } catch (error) {
      console.error('Error fetching stations:', error);
      throw error;
    }
  }

  /**
   * Update the status of an order item
   * @param orderId - ID of the order
   * @param itemId - ID of the item
   * @param status - New status
   * @returns Promise with update result
   */
  async updateItemStatus(orderId: string, itemId: string, status: string): Promise<boolean> {
    try {
      const response = await this.apiClient.put<{success: boolean}>(`/orders/${orderId}/items/${itemId}/status`, {
        status
      });
      
      return response.data && response.data.success;
    } catch (error) {
      console.error(`Error updating item ${itemId} status:`, error);
      throw error;
    }
  }

  /**
   * Mark an order as complete
   * @param orderId - ID of the order
   * @returns Promise with completion result
   */
  async completeOrder(orderId: string): Promise<boolean> {
    try {
      const response = await this.apiClient.put<{success: boolean}>(`/orders/${orderId}/complete`);
      
      return response.data && response.data.success;
    } catch (error) {
      console.error(`Error completing order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get KDS performance metrics
   * @param dateRange - Time range for metrics
   * @param startDate - Custom start date (if range is 'custom')
   * @param endDate - Custom end date (if range is 'custom')
   * @returns Promise with metrics data
   */
  async getMetrics(dateRange: string = 'today', startDate?: string, endDate?: string): Promise<any> {
    try {
      const params = new URLSearchParams();
      
      if (dateRange === 'custom' && startDate && endDate) {
        params.append('start_date', startDate);
        params.append('end_date', endDate);
      } else {
        params.append('range', dateRange);
      }
      
      const response = await this.apiClient.get<{success: boolean, data: any}>(`/metrics?${params.toString()}`);
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch metrics');
    } catch (error) {
      console.error('Error fetching KDS metrics:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const kdsService = new KDSService();
