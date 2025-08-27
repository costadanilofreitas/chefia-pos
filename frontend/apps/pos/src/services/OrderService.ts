import { AxiosResponse } from "axios";
import { API_CONFIG, buildApiUrl } from "../config/api";
import {
  Order,
  OrderCreate,
  OrderFilters,
  OrderItemCreate,
  OrderItemUpdate,
  OrderStats,
  OrderStatus,
  OrderUpdate,
  ProcessPaymentData,
} from "../types/order";
import { ApiInterceptor } from "./ApiInterceptor";
import logger, { LogSource } from "./LocalLoggerService";

/**
 * Serviço para gerenciamento de pedidos
 * Integração com backend API
 */
export class OrderService {
  private readonly apiInterceptor = ApiInterceptor.getInstance();

  /**
   * Criar um novo pedido
   */
  async createOrder(orderData: OrderCreate): Promise<Order> {
    try {
      await logger.info(
        "Criando novo pedido",
        { orderData },
        "OrderService",
        LogSource.POS
      );

      const response: AxiosResponse<Order> = await this.apiInterceptor
        .getAxiosInstance()
        .post(buildApiUrl(API_CONFIG.ENDPOINTS.ORDERS.CREATE), orderData);

      await logger.info(
        "Pedido criado com sucesso",
        { orderId: response.data.id },
        "OrderService",
        LogSource.POS
      );
      return response.data;
    } catch (error) {
      await logger.error(
        "Erro ao criar pedido",
        error,
        "OrderService",
        LogSource.POS
      );
      throw error;
    }
  }

  /**
   * Buscar pedido por ID
   */
  async getOrder(orderId: string): Promise<Order> {
    try {
      await logger.debug(
        "Buscando pedido",
        { orderId },
        "OrderService",
        LogSource.POS
      );

      const response: AxiosResponse<Order> = await this.apiInterceptor
        .getAxiosInstance()
        .get(buildApiUrl(`/api/v1/orders/${orderId}`));

      return response.data;
    } catch (error) {
      await logger.error(
        "Erro ao buscar pedido",
        { orderId, error },
        "OrderService",
        LogSource.POS
      );
      throw error;
    }
  }

  /**
   * Listar pedidos com filtros
   */
  async listOrders(filters?: OrderFilters): Promise<Order[]> {
    try {
      await logger.debug(
        "Listando pedidos",
        { filters },
        "OrderService",
        LogSource.POS
      );

      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response: AxiosResponse<Order[]> = await this.apiInterceptor
        .getAxiosInstance()
        .get(
          buildApiUrl(
            `${API_CONFIG.ENDPOINTS.ORDERS.LIST}?${params.toString()}`
          )
        );

      return response.data;
    } catch (error) {
      await logger.error(
        "Erro ao listar pedidos",
        { filters, error },
        "OrderService",
        LogSource.POS
      );
      throw error;
    }
  }

  /**
   * Atualizar pedido
   */
  async updateOrder(orderId: string, updateData: OrderUpdate): Promise<Order> {
    try {
      await logger.info(
        "Atualizando pedido",
        { orderId, updateData },
        "OrderService",
        LogSource.POS
      );

      const response: AxiosResponse<Order> = await this.apiInterceptor
        .getAxiosInstance()
        .put(
          buildApiUrl(API_CONFIG.ENDPOINTS.ORDERS.UPDATE(orderId)),
          updateData
        );

      await logger.info(
        "Pedido atualizado",
        { orderId },
        "OrderService",
        LogSource.POS
      );
      return response.data;
    } catch (error) {
      await logger.error(
        "Erro ao atualizar pedido",
        { orderId, error },
        "OrderService",
        LogSource.POS
      );
      throw error;
    }
  }

  /**
   * Cancelar pedido
   */
  async cancelOrder(orderId: string, reason: string): Promise<Order> {
    try {
      await logger.warn(
        "Cancelando pedido",
        { orderId, reason },
        "OrderService",
        LogSource.POS
      );

      const response: AxiosResponse<Order> = await this.apiInterceptor
        .getAxiosInstance()
        .put(buildApiUrl(`/api/v1/orders/${orderId}/cancel`), {
          cancellation_reason: reason,
        });

      await logger.info(
        "Pedido cancelado",
        { orderId },
        "OrderService",
        LogSource.POS
      );
      return response.data;
    } catch (error) {
      await logger.error(
        "Erro ao cancelar pedido",
        { orderId, error },
        "OrderService",
        LogSource.POS
      );
      throw error;
    }
  }

  /**
   * Finalizar pedido
   */
  async completeOrder(orderId: string): Promise<Order> {
    try {
      await logger.info(
        "Finalizando pedido",
        { orderId },
        "OrderService",
        LogSource.POS
      );

      const response: AxiosResponse<Order> = await this.apiInterceptor
        .getAxiosInstance()
        .put(buildApiUrl(`/api/v1/orders/${orderId}/complete`));

      await logger.info(
        "Pedido finalizado com sucesso",
        { orderId },
        "OrderService",
        LogSource.POS
      );
      return response.data;
    } catch (error) {
      await logger.error(
        "Erro ao finalizar pedido",
        { orderId, error },
        "OrderService",
        LogSource.POS
      );
      throw error;
    }
  }

  /**
   * Processar pagamento do pedido
   */
  async processPayment(paymentData: ProcessPaymentData): Promise<void> {
    try {
      await logger.info(
        "Processando pagamento",
        { orderId: paymentData.order_id, amount: paymentData.amount },
        "OrderService",
        LogSource.PAYMENT
      );

      await this.apiInterceptor
        .getAxiosInstance()
        .post(
          buildApiUrl(`/api/v1/orders/${paymentData.order_id}/payment`),
          paymentData
        );

      await logger.info(
        "Pagamento processado com sucesso",
        { orderId: paymentData.order_id },
        "OrderService",
        LogSource.PAYMENT
      );
    } catch (error) {
      await logger.critical(
        "Erro ao processar pagamento",
        { orderId: paymentData.order_id, error },
        "OrderService",
        LogSource.PAYMENT
      );
      throw error;
    }
  }

  /**
   * Adicionar item ao pedido
   */
  async addItemToOrder(orderId: string, item: OrderItemCreate): Promise<Order> {
    try {
      await logger.info(
        "Adicionando item ao pedido",
        { orderId, item },
        "OrderService",
        LogSource.POS
      );

      const response: AxiosResponse<Order> = await this.apiInterceptor
        .getAxiosInstance()
        .post(buildApiUrl(`/api/v1/orders/${orderId}/items`), item);

      await logger.info(
        "Item adicionado ao pedido",
        { orderId, itemId: response.data.id },
        "OrderService",
        LogSource.POS
      );
      return response.data;
    } catch (error) {
      await logger.error(
        "Erro ao adicionar item ao pedido",
        { orderId, item, error },
        "OrderService",
        LogSource.POS
      );
      throw error;
    }
  }

  /**
   * Remover item do pedido
   */
  async removeItemFromOrder(orderId: string, itemId: string): Promise<Order> {
    try {
      await logger.info(
        "Removendo item do pedido",
        { orderId, itemId },
        "OrderService",
        LogSource.POS
      );

      const response: AxiosResponse<Order> = await this.apiInterceptor
        .getAxiosInstance()
        .delete(buildApiUrl(`/api/v1/orders/${orderId}/items/${itemId}`));

      await logger.info(
        "Item removido do pedido",
        { orderId, itemId },
        "OrderService",
        LogSource.POS
      );
      return response.data;
    } catch (error) {
      await logger.error(
        "Erro ao remover item do pedido",
        { orderId, itemId, error },
        "OrderService",
        LogSource.POS
      );
      throw error;
    }
  }

  /**
   * Atualizar item do pedido
   */
  async updateOrderItem(
    orderId: string,
    itemId: string,
    updateData: OrderItemUpdate
  ): Promise<Order> {
    const response: AxiosResponse<Order> = await this.apiInterceptor
      .getAxiosInstance()
      .put(
        buildApiUrl(`/api/v1/orders/${orderId}/items/${itemId}`),
        updateData
      );
    return response.data;
  }

  /**
   * Obter estatísticas de pedidos
   */
  async getOrderStats(filters?: OrderFilters): Promise<OrderStats> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response: AxiosResponse<OrderStats> = await this.apiInterceptor
      .getAxiosInstance()
      .get(buildApiUrl(`/api/v1/orders/stats?${params.toString()}`));
    return response.data;
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
  OrderFilters,
  OrderItem,
  OrderItemCreate,
  OrderItemUpdate,
  OrderListResponse,
  OrderResponse,
  OrderStats,
  OrderStatus,
  OrderType,
  OrderUpdate,
  PaymentData,
  PaymentMethod,
  PaymentStatus,
  ProcessPaymentData,
} from "../types/order";
