import { ApiService } from './api';
import { logger } from './logger';

export interface Order {
  id: number;
  order_number: string;
  source: string;
  status: string;
  type?: 'delivery' | 'table' | 'takeout' | string;
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

export interface Station {
  id: string;
  name: string;
  active: boolean;
  order_count?: number;
}

export interface KDSMetrics {
  total_orders: number;
  completed_orders: number;
  average_preparation_time: number;
  orders_by_station: Record<string, number>;
  peak_hours: number[];
}

/**
 * Service for managing KDS orders and kitchen operations
 */
export class KDSService {
  private baseEndpoint = '/kds';

  /**
   * Get all pending orders
   * @returns Promise with orders data
   */
  async getOrders(): Promise<Order[]> {
    try {
      const response = await ApiService.get<{ success: boolean; data: Order[] }>(
        `${this.baseEndpoint}/orders`
      );
      
      if (response.success) {
        return response.data;
      }
      
      throw new Error('Failed to fetch orders');
    } catch (error) {
      logger.error('Error fetching orders', error, 'KDSService');
      throw error;
    }
  }

  /**
   * Get all kitchen stations
   * @returns Promise with stations data
   */
  async getStations(): Promise<Station[]> {
    try {
      const response = await ApiService.get<{ success: boolean; data: Station[] }>(
        `${this.baseEndpoint}/stations`
      );
      
      if (response.success) {
        return response.data;
      }
      
      throw new Error('Failed to fetch stations');
    } catch (error) {
      logger.error('Error fetching stations', error, 'KDSService');
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
  async updateItemStatus(orderId: string | number, itemId: string | number, status: string): Promise<boolean> {
    try {
      const response = await ApiService.put<{ success: boolean }>(
        `${this.baseEndpoint}/orders/${orderId}/items/${itemId}/status`,
        { status }
      );
      
      return response.success;
    } catch (error) {
      logger.error(`Error updating item ${itemId} status`, error, 'KDSService');
      throw error;
    }
  }

  /**
   * Update the status of an entire order
   * @param orderId - ID of the order
   * @param status - New status
   * @returns Promise with update result
   */
  async updateOrderStatus(orderId: string | number, status: string): Promise<boolean> {
    try {
      const response = await ApiService.put<{ success: boolean }>(
        `${this.baseEndpoint}/orders/${orderId}/status`,
        { status }
      );
      
      return response.success;
    } catch (error) {
      logger.error(`Error updating order ${orderId} status`, error, 'KDSService');
      throw error;
    }
  }

  /**
   * Mark an order as complete
   * @param orderId - ID of the order
   * @returns Promise with completion result
   */
  async completeOrder(orderId: string | number): Promise<boolean> {
    try {
      const response = await ApiService.put<{ success: boolean }>(
        `${this.baseEndpoint}/orders/${orderId}/complete`,
        {}
      );
      
      return response.success;
    } catch (error) {
      logger.error(`Error completing order ${orderId}`, error, 'KDSService');
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
  async getMetrics(dateRange: string = 'today', startDate?: string, endDate?: string): Promise<KDSMetrics> {
    try {
      const params = new URLSearchParams();
      
      if (dateRange === 'custom' && startDate && endDate) {
        params.append('start_date', startDate);
        params.append('end_date', endDate);
      } else {
        params.append('range', dateRange);
      }
      
      const response = await ApiService.get<{ success: boolean; data: KDSMetrics }>(
        `${this.baseEndpoint}/metrics?${params.toString()}`
      );
      
      if (response.success) {
        return response.data;
      }
      
      throw new Error('Failed to fetch metrics');
    } catch (error) {
      logger.error('Error fetching KDS metrics', error, 'KDSService');
      throw error;
    }
  }

  /**
   * Get orders by station
   * @param stationId - ID of the station
   * @returns Promise with filtered orders
   */
  async getOrdersByStation(stationId: string): Promise<Order[]> {
    try {
      const response = await ApiService.get<{ success: boolean; data: Order[] }>(
        `${this.baseEndpoint}/stations/${stationId}/orders`
      );
      
      if (response.success) {
        return response.data;
      }
      
      throw new Error(`Failed to fetch orders for station ${stationId}`);
    } catch (error) {
      logger.error(`Error fetching orders for station ${stationId}`, error, 'KDSService');
      throw error;
    }
  }
}

// Export a singleton instance
export const kdsService = new KDSService();