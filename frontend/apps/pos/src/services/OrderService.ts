import axios, { AxiosResponse } from 'axios';
import { ApiInterceptor } from './ApiInterceptor';
import {
  Order,
  OrderCreate,
  OrderUpdate,
  OrderItem,
  OrderItemCreate,
  OrderItemUpdate,
  OrderFilters,
  OrderResponse,
  OrderListResponse,
  OrderStats,
  PaymentData,
  ProcessPaymentData,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus
} from '../types/order';

/**
 * Serviço para gerenciamento de pedidos
 * Integração com backend API
 */
export class OrderService {
  private baseURL = 'http://localhost:8001/api/v1';
  private apiInterceptor = ApiInterceptor.getInstance();

  /**
   * Criar um novo pedido
   */
  async createOrder(orderData: OrderCreate): Promise<Order> {
    console.log('🔥 OrderService: Criando pedido', orderData);
    
    try {
      const response: AxiosResponse<Order> = await this.apiInterceptor.getAxiosInstance().post(
        `${this.baseURL}/orders/`,
        orderData
      );

      console.log('✅ OrderService: Pedido criado com sucesso', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ OrderService: Erro ao criar pedido', error);
      throw new Error(error.response?.data?.message || 'Erro ao criar pedido');
    }
  }

  /**
   * Buscar pedido por ID
   */
  async getOrder(orderId: string): Promise<Order> {
    console.log('🔍 OrderService: Buscando pedido', orderId);
    
    try {
      const response: AxiosResponse<Order> = await this.apiInterceptor.getAxiosInstance().get(
        `${this.baseURL}/orders/${orderId}`
      );

      console.log('✅ OrderService: Pedido encontrado', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ OrderService: Erro ao buscar pedido', error);
      throw new Error(error.response?.data?.message || 'Erro ao buscar pedido');
    }
  }

  /**
   * Listar pedidos com filtros
   */
  async listOrders(filters?: OrderFilters): Promise<Order[]> {
    console.log('📋 OrderService: Listando pedidos', filters);
    
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response: AxiosResponse<Order[]> = await this.apiInterceptor.getAxiosInstance().get(
        `${this.baseURL}/orders/?${params.toString()}`
      );

      console.log('✅ OrderService: Pedidos listados', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ OrderService: Erro ao listar pedidos', error);
      throw new Error(error.response?.data?.message || 'Erro ao listar pedidos');
    }
  }

  /**
   * Atualizar pedido
   */
  async updateOrder(orderId: string, updateData: OrderUpdate): Promise<Order> {
    console.log('🔄 OrderService: Atualizando pedido', orderId, updateData);
    
    try {
      const response: AxiosResponse<Order> = await this.apiInterceptor.getAxiosInstance().put(
        `${this.baseURL}/orders/${orderId}`,
        updateData
      );

      console.log('✅ OrderService: Pedido atualizado', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ OrderService: Erro ao atualizar pedido', error);
      throw new Error(error.response?.data?.message || 'Erro ao atualizar pedido');
    }
  }

  /**
   * Cancelar pedido
   */
  async cancelOrder(orderId: string, reason: string): Promise<Order> {
    console.log('❌ OrderService: Cancelando pedido', orderId, reason);
    
    try {
      const response: AxiosResponse<Order> = await this.apiInterceptor.getAxiosInstance().put(
        `${this.baseURL}/orders/${orderId}/cancel`,
        { cancellation_reason: reason }
      );

      console.log('✅ OrderService: Pedido cancelado', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ OrderService: Erro ao cancelar pedido', error);
      throw new Error(error.response?.data?.message || 'Erro ao cancelar pedido');
    }
  }

  /**
   * Finalizar pedido
   */
  async completeOrder(orderId: string): Promise<Order> {
    console.log('✅ OrderService: Finalizando pedido', orderId);
    
    try {
      const response: AxiosResponse<Order> = await this.apiInterceptor.getAxiosInstance().put(
        `${this.baseURL}/orders/${orderId}/complete`
      );

      console.log('✅ OrderService: Pedido finalizado', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ OrderService: Erro ao finalizar pedido', error);
      throw new Error(error.response?.data?.message || 'Erro ao finalizar pedido');
    }
  }

  /**
   * Processar pagamento do pedido
   */
  async processPayment(paymentData: ProcessPaymentData): Promise<void> {
    console.log('💳 OrderService: Processando pagamento', paymentData);
    
    try {
      await this.apiInterceptor.getAxiosInstance().post(
        `${this.baseURL}/orders/${paymentData.order_id}/payment`,
        paymentData
      );

      console.log('✅ OrderService: Pagamento processado com sucesso');
    } catch (error: any) {
      console.error('❌ OrderService: Erro ao processar pagamento', error);
      throw new Error(error.response?.data?.message || 'Erro ao processar pagamento');
    }
  }

  /**
   * Adicionar item ao pedido
   */
  async addItemToOrder(orderId: string, item: OrderItemCreate): Promise<Order> {
    console.log('➕ OrderService: Adicionando item ao pedido', orderId, item);
    
    try {
      const response: AxiosResponse<Order> = await this.apiInterceptor.getAxiosInstance().post(
        `${this.baseURL}/orders/${orderId}/items`,
        item
      );

      console.log('✅ OrderService: Item adicionado ao pedido', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ OrderService: Erro ao adicionar item', error);
      throw new Error(error.response?.data?.message || 'Erro ao adicionar item');
    }
  }

  /**
   * Remover item do pedido
   */
  async removeItemFromOrder(orderId: string, itemId: string): Promise<Order> {
    console.log('➖ OrderService: Removendo item do pedido', orderId, itemId);
    
    try {
      const response: AxiosResponse<Order> = await this.apiInterceptor.getAxiosInstance().delete(
        `${this.baseURL}/orders/${orderId}/items/${itemId}`
      );

      console.log('✅ OrderService: Item removido do pedido', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ OrderService: Erro ao remover item', error);
      throw new Error(error.response?.data?.message || 'Erro ao remover item');
    }
  }

  /**
   * Atualizar item do pedido
   */
  async updateOrderItem(orderId: string, itemId: string, updateData: OrderItemUpdate): Promise<Order> {
    console.log('🔄 OrderService: Atualizando item do pedido', orderId, itemId, updateData);
    
    try {
      const response: AxiosResponse<Order> = await this.apiInterceptor.getAxiosInstance().put(
        `${this.baseURL}/orders/${orderId}/items/${itemId}`,
        updateData
      );

      console.log('✅ OrderService: Item atualizado', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ OrderService: Erro ao atualizar item', error);
      throw new Error(error.response?.data?.message || 'Erro ao atualizar item');
    }
  }

  /**
   * Obter estatísticas de pedidos
   */
  async getOrderStats(filters?: OrderFilters): Promise<OrderStats> {
    console.log('📊 OrderService: Obtendo estatísticas', filters);
    
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response: AxiosResponse<OrderStats> = await this.apiInterceptor.getAxiosInstance().get(
        `${this.baseURL}/orders/stats?${params.toString()}`
      );

      console.log('✅ OrderService: Estatísticas obtidas', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ OrderService: Erro ao obter estatísticas', error);
      throw new Error(error.response?.data?.message || 'Erro ao obter estatísticas');
    }
  }

  /**
   * Buscar pedidos pendentes
   */
  async getPendingOrders(): Promise<Order[]> {
    return this.listOrders({ status: OrderStatus.PENDING });
  }

  /**
   * Buscar pedidos em preparo
   */
  async getPreparingOrders(): Promise<Order[]> {
    return this.listOrders({ status: OrderStatus.PREPARING });
  }

  /**
   * Buscar pedidos prontos
   */
  async getReadyOrders(): Promise<Order[]> {
    return this.listOrders({ status: OrderStatus.READY });
  }

  /**
   * Buscar pedidos por mesa
   */
  async getOrdersByTable(tableNumber: number): Promise<Order[]> {
    return this.listOrders({ table_number: tableNumber });
  }

  /**
   * Buscar pedidos por garçom
   */
  async getOrdersByWaiter(waiterId: string): Promise<Order[]> {
    return this.listOrders({ waiter_id: waiterId });
  }
}

// Exportar instância singleton
export const orderService = new OrderService();
export default orderService;

// Re-exportar tipos para facilitar importação
export type {
  Order,
  OrderCreate,
  OrderUpdate,
  OrderItem,
  OrderItemCreate,
  OrderItemUpdate,
  OrderFilters,
  OrderResponse,
  OrderListResponse,
  OrderStats,
  PaymentData,
  ProcessPaymentData,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus
} from '../types/order';

