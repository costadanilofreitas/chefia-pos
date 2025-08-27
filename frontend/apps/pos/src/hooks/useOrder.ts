import { useCallback, useEffect, useState } from "react";
import { orderService } from "../services/OrderService";

import {
  Order,
  OrderCreate,
  OrderFilters,
  OrderItemCreate,
  OrderUpdate,
  PaymentMethod,
} from "../types/order";

interface UseOrderState {
  // Estado dos pedidos
  orders: Order[];
  currentOrder: Order | null;

  // Estado do carrinho local
  cart: OrderItemCreate[];
  cartTotal: number;

  // Estados de loading
  loading: boolean;
  creating: boolean;
  updating: boolean;

  // Estado de erro
  error: string | null;
}

interface UseOrderActions {
  // Operações de pedidos
  getOrders: (filters?: OrderFilters) => Promise<void>;
  createOrder: (orderData: OrderCreate) => Promise<Order | null>;
  updateOrder: (
    _orderId: string,
    updateData: OrderUpdate
  ) => Promise<Order | null>;
  cancelOrder: (_orderId: string, reason: string) => Promise<Order | null>;
  completeOrder: (orderId: string) => Promise<Order | null>;

  // Operações de carrinho local
  addToCart: (item: OrderItemCreate) => void;
  removeFromCart: (_index: number) => void;
  updateCartItem: (_index: number, updates: Partial<OrderItemCreate>) => void;
  clearCart: () => void;

  // Finalização
  finalizeOrder: (
    _orderId: string,
    paymentMethod: PaymentMethod
  ) => Promise<Order | null>;

  // Utilitários
  setCurrentOrder: (order: Order | null) => void;
  clearError: () => void;
}

export interface UseOrderReturn extends UseOrderState, UseOrderActions {}

export const useOrder = (): UseOrderReturn => {
  const [state, setState] = useState<UseOrderState>({
    orders: [],
    currentOrder: null,
    cart: [],
    cartTotal: 0,
    loading: false,
    creating: false,
    updating: false,
    error: null,
  });

  // Função auxiliar para atualizar estado
  const updateState = useCallback((updates: Partial<UseOrderState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Calcular total do carrinho
  const calculateCartTotal = useCallback((cart: OrderItemCreate[]): number => {
    return cart.reduce(
      (total, item) => total + item.unit_price * item.quantity,
      0
    );
  }, []);

  // Atualizar total do carrinho quando o carrinho mudar
  useEffect(() => {
    const total = calculateCartTotal(state.cart);
    if (total !== state.cartTotal) {
      updateState({ cartTotal: total });
    }
  }, [state.cart, state.cartTotal, calculateCartTotal, updateState]);

  // Buscar pedidos
  const getOrders = useCallback(
    async (filters?: OrderFilters): Promise<void> => {
      try {
        updateState({ loading: true, error: null });

        const orders = await orderService.listOrders(filters);

        updateState({
          orders,
          loading: false,
        });
      } catch (error) {
        updateState({
          loading: false,
          error:
            error instanceof Error ? error.message : "Erro ao buscar pedidos",
        });
      }
    },
    [updateState]
  );

  // Criar pedido
  const createOrder = useCallback(
    async (orderData: OrderCreate): Promise<Order | null> => {
      try {
        updateState({ creating: true, error: null });

        const order = await orderService.createOrder(orderData);

        // Atualizar estado
        updateState({
          currentOrder: order,
          orders: [order, ...state.orders],
          creating: false,
        });
        return order;
      } catch (error) {
        updateState({
          creating: false,
          error:
            error instanceof Error ? error.message : "Erro ao criar pedido",
        });
        return null;
      }
    },
    [state.orders, updateState]
  );

  // Atualizar pedido
  const updateOrder = useCallback(
    async (orderId: string, updateData: OrderUpdate): Promise<Order | null> => {
      try {
        updateState({ updating: true, error: null });

        const updatedOrder = await orderService.updateOrder(
          orderId,
          updateData
        );

        // Atualizar no estado local
        const updatedOrders = state.orders.map((order) =>
          order.id === orderId ? updatedOrder : order
        );

        updateState({
          orders: updatedOrders,
          currentOrder:
            state.currentOrder?.id === orderId
              ? updatedOrder
              : state.currentOrder,
          updating: false,
        });
        return updatedOrder;
      } catch (error) {
        updateState({
          updating: false,
          error:
            error instanceof Error ? error.message : "Erro ao atualizar pedido",
        });
        return null;
      }
    },
    [state.orders, state.currentOrder, updateState]
  );

  // Cancelar pedido
  const cancelOrder = useCallback(
    async (orderId: string, reason: string): Promise<Order | null> => {
      try {
        updateState({ updating: true, error: null });

        const cancelledOrder = await orderService.cancelOrder(orderId, reason);

        // Atualizar no estado local
        const updatedOrders = state.orders.map((order) =>
          order.id === orderId ? cancelledOrder : order
        );

        updateState({
          orders: updatedOrders,
          currentOrder:
            state.currentOrder?.id === orderId
              ? cancelledOrder
              : state.currentOrder,
          updating: false,
        });
        return cancelledOrder;
      } catch (error) {
        updateState({
          updating: false,
          error:
            error instanceof Error ? error.message : "Erro ao cancelar pedido",
        });
        return null;
      }
    },
    [state.orders, state.currentOrder, updateState]
  );

  // Finalizar pedido
  const completeOrder = useCallback(
    async (orderId: string): Promise<Order | null> => {
      try {
        updateState({ updating: true, error: null });

        const completedOrder = await orderService.completeOrder(orderId);

        // Atualizar no estado local
        const updatedOrders = state.orders.map((order) =>
          order.id === orderId ? completedOrder : order
        );

        updateState({
          orders: updatedOrders,
          currentOrder:
            state.currentOrder?.id === orderId
              ? completedOrder
              : state.currentOrder,
          updating: false,
        });
        return completedOrder;
      } catch (error) {
        updateState({
          updating: false,
          error:
            error instanceof Error ? error.message : "Erro ao finalizar pedido",
        });
        return null;
      }
    },
    [state.orders, state.currentOrder, updateState]
  );

  // Adicionar item ao carrinho
  const addToCart = useCallback(
    (item: OrderItemCreate) => {

      const newCart = [...state.cart, item];
      updateState({ cart: newCart });
    },
    [state.cart, updateState]
  );

  // Remover item do carrinho
  const removeFromCart = useCallback(
    (index: number) => {

      const newCart = state.cart.filter((_, i) => i !== index);
      updateState({ cart: newCart });
    },
    [state.cart, updateState]
  );

  // Atualizar item do carrinho
  const updateCartItem = useCallback(
    (index: number, updates: Partial<OrderItemCreate>) => {

      const newCart = state.cart.map((item, i) =>
        i === index ? { ...item, ...updates } : item
      );
      updateState({ cart: newCart });
    },
    [state.cart, updateState]
  );

  // Limpar carrinho
  const clearCart = useCallback(() => {
    updateState({ cart: [], cartTotal: 0 });
  }, [updateState]);

  // Finalizar pedido (placeholder)
  const finalizeOrder = useCallback(
    async (
      orderId: string,
      _paymentMethod: PaymentMethod
    ): Promise<Order | null> => {

      // Implementar lógica de finalização com pagamento
      return completeOrder(orderId);
    },
    [completeOrder]
  );

  // Definir pedido atual
  const setCurrentOrder = useCallback(
    (order: Order | null) => {
      updateState({ currentOrder: order });
    },
    [updateState]
  );

  // Limpar erro
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  return {
    // Estado
    ...state,

    // Ações
    getOrders,
    createOrder,
    updateOrder,
    cancelOrder,
    completeOrder,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    finalizeOrder,
    setCurrentOrder,
    clearError,
  };
};

export default useOrder;
