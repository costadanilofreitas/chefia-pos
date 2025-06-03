import { createContext, useContext, useState, useEffect } from 'react';

// Criando o contexto de pedidos
const OrderContext = createContext(null);

// Provider para o contexto de pedidos
export const OrderProvider = ({ children }) => {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Função para obter pedidos pendentes
  const getPendingOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Em um cenário real, isso faria uma chamada à API para obter pedidos pendentes
      // Simulando uma chamada de API com timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          // Dados simulados de pedidos pendentes
          const mockPendingOrders = [
            {
              id: '1001',
              customer_name: 'João Silva',
              items: [
                { id: '1', name: 'X-Burger', quantity: 2, price: 18.90 },
                { id: '2', name: 'Batata Frita', quantity: 1, price: 9.90 }
              ],
              total: 47.70,
              status: 'pending',
              created_at: new Date().toISOString(),
              source: 'pos'
            },
            {
              id: '1002',
              customer_name: 'Maria Oliveira',
              items: [
                { id: '3', name: 'Pizza Margherita', quantity: 1, price: 39.90 }
              ],
              total: 39.90,
              status: 'pending',
              created_at: new Date().toISOString(),
              source: 'ifood'
            }
          ];
          
          setPendingOrders(mockPendingOrders);
          setLoading(false);
          resolve(mockPendingOrders);
        }, 500);
      });
    } catch (err) {
      setError(err.message);
      console.error('Erro ao obter pedidos pendentes:', err);
      setLoading(false);
      throw err;
    }
  };

  // Função para criar um novo pedido
  const createOrder = async (orderData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Em um cenário real, isso faria uma chamada à API para criar um novo pedido
      // Simulando uma chamada de API com timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          const newOrder = {
            id: `ORD-${Date.now()}`,
            ...orderData,
            status: 'pending',
            created_at: new Date().toISOString()
          };
          
          setCurrentOrder(newOrder);
          setPendingOrders(prev => [...prev, newOrder]);
          setLoading(false);
          resolve(newOrder);
        }, 500);
      });
    } catch (err) {
      setError(err.message);
      console.error('Erro ao criar pedido:', err);
      setLoading(false);
      throw err;
    }
  };

  // Função para atualizar um pedido existente
  const updateOrder = async (orderId, orderData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Em um cenário real, isso faria uma chamada à API para atualizar um pedido
      // Simulando uma chamada de API com timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          // Atualizar pedido nos pedidos pendentes
          const updatedPendingOrders = pendingOrders.map(order => 
            order.id === orderId ? { ...order, ...orderData } : order
          );
          
          setPendingOrders(updatedPendingOrders);
          
          // Se for o pedido atual, atualizá-lo também
          if (currentOrder && currentOrder.id === orderId) {
            const updatedOrder = { ...currentOrder, ...orderData };
            setCurrentOrder(updatedOrder);
            resolve(updatedOrder);
          } else {
            const updatedOrder = updatedPendingOrders.find(order => order.id === orderId);
            resolve(updatedOrder);
          }
          
          setLoading(false);
        }, 500);
      });
    } catch (err) {
      setError(err.message);
      console.error('Erro ao atualizar pedido:', err);
      setLoading(false);
      throw err;
    }
  };

  // Função para finalizar um pedido
  const completeOrder = async (orderId, paymentData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Em um cenário real, isso faria uma chamada à API para finalizar um pedido
      // Simulando uma chamada de API com timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          // Encontrar o pedido a ser finalizado
          const orderToComplete = pendingOrders.find(order => order.id === orderId);
          
          if (!orderToComplete) {
            const error = new Error(`Pedido ${orderId} não encontrado`);
            setError(error.message);
            setLoading(false);
            throw error;
          }
          
          // Atualizar o pedido com os dados de pagamento e status
          const completedOrder = {
            ...orderToComplete,
            ...paymentData,
            status: 'completed',
            completed_at: new Date().toISOString()
          };
          
          // Remover o pedido dos pendentes
          setPendingOrders(prev => prev.filter(order => order.id !== orderId));
          
          // Adicionar ao histórico
          setOrderHistory(prev => [...prev, completedOrder]);
          
          // Se for o pedido atual, limpar
          if (currentOrder && currentOrder.id === orderId) {
            setCurrentOrder(null);
          }
          
          setLoading(false);
          resolve(completedOrder);
        }, 500);
      });
    } catch (err) {
      setError(err.message);
      console.error('Erro ao finalizar pedido:', err);
      setLoading(false);
      throw err;
    }
  };

  // Função para cancelar um pedido
  const cancelOrder = async (orderId, reason) => {
    try {
      setLoading(true);
      setError(null);
      
      // Em um cenário real, isso faria uma chamada à API para cancelar um pedido
      // Simulando uma chamada de API com timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          // Encontrar o pedido a ser cancelado
          const orderToCancel = pendingOrders.find(order => order.id === orderId);
          
          if (!orderToCancel) {
            const error = new Error(`Pedido ${orderId} não encontrado`);
            setError(error.message);
            setLoading(false);
            throw error;
          }
          
          // Atualizar o pedido com status cancelado
          const cancelledOrder = {
            ...orderToCancel,
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason
          };
          
          // Remover o pedido dos pendentes
          setPendingOrders(prev => prev.filter(order => order.id !== orderId));
          
          // Adicionar ao histórico
          setOrderHistory(prev => [...prev, cancelledOrder]);
          
          // Se for o pedido atual, limpar
          if (currentOrder && currentOrder.id === orderId) {
            setCurrentOrder(null);
          }
          
          setLoading(false);
          resolve(cancelledOrder);
        }, 500);
      });
    } catch (err) {
      setError(err.message);
      console.error('Erro ao cancelar pedido:', err);
      setLoading(false);
      throw err;
    }
  };

  // Função para obter o histórico de pedidos
  const getOrderHistory = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      // Em um cenário real, isso faria uma chamada à API para obter o histórico de pedidos
      // Simulando uma chamada de API com timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          // Dados simulados de histórico de pedidos
          const mockOrderHistory = [
            {
              id: '1000',
              customer_name: 'Carlos Mendes',
              items: [
                { id: '1', name: 'X-Burger', quantity: 1, price: 18.90 },
                { id: '4', name: 'Refrigerante', quantity: 1, price: 6.00 }
              ],
              total: 24.90,
              status: 'completed',
              created_at: new Date(Date.now() - 86400000).toISOString(),
              completed_at: new Date(Date.now() - 86000000).toISOString(),
              payment_method: 'credit'
            },
            {
              id: '999',
              customer_name: 'Ana Souza',
              items: [
                { id: '5', name: 'Salada Caesar', quantity: 1, price: 25.90 }
              ],
              total: 25.90,
              status: 'cancelled',
              created_at: new Date(Date.now() - 172800000).toISOString(),
              cancelled_at: new Date(Date.now() - 172000000).toISOString(),
              cancellation_reason: 'Cliente desistiu'
            }
          ];
          
          setOrderHistory(mockOrderHistory);
          setLoading(false);
          resolve(mockOrderHistory);
        }, 500);
      });
    } catch (err) {
      setError(err.message);
      console.error('Erro ao obter histórico de pedidos:', err);
      setLoading(false);
      throw err;
    }
  };

  // Valor do contexto
  const value = {
    pendingOrders,
    currentOrder,
    orderHistory,
    loading,
    error,
    getPendingOrders,
    createOrder,
    updateOrder,
    completeOrder,
    cancelOrder,
    getOrderHistory,
    setCurrentOrder
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

// Hook personalizado para usar o contexto de pedidos
export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder deve ser usado dentro de um OrderProvider');
  }
  return context;
};

export default useOrder;
