import { useState, useEffect, useCallback, useRef, lazy, Suspense, useMemo } from 'react';
import { FaSync, FaWifi, FaExclamationTriangle, FaExpand, FaCompress, FaVolumeUp, FaVolumeMute, FaKeyboard, FaCog } from 'react-icons/fa';
import { Button } from '../components/Button';
import { Select } from '../components/Select';
import { Badge } from '../components/Badge';
import { kdsService, Order, OrderItem, Station } from '../services/kdsService';
import { useWebSocket } from '../hooks/useWebSocket';
import { offlineStorage } from '../services/offlineStorage';
import { audioService } from '../services/audioService';
import { useFullscreen } from '../hooks/useFullscreen';
import { useKeyboardShortcuts, KDS_SHORTCUTS } from '../hooks/useKeyboardShortcuts';
import { useVirtualization } from '../hooks/useVirtualization';

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
  const [orders, setOrders] = useState<Order[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [alerts, setAlerts] = useState<Array<{id: string; type: 'urgent' | 'new' | 'ready' | 'warning'; message: string; duration?: number}>>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const previousOrdersRef = useRef<Order[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fullscreen hook
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  
  // Memoized callbacks for better performance
  const addAlert = useCallback((type: 'urgent' | 'new' | 'ready' | 'warning', message: string, duration = 5000) => {
    const alert = {
      id: Date.now().toString(),
      type,
      message,
      duration
    };
    setAlerts(prev => [...prev, alert]);
  }, []);
  
  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  // Optimized load orders with debouncing
  const loadOrdersDebounced = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return async () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        setLoading(true);
        setError(null);
        
        try {
          let data: Order[];
          
          if (navigator.onLine) {
            data = selectedStation === 'all' 
              ? await kdsService.getOrders()
              : await kdsService.getOrdersByStation(selectedStation);
            
            // Batch cache updates
            const cachePromises = data.map(order => offlineStorage.saveOrder(order));
            await Promise.all(cachePromises);
          } else {
            data = selectedStation === 'all'
              ? await offlineStorage.getAllOrders()
              : (await offlineStorage.getAllOrders()).filter(
                  (order: Order) => order.items.some((item: OrderItem) => item.station === selectedStation)
                );
          }
          
          // Check for new orders
          if (previousOrdersRef.current.length > 0) {
            const newOrders = data.filter((order: Order) => 
              !previousOrdersRef.current.find(o => o.id === order.id)
            );
            
            for (const order of newOrders) {
              if (soundEnabled) {
                if (order.priority === 'high' || order.priority === 'medium') {
                  await audioService.playUrgentOrder();
                  addAlert('urgent', `URGENTE: Pedido #${order.order_number}`, 10000);
                } else {
                  await audioService.playNewOrder();
                  addAlert('new', `Novo pedido #${order.order_number}`, 5000);
                }
              }
            }
          }
          
          previousOrdersRef.current = data;
          setOrders(data);
          setLastUpdate(new Date());
        } catch (err) {
          setError('Não foi possível carregar os pedidos');
          await offlineStorage.log('Error loading orders', err);
          
          const cachedOrders = await offlineStorage.getAllOrders();
          if (cachedOrders.length > 0) {
            setOrders(cachedOrders);
            setError('Usando dados em cache (modo offline)');
          }
        } finally {
          setLoading(false);
        }
      }, 300);
    };
  }, [selectedStation, soundEnabled, addAlert]);

  // Load stations
  const loadStations = useCallback(async () => {
    try {
      let data: Station[];
      if (navigator.onLine) {
        data = await kdsService.getStations();
        await Promise.all(data.map(station => offlineStorage.saveStation(station)));
      } else {
        data = await offlineStorage.getAllStations();
      }
      setStations(data);
    } catch (err) {
      await offlineStorage.log('Error loading stations', err);
    }
  }, []);

  // WebSocket with optimized callbacks
  const { isConnected, sendMessage } = useWebSocket({
    onOrderUpdate: useCallback(() => {
      loadOrdersDebounced();
    }, [loadOrdersDebounced]),
    onStationUpdate: useCallback(() => {
      loadStations();
    }, [loadStations]),
    onConnected: useCallback(() => {
      setError(null);
    }, []),
    onDisconnected: useCallback(() => {
      if (!isOffline) {
        setError('Conexão WebSocket perdida. Reconectando...');
      }
    }, [isOffline]),
    onReconnecting: useCallback((info: { attempt: number; maxAttempts: number }) => {
      setError(`Reconectando... Tentativa ${info.attempt}/${info.maxAttempts}`);
    }, [])
  });

  // Optimized order status handlers
  const handleOrderStatusChange = useCallback(async (orderId: string | number, newStatus: string) => {
    try {
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus }
            : order
        )
      );
      
      if (navigator.onLine) {
        await kdsService.updateOrderStatus(orderId, newStatus);
      } else {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          await offlineStorage.saveOrder({ ...order, status: newStatus, synced: false });
        }
      }
      
      sendMessage('order.status_changed', { orderId, status: newStatus });
      
      if (newStatus === 'ready') {
        if (soundEnabled) {
          await audioService.playOrderReady();
        }
        const order = orders.find(o => o.id === orderId);
        if (order) {
          addAlert('ready', `Pedido #${order.order_number} pronto!`, 5000);
        }
        setTimeout(loadOrdersDebounced, 1000);
      } else if (newStatus === 'delivered') {
        setTimeout(loadOrdersDebounced, 1000);
      }
    } catch (err) {
      await offlineStorage.log('Error updating order status', err);
      setError('Erro ao atualizar status do pedido');
    }
  }, [orders, soundEnabled, sendMessage, addAlert, loadOrdersDebounced]);

  const handleItemStatusChange = useCallback(async (
    orderId: string | number, 
    itemId: string | number, 
    newStatus: string
  ) => {
    try {
      setOrders(prevOrders => 
        prevOrders.map(order => {
          if (order.id === orderId) {
            return {
              ...order,
              items: order.items.map(item => 
                item.item_id === itemId 
                  ? { ...item, status: newStatus }
                  : item
              )
            };
          }
          return order;
        })
      );
      
      if (navigator.onLine) {
        await kdsService.updateItemStatus(orderId, itemId, newStatus);
      } else {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          const updatedOrder = {
            ...order,
            items: order.items.map(item => 
              item.item_id === itemId ? { ...item, status: newStatus } : item
            ),
            synced: false
          };
          await offlineStorage.saveOrder(updatedOrder);
        }
      }
      
      sendMessage('order.item_status_changed', { orderId, itemId, status: newStatus });
      
      const order = orders.find(o => o.id === orderId);
      if (order && order.items.every(item => item.item_id === itemId ? newStatus === 'ready' : item.status === 'ready')) {
        handleOrderStatusChange(orderId, 'ready');
      }
    } catch (err) {
      await offlineStorage.log('Error updating item status', err);
      setError('Erro ao atualizar status do item');
    }
  }, [orders, sendMessage, handleOrderStatusChange]);

  // Keyboard shortcuts
  const shortcuts = useKeyboardShortcuts([
    {
      key: KDS_SHORTCUTS.REFRESH.key,
      action: loadOrdersDebounced,
      description: KDS_SHORTCUTS.REFRESH.description
    },
    {
      key: KDS_SHORTCUTS.FULLSCREEN.key,
      action: toggleFullscreen,
      description: KDS_SHORTCUTS.FULLSCREEN.description
    },
    {
      key: KDS_SHORTCUTS.TOGGLE_SOUND.key,
      ctrl: true,
      action: () => {
        const newState = audioService.toggle();
        setSoundEnabled(newState);
        addAlert('warning', newState ? 'Som ativado' : 'Som desativado', 2000);
      },
      description: KDS_SHORTCUTS.TOGGLE_SOUND.description
    },
    {
      key: KDS_SHORTCUTS.FILTER_ALL.key,
      ctrl: true,
      action: () => setSelectedStation('all'),
      description: KDS_SHORTCUTS.FILTER_ALL.description
    },
    {
      key: KDS_SHORTCUTS.HELP.key,
      action: () => setShowHelp(prev => !prev),
      description: KDS_SHORTCUTS.HELP.description
    },
    {
      key: KDS_SHORTCUTS.NEXT_ORDER.key,
      action: () => setSelectedOrderIndex(prev => Math.min(prev + 1, orders.length - 1)),
      description: KDS_SHORTCUTS.NEXT_ORDER.description
    },
    {
      key: KDS_SHORTCUTS.PREV_ORDER.key,
      action: () => setSelectedOrderIndex(prev => Math.max(prev - 1, 0)),
      description: KDS_SHORTCUTS.PREV_ORDER.description
    }
  ]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setError(null);
      loadOrdersDebounced();
      loadStations();
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setError('Modo offline - trabalhando com dados em cache');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadOrdersDebounced, loadStations]);

  // Initialize
  useEffect(() => {
    offlineStorage.init().then(() => {
      loadOrdersDebounced();
      loadStations();
    });
  }, [loadOrdersDebounced, loadStations]);

  // Auto-refresh with optimization
  useEffect(() => {
    const interval = setInterval(loadOrdersDebounced, 30000);
    return () => clearInterval(interval);
  }, [loadOrdersDebounced]);

  // Initialize audio
  useEffect(() => {
    audioService.setVolume(0.7);
    if (soundEnabled) {
      audioService.enable();
    } else {
      audioService.disable();
    }
  }, [soundEnabled]);

  // Memoized computed values
  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
  }), [orders]);

  const convertedOrders = useMemo(() => orders.map(order => {
    const baseOrder = {
      ...order,
      type: order.table_number ? 'table' : 'delivery',
      created_at: order.created_at,
      items: order.items.map(item => ({
        id: item.item_id,
        name: item.name,
        quantity: item.quantity,
        status: item.status,
        notes: item.notes || ''
      }))
    };
    
    if (!order.table_number) {
      (baseOrder as any).delivery_id = order.id;
    }
    
    return baseOrder;
  }), [orders]);

  // Virtualization for large lists (only use when more than 9 orders)
  const useVirtualScroll = convertedOrders.length > 9;
  const { visibleItems, totalHeight, offsetY } = useVirtualization({
    items: convertedOrders,
    itemHeight: 250,
    containerHeight: window.innerHeight - 200,
    overscan: 2
  });

  const ordersToRender = useVirtualScroll ? visibleItems : convertedOrders;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Kitchen Display System
              </h1>
              <Badge variant="info" size="lg">
                {stats.total} pedidos
              </Badge>
            </div>
            
            <div className="flex items-center gap-4">
              <Select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                options={[
                  { value: 'all', label: 'Todas as Estações' },
                  ...stations.map(s => ({ value: s.id, label: s.name }))
                ]}
                className="w-48"
              />
              
              <Badge 
                variant={isOffline ? 'danger' : isConnected ? 'success' : 'warning'}
                size="lg"
              >
                {isOffline ? (
                  <><FaExclamationTriangle className="inline mr-1" /> Offline</>
                ) : isConnected ? (
                  <><FaWifi className="inline mr-1" /> Conectado</>
                ) : (
                  <><FaSync className="inline mr-1 animate-spin" /> Conectando...</>
                )}
              </Badge>
              
              <Button
                variant="secondary"
                icon={<FaSync className={loading ? 'animate-spin' : ''} />}
                onClick={loadOrdersDebounced}
                disabled={loading}
              >
                Atualizar
              </Button>
              
              <Button
                variant="ghost"
                icon={soundEnabled ? <FaVolumeUp /> : <FaVolumeMute />}
                onClick={() => {
                  const newState = audioService.toggle();
                  setSoundEnabled(newState);
                  addAlert('warning', newState ? 'Som ativado' : 'Som desativado', 2000);
                }}
                title="Alternar som (Ctrl+M)"
              />
              
              <Button
                variant="ghost"
                icon={isFullscreen ? <FaCompress /> : <FaExpand />}
                onClick={toggleFullscreen}
                title="Tela cheia (F11)"
              />
              
              <Button
                variant="ghost"
                icon={<FaKeyboard />}
                onClick={() => setShowHelp(prev => !prev)}
                title="Atalhos de teclado (F1)"
              />
              
              <Button
                variant="ghost"
                icon={<FaCog />}
                onClick={() => {/* Settings - TODO: Implement settings modal */}}
              />
            </div>
          </div>
          
          <div className="flex gap-6 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Pendentes:</span>
              <Badge variant="warning">{stats.pending}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Preparando:</span>
              <Badge variant="info">{stats.preparing}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Prontos:</span>
              <Badge variant="success">{stats.ready}</Badge>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Help modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center" onClick={() => setShowHelp(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Atalhos de Teclado</h2>
            <div className="space-y-2">
              {shortcuts.map(shortcut => (
                <div key={shortcut.combination} className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{shortcut.description}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">
                    {shortcut.combination}
                  </kbd>
                </div>
              ))}
            </div>
            <Button
              variant="primary"
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full"
            >
              Fechar
            </Button>
          </div>
        </div>
      )}

      <Suspense fallback={<div />}>
        <AlertSystem alerts={alerts} onAlertClose={removeAlert} />
      </Suspense>
      
      <main className="container mx-auto px-4 py-6" ref={containerRef}>
        {error && (
          <div className="bg-danger-100 text-danger-800 dark:bg-danger-900 dark:text-danger-200 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        {loading && orders.length === 0 ? (
          <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <OrderCardSkeleton key={i} />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
                Nenhum pedido pendente
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Os pedidos aparecerão aqui quando forem enviados para a cozinha
              </p>
            </div>
          </div>
        ) : useVirtualScroll ? (
          <div 
            className="relative"
            style={{ height: `${Math.min(totalHeight, window.innerHeight - 200)}px` }}
          >
            <div 
              className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4"
              style={{ transform: `translateY(${offsetY}px)` }}
            >
              {ordersToRender.map((order, index) => (
                <div
                  key={order.id}
                  className={index === selectedOrderIndex ? 'ring-4 ring-primary-500 rounded-lg' : ''}
                >
                  <Suspense fallback={<OrderCardSkeleton />}>
                    <OrderCard
                      order={order}
                      onStatusChange={handleOrderStatusChange}
                      onItemStatusChange={handleItemStatusChange}
                      nextStatus="preparing"
                    />
                  </Suspense>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4">
            {ordersToRender.map((order, index) => (
              <div
                key={order.id}
                className={index === selectedOrderIndex ? 'ring-4 ring-primary-500 rounded-lg' : ''}
              >
                <Suspense fallback={<OrderCardSkeleton />}>
                  <OrderCard
                    order={order}
                    onStatusChange={handleOrderStatusChange}
                    onItemStatusChange={handleItemStatusChange}
                    nextStatus="preparing"
                  />
                </Suspense>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default KDSMainPage;