import { apiInterceptor } from "./ApiInterceptor";
import logger from './LocalLoggerService';
import { buildApiUrl } from '../config/api';

interface BackendRemoteOrder {
  id: string;
  platform: string;
  platform_order_id?: string;
  platformOrderId?: string;
  customer_name?: string;
  customerName?: string;
  customer_phone?: string;
  customerPhone?: string;
  customer_address?: string;
  customerAddress?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    zipCode: string;
  };
  items?: Array<{
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
  subtotal?: number;
  delivery_fee?: number;
  deliveryFee?: number;
  service_fee?: number;
  serviceFee?: number;
  discount?: number;
  total?: number;
  status?: string;
  payment_method?: string;
  paymentMethod?: string;
  payment_status?: string;
  paymentStatus?: string;
  estimated_delivery_time?: string;
  estimatedDeliveryTime?: string;
  order_type?: string;
  orderType?: string;
  observations?: string;
  created_at?: string;
  createdAt?: string;
  confirmed_at?: string;
  confirmedAt?: string;
  ready_at?: string;
  readyAt?: string;
  delivered_at?: string;
  deliveredAt?: string;
  cancelled_at?: string;
  cancelledAt?: string;
}

export interface RemoteOrder {
  id: string;
  platform: "ifood" | "rappi" | "ubereats" | "whatsapp" | "website" | "phone";
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
  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "ready"
    | "dispatched"
    | "delivered"
    | "cancelled";
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "refunded";
  estimatedDeliveryTime: Date;
  orderType: "delivery" | "pickup";
  observations?: string;
  createdAt: Date;
  confirmedAt?: Date;
  readyAt?: Date;
  deliveredAt?: Date;
}

export interface PlatformIntegration {
  platform: RemoteOrder["platform"];
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

  /**
   * Get all remote orders
   */
  async getOrders(): Promise<RemoteOrder[]> {
    const response = await apiInterceptor.get<BackendRemoteOrder[]>(
      buildApiUrl('/api/v1/remote-orders/')
    );
    return response.data.map(this.transformOrder);
  }

  /**
   * Sync platform
   */
  async syncPlatform(platform: RemoteOrder["platform"]): Promise<void> {
    try {
      await apiInterceptor.post(
        buildApiUrl(`/api/v1/remote-orders/sync/${platform}`)
      );
    } catch (error) {
      await logger.error('Failed to sync platform', { platform, error }, 'RemoteOrdersService');
    }
  }

  /**
   * Configure platform
   */
  async configurePlatform(
    platform: RemoteOrder["platform"],
    config: PlatformConfig
  ): Promise<void> {
    await apiInterceptor.put(
      buildApiUrl(`/api/v1/remote-platforms/${platform}`),
      config
    );
  }

  /**
   * Print order
   */
  async printOrder(orderId: string): Promise<void> {
    try {
      await apiInterceptor.post(
        buildApiUrl(`/api/v1/remote-orders/${orderId}/print`)
      );
    } catch (error) {
      await logger.error('Failed to print order', { orderId, error }, 'RemoteOrdersService');
    }
  }

  /**
   * Get platform integrations
   */
  async getIntegrations(): Promise<PlatformIntegration[]> {
    try {
      const response = await apiInterceptor.get<PlatformIntegration[]>(
        buildApiUrl('/api/v1/remote-platforms/integrations')
      );
      return response.data;
    } catch (error) {
      await logger.warn('Failed to get platform configs', { error }, 'RemoteOrdersService');
      return [];
    }
  }

  /**
   * Accept order
   */
  async acceptOrder(orderId: string): Promise<RemoteOrder> {
    const response = await apiInterceptor.post<RemoteOrder>(
      buildApiUrl(`/api/v1/remote-orders/${orderId}/accept`)
    );
    return response.data;
  }

  /**
   * Reject order
   */
  async rejectOrder(orderId: string, reason?: string): Promise<void> {
    await apiInterceptor.post(
      buildApiUrl(`/api/v1/remote-orders/${orderId}/reject`),
      { reason }
    );
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    await apiInterceptor.put(
      buildApiUrl(`/api/v1/remote-orders/${orderId}/status`),
      { status }
    );
  }

  /**
   * Get statistics summary
   */
  async getStatsSummary(): Promise<unknown> {
    try {
      const response = await apiInterceptor.get(
        buildApiUrl('/api/v1/remote-orders/stats/summary')
      );
      return response.data;
    } catch (error) {
      await logger.warn('Failed to get remote orders summary', { error }, 'RemoteOrdersService');
      return {
        total_orders: 0,
        pending_orders: 0,
        today_revenue: 0,
      };
    }
  }

  /**
   * Transform backend order to frontend format
   */
  private transformOrder(order: BackendRemoteOrder): RemoteOrder {
    return {
      id: order.id,
      platform: (order.platform as RemoteOrder["platform"]) || "phone",
      platformOrderId: order.platform_order_id || order.platformOrderId || "",
      customerName: order.customer_name || order.customerName || "Cliente",
      customerPhone: order.customer_phone || order.customerPhone || "",
      customerAddress:
        typeof order.customer_address === "string"
          ? undefined
          : order.customer_address || order.customerAddress,
      items: order.items || [],
      subtotal: order.subtotal || 0,
      deliveryFee: order.delivery_fee || order.deliveryFee || 0,
      serviceFee: order.service_fee || order.serviceFee || 0,
      discount: order.discount || 0,
      total: order.total || 0,
      status: (order.status as RemoteOrder["status"]) || "pending",
      paymentMethod: order.payment_method || order.paymentMethod || "cash",
      paymentStatus: (order.payment_status ||
        order.paymentStatus ||
        "pending") as RemoteOrder["paymentStatus"],
      estimatedDeliveryTime: new Date(
        order.estimated_delivery_time ||
          order.estimatedDeliveryTime ||
          Date.now() + 3600000
      ),
      orderType: (order.order_type ||
        order.orderType ||
        "delivery") as RemoteOrder["orderType"],
      observations: order.observations,
      createdAt: new Date(order.created_at || order.createdAt || Date.now()),
      confirmedAt:
        order.confirmed_at || order.confirmedAt
          ? new Date(order.confirmed_at || order.confirmedAt || "")
          : undefined,
      readyAt:
        order.ready_at || order.readyAt
          ? new Date(order.ready_at || order.readyAt || "")
          : undefined,
      deliveredAt:
        order.delivered_at || order.deliveredAt
          ? new Date(order.delivered_at || order.deliveredAt || "")
          : undefined,
    };
  }
}

// Export singleton instance
export const remoteOrdersService = new RemoteOrdersServiceClass();
