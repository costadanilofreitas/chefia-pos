import { ApiClient } from '@common/services/apiClient';

export interface POSConfig {
  store_id: string;
  store_name: string;
  terminal_id: string;
  printer_config: {
    receipt_printer: string;
    kitchen_printer: string;
    report_printer: string;
  };
  tax_rate: number;
  currency: string;
  offline_mode_enabled: boolean;
}

export interface CashierSession {
  id: string;
  terminal_id: string;
  employee_id: string;
  employee_name: string;
  start_time: string;
  end_time?: string;
  starting_amount: number;
  current_amount: number;
  status: 'open' | 'closed' | 'suspended';
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  image_url?: string;
  options?: ProductOption[];
  modifiers?: ProductModifier[];
  tax_exempt: boolean;
  barcode?: string;
  sku?: string;
  stock_quantity?: number;
}

export interface ProductOption {
  id: string;
  name: string;
  price_adjustment: number;
}

export interface ProductModifier {
  id: string;
  name: string;
  min_selections: number;
  max_selections: number;
  options: {
    id: string;
    name: string;
    price_adjustment: number;
  }[];
}

export interface Category {
  id: string;
  name: string;
  image_url?: string;
  parent_id?: string;
  sort_order: number;
}

export interface OrderItem {
  id: string;
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  options?: {
    option_id: string;
    name: string;
    price_adjustment: number;
  }[];
  modifiers?: {
    modifier_id: string;
    name: string;
    selections: {
      option_id: string;
      name: string;
      price_adjustment: number;
    }[];
  }[];
  notes?: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
}

export interface Order {
  id: string;
  order_number: string;
  terminal_id: string;
  cashier_id: string;
  cashier_name: string;
  customer_id?: string;
  customer_name?: string;
  table_number?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment_method?: string;
  payment_status: 'pending' | 'paid' | 'partially_paid' | 'refunded';
  order_status: 'new' | 'in_progress' | 'ready' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  delivery_info?: {
    address: string;
    phone: string;
    notes?: string;
  };
  source: 'pos' | 'kiosk' | 'online' | 'ifood' | 'whatsapp';
}

export interface PaymentTransaction {
  id: string;
  order_id: string;
  amount: number;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id?: string;
  created_at: string;
}

/**
 * Service for managing POS operations
 */
export class POSService {
  private apiClient: ApiClient;

  constructor() {
    // Use the base URL from environment or default to /api
    const baseURL = process.env['REACT_APP_API_URL'] || '/api';
    this.apiClient = new ApiClient(`${baseURL}/pos`);
  }

  /**
   * Get POS terminal configuration
   * @returns Promise with POS configuration
   */
  async getConfig(): Promise<POSConfig> {
    try {
      const response = await this.apiClient.get<{success: boolean, data: POSConfig}>('/config');
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch POS configuration');
    } catch (error) {
      console.error('Error fetching POS configuration:', error);
      throw error;
    }
  }

  /**
   * Open a new cashier session
   * @param employeeId - ID of the employee
   * @param startingAmount - Initial cash amount
   * @returns Promise with the created session
   */
  async openCashierSession(employeeId: string, startingAmount: number): Promise<CashierSession> {
    try {
      const response = await this.apiClient.post<{success: boolean, data: CashierSession}>('/cashier/open', {
        employee_id: employeeId,
        starting_amount: startingAmount
      });
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to open cashier session');
    } catch (error) {
      console.error('Error opening cashier session:', error);
      throw error;
    }
  }

  /**
   * Close the current cashier session
   * @param sessionId - ID of the session to close
   * @param finalAmount - Final cash amount
   * @returns Promise with the closed session
   */
  async closeCashierSession(sessionId: string, finalAmount: number): Promise<CashierSession> {
    try {
      const response = await this.apiClient.post<{success: boolean, data: CashierSession}>(`/cashier/${sessionId}/close`, {
        final_amount: finalAmount
      });
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to close cashier session');
    } catch (error) {
      console.error('Error closing cashier session:', error);
      throw error;
    }
  }

  /**
   * Get the current cashier session
   * @returns Promise with the current session or null if no session is open
   */
  async getCurrentCashierSession(): Promise<CashierSession | null> {
    try {
      const response = await this.apiClient.get<{success: boolean, data: CashierSession | null}>('/cashier/current');
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch current cashier session');
    } catch (error) {
      console.error('Error fetching current cashier session:', error);
      throw error;
    }
  }

  /**
   * Get all product categories
   * @returns Promise with categories data
   */
  async getCategories(): Promise<Category[]> {
    try {
      const response = await this.apiClient.get<{success: boolean, data: Category[]}>('/categories');
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch categories');
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Get all products
   * @returns Promise with products data
   */
  async getProducts(): Promise<Product[]> {
    try {
      const response = await this.apiClient.get<{success: boolean, data: Product[]}>('/products');
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch products');
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  /**
   * Get products by category
   * @param categoryId - ID of the category
   * @returns Promise with filtered products data
   */
  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    try {
      const response = await this.apiClient.get<{success: boolean, data: Product[]}>(`/products/category/${categoryId}`);
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch products by category');
    } catch (error) {
      console.error(`Error fetching products for category ${categoryId}:`, error);
      throw error;
    }
  }

  /**
   * Search products by term
   * @param searchTerm - Search term
   * @returns Promise with search results
   */
  async searchProducts(searchTerm: string): Promise<Product[]> {
    try {
      const response = await this.apiClient.get<{success: boolean, data: Product[]}>(`/products/search?q=${encodeURIComponent(searchTerm)}`);
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to search products');
    } catch (error) {
      console.error(`Error searching products with term "${searchTerm}":`, error);
      throw error;
    }
  }

  /**
   * Create a new order
   * @param orderData - Order data
   * @returns Promise with the created order
   */
  async createOrder(orderData: Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at'>): Promise<Order> {
    try {
      const response = await this.apiClient.post<{success: boolean, data: Order}>('/orders', orderData);
      
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
   * Get order by ID
   * @param orderId - ID of the order
   * @returns Promise with order data
   */
  async getOrder(orderId: string): Promise<Order> {
    try {
      const response = await this.apiClient.get<{success: boolean, data: Order}>(`/orders/${orderId}`);
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error(`Failed to fetch order ${orderId}`);
    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Update order status
   * @param orderId - ID of the order
   * @param status - New status
   * @returns Promise with update result
   */
  async updateOrderStatus(orderId: string, status: Order['order_status']): Promise<boolean> {
    try {
      const response = await this.apiClient.put<{success: boolean}>(`/orders/${orderId}/status`, {
        status
      });
      
      return response.data && response.data.success;
    } catch (error) {
      console.error(`Error updating order ${orderId} status:`, error);
      throw error;
    }
  }

  /**
   * Process payment for an order
   * @param orderId - ID of the order
   * @param paymentData - Payment data
   * @returns Promise with payment transaction
   */
  async processPayment(orderId: string, paymentData: {
    amount: number;
    payment_method: string;
    reference?: string;
  }): Promise<PaymentTransaction> {
    try {
      const response = await this.apiClient.post<{success: boolean, data: PaymentTransaction}>(`/orders/${orderId}/payment`, paymentData);
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to process payment');
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Print receipt for an order
   * @param orderId - ID of the order
   * @returns Promise with print result
   */
  async printReceipt(orderId: string): Promise<boolean> {
    try {
      const response = await this.apiClient.post<{success: boolean}>(`/orders/${orderId}/print`);
      
      return response.data && response.data.success;
    } catch (error) {
      console.error(`Error printing receipt for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get daily sales report
   * @param date - Report date (YYYY-MM-DD)
   * @returns Promise with report data
   */
  async getDailySalesReport(date: string): Promise<any> {
    try {
      const response = await this.apiClient.get<{success: boolean, data: any}>(`/reports/daily-sales?date=${date}`);
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch daily sales report');
    } catch (error) {
      console.error('Error fetching daily sales report:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const posService = new POSService();
