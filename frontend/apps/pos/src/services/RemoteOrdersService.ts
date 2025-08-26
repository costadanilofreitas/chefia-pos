import { apiInterceptor } from './ApiInterceptor';

export interface RemoteOrder {
  id: string;
  platform: 'ifood' | 'rappi' | 'ubereats' | 'whatsapp' | 'website' | 'phone';
  platformOrderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    zipCode: string;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    observations?: string;
    modifiers?: Array<{
      name: string;
      price: number;
    }>;
  }>;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled';
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  estimatedDeliveryTime: Date;
  orderType: 'delivery' | 'pickup';
  observations?: string;
  createdAt: Date;
  confirmedAt?: Date;
  readyAt?: Date;
  deliveredAt?: Date;
}

export interface PlatformIntegration {
  platform: RemoteOrder['platform'];
  name: string;
  icon: string;
  color: string;
  connected: boolean;
  lastSync?: Date;
  pendingOrders: number;
  todayOrders: number;
  todayRevenue: number;
}

export interface PlatformConfig {
  apiToken?: string;
  establishmentId?: string;
  autoAccept?: boolean;
  autoSync?: boolean;
  webhookUrl?: string;
}

class RemoteOrdersServiceClass {
  private baseURL = 'http://localhost:8001/api/v1';

  /**
   * Get all remote orders
   */
  async getOrders(): Promise<RemoteOrder[]> {
    
    const response = await apiInterceptor.get<any[]>(`${this.baseURL}/remote-orders/`);
    return response.data.map(this.transformOrder);
  
  }

  /**
   * Sync platform
   */
  async syncPlatform(platform: RemoteOrder['platform']): Promise<void> {
    try {
      await apiInterceptor.post(`${this.baseURL}/remote-orders/sync/${platform}`);
    } catch {
// console.error('Error syncing platform:', error);
    }
  }

  /**
   * Configure platform
   */
  async configurePlatform(platform: RemoteOrder['platform'], config: PlatformConfig): Promise<void> {
    await apiInterceptor.put(`${this.baseURL}/remote-platforms/${platform}`, config);
    
  }

  /**
   * Print order
   */
  async printOrder(orderId: string): Promise<void> {
    try {
      await apiInterceptor.post(`${this.baseURL}/remote-orders/${orderId}/print`);
    } catch {
// console.error('Error printing order:', error);
    }
  }

  /**
   * Get platform integrations
   */
  async getIntegrations(): Promise<PlatformIntegration[]> {
    try {
      const response = await apiInterceptor.get<PlatformIntegration[]>(`${this.baseURL}/remote-platforms/integrations`);
      return response.data;
    } catch {
      return [];
    }
  }

  /**
   * Accept order
   */
  async acceptOrder(orderId: string): Promise<RemoteOrder> {
    const response = await apiInterceptor.post<RemoteOrder>(`${this.baseURL}/remote-orders/${orderId}/accept`);
    return response.data;
  }

  /**
   * Reject order
   */
  async rejectOrder(orderId: string, reason?: string): Promise<void> {
    await apiInterceptor.post(`${this.baseURL}/remote-orders/${orderId}/reject`, { reason });
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    await apiInterceptor.put(`${this.baseURL}/remote-orders/${orderId}/status`, { status });
  }

  /**
   * Get statistics summary
   */
  async getStatsSummary(): Promise<unknown> {
    try {
      const response = await apiInterceptor.get(`${this.baseURL}/remote-orders/stats/summary`);
      return response.data;
    } catch {
// console.error('Error fetching stats:', error);
      return {
        total_orders: 0,
        pending_orders: 0,
        today_revenue: 0
      };
    }
  }

  /**
   * Transform backend order to frontend format
   */
  private transformOrder(order: any): RemoteOrder {
    return {
      id: order.id,
      platform: order.platform,
      platformOrderId: order.platform_order_id || order.platformOrderId,
      customerName: order.customer_name || order.customerName || 'Cliente',
      customerPhone: order.customer_phone || order.customerPhone || '',
      customerAddress: order.customer_address || order.customerAddress,
      items: order.items || [],
      subtotal: order.subtotal || 0,
      deliveryFee: order.delivery_fee || order.deliveryFee || 0,
      serviceFee: order.service_fee || order.serviceFee || 0,
      discount: order.discount || 0,
      total: order.total || 0,
      status: order.status || 'pending',
      paymentMethod: order.payment_method || order.paymentMethod || 'cash',
      paymentStatus: order.payment_status || order.paymentStatus || 'pending',
      estimatedDeliveryTime: new Date(order.estimated_delivery_time || Date.now() + 3600000),
      orderType: order.order_type || order.orderType || 'delivery',
      observations: order.observations,
      createdAt: new Date(order.created_at || order.createdAt || Date.now()),
      confirmedAt: order.confirmed_at ? new Date(order.confirmed_at) : undefined,
      readyAt: order.ready_at ? new Date(order.ready_at) : undefined,
      deliveredAt: order.delivered_at ? new Date(order.delivered_at) : undefined
    };
  }

}

// Export singleton instance
export const remoteOrdersService = new RemoteOrdersServiceClass();