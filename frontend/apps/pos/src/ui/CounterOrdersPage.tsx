import { useCallback, useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useOrder } from '../hooks/useOrder';
import { showError } from '../utils/notifications';
import '../index.css';
import { Order, OrderStatus, OrderType } from '../types/order';
import { formatCurrency } from '../utils/formatters';

export default function CounterOrdersPage() {
  const navigate = useNavigate();
  const { terminalId } = useParams();
  const { /* user, */ isAuthenticated } = useAuth();
  
  const {
    orders,
    loading,
    error,
    getOrders,
    updateOrder,
    cancelOrder,
    completeOrder
  } = useOrder();
  
  // State
  const [selectedTab, setSelectedTab] = useState<'pending' | 'preparing' | 'ready' | 'completed'>('pending');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Load orders on mount
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/pos/${terminalId}/cashier`);
      return;
    }
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate, terminalId]);
  
  // Auto-refresh orders
  useEffect(() => {
    const interval = setInterval(loadOrders, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const loadOrders = useCallback(async () => {
    try {
      await getOrders();
    } catch {
      showError('Erro ao carregar pedidos');
    }
  }, [getOrders]);
  
  // Filter orders by status
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    switch (selectedTab) {
      case 'pending':
        return matchesSearch && order.status === OrderStatus.PENDING;
      case 'preparing':
        return matchesSearch && order.status === OrderStatus.PREPARING;
      case 'ready':
        return matchesSearch && order.status === OrderStatus.READY;
      case 'completed':
        return matchesSearch && order.status === OrderStatus.DELIVERED;
      default:
        return matchesSearch;
    }
  });
  
  // Handle order actions
  const handleConfirmOrder = useCallback(async (order: Order) => {
    try {
      await updateOrder(order.id, { status: OrderStatus.PREPARING });
      await loadOrders();
      showError('Pedido confirmado e enviado para preparo!');
    } catch {
      showError('Erro ao confirmar pedido');
    }
  }, [updateOrder, loadOrders]);
  
  const handleMarkAsReady = useCallback(async (order: Order) => {
    try {
      await updateOrder(order.id, { status: OrderStatus.READY });
      await loadOrders();
      showError('Pedido marcado como pronto!');
    } catch {
      showError('Erro ao marcar pedido como pronto');
    }
  }, [updateOrder, loadOrders]);
  
  const handleCompleteOrder = useCallback(async (order: Order) => {
    try {
      await completeOrder(order.id);
      await loadOrders();
      showError('Pedido finalizado com sucesso!');
    } catch {
      showError('Erro ao finalizar pedido');
    }
  }, [completeOrder, loadOrders]);
  
  const handleCancelOrder = useCallback(async () => {
    if (!selectedOrder || !cancelReason) {
      showError('Por favor, informe o motivo do cancelamento');
      return;
    }
    
    try {
      await cancelOrder(selectedOrder.id, cancelReason);
      await loadOrders();
      setShowCancelDialog(false);
      setCancelReason('');
      setSelectedOrder(null);
      showError('Pedido cancelado com sucesso');
    } catch {
      showError('Erro ao cancelar pedido');
    }
  }, [selectedOrder, cancelReason, cancelOrder, loadOrders]);
  
  // Get order type info
  const getOrderTypeInfo = (type: OrderType) => {
    switch (type) {
      case 'dine_in':
        return { label: 'Local', icon: '🍽️', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' };
      case 'takeaway':
        return { label: 'Retirada', icon: '🥡', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' };
      case 'delivery':
        return { label: 'Entrega', icon: '🛵', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' };
      default:
        return { label: 'Balcão', icon: '🛒', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300' };
    }
  };
  
  // Get status info
  const getStatusInfo = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return { label: 'Pendente', color: 'text-yellow-600 dark:text-yellow-400' };
      case OrderStatus.PREPARING:
        return { label: 'Preparando', color: 'text-blue-600 dark:text-blue-400' };
      case OrderStatus.READY:
        return { label: 'Pronto', color: 'text-green-600 dark:text-green-400' };
      case OrderStatus.DELIVERED:
        return { label: 'Entregue', color: 'text-gray-600 dark:text-gray-400' };
      case OrderStatus.CANCELLED:
        return { label: 'Cancelado', color: 'text-red-600 dark:text-red-400' };
      default:
        return { label: status, color: 'text-gray-600 dark:text-gray-400' };
    }
  };
  
  // Format time
  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Tab counts
  const tabCounts = {
    pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
    preparing: orders.filter(o => o.status === OrderStatus.PREPARING).length,
    ready: orders.filter(o => o.status === OrderStatus.READY).length,
    completed: orders.filter(o => o.status === OrderStatus.DELIVERED).length
  };
  
  // Keyboard shortcuts
  useHotkeys('f5', () => loadOrders());
  useHotkeys('escape', () => {
    setShowOrderDetails(false);
    setShowCancelDialog(false);
  });
  
  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Pedidos do Balcão
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Gerencie os pedidos realizados no balcão
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar pedido..."
                className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Refresh button */}
            <button
              onClick={loadOrders}
              className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              title="Atualizar (F5)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            {/* New order button */}
            <button
              onClick={() => navigate(`/pos/${terminalId}/main`)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Pedido
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {[
            { key: 'pending', label: 'Pendentes', icon: '⏳' },
            { key: 'preparing', label: 'Preparando', icon: '👨‍🍳' },
            { key: 'ready', label: 'Prontos', icon: '✅' },
            { key: 'completed', label: 'Finalizados', icon: '📦' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as 'pending' | 'preparing' | 'ready' | 'completed')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                selectedTab === tab.key
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span className="text-lg mr-2">{tab.icon}</span>
              {tab.label}
              {tabCounts[tab.key as keyof typeof tabCounts] > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-sm">
                  {tabCounts[tab.key as keyof typeof tabCounts]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Orders Grid */}
      <div className="flex-1 overflow-auto p-4">
        {(() => {
          if (error) {
            return (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-red-500 text-6xl mb-4">⚠️</div>
                  <p className="text-xl font-medium text-red-600 dark:text-red-400">Erro ao carregar pedidos</p>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
                  <button
                    onClick={loadOrders}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            );
          }
          
          if (loading) {
            return (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Carregando pedidos...</p>
                </div>
              </div>
            );
          }
          
          if (filteredOrders.length === 0) {
            const tabStatusText = {
              pending: 'pendente',
              preparing: 'em preparo',
              ready: 'pronto',
              completed: 'finalizado'
            }[selectedTab];
            
            return (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-xl font-medium text-gray-600 dark:text-gray-400">
                    Nenhum pedido {tabStatusText}
                  </p>
                </div>
              </div>
            );
          }
          
          return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map(order => {
              const typeInfo = getOrderTypeInfo(order.order_type);
              const statusInfo = getStatusInfo(order.status);
              
              return (
                <button
                  key={order.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transform hover:scale-105 transition-all duration-150 cursor-pointer w-full text-left"
                  onClick={() => {
                    setSelectedOrder(order);
                    setShowOrderDetails(true);
                  }}
                  type="button"
                >
                  {/* Order Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        #{order.id.slice(-6).toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${typeInfo.color}`}>
                        {typeInfo.icon} {typeInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(order.created_at)}
                      </span>
                      <span className={`text-sm font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                  
                  {/* Order Items */}
                  <div className="p-4">
                    <div className="space-y-2 mb-3">
                      {order.items.slice(0, 3).map((item, index) => (
                        <div key={`${order.id}-item-${item.product_id || index}-${item.product_name}`} className="flex justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">
                            {item.quantity}x {item.product_name}
                          </span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {formatCurrency(item.total_price)}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          +{order.items.length - 3} itens...
                        </p>
                      )}
                    </div>
                    
                    {/* Customer Info */}
                    {order.customer_name && (
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          👤 {order.customer_name}
                        </p>
                      </div>
                    )}
                    
                    {/* Total */}
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 flex gap-2">
                    {order.status === OrderStatus.PENDING && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmOrder(order);
                        }}
                        className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                      >
                        Confirmar
                      </button>
                    )}
                    {order.status === OrderStatus.PREPARING && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsReady(order);
                        }}
                        className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                      >
                        Pronto
                      </button>
                    )}
                    {order.status === OrderStatus.READY && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompleteOrder(order);
                        }}
                        className="flex-1 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
                      >
                        Finalizar
                      </button>
                    )}
                    {(order.status === OrderStatus.PENDING || order.status === OrderStatus.PREPARING) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                          setShowCancelDialog(true);
                        }}
                        className="px-3 py-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          );
        })()}
      </div>
      
      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Detalhes do Pedido #{selectedOrder.id.slice(-6).toUpperCase()}
              </h3>
              <button
                onClick={() => setShowOrderDetails(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Order Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                  <p className={`font-medium ${getStatusInfo(selectedOrder.status).color}`}>
                    {getStatusInfo(selectedOrder.status).label}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tipo</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {getOrderTypeInfo(selectedOrder.order_type).icon} {getOrderTypeInfo(selectedOrder.order_type).label}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Data/Hora</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(selectedOrder.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Cliente</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedOrder.customer_name || 'Não informado'}
                  </p>
                </div>
              </div>
              
              {/* Items */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Itens do Pedido</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div key={`${selectedOrder.id}-detail-${item.product_id || index}-${item.product_name}`} className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">
                        {item.quantity}x {item.product_name}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(item.total_price)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(selectedOrder.total)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Fechar
                </button>
                {selectedOrder.status === OrderStatus.PENDING && (
                  <button
                    onClick={() => {
                      handleConfirmOrder(selectedOrder);
                      setShowOrderDetails(false);
                    }}
                    className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Confirmar Pedido
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Cancel Dialog */}
      {showCancelDialog && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Cancelar Pedido
            </h3>
            
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3">
                <p className="text-sm text-red-700 dark:text-red-300">
                  Você está prestes a cancelar o pedido #{selectedOrder.id.slice(-6).toUpperCase()}. Esta ação não pode ser desfeita.
                </p>
              </div>
              
              <div>
                <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Motivo do cancelamento
                </label>
                <textarea
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                  rows={3}
                  placeholder="Digite o motivo do cancelamento..."
                />
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancelReason('');
                }}
                className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Voltar
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={!cancelReason}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}