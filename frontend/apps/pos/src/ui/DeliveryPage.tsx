import { useState, useEffect, useCallback, useMemo } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { useDelivery } from '../hooks/useDelivery';
import type { DeliveryCourier, DeliveryOrder } from '../services/DeliveryService';
import { formatCurrency } from '../utils/formatters';
import '../index.css';
import Toast from '../components/Toast';
import { useToast } from '../components/Toast';

// Custom styles for scrollbar
const customStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e0;
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #a0aec0;
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #4a5568;
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #718096;
  }
`;

// Interface for external order items with flexible structure
interface ExternalOrderItem {
  name?: string;
  productId?: string;
  product_id?: string;
  quantity: number;
  price: number;
  [key: string]: unknown; // Allow additional properties
}

// Interface local para o componente de UI - mapeamento do DeliveryOrder do serviço
interface DeliveryOrderUI {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  deliveryFee: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled';
  paymentMethod: 'cash' | 'card' | 'pix' | 'online';
  estimatedTime: string;
  courierName?: string;
  createdAt: string;
}

// interface Courier {
//   id: string;
//   name: string;
//   phone: string;
//   status: 'available' | 'busy' | 'offline';
//   currentDeliveries: number;
//   vehicle: 'bike' | 'motorcycle' | 'car';
// } // TODO: usar quando implementar entregadores

interface StatusColumn {
  status: DeliveryOrderUI['status'];
  title: string;
  color: string;
  borderColor: string;
  icon: string;
}

export default function DeliveryPage() {
  // const _navigate = useNavigate(); // TODO: usar para navegação
  // const _params = useParams(); // terminalId = _params.terminalId quando necessário
  const { toasts, removeToast, success, /* info, */ warning, error } = useToast();
  const { 
    deliveryOrders = [], 
    couriers = [], 
    // loading, // TODO: usar para indicador de carregamento
    loadDeliveryOrders,
    loadCouriers,
    assignCourier,
    startDelivery,
    completeDelivery
  } = useDelivery();
  
  // State
  const [draggedOrder, setDraggedOrder] = useState<DeliveryOrderUI | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrderUI | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showAssignCourier, setShowAssignCourier] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Transform delivery orders from hook to match component interface
  const orders: DeliveryOrderUI[] = deliveryOrders.map((order) => {
    // Extended order might have additional properties from backend
    const extOrder = order as DeliveryOrder & {
      customer_name?: string;
      customer_phone?: string;
      delivery_address?: string;
      customer_address?: string;
      items?: Array<{ productId: string; quantity: number; price: number }>;
      total?: number;
      estimated_time?: string;
      courier_name?: string;
    };
    
    return {
      id: order.id,
      customerName: extOrder.customer_name || 'Cliente',
      phone: extOrder.customer_phone || '',
      address: extOrder.delivery_address || extOrder.customer_address || '',
      items: (extOrder.items || []).map((item: ExternalOrderItem) => ({
        name: item.name || `Produto ${item.productId || item.product_id || ''}`,
        quantity: item.quantity,
        price: item.price
      })),
      total: extOrder.total || order.payment_amount || 0,
      deliveryFee: order.delivery_fee || 0,
      status: (order.status as DeliveryOrderUI['status']) || 'pending',
      paymentMethod: (order.payment_method as DeliveryOrderUI['paymentMethod']) || 'cash',
      estimatedTime: extOrder.estimated_time || order.estimated_delivery_time || '30 min',
      courierName: extOrder.courier_name,
      createdAt: order.created_at || new Date().toISOString()
    };
  });

  // Load delivery orders and couriers on mount
  useEffect(() => {
    loadDeliveryOrders();
    loadCouriers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Load only once on mount

  // Mock data removed - using real data from useDelivery hook

  // Status columns configuration
  const statusColumns: StatusColumn[] = [
    { status: 'pending', title: 'Pendentes', color: 'bg-yellow-50 dark:bg-yellow-900/20', borderColor: 'border-yellow-500', icon: '⏳' },
    { status: 'preparing', title: 'Preparando', color: 'bg-orange-50 dark:bg-orange-900/20', borderColor: 'border-orange-500', icon: '👨‍🍳' },
    { status: 'ready', title: 'Prontos', color: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-500', icon: '📦' },
    { status: 'dispatched', title: 'Em Rota', color: 'bg-purple-50 dark:bg-purple-900/20', borderColor: 'border-purple-500', icon: '🛵' },
    { status: 'delivered', title: 'Entregues', color: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-green-500', icon: '✅' }
  ];

  // Use couriers from hook or provide empty array
  const availableCouriers = useMemo(() => couriers || [], [couriers]);

  // Drag and Drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, order: DeliveryOrderUI) => {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = 'move';
    const element = e.target as HTMLElement;
    element.style.opacity = '0.5';
  }, []);
  
  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const element = e.target as HTMLElement;
    element.style.opacity = '1';
    setDraggedOrder(null);
    setDragOverStatus(null);
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent, _status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  }, []);
  
  const handleDragLeave = useCallback(() => {
    setDragOverStatus(null);
  }, []);
  
  const handleDrop = useCallback(async (e: React.DragEvent, newStatus: DeliveryOrderUI['status']) => {
    e.preventDefault();
    setDragOverStatus(null);
    
    if (!draggedOrder) return;
    
    // Validação de transições válidas
    const validTransitions: Record<string, string[]> = {
      'pending': ['preparing', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': ['ready', 'cancelled'],
      'ready': ['dispatched', 'cancelled'],
      'dispatched': ['delivered', 'cancelled'],
      'delivered': [],
      'cancelled': ['pending']
    };
    
    const currentValidTransitions = validTransitions[draggedOrder.status] || [];
    
    if (!currentValidTransitions.includes(newStatus)) {
      warning('Transição inválida. Siga o fluxo correto dos pedidos.');
      return;
    }
    
    // Se for para 'dispatched', precisa atribuir entregador
    if (newStatus === 'dispatched' && !draggedOrder.courierName) {
      setSelectedOrder(draggedOrder);
      setShowAssignCourier(true);
      return;
    }
    
    // Atualiza o status usando a API
    try {
      if (newStatus === 'delivered') {
        await completeDelivery(draggedOrder.id);
      } else {
        // For other status changes, we need to update via API
        // This would require adding an updateOrderStatus method to useDelivery hook
      }
      await loadDeliveryOrders(); // Reload to show updated status
    } catch {
      error('Erro ao atualizar status do pedido');
      return;
    }
    
    // Mensagem de sucesso
    const statusMessages: Record<string, string> = {
      'preparing': 'Pedido enviado para preparo!',
      'ready': 'Pedido pronto para entrega!',
      'dispatched': 'Pedido saiu para entrega!',
      'delivered': 'Entrega concluída!',
      'cancelled': 'Pedido cancelado'
    };
    
    success(statusMessages[newStatus] || 'Status atualizado');
  }, [draggedOrder, warning, success, error, completeDelivery, loadDeliveryOrders]);

  // Handle courier assignment
  const handleAssignCourier = useCallback(async () => {
    if (!selectedOrder || !selectedCourier) {
      warning('Selecione um entregador');
      return;
    }
    
    const courier = availableCouriers.find((c) => c.id === selectedCourier);
    if (courier) {
      try {
        await assignCourier(selectedOrder.id, selectedCourier);
        await startDelivery(selectedOrder.id);
        await loadDeliveryOrders(); // Reload to show updated status
        setShowAssignCourier(false);
        setSelectedCourier('');
        setSelectedOrder(null);
        success(`Pedido atribuído para ${courier.name}`);
      } catch {
        error('Erro ao atribuir entregador');
      }
    }
  }, [selectedOrder, selectedCourier, availableCouriers, warning, success, error, assignCourier, startDelivery, loadDeliveryOrders]);

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return order.customerName.toLowerCase().includes(search) ||
             order.phone.includes(search) ||
             order.address.toLowerCase().includes(search) ||
             order.id.includes(search);
    }
    return true;
  });

  // Keyboard shortcuts
  useHotkeys('escape', () => {
    setShowOrderDetails(false);
    setShowAssignCourier(false);
  });

  return (
    <>
      <style>{customStyles}</style>
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 select-none">
      {/* Header - Mobile optimized */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 lg:p-4">
        <div className="flex flex-col lg:flex-row items-center gap-3 lg:gap-0 lg:justify-between">
          
          {/* Search - Mobile responsive */}
          <div className="flex-1 max-w-md mx-2 lg:mx-4">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar pedido..."
                className="w-full px-4 py-2 pl-10 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Stats - Hidden on mobile, visible on desktop */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{orders.length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{orders.filter(o => o.status === 'pending').length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Pendentes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{orders.filter(o => o.status === 'dispatched').length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Em Rota</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board - Mobile optimized with horizontal scroll */}
      <div className="flex-1 overflow-hidden p-2 lg:p-4">
        <div className="flex gap-2 lg:gap-3 h-full overflow-x-auto lg:overflow-x-visible pb-2">
          {statusColumns.map(column => {
            const columnOrders = filteredOrders.filter(o => o.status === column.status);
            const isDropTarget = dragOverStatus === column.status;
            
            return (
              <div
                key={column.status}
                className={`flex-1 min-w-[280px] lg:min-w-0 ${column.color} rounded-xl p-3 transition-all ${
                  isDropTarget ? 'ring-2 ring-blue-500 scale-102' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, column.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.status)}
              >
                <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-xl">{column.icon}</span>
                    {column.title}
                  </span>
                  <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded-full text-sm">
                    {columnOrders.length}
                  </span>
                </h3>
                
                <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] lg:max-h-[calc(100vh-240px)] custom-scrollbar">
                  {columnOrders.map(order => (
                    <div
                      key={order.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, order)}
                      onDragEnd={handleDragEnd}
                      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all cursor-move border-l-4 ${column.borderColor}`}
                      title="Arraste para mudar status"
                    >
                      <div className="p-2">
                        {/* Order Header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-gray-900 dark:text-white">#{order.id}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(order.createdAt).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        
                        {/* Customer */}
                        <div className="mb-2">
                          <p className="font-medium text-gray-900 dark:text-white">{order.customerName}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">📱 {order.phone}</p>
                        </div>
                        
                        {/* Address */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 mb-2">
                          <p className="text-xs text-gray-700 dark:text-gray-300">📍 {order.address}</p>
                        </div>
                        
                        {/* Items Summary */}
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                        </div>
                        
                        {/* Total */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(order.total + order.deliveryFee)}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowOrderDetails(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-xs"
                          >
                            Ver detalhes
                          </button>
                        </div>
                        
                        {/* Courier if assigned */}
                        {order.courierName && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              🛵 {order.courierName}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {columnOrders.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <p className="text-sm">Nenhum pedido</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assign Courier Modal */}
      {showAssignCourier && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Atribuir Entregador
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Pedido #{selectedOrder.id} - {selectedOrder.customerName}
              </p>
            </div>
            
            <div className="space-y-2 mb-4">
              {availableCouriers.map((courier) => (
                <button
                  key={courier.id}
                  onClick={() => setSelectedCourier(courier.id)}
                  className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                    selectedCourier === courier.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">{courier.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {courier.vehicle_type === 'bike' && '🚴 Bicicleta'}
                      {courier.vehicle_type === 'motorcycle' && '🏍️ Moto'}
                      {courier.vehicle_type === 'car' && '🚗 Carro'}
                      {' • '}{(courier as DeliveryCourier & { currentDeliveries?: number }).currentDeliveries || 0} entregas
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    courier.status === 'available' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                  }`}>
                    {courier.status === 'available' ? 'Disponível' : 'Ocupado'}
                  </span>
                </button>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAssignCourier(false);
                  setSelectedCourier('');
                  setSelectedOrder(null);
                }}
                className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleAssignCourier}
                disabled={!selectedCourier}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                Atribuir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Detalhes do Pedido #{selectedOrder.id}
              </h3>
              <button
                onClick={() => setShowOrderDetails(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Customer Info */}
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Cliente</h4>
              <p className="text-gray-700 dark:text-gray-300">{selectedOrder.customerName}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">📱 {selectedOrder.phone}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">📍 {selectedOrder.address}</p>
            </div>
            
            {/* Items */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Itens do Pedido</h4>
              <div className="space-y-2">
                {selectedOrder.items.map((item, index) => (
                  <div key={`order-item-${item.name}-${item.quantity}-${index}`} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-700 dark:text-gray-300">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Total */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(selectedOrder.total)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">Taxa de Entrega:</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(selectedOrder.deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900 dark:text-white">Total:</span>
                <span className="text-green-600 dark:text-green-400">
                  {formatCurrency(selectedOrder.total + selectedOrder.deliveryFee)}
                </span>
              </div>
            </div>
            
            <button
              onClick={() => setShowOrderDetails(false)}
              className="w-full mt-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

        {/* Mobile Stats Bar - Visible only on mobile */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2">
          <div className="flex justify-around text-center">
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{orders.length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-600">{orders.filter(o => o.status === 'pending').length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Pendentes</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600">{orders.filter(o => o.status === 'dispatched').length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Em Rota</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">{orders.filter(o => o.status === 'delivered').length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Entregues</p>
            </div>
          </div>
        </div>

        {/* Toast Messages */}
        <Toast messages={toasts} onRemove={removeToast} />
      </div>
    </>
  );
}