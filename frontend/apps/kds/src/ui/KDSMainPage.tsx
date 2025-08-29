import { useState, useEffect, useCallback, lazy, Suspense, useMemo } from 'react';
import { FaSync, FaWifi, FaExclamationTriangle, FaExpand, FaCompress, FaVolumeUp, FaVolumeMute, FaKeyboard, FaCog, FaMoon, FaSun } from 'react-icons/fa';
import { Button } from '../components/Button';
import { Select } from '../components/Select';
import { Badge } from '../components/Badge';
import type { Station, Order, OrderItem } from '../services/kdsService';

// Time constants in milliseconds
const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds
const DELAYED_ORDER_CHECK_INTERVAL = 60000; // 1 minute
const DELAYED_ORDER_THRESHOLD_MINUTES = 15;
const ALERT_AUTO_REMOVE_DELAY = 5000; // 5 seconds
import { ApiService } from '../services/api';
import { offlineStorage } from '../services/offlineStorage';
import { logger } from '../services/logger';
import { useFullscreen } from '../hooks/useFullscreen';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useKDSOrders } from '../hooks/useKDSOrders';
import { useKDSAlerts } from '../hooks/useKDSAlerts';
import { useKDSWebSocket } from '../hooks/useKDSWebSocket';
import { useTheme } from '../contexts/ThemeContext';

// Lazy load heavy components
const OrderCard = lazy(() => import('./OrderCard'));
const AlertSystem = lazy(() => import('../components/VisualAlert').then(m => ({ default: m.AlertSystem })));

// Loading component
const OrderCardSkeleton = () => (
  <div className="animate-pulse">
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-4/6"></div>
      </div>
    </div>
  </div>
);

const KDSMainPage = () => {
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [stations, setStations] = useState<Station[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const { mode: themeMode, toggleTheme } = useTheme();

  // Use custom hooks
  const { 
    alerts, 
    removeAlert, 
    newOrder: alertNewOrder,
    urgentOrder: alertUrgentOrder,
    orderReady: alertOrderReady,
    orderDelayed: alertOrderDelayed
  } = useKDSAlerts({ 
    soundEnabled,
    autoRemoveDelay: ALERT_AUTO_REMOVE_DELAY 
  });

  const {
    orders,
    loading,
    error,
    stats,
    loadOrders,
    updateOrderStatus,
    updateItemStatus,
    setError
  } = useKDSOrders({
    selectedStation,
    onNewOrder: (order) => {
      alertNewOrder(order.id.toString());
      if (order.priority === 'high') {
        alertUrgentOrder(order.id.toString());
      }
    }
  });

  const {
    isConnected,
    joinStation,
    leaveStation,
    markOrderStarted,
    markOrderCompleted
  } = useKDSWebSocket({
    onOrderUpdate: () => {
      loadOrders(); // Refresh orders on WebSocket update
    },
    onOrderDelete: () => {
      loadOrders(); // Refresh when order is deleted
    },
    onStationUpdate: (_station, data) => {
      if (data.type === 'urgent' && data.orderId) {
        alertUrgentOrder(data.orderId);
      }
    },
    onConnectionChange: (connected) => {
      if (connected) {
        setError(null);
        loadOrders(); // Reload when reconnected
      }
      // Don't set error here - use connectionError from hook
    }
  });

  // Fullscreen hook
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  // Filtered orders based on station - memoized for performance
  const filteredOrders = useMemo(() => {
    if (selectedStation === 'all') return orders;
    return orders.filter(order => 
      order.items.some(item => item.station === selectedStation)
    );
  }, [orders, selectedStation]);

  // Load stations
  const loadStations = useCallback(async () => {
    try {
      const data: Station[] = navigator.onLine
        ? await ApiService.get('/kds/stations')
        : await offlineStorage.getAllStations();
      setStations(data);
    } catch (err) {
      logger.error('Error loading stations', err, 'KDSMainPage');
    }
  }, []);

  // Handle station change
  const handleStationChange = useCallback((station: string) => {
    if (selectedStation !== 'all') {
      leaveStation(selectedStation);
    }
    setSelectedStation(station);
    if (station !== 'all') {
      joinStation(station);
    }
  }, [selectedStation, joinStation, leaveStation]);

  // Optimized button handlers to prevent re-renders
  const handleRefreshClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    loadOrders();
    e.currentTarget.blur();
  }, [loadOrders]);

  const handleFullscreenClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    toggleFullscreen();
    e.currentTarget.blur();
  }, [toggleFullscreen]);

  const handleSoundToggleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setSoundEnabled(prev => !prev);
    e.currentTarget.blur();
  }, []);

  const handleThemeToggleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    toggleTheme();
    e.currentTarget.blur();
  }, [toggleTheme]);

  const handleShowHelpClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setShowHelp(true);
    e.currentTarget.blur();
  }, []);

  const handleCloseHelpClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setShowHelp(false);
    e.currentTarget.blur();
  }, []);

  // Handle order actions
  const handleStartOrder = useCallback(async (orderId: string | number) => {
    const orderIdString = orderId.toString();
    await updateOrderStatus(orderId, 'preparing');
    markOrderStarted(orderIdString);
  }, [updateOrderStatus, markOrderStarted]);

  const handleCompleteOrder = useCallback(async (orderId: string | number) => {
    const orderIdString = orderId.toString();
    await updateOrderStatus(orderId, 'ready');
    markOrderCompleted(orderIdString);
    alertOrderReady(orderIdString);
  }, [updateOrderStatus, markOrderCompleted, alertOrderReady]);

  // Helper function to calculate elapsed minutes
  const getMinutesElapsed = (createdAt: string | Date): number => {
    const createdTime = new Date(createdAt).getTime();
    return Math.floor((Date.now() - createdTime) / 60000);
  };

  // Keyboard shortcuts
  const shortcuts = useMemo(() => [
    { key: 'ArrowUp', action: () => setSelectedOrderIndex(prev => Math.max(0, prev - 1)), description: 'Navegar para cima' },
    { key: 'ArrowDown', action: () => setSelectedOrderIndex(prev => Math.min(filteredOrders.length - 1, prev + 1)), description: 'Navegar para baixo' },
    { key: 'Enter', action: () => {
      const order = filteredOrders[selectedOrderIndex];
      if (order) handleStartOrder(order.id);
    }, description: 'Iniciar pedido' },
    { key: 'Space', action: () => {
      const order = filteredOrders[selectedOrderIndex];
      if (order) handleCompleteOrder(order.id);
    }, description: 'Completar pedido' },
    { key: 'r', action: () => { loadOrders(); }, description: 'Atualizar lista' },
    { key: 'f', action: () => { toggleFullscreen(); }, description: 'Tela cheia' },
    { key: 'm', action: () => setSoundEnabled(prev => !prev), description: 'Som ligado/desligado' },
    { key: 'h', action: () => setShowHelp(prev => !prev), description: 'Mostrar ajuda' },
    { key: 'Escape', action: () => setShowHelp(false), description: 'Fechar' }
  ], [
    filteredOrders, 
    selectedOrderIndex, 
    handleStartOrder, 
    handleCompleteOrder,
    loadOrders,
    toggleFullscreen
  ]);

  useKeyboardShortcuts(shortcuts);

  // Initial load and periodic refresh
  useEffect(() => {
    loadStations();
    loadOrders();
    
    const interval = setInterval(() => {
      loadOrders();
      setLastUpdate(new Date());
    }, AUTO_REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [loadStations, loadOrders]);

  // Check delayed orders
  useEffect(() => {
    const checkDelayedOrders = () => {
      orders.forEach(order => {
        const minutesElapsed = getMinutesElapsed(order.created_at);
        
        if (minutesElapsed > DELAYED_ORDER_THRESHOLD_MINUTES && order.status === 'pending') {
          alertOrderDelayed(order.id.toString(), minutesElapsed);
        }
      });
    };

    const delayInterval = setInterval(checkDelayedOrders, DELAYED_ORDER_CHECK_INTERVAL);
    return () => clearInterval(delayInterval);
  }, [orders, alertOrderDelayed]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Kitchen Display
              </h1>
              <Select
                value={selectedStation}
                options={[
                  { value: 'all', label: 'Todas as Estações' },
                  ...stations.map(s => ({ value: s.id, label: s.name }))
                ]}
                onChange={(e) => handleStationChange(e.target.value)}
                className="w-48"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Connection Status */}
              <Badge
                variant={isConnected ? 'success' : 'danger'}
                className="flex items-center gap-1"
              >
                <FaWifi className="w-3 h-3" />
                {isConnected ? 'Online' : 'Offline'}
              </Badge>
              
              {/* Statistics */}
              <div className="flex items-center space-x-2 text-sm">
                <Badge variant="info">Total: {stats.total}</Badge>
                <Badge variant="warning">Pendente: {stats.pending}</Badge>
                <Badge variant="info">Preparando: {stats.preparing}</Badge>
                <Badge variant="success">Pronto: {stats.ready}</Badge>
              </div>
              
              {/* Action Buttons */}
              <Button
                onClick={handleRefreshClick}
                size="sm"
                variant="secondary"
                disabled={loading}
                aria-label="Atualizar pedidos"
                title="Atualizar pedidos (R)"
              >
                <FaSync className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              
              <Button
                onClick={handleFullscreenClick}
                size="sm"
                variant="secondary"
                aria-label={isFullscreen ? "Sair da tela cheia" : "Entrar em tela cheia"}
                title={isFullscreen ? "Sair da tela cheia (F)" : "Tela cheia (F)"}
              >
                {isFullscreen ? <FaCompress /> : <FaExpand />}
              </Button>
              
              <Button
                onClick={handleSoundToggleClick}
                size="sm"
                variant="secondary"
                aria-label={soundEnabled ? "Desativar som" : "Ativar som"}
                title={soundEnabled ? "Desativar som (M)" : "Ativar som (M)"}
              >
                {soundEnabled ? <FaVolumeUp /> : <FaVolumeMute />}
              </Button>
              
              <Button
                onClick={handleThemeToggleClick}
                size="sm"
                variant="secondary"
                aria-label={themeMode === 'dark' ? "Mudar para modo claro" : "Mudar para modo escuro"}
                title={themeMode === 'dark' ? "Modo claro" : "Modo escuro"}
              >
                {themeMode === 'dark' ? <FaSun /> : <FaMoon />}
              </Button>
              
              <Button
                onClick={handleShowHelpClick}
                size="sm"
                variant="secondary"
                aria-label="Mostrar atalhos do teclado"
                title="Atalhos do teclado (H)"
              >
                <FaKeyboard />
              </Button>
              
              <Button
                onClick={handleShowHelpClick}
                size="sm"
                variant="secondary"
                aria-label="Abrir configurações"
                title="Configurações"
              >
                <FaCog />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {(error || !isConnected) && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center">
          <FaExclamationTriangle className="mr-2" />
          {error || 'Sistema offline. Operando em modo local.'}
        </div>
      )}

      {/* Main Content */}
      <main className="p-4 pb-12">
        {loading && filteredOrders.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <OrderCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              Nenhum pedido na fila
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <Suspense fallback={<OrderCardSkeleton />}>
              {filteredOrders.map((order, index) => (
                <div
                  key={order.id}
                  className={`relative ${index === selectedOrderIndex ? 'ring-2 ring-primary-500 ring-offset-2 rounded-lg' : ''}`}
                >
                  <OrderCard
                    order={transformOrderForCard(order)}
                    onStatusChange={(orderId, status) => updateOrderStatus(orderId, status)}
                    onItemStatusChange={(orderId, itemId, status) => updateItemStatus(orderId, itemId, status)}
                    nextStatus={order.status === 'pending' ? 'preparing' : 'ready'}
                  />
                </div>
              ))}
            </Suspense>
          </div>
        )}
      </main>

      {/* Alert System */}
      <Suspense fallback={null}>
        <AlertSystem
          alerts={alerts}
          onAlertClose={removeAlert}
        />
      </Suspense>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Atalhos do Teclado
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">↑↓</span>
                <span className="text-gray-900 dark:text-white">Navegar pedidos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Enter</span>
                <span className="text-gray-900 dark:text-white">Iniciar pedido</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Space</span>
                <span className="text-gray-900 dark:text-white">Completar pedido</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">R</span>
                <span className="text-gray-900 dark:text-white">Atualizar lista</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">F</span>
                <span className="text-gray-900 dark:text-white">Tela cheia</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">M</span>
                <span className="text-gray-900 dark:text-white">Som ligado/desligado</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Esc</span>
                <span className="text-gray-900 dark:text-white">Fechar</span>
              </div>
            </div>
            <Button
              onClick={handleCloseHelpClick}
              className="mt-4 w-full"
            >
              Fechar
            </Button>
          </div>
        </div>
      )}

      {/* Footer with Keyboard Shortcuts and Status */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex justify-between items-center">
          {/* Keyboard Shortcuts */}
          <div className="text-xs text-gray-500 dark:text-gray-400 space-x-4">
            <span>F1: Ajuda</span>
            <span>F5: Atualizar</span>
            <span>F11: Tela Cheia</span>
            <span>Tab: Navegar</span>
            <span>Enter: Selecionar</span>
            <span>Espaço: Concluir Item</span>
          </div>
          
          {/* System Status */}
          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            {/* Connection Status */}
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>{isConnected ? 'Online' : 'Offline'}</span>
            </div>
            
            {/* Station Info */}
            <span>Estação: {selectedStation === 'all' ? 'Todas' : selectedStation}</span>
            
            {/* Last Update */}
            <span>Atualizado: {lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to transform order data for OrderCard
interface OrderCardData {
  id: string | number;
  created_at: string;
  priority: string;
  type: string;
  table_number?: string | number;
  customer_name?: string;
  items: Array<{
    id: string | number;
    name: string;
    quantity: number;
    notes?: string;
    status: string;
  }>;
}

function transformOrderForCard(order: Order): OrderCardData {
  return {
    id: order.id,
    created_at: order.created_at,
    priority: order.priority,
    type: order.type || 'table',
    ...(order.table_number && { table_number: order.table_number }),
    items: order.items.map((item: OrderItem) => ({
      id: item.item_id,
      name: item.name,
      quantity: item.quantity,
      ...(item.notes && { notes: item.notes }),
      status: item.status
    })),
    ...(order.customer_name && { customer_name: order.customer_name })
  };
}

export default KDSMainPage;