import { apiService, ApiResponse } from './api';
import { API_CONFIG } from '../config/api';

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
  status: 'preparing' | 'ready' | 'delivered' | 'cancelled';
  notes?: string;
}

export interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  category_id: number;
  available: boolean;
  image_url?: string;
}

export interface Order {
  id: number;
  table_id: number;
  status: 'new' | 'in_progress' | 'ready' | 'delivered' | 'paid' | 'cancelled';
  items: OrderItem[];
  created_at: string;
  updated_at?: string;
  total?: number;
}

/**
 * Service for managing waiter operations
 */
export class WaiterService {
  constructor() {
    // Service initialized
  }

  /**
   * Get all tables with their current status
   * @returns Promise with tables data
   */
  async getTables(): Promise<Table[]> {
    const response = await apiService.get<ApiResponse<Table[]>>(API_CONFIG.ENDPOINTS.WAITER.TABLES);
    
    if (response && response.success) {
      return response.data;
    }
    
    throw new Error('Failed to fetch tables');
  }

  /**
   * Get all active orders
   * @returns Promise with orders data
   */
  async getOrders(): Promise<Order[]> {
    const response = await apiService.get<ApiResponse<Order[]>>(API_CONFIG.ENDPOINTS.WAITER.ORDERS);
    
    if (response && response.success) {
      return response.data;
    }
    
    throw new Error('Failed to fetch orders');
  }

  /**
   * Get orders for a specific table
   * @param tableId - ID of the table
   * @returns Promise with table orders data
   */
  async getOrdersByTable(tableId: number): Promise<Order[]> {
    const response = await apiService.get<ApiResponse<Order[]>>(API_CONFIG.ENDPOINTS.WAITER.TABLE_ORDERS(tableId));
    
    if (response && response.success) {
      return response.data;
    }
    
    throw new Error(`Failed to fetch orders for table ${tableId}`);
  }

  /**
   * Create a new order for a table
   * @param tableId - ID of the table
   * @param items - Order items
   * @returns Promise with the created order
   */
  async createOrder(tableId: number, items: Omit<OrderItem, 'id' | 'status'>[]): Promise<Order> {
    const response = await apiService.post<ApiResponse<Order>>(API_CONFIG.ENDPOINTS.WAITER.CREATE_ORDER(tableId), {
      items
    });
    
    if (response && response.success) {
      return response.data;
    }
    
    throw new Error('Failed to create order');
  }

  /**
   * Update table status
   * @param tableId - ID of the table
   * @param status - New status
   * @returns Promise with update result
   */
  async updateTableStatus(tableId: number, status: Table['status']): Promise<boolean> {
    const response = await apiService.put<ApiResponse<null>>(API_CONFIG.ENDPOINTS.WAITER.UPDATE_TABLE_STATUS(tableId), {
      status
    });
    
    return response && response.success;
  }

  /**
   * Mark order items as delivered
   * @param orderId - ID of the order
   * @param itemIds - IDs of the items to mark as delivered
   * @returns Promise with update result
   */
  async deliverOrderItems(orderId: number, itemIds: number[]): Promise<boolean> {
    const response = await apiService.put<ApiResponse<null>>(API_CONFIG.ENDPOINTS.WAITER.DELIVER_ITEMS(orderId), {
      item_ids: itemIds
    });
    
    return response && response.success;
  }

  /**
   * Get menu categories and items
   * @returns Promise with menu data
   */
  async getMenu(): Promise<{categories: {id: number, name: string}[], items: MenuItem[]}> {
    const response = await apiService.get<ApiResponse<{categories: {id: number, name: string}[], items: MenuItem[]}>>(API_CONFIG.ENDPOINTS.WAITER.MENU);
    
    if (response && response.success) {
      return response.data;
    }
    
    throw new Error('Failed to fetch menu');
  }
}

// Export a singleton instance
export const waiterService = new WaiterService();
