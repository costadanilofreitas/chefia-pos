/**
 * KDS Main Page - Simplified Version
 * Kitchen Display System main interface with reduced complexity
 */

import { useState, useCallback, useMemo, lazy, Suspense, useEffect } from 'react';
import { 
  FaSync, FaWifi, FaExpand, FaCompress, FaVolumeUp, 
  FaVolumeMute, FaKeyboard, FaMoon, FaSun 
} from 'react-icons/fa';
import { Button } from '../components/Button';
import { Select } from '../components/Select';
import { Badge } from '../components/Badge';
import { useFullscreen } from '../hooks/useFullscreen';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useKDSOrders } from '../hooks/useKDSOrders';
import { useKDSAlerts } from '../hooks/useKDSAlerts';
import { useKDSWebSocket } from '../hooks/useKDSWebSocket';
import { useTheme } from '../contexts/ThemeContext';
import { 
  TIME_INTERVALS, 
  THRESHOLDS, 
  ORDER_STATUS, 
  STATION_ALL,
  KEYBOARD_SHORTCUTS 
} from '../config/constants';
import { 
  getMinutesElapsed, 
  formatTime, 
  isDelayed,
  countByStatus 
} from '../utils/dataHelpers';
import type { Station, Order } from '../services/kdsService';

// Lazy load components
const OrderCard = lazy(() => import('./KDSOrderCard'));
const AlertSystem = lazy(() => import('../components/VisualAlert').then(m => ({ default: m.AlertSystem })));

// Loading skeleton component
const OrderSkeleton = () => (
  <div className="animate-pulse bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
    <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-4" />
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-4 bg-gray-300 dark:bg-gray-600 rounded" style={{ width: `${100 - i * 15}%` }} />
      ))}
    </div>
  </div>
);

// Header component
const KDSHeader = ({
  selectedStation,
  stations,
  stats,
  isConnected,
  isLoading,
  soundEnabled,
  themeMode,
  isFullscreen,
  onStationChange,
  onRefresh,
  onToggleFullscreen,
  onToggleSound,
  onToggleTheme,
  onShowHelp,
}: {
  selectedStation: string;
  stations: Station[];
  stats: Record<string, number>;
  isConnected: boolean;
  isLoading: boolean;
  soundEnabled: boolean;
  themeMode: string;
  isFullscreen: boolean;
  onStationChange: (station: string) => void;
  onRefresh: () => void;
  onToggleFullscreen: () => void;
  onToggleSound: () => void;
  onToggleTheme: () => void;
  onShowHelp: () => void;
}) => (
  <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
    <div className="px-4 py-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Sistema de Cozinha
          </h1>
          <Select
            value={selectedStation}
            options={[
              { value: STATION_ALL, label: 'Todas as Estações' },
              ...stations.map(s => ({ value: s.id, label: s.name }))
            ]}
            onChange={(e) => onStationChange(e.target.value)}
            className="w-full sm:w-48"
          />
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap sm:flex-nowrap">
          {/* Connection Status */}
          <Badge variant={isConnected ? 'success' : 'danger'} className="flex items-center gap-1">
            <FaWifi className="w-3 h-3" />
            {isConnected ? 'Conectado' : 'Desconectado'}
          </Badge>
          
          {/* Statistics */}
          <div className="hidden md:flex items-center space-x-2 text-sm">
            {Object.entries(stats).map(([key, value]) => (
              <Badge key={key} variant={key === 'pendente' ? 'warning' : 'info'}>
                {key}: {value}
              </Badge>
            ))}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button
              onClick={(e) => {
                onRefresh();
                (e.currentTarget as HTMLButtonElement).blur();
              }}
              size="sm"
              variant="secondary"
              disabled={isLoading}
              aria-label="Atualizar"
              title="Atualizar (R)"
            >
              <FaSync className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button
              onClick={(e) => {
                onToggleFullscreen();
                (e.currentTarget as HTMLButtonElement).blur();
              }}
              size="sm"
              variant="secondary"
              aria-label="Tela cheia"
              title="Tela cheia (F)"
            >
              {isFullscreen ? <FaCompress /> : <FaExpand />}
            </Button>
            
            <Button
              onClick={(e) => {
                onToggleSound();
                (e.currentTarget as HTMLButtonElement).blur();
              }}
              size="sm"
              variant="secondary"
              aria-label="Som"
              title="Som (M)"
            >
              {soundEnabled ? <FaVolumeUp /> : <FaVolumeMute />}
            </Button>
            
            <Button
              onClick={(e) => {
                onToggleTheme();
                (e.currentTarget as HTMLButtonElement).blur();
              }}
              size="sm"
              variant="secondary"
              aria-label="Tema"
              title="Tema (T)"
            >
              {themeMode === 'dark' ? <FaSun /> : <FaMoon />}
            </Button>
            
            <Button
              onClick={(e) => {
                onShowHelp();
                (e.currentTarget as HTMLButtonElement).blur();
              }}
              size="sm"
              variant="secondary"
              aria-label="Ajuda"
              title="Ajuda (H)"
            >
              <FaKeyboard />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </header>
);

// Help modal component
const HelpModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  
  const shortcuts = [
    { key: '↑↓', description: 'Navegar pedidos' },
    { key: 'Enter', description: 'Iniciar pedido' },
    { key: 'Space', description: 'Completar pedido' },
    { key: 'R', description: 'Atualizar lista' },
    { key: 'F', description: 'Tela cheia' },
    { key: 'M', description: 'Som ligado/desligado' },
    { key: 'T', description: 'Alternar tema' },
    { key: 'H', description: 'Mostrar ajuda' },
    { key: 'Esc', description: 'Fechar' },
  ];
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Atalhos do Teclado
        </h2>
        <div className="space-y-2 text-sm">
          {shortcuts.map(({ key, description }) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{key}</span>
              <span className="text-gray-900 dark:text-white">{description}</span>
            </div>
          ))}
        </div>
        <Button onClick={onClose} className="mt-4 w-full">
          Fechar
        </Button>
      </div>
    </div>
  );
};

// Main component
const KDSMainPage = () => {
  // State
  const [selectedStation, setSelectedStation] = useState<string>(STATION_ALL);
  const [stations] = useState<Station[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const [lastUpdate] = useState(new Date());
  
  // Hooks
  const { mode: themeMode, toggleTheme } = useTheme();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  
  // Alerts hook
  const { 
    alerts, 
    removeAlert, 
    newOrder: alertNewOrder,
    urgentOrder: alertUrgentOrder,
    orderReady: alertOrderReady,
    orderDelayed: alertOrderDelayed
  } = useKDSAlerts({ 
    soundEnabled,
    autoRemoveDelay: TIME_INTERVALS.ALERT_AUTO_REMOVE 
  });
  
  // Orders hook with new order callback
  const {
    orders,
    loading,
    loadOrders,
    updateOrderStatus,
    updateItemStatus,
    setError
  } = useKDSOrders({
    selectedStation,
    onNewOrder: useCallback((order) => {
      alertNewOrder(order.id.toString());
      if (order.priority === 'high') {
        alertUrgentOrder(order.id.toString());
      }
    }, [alertNewOrder, alertUrgentOrder])
  });
  
  // WebSocket hook
  const { isConnected, joinStation, leaveStation } = useKDSWebSocket({
    onOrderUpdate: loadOrders,
    onOrderDelete: loadOrders,
    onStationUpdate: useCallback((_station, data) => {
      if (data.type === 'urgent' && data.orderId) {
        alertUrgentOrder(data.orderId);
      }
    }, [alertUrgentOrder]),
    onConnectionChange: useCallback((connected) => {
      if (connected) {
        setError(null);
        loadOrders();
      }
    }, [setError, loadOrders])
  });
  
  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (selectedStation === STATION_ALL) return orders;
    return orders.filter(order => 
      order.items.some(item => item.station === selectedStation)
    );
  }, [orders, selectedStation]);
  
  // Statistics
  const stats = useMemo(() => ({
    total: orders.length,
    pendente: countByStatus(orders, ORDER_STATUS.PENDING),
    preparando: countByStatus(orders, ORDER_STATUS.PREPARING),
    pronto: countByStatus(orders, ORDER_STATUS.READY),
  }), [orders]);
  
  // Handlers
  const handleStationChange = useCallback((station: string) => {
    if (selectedStation !== STATION_ALL) {
      leaveStation(selectedStation);
    }
    setSelectedStation(station);
    if (station !== STATION_ALL) {
      joinStation(station);
    }
  }, [selectedStation, joinStation, leaveStation]);
  
  const handleStartOrder = useCallback(async (orderId: string | number) => {
    await updateOrderStatus(orderId, ORDER_STATUS.PREPARING);
  }, [updateOrderStatus]);
  
  const handleCompleteOrder = useCallback(async (orderId: string | number) => {
    await updateOrderStatus(orderId, ORDER_STATUS.READY);
    alertOrderReady(orderId.toString());
  }, [updateOrderStatus, alertOrderReady]);
  
  // Keyboard shortcuts
  const shortcuts = useMemo(() => [
    { 
      key: KEYBOARD_SHORTCUTS.ARROW_UP, 
      action: () => setSelectedOrderIndex(prev => Math.max(0, prev - 1)) 
    },
    { 
      key: KEYBOARD_SHORTCUTS.ARROW_DOWN, 
      action: () => setSelectedOrderIndex(prev => Math.min(filteredOrders.length - 1, prev + 1)) 
    },
    { 
      key: KEYBOARD_SHORTCUTS.ENTER, 
      action: () => {
        const order = filteredOrders[selectedOrderIndex];
        if (order) handleStartOrder(order.id);
      }
    },
    { 
      key: KEYBOARD_SHORTCUTS.SPACE, 
      action: () => {
        const order = filteredOrders[selectedOrderIndex];
        if (order) handleCompleteOrder(order.id);
      }
    },
    { key: KEYBOARD_SHORTCUTS.REFRESH, action: loadOrders },
    { key: KEYBOARD_SHORTCUTS.FULLSCREEN, action: toggleFullscreen },
    { key: KEYBOARD_SHORTCUTS.SOUND_TOGGLE, action: () => setSoundEnabled(prev => !prev) },
    { key: KEYBOARD_SHORTCUTS.THEME, action: toggleTheme },
    { key: KEYBOARD_SHORTCUTS.HELP, action: () => setShowHelp(prev => !prev) },
    { key: KEYBOARD_SHORTCUTS.ESCAPE, action: () => setShowHelp(false) }
  ], [
    filteredOrders, 
    selectedOrderIndex, 
    handleStartOrder, 
    handleCompleteOrder,
    loadOrders,
    toggleFullscreen,
    toggleTheme
  ]);
  
  useKeyboardShortcuts(shortcuts);
  
  // Check for delayed orders periodically
  useEffect(() => {
    const checkDelayed = () => {
      orders.forEach(order => {
        if (isDelayed(order.created_at, THRESHOLDS.DELAYED_ORDER_MINUTES, order.status)) {
          alertOrderDelayed(order.id.toString(), getMinutesElapsed(order.created_at));
        }
      });
    };
    
    const interval = setInterval(checkDelayed, TIME_INTERVALS.DELAYED_CHECK);
    return () => clearInterval(interval);
  }, [orders, alertOrderDelayed]);
  
  // Transform order for card (simplified)
  const transformOrderForCard = useCallback((order: Order): any => ({
    id: order.id,
    created_at: order.created_at,
    priority: order.priority,
    type: order.type || 'table',
    table_number: order.table_number,
    customer_name: order.customer_name,
    items: order.items.map(item => ({
      id: item.item_id,
      name: item.name,
      quantity: item.quantity,
      notes: item.notes,
      status: item.status
    }))
  }), []);
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <KDSHeader
        selectedStation={selectedStation}
        stations={stations}
        stats={stats}
        isConnected={isConnected}
        isLoading={loading}
        soundEnabled={soundEnabled}
        themeMode={themeMode}
        isFullscreen={isFullscreen}
        onStationChange={handleStationChange}
        onRefresh={loadOrders}
        onToggleFullscreen={toggleFullscreen}
        onToggleSound={() => setSoundEnabled(prev => !prev)}
        onToggleTheme={toggleTheme}
        onShowHelp={() => setShowHelp(true)}
      />
      
      {/* Connection Error Display - Fixed */}
      {!isConnected && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center sticky top-[73px] z-30">
          Sem conexão com o servidor - Modo offline ativo
        </div>
      )}
      
      {/* Main Content */}
      <main className="p-4 pb-16 overflow-x-auto min-h-screen">
        {loading && filteredOrders.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <OrderSkeleton key={i} />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              Nenhum pedido na fila
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <Suspense fallback={<OrderSkeleton />}>
              {filteredOrders.map((order, index) => (
                <div
                  key={order.id}
                  className={index === selectedOrderIndex ? 'ring-2 ring-primary-500 ring-offset-2 rounded-lg' : ''}
                >
                  <OrderCard
                    order={transformOrderForCard(order)}
                    onStatusChange={updateOrderStatus}
                    onItemStatusChange={updateItemStatus}
                    nextStatus={order.status === ORDER_STATUS.PENDING ? ORDER_STATUS.PREPARING : ORDER_STATUS.READY}
                  />
                </div>
              ))}
            </Suspense>
          </div>
        )}
      </main>
      
      {/* Alert System */}
      <Suspense fallback={null}>
        <AlertSystem alerts={alerts} onAlertClose={removeAlert} />
      </Suspense>
      
      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      
      {/* Footer with Keyboard Shortcuts */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>Estação: {selectedStation === STATION_ALL ? 'Todas' : selectedStation}</span>
            <span className="hidden md:inline">Atualizado: {formatTime(lastUpdate)}</span>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">↑↓</kbd>
              Navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">Enter</kbd>
              Iniciar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">Space</kbd>
              Completar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">R</kbd>
              Atualizar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">F</kbd>
              Tela Cheia
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">H</kbd>
              Ajuda
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default KDSMainPage;