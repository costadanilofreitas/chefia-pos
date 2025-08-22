import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { useRemoteOrders } from '../hooks/useRemoteOrders';
import { RemoteOrder } from '../services/RemoteOrdersService';
import Toast, { useToast } from '../components/Toast';
import '../index.css';

// Types are now imported from useRemoteOrders hook

export default function RemoteOrdersPage() {
  const navigate = useNavigate();
  const { terminalId } = useParams();
  const { toasts, removeToast, info } = useToast();
  const {
    orders,
    integrations,
    loading,
    autoAccept,
    setAutoAccept,
    acceptOrder,
    rejectOrder,
    syncPlatform,
    configurePlatform,
    printOrder,
    getTotalPendingOrders,
    getTotalTodayRevenue,
    getTotalTodayOrders
  } = useRemoteOrders();
  
  const [selectedTab, setSelectedTab] = useState<'orders' | 'integrations' | 'analytics'>('orders');
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | RemoteOrder['platform']>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | RemoteOrder['status']>('all');
  const [selectedOrder, setSelectedOrder] = useState<RemoteOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState({ apiToken: '', establishmentId: '', autoAccept: false, autoSync: false });
  // Calculate totals
  const totalPendingOrders = getTotalPendingOrders();
  const totalTodayRevenue = getTotalTodayRevenue();
  const totalTodayOrders = getTotalTodayOrders();

  useEffect(() => {
    if (!terminalId || isNaN(Number(terminalId))) {
      navigate('/');
    }
  }, [terminalId, navigate]);

  // Keyboard shortcuts
  useHotkeys('alt+o', () => setSelectedTab('orders'));
  useHotkeys('alt+i', () => setSelectedTab('integrations'));
  useHotkeys('alt+a', () => setSelectedTab('analytics'));
  useHotkeys('esc', () => setShowOrderModal(false));
  useHotkeys('space', (e) => {
    e.preventDefault();
    if (orders.length > 0 && orders[0].status === 'pending') {
      acceptOrder(orders[0].id);
    }
  });

  const getPlatformColor = (platform: RemoteOrder['platform']) => {
    switch (platform) {
      case 'ifood': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'rappi': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      case 'ubereats': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'whatsapp': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300';
      case 'website': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'phone': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPlatformName = (platform: RemoteOrder['platform']) => {
    switch (platform) {
      case 'ifood': return 'iFood';
      case 'rappi': return 'Rappi';
      case 'ubereats': return 'Uber Eats';
      case 'whatsapp': return 'WhatsApp';
      case 'website': return 'Site';
      case 'phone': return 'Telefone';
      default: return platform;
    }
  };

  const getStatusColor = (status: RemoteOrder['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900 dark:text-yellow-400';
      case 'confirmed': return 'text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-400';
      case 'preparing': return 'text-orange-600 bg-orange-50 dark:bg-orange-900 dark:text-orange-400';
      case 'ready': return 'text-green-600 bg-green-50 dark:bg-green-900 dark:text-green-400';
      case 'dispatched': return 'text-purple-600 bg-purple-50 dark:bg-purple-900 dark:text-purple-400';
      case 'delivered': return 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400';
      case 'cancelled': return 'text-red-600 bg-red-50 dark:bg-red-900 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusText = (status: RemoteOrder['status']) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'confirmed': return 'Confirmado';
      case 'preparing': return 'Preparando';
      case 'ready': return 'Pronto';
      case 'dispatched': return 'Saiu para Entrega';
      case 'delivered': return 'Entregue';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const filteredOrders = orders.filter(order => {
    const matchesPlatform = selectedPlatform === 'all' || order.platform === selectedPlatform;
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    return matchesPlatform && matchesStatus;
  });

  const handlePrintOrder = (orderId: string) => {
    printOrder(orderId);
  };


  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 select-none">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Gerencie pedidos de todas as plataformas integradas
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Auto Accept Toggle */}
            <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <input
                type="checkbox"
                checked={autoAccept}
                onChange={(e) => setAutoAccept(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Aceitar Automaticamente
              </span>
            </label>
            
            {/* Pending Orders Badge */}
            {totalPendingOrders > 0 && (
              <div className="px-3 py-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-lg font-medium text-sm flex items-center gap-2 animate-pulse">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {totalPendingOrders} Pedidos Pendentes
              </div>
            )}
            
            {/* Sync Button */}
            <button className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {[
            { key: 'orders', label: 'Pedidos', icon: '📋' },
            { key: 'integrations', label: 'Integrações', icon: '🔌' },
            { key: 'analytics', label: 'Analytics', icon: '📊' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                selectedTab === tab.key
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {selectedTab === 'orders' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <div className="flex flex-wrap gap-3">
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">Todas as Plataformas</option>
                  <option value="ifood">iFood</option>
                  <option value="rappi">Rappi</option>
                  <option value="ubereats">Uber Eats</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="website">Site</option>
                  <option value="phone">Telefone</option>
                </select>
                
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">Todos os Status</option>
                  <option value="pending">Pendente</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="preparing">Preparando</option>
                  <option value="ready">Pronto</option>
                  <option value="dispatched">Saiu para Entrega</option>
                  <option value="delivered">Entregue</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            </div>
            
            {/* Orders List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredOrders.map(order => (
                <div
                  key={order.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer ${
                    order.status === 'pending' ? 'ring-2 ring-yellow-400 animate-pulse' : ''
                  }`}
                  onClick={() => {
                    setSelectedOrder(order);
                    setShowOrderModal(true);
                  }}
                >
                  {/* Order Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getPlatformColor(order.platform)}`}>
                          {getPlatformName(order.platform)}
                        </span>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          #{order.platformOrderId}
                        </span>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {order.customerName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatTime(order.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(order.total)}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {order.orderType === 'delivery' ? 'Entrega' : 'Retirada'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Order Items */}
                  <div className="p-4 space-y-2 max-h-32 overflow-y-auto">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {formatCurrency(item.quantity * item.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Order Actions */}
                  {order.status === 'pending' && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          acceptOrder(order.id);
                        }}
                        className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors text-sm"
                      >
                        Aceitar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rejectOrder(order.id);
                        }}
                        className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors text-sm"
                      >
                        Rejeitar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintOrder(order.id);
                        }}
                        className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {selectedTab === 'integrations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map(integration => (
              <div key={integration.platform} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${integration.color} rounded-lg flex items-center justify-center text-white text-2xl`}>
                      {integration.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {integration.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {integration.connected ? 'Conectado' : 'Desconectado'}
                      </p>
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${integration.connected ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>
                
                {integration.connected ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Pedidos Pendentes</span>
                        <span className="font-medium text-yellow-600 dark:text-yellow-400">
                          {integration.pendingOrders}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Pedidos Hoje</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {integration.todayOrders}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Faturamento Hoje</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(integration.todayRevenue)}
                        </span>
                      </div>
                    </div>
                    
                    {integration.lastSync && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                        Última sincronização: {formatTime(integration.lastSync)}
                      </p>
                    )}
                    
                    <button 
                      onClick={() => {
                        setShowConfigModal(integration.platform);
                        info(`Abrindo configurações do ${integration.name}`);
                      }}
                      className="w-full mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title="Configurar integração"
                    >
                      Configurações
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => {
                      // Connect platform logic would go here
                      info(`Conectando com ${integration.name}...`);
                    }}
                    className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                    title="Conectar plataforma"
                  >
                    Conectar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        
        {selectedTab === 'analytics' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                    +23.5%
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total de Pedidos Hoje</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalTodayOrders}
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                    +18.2%
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Faturamento Hoje</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totalTodayRevenue)}
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                    +5.7%
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ticket Médio</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totalTodayRevenue / (totalTodayOrders || 1))}
                </p>
              </div>
            </div>
            
            {/* Platform Performance */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Performance por Plataforma
              </h2>
              <div className="space-y-4">
                {integrations.filter(i => i.connected).map(integration => {
                  const percentage = totalTodayRevenue > 0 
                    ? (integration.todayRevenue / totalTodayRevenue * 100).toFixed(1)
                    : '0';
                  
                  return (
                    <div key={integration.platform}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{integration.icon}</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {integration.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(integration.todayRevenue)}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                            ({percentage}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${integration.color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowOrderModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Pedido #{selectedOrder.platformOrderId}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getPlatformColor(selectedOrder.platform)}`}>
                      {getPlatformName(selectedOrder.platform)}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusText(selectedOrder.status)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Customer Info */}
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Cliente</h3>
                  <p className="text-gray-700 dark:text-gray-300">{selectedOrder.customerName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedOrder.customerPhone}</p>
                </div>
                
                {/* Delivery Address */}
                {selectedOrder.customerAddress && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Endereço de Entrega</h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {selectedOrder.customerAddress.street}, {selectedOrder.customerAddress.number}
                      {selectedOrder.customerAddress.complement && ` - ${selectedOrder.customerAddress.complement}`}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      {selectedOrder.customerAddress.neighborhood} - {selectedOrder.customerAddress.city}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      CEP: {selectedOrder.customerAddress.zipCode}
                    </p>
                  </div>
                )}
                
                {/* Order Items */}
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Itens do Pedido</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(item.quantity * item.price)}
                          </span>
                        </div>
                        {item.observations && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Obs: {item.observations}
                          </p>
                        )}
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="mt-1">
                            {item.modifiers.map((mod, idx) => (
                              <p key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                                + {mod.name} ({formatCurrency(mod.price)})
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Order Summary */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                      <span className="text-gray-900 dark:text-white">{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    {selectedOrder.deliveryFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Taxa de Entrega</span>
                        <span className="text-gray-900 dark:text-white">{formatCurrency(selectedOrder.deliveryFee)}</span>
                      </div>
                    )}
                    {selectedOrder.serviceFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Taxa de Serviço</span>
                        <span className="text-gray-900 dark:text-white">{formatCurrency(selectedOrder.serviceFee)}</span>
                      </div>
                    )}
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Desconto</span>
                        <span className="text-green-600 dark:text-green-400">-{formatCurrency(selectedOrder.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium text-lg pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-gray-900 dark:text-white">Total</span>
                      <span className="text-gray-900 dark:text-white">{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Payment Info */}
                <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Forma de Pagamento</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedOrder.paymentMethod}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedOrder.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
                    </p>
                  </div>
                </div>
                
                {/* Actions */}
                {selectedOrder.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => acceptOrder(selectedOrder.id)}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                    >
                      Aceitar Pedido
                    </button>
                    <button
                      onClick={() => rejectOrder(selectedOrder.id)}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                    >
                      Rejeitar Pedido
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {showConfigModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowConfigModal(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Configurar {getPlatformName(showConfigModal as RemoteOrder['platform'])}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Token de API
                </label>
                <input
                  type="password"
                  placeholder="Digite o token de integração"
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ID do Estabelecimento
                </label>
                <input
                  type="text"
                  placeholder="Digite o ID do estabelecimento"
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Aceitar pedidos automaticamente
                  </span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Sincronizar cardápio automaticamente
                  </span>
                </label>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfigModal(null)}
                className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await configurePlatform(showConfigModal as RemoteOrder['platform'], configForm);
                  setShowConfigModal(null);
                  setConfigForm({ apiToken: '', establishmentId: '', autoAccept: false, autoSync: false });
                }}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Messages */}
      <Toast messages={toasts} onRemove={removeToast} />
    </div>
  );
}