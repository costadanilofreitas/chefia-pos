import { ApiClient } from '@common/services/apiClient';

export interface Table {
  id: number;
  number: number;
  status: 'available' | 'occupied' | 'reserved';
  seats: number;
  shape: 'square' | 'round' | 'rectangle';
  x: number;
  y: number;
}

export interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  status: 'preparing' | 'ready' | 'delivered';
  notes?: string;
}

export interface Order {
  id: number;
  table_id: number;
  status: 'new' | 'in_progress' | 'ready' | 'delivered' | 'paid';
  items: OrderItem[];
  created_at: string;
  updated_at?: string;
  total?: number;
}

/**
 * Service for managing waiter operations
 */
export class WaiterService {
  private apiClient: ApiClient;

  constructor() {
    // Use the base URL from environment or default to /api
    const baseURL = process.env.REACT_APP_API_URL || '/api';
    this.apiClient = new ApiClient(`${baseURL}/waiter`);
  }

  /**
   * Get all tables with their current status
   * @returns Promise with tables data
   */
  async getTables(): Promise<Table[]> {
    try {
      const response = await this.apiClient.get<{success: boolean, data: Table[]}>('/tables');
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch tables');
    } catch (error) {
      console.error('Error fetching tables:', error);
      throw error;
    }
  }

  /**
   * Get all active orders
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
   * Get orders for a specific table
   * @param tableId - ID of the table
   * @returns Promise with table orders data
   */
  async getOrdersByTable(tableId: number): Promise<Order[]> {
    try {
      const response = await this.apiClient.get<{success: boolean, data: Order[]}>(`/tables/${tableId}/orders`);
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error(`Failed to fetch orders for table ${tableId}`);
    } catch (error) {
      console.error(`Error fetching orders for table ${tableId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new order for a table
   * @param tableId - ID of the table
   * @param items - Order items
   * @returns Promise with the created order
   */
  async createOrder(tableId: number, items: Omit<OrderItem, 'id' | 'status'>[]): Promise<Order> {
    try {
      const response = await this.apiClient.post<{success: boolean, data: Order}>(`/tables/${tableId}/orders`, {
        items
      });
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to create order');
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Update table status
   * @param tableId - ID of the table
   * @param status - New status
   * @returns Promise with update result
   */
  async updateTableStatus(tableId: number, status: Table['status']): Promise<boolean> {
    try {
      const response = await this.apiClient.put<{success: boolean}>(`/tables/${tableId}/status`, {
        status
      });
      
      return response.data && response.data.success;
    } catch (error) {
      console.error(`Error updating table ${tableId} status:`, error);
      throw error;
    }
  }

  /**
   * Mark order items as delivered
   * @param orderId - ID of the order
   * @param itemIds - IDs of the items to mark as delivered
   * @returns Promise with update result
   */
  async deliverOrderItems(orderId: number, itemIds: number[]): Promise<boolean> {
    try {
      const response = await this.apiClient.put<{success: boolean}>(`/orders/${orderId}/deliver`, {
        item_ids: itemIds
      });
      
      return response.data && response.data.success;
    } catch (error) {
      console.error(`Error marking items as delivered for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get menu categories and items
   * @returns Promise with menu data
   */
  async getMenu(): Promise<{categories: {id: number, name: string}[], items: any[]}> {
    try {
      const response = await this.apiClient.get<{success: boolean, data: {categories: any[], items: any[]}}>('/menu');
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch menu');
    } catch (error) {
      console.error('Error fetching menu:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const waiterService = new WaiterService();
