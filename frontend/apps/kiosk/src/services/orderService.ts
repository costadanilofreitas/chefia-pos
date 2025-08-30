import apiClient from './apiClient';
import { API_CONFIG } from '../config/api';
import { offlineStorage } from './offlineStorage';
import { errorHandler } from './errorHandler';
import { CartItem } from '../contexts/CartContext';
import { Order, OrderType, PaymentMethod } from '../contexts/OrderContext';

// Types
export interface CreateOrderRequest {
  items: Array<{
    product_id: string;
    quantity: number;
    price: number;
    customizations?: {
      additions?: Array<{ id: string; name: string; price: number }>;
      removals?: Array<{ id: string; name: string }>;
      notes?: string;
    };
  }>;
  type: OrderType;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  notes?: string;
  payment_method?: PaymentMethod;
  subtotal: number;
  tax: number;
  total: number;
}

export interface OrderResponse extends Order {
  payment_url?: string;
  payment_qr_code?: string;
  estimated_time?: number;
}

export interface OrderStatusUpdate {
  status: Order['status'];
  notes?: string;
}

export interface PaymentRequest {
  order_id: string;
  payment_method: PaymentMethod;
  amount: number;
  card_token?: string;
  pix_key?: string;
  installments?: number;
}

export interface PaymentResponse {
  success: boolean;
  transaction_id?: string;
  payment_url?: string;
  qr_code?: string;
  qr_code_text?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
}

/**
 * Order Service for Kiosk self-service operations
 */
class OrderService {
  /**
   * Create a new order
   */
  async createOrder(request: CreateOrderRequest): Promise<OrderResponse> {
    const timer = offlineStorage.startTimer('Create Order');
    
    try {
      offlineStorage.log('Creating order', {
        type: request.type,
        items: request.items.length,
        total: request.total
      });

      const response = await apiClient.post<OrderResponse>(
        API_CONFIG.ENDPOINTS.SELFSERVICE.ORDER,
        request
      );
      
      const order = response.data;
      
      timer();
      offlineStorage.log('Order created successfully', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: order.total
      });
      
      // Track user action
      offlineStorage.trackAction('order_created', {
        orderId: order.id,
        type: order.type,
        total: order.total,
        itemCount: order.items.length
      });
      
      return order;
    } catch (error) {
      offlineStorage.error('Failed to create order', error);
      throw errorHandler.handle(error, 'OrderService.createOrder');
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<OrderResponse> {
    const timer = offlineStorage.startTimer('Get Order');
    
    try {
      const response = await apiClient.get<OrderResponse>(
        API_CONFIG.ENDPOINTS.ORDERS.DETAIL(orderId)
      );
      
      const order = response.data;
      
      timer();
      offlineStorage.log('Order fetched', { 
        orderId: order.id,
        status: order.status 
      });
      
      return order;
    } catch (error) {
      offlineStorage.error(`Failed to fetch order ${orderId}`, error);
      throw errorHandler.handle(error, 'OrderService.getOrder');
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, update: OrderStatusUpdate): Promise<OrderResponse> {
    const timer = offlineStorage.startTimer('Update Order Status');
    
    try {
      const response = await apiClient.patch<OrderResponse>(
        API_CONFIG.ENDPOINTS.ORDERS.STATUS(orderId),
        update
      );
      
      const order = response.data;
      
      timer();
      offlineStorage.log('Order status updated', {
        orderId: order.id,
        newStatus: order.status
      });
      
      return order;
    } catch (error) {
      offlineStorage.error(`Failed to update order ${orderId}`, error);
      throw errorHandler.handle(error, 'OrderService.updateOrderStatus');
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, reason?: string): Promise<void> {
    const timer = offlineStorage.startTimer('Cancel Order');
    
    try {
      await apiClient.post(
        API_CONFIG.ENDPOINTS.ORDERS.CANCEL(orderId),
        { reason }
      );
      
      timer();
      offlineStorage.log('Order cancelled', { orderId, reason });
      
      // Track cancellation
      offlineStorage.trackAction('order_cancelled', { orderId, reason });
    } catch (error) {
      offlineStorage.error(`Failed to cancel order ${orderId}`, error);
      throw errorHandler.handle(error, 'OrderService.cancelOrder');
    }
  }

  /**
   * Process payment for an order
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const timer = offlineStorage.startTimer('Process Payment');
    
    try {
      offlineStorage.log('Processing payment', {
        orderId: request.order_id,
        method: request.payment_method,
        amount: request.amount
      });

      const response = await apiClient.post<PaymentResponse>(
        API_CONFIG.ENDPOINTS.PAYMENTS.PROCESS,
        request,
        {
          timeout: 60000 // 60 seconds for payment processing
        }
      );
      
      const payment = response.data;
      
      timer();
      
      if (payment.success) {
        offlineStorage.log('Payment successful', {
          orderId: request.order_id,
          transactionId: payment.transaction_id
        });
        
        // Track successful payment
        offlineStorage.trackAction('payment_success', {
          orderId: request.order_id,
          method: request.payment_method,
          amount: request.amount
        });
      } else {
        offlineStorage.warn('Payment failed', {
          orderId: request.order_id,
          message: payment.message
        });
        
        // Track failed payment
        offlineStorage.trackAction('payment_failed', {
          orderId: request.order_id,
          method: request.payment_method,
          reason: payment.message
        });
      }
      
      return payment;
    } catch (error) {
      offlineStorage.error('Payment processing error', error);
      
      // Track payment error
      offlineStorage.trackAction('payment_error', {
        orderId: request.order_id,
        error: (error as any)?.message
      });
      
      throw errorHandler.handlePaymentError(
        'Erro ao processar pagamento',
        request.payment_method,
        { orderId: request.order_id }
      );
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    try {
      const response = await apiClient.get<PaymentResponse>(
        API_CONFIG.ENDPOINTS.PAYMENTS.STATUS(paymentId)
      );
      
      return response.data;
    } catch (error) {
      offlineStorage.error(`Failed to get payment status ${paymentId}`, error);
      throw errorHandler.handle(error, 'OrderService.getPaymentStatus');
    }
  }

  /**
   * Validate self-service code
   */
  async validateCode(code: string): Promise<{ valid: boolean; message?: string }> {
    try {
      const response = await apiClient.post<{ valid: boolean; message?: string }>(
        API_CONFIG.ENDPOINTS.SELFSERVICE.VALIDATE_CODE,
        { code }
      );
      
      offlineStorage.log('Code validation', { 
        code,
        valid: response.data.valid 
      });
      
      return response.data;
    } catch (error) {
      offlineStorage.error('Code validation failed', error);
      throw errorHandler.handle(error, 'OrderService.validateCode');
    }
  }

  /**
   * Start self-service session
   */
  async startSession(): Promise<{ session_id: string; expires_at: string }> {
    try {
      const response = await apiClient.post<{ session_id: string; expires_at: string }>(
        API_CONFIG.ENDPOINTS.SELFSERVICE.START_SESSION
      );
      
      const session = response.data;
      
      offlineStorage.log('Session started', { 
        sessionId: session.session_id,
        expiresAt: session.expires_at 
      });
      
      // Track session start
      offlineStorage.trackAction('session_started', {
        sessionId: session.session_id
      });
      
      return session;
    } catch (error) {
      offlineStorage.error('Failed to start session', error);
      throw errorHandler.handle(error, 'OrderService.startSession');
    }
  }

  /**
   * End self-service session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      await apiClient.post(
        API_CONFIG.ENDPOINTS.SELFSERVICE.END_SESSION,
        { session_id: sessionId }
      );
      
      offlineStorage.log('Session ended', { sessionId });
      
      // Track session end
      offlineStorage.trackAction('session_ended', { sessionId });
    } catch (error) {
      offlineStorage.error('Failed to end session', error);
      // Don't throw - session cleanup is not critical
    }
  }

  /**
   * Calculate order totals
   */
  calculateTotals(items: CartItem[], taxRate: number = 0.1): {
    subtotal: number;
    tax: number;
    total: number;
  } {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  /**
   * Format order for display
   */
  formatOrderNumber(orderNumber: string): string {
    // Format as K-XXX for kiosk orders
    if (orderNumber.startsWith('K')) {
      return orderNumber;
    }
    return `K-${orderNumber}`;
  }

  /**
   * Estimate preparation time based on items
   */
  estimatePreparationTime(items: CartItem[]): number {
    // Simple estimation: 5 minutes base + 2 minutes per item
    const baseTime = 5;
    const perItemTime = 2;
    const totalTime = baseTime + (items.length * perItemTime);
    
    // Cap at 30 minutes
    return Math.min(totalTime, 30);
  }
}

// Export singleton instance
export const orderService = new OrderService();

// Also export class for testing
export { OrderService };