/**
 * Waiter Main Page - Simplified Version
 * Waiter terminal interface with reduced complexity
 */

import {
  BookOpen,
  CheckCircle,
  Clock,
  Maximize, Minimize,
  Moon,
  Plus,
  Receipt,
  RefreshCw,
  Sun,
  Users,
  Wifi, WifiOff
} from 'lucide-react';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { BottomNavigation } from '../components/BottomNavigation';
import { NotificationContainer } from '../components/NotificationContainer';
import { PullToRefresh } from '../components/PullToRefresh';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader } from '../components/ui/Card';
import { OrderSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { TabPanel, Tabs } from '../components/ui/Tabs';
import {
  ITEM_STATUS,
  NOTIFICATION_TYPE,
  TABLE_STATUS,
  TABS,
  TIME
} from '../config/constants';
import { useNotifications } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { useFullscreen } from '../hooks/useFullscreen';
import { KeyboardKeys, useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useWaiterData } from '../hooks/useWaiterData';
import { useWaiterWebSocket } from '../hooks/useWaiterWebSocket';
import { logger } from '../services/logger';
import type { Order, Table } from '../types';
import {
  calculateTotal,
  formatCurrency, getItemsWithStatus,
  getStatusConfig,
  updateItemById, upsertItem
} from '../utils/dataHelpers';

// Table Card Component
const TableCard = memo(({ 
  table, 
  isSelected, 
  onSelect 
}: { 
  table: Table; 
  isSelected: boolean; 
  onSelect: (table: Table) => void;
}) => {
  const statusConfig = getStatusConfig(table.status);
  
  return (
    <Card
      hoverable
      onClick={() => onSelect(table)}
      className={isSelected ? 'ring-2 ring-primary-500' : ''}
    >
      <CardContent className="text-center">
        <div className="text-2xl font-bold mb-2 select-none">Mesa {table.number}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 select-none">
          {table.seats} lugares
        </div>
        <Badge variant={statusConfig.variant as any} dot>
          {statusConfig.label}
        </Badge>
      </CardContent>
    </Card>
  );
});
TableCard.displayName = 'TableCard';

// Order Card Component
const OrderCard = memo(({ 
  order, 
  onDeliver 
}: { 
  order: Order; 
  onDeliver: (order: Order) => void;
}) => {
  const getItemIcon = (status: string) => {
    const icons: Record<string, JSX.Element> = {
      [ITEM_STATUS.PREPARING]: <Clock className="h-4 w-4 text-yellow-500" />,
      [ITEM_STATUS.READY]: <CheckCircle className="h-4 w-4 text-green-500" />,
      [ITEM_STATUS.DELIVERED]: <CheckCircle className="h-4 w-4 text-gray-400" />,
    };
    return icons[status] || null;
  };
  
  const readyItems = getItemsWithStatus(order.items, ITEM_STATUS.READY);
  const hasReadyItems = readyItems.length > 0;
  const orderTotal = calculateTotal(order.items);
  const statusConfig = getStatusConfig(order.status);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold select-none">Pedido #{order.id}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 select-none">
              Mesa {order.table_id} • {new Date(order.created_at).toLocaleTimeString()}
            </p>
          </div>
          <Badge variant={statusConfig.variant as any}>
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {order.items.map(item => (
            <div key={item.id} className="flex justify-between items-center py-2">
              <div className="flex items-center space-x-3">
                {getItemIcon(item.status)}
                <div>
                  <span className="font-medium">
                    {item.quantity}x {item.name}
                  </span>
                  {item.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatCurrency(orderTotal)}</span>
          </div>
        </div>
      </CardContent>
      {hasReadyItems && (
        <CardFooter>
          <Button
            variant="success"
            fullWidth
            onClick={() => onDeliver(order)}
          >
            Entregar {readyItems.length} {readyItems.length === 1 ? 'Item' : 'Itens'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
});
OrderCard.displayName = 'OrderCard';

// Header Component
const WaiterHeader = memo(({
  stats,
  isOnline,
  isConnected,
  isFullscreen,
  theme,
  lastSync,
  onRefresh,
  onToggleFullscreen,
  onToggleTheme,
}: {
  stats: any;
  isOnline: boolean;
  isConnected: boolean;
  isFullscreen: boolean;
  theme: string;
  lastSync: Date | null;
  onRefresh: () => void;
  onToggleFullscreen: () => void;
  onToggleTheme: () => void;
}) => (
  <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white select-none">
            Garçom
          </h1>
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            {isConnected && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-4 text-sm">
            <span className="text-gray-600 dark:text-gray-400 select-none">
              {stats.availableTables} mesas livres
            </span>
            {stats.readyItems > 0 && (
              <Badge variant="warning">
                {stats.readyItems} itens prontos
              </Badge>
            )}
            {lastSync && (
              <span className="text-xs text-gray-500 dark:text-gray-400 select-none">
                Atualizado: {lastSync.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              icon={<RefreshCw className="h-4 w-4" />}
              aria-label="Atualizar"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFullscreen}
              icon={isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              aria-label="Tela cheia"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleTheme}
              icon={theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              aria-label="Tema"
            />
          </div>
        </div>
      </div>
    </div>
  </header>
));
WaiterHeader.displayName = 'WaiterHeader';

// Main Component
const WaiterMainPage: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<string>(TABS.TABLES);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  
  // Hooks
  const { theme, toggleTheme } = useTheme();
  const { addNotification } = useNotifications();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  
  // Pull to refresh
  const { isPulling, pullDistance, isRefreshing, pullProgress } = usePullToRefresh({
    onRefresh: async () => {
      await handleRefresh();
    },
    enabled: true
  });
  
  // Data management
  const {
    tables,
    orders,
    menu,
    stats,
    loading,
    error,
    lastSync,
    isOnline,
    loadAllData,
    createOrder,
    deliverOrderItems,
    setTables,
    setOrders
  } = useWaiterData();
  
  // WebSocket callbacks (stable references)
  const handleTableUpdate = useCallback((data: any) => {
    if (data?.id) {
      setTables(prev => updateItemById(prev, data.id, data));
      addNotification({
        type: NOTIFICATION_TYPE.INFO,
        title: 'Mesa atualizada',
        message: `Mesa ${data.number || data.id} foi atualizada`,
        duration: TIME.NOTIFICATION
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependencies removed for stability
  
  const handleOrderUpdate = useCallback((data: any) => {
    if (data?.id) {
      setOrders(prev => upsertItem(prev, data));
      addNotification({
        type: NOTIFICATION_TYPE.INFO,
        title: 'Pedido atualizado',
        message: `Pedido #${data.id} foi atualizado`,
        duration: TIME.NOTIFICATION
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependencies removed for stability
  
  const handleKitchenUpdate = useCallback((data: any) => {
    if (data?.orderId) {
      addNotification({
        type: NOTIFICATION_TYPE.SUCCESS,
        title: 'Item pronto!',
        message: `Item do pedido #${data.orderId} está pronto`,
        duration: TIME.NOTIFICATION_LONG
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependencies removed for stability
  
  // WebSocket
  const { isConnected, requestAssistance } = useWaiterWebSocket({
    tableIds: useMemo(() => tables.map(t => t.id), [tables]),
    onTableUpdate: handleTableUpdate,
    onOrderUpdate: handleOrderUpdate,
    onKitchenUpdate: handleKitchenUpdate
  });
  
  // Handlers
  const handleRefresh = useCallback(async () => {
    await loadAllData(false);
    addNotification({
      type: NOTIFICATION_TYPE.SUCCESS,
      title: 'Dados atualizados',
      duration: TIME.NOTIFICATION
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependencies removed for stability
  
  const handleTableSelect = useCallback((table: Table) => {
    setSelectedTable(table);
    logger.logTableEvent('selected', table.id, { tableNumber: table.number });
  }, []);
  
  const handleNewOrder = useCallback(async () => {
    // Use functional update to get current state
    setSelectedTable(currentTable => {
      if (!currentTable) return currentTable;
      
      (async () => {
        try {
          await createOrder(currentTable.id, []);
          addNotification({
            type: NOTIFICATION_TYPE.SUCCESS,
            title: 'Pedido criado',
            message: `Novo pedido para mesa ${currentTable.number}`,
            duration: TIME.NOTIFICATION
          });
          setActiveTab(TABS.ORDERS);
        } catch (err) {
          addNotification({
            type: NOTIFICATION_TYPE.ERROR,
            title: 'Erro ao criar pedido',
            message: 'Não foi possível criar o pedido',
            duration: TIME.NOTIFICATION_LONG
          });
        }
      })();
      
      return currentTable;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependencies removed for stability
  
  const handleDeliverItems = useCallback(async (order: Order) => {
    const readyItems = getItemsWithStatus(order.items, ITEM_STATUS.READY);
    if (readyItems.length === 0) return;
    
    try {
      await deliverOrderItems(order.id, readyItems.map(item => item.id));
      addNotification({
        type: NOTIFICATION_TYPE.SUCCESS,
        title: 'Itens entregues',
        message: `${readyItems.length} itens marcados como entregues`,
        duration: TIME.NOTIFICATION
      });
    } catch (err) {
      addNotification({
        type: NOTIFICATION_TYPE.ERROR,
        title: 'Erro ao entregar itens',
        duration: TIME.NOTIFICATION_LONG
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependencies removed for stability
  
  const handleRequestHelp = useCallback(() => {
    // Use functional update to get current state
    setSelectedTable(currentTable => {
      if (currentTable) {
        requestAssistance(currentTable.id, 'help');
        addNotification({
          type: NOTIFICATION_TYPE.INFO,
          title: 'Ajuda solicitada',
          message: 'Um supervisor foi notificado',
          duration: TIME.NOTIFICATION
        });
      }
      return currentTable;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependencies removed for stability
  
  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: KeyboardKeys.F1, handler: () => setShowHelp(prev => !prev), description: 'Ajuda' },
    { key: KeyboardKeys.F5, handler: handleRefresh, description: 'Atualizar' },
    { key: KeyboardKeys.F11, handler: toggleFullscreen, description: 'Tela cheia' },
    { key: KeyboardKeys.N, ctrl: true, handler: handleNewOrder, description: 'Novo pedido' },
    { key: KeyboardKeys.H, ctrl: true, handler: handleRequestHelp, description: 'Solicitar ajuda' },
    { key: KeyboardKeys.NUMBER_1, handler: () => setActiveTab(TABS.TABLES), description: 'Mesas' },
    { key: KeyboardKeys.NUMBER_2, handler: () => setActiveTab(TABS.ORDERS), description: 'Pedidos' },
    { key: KeyboardKeys.NUMBER_3, handler: () => setActiveTab(TABS.MENU), description: 'Cardápio' },
  ]);
  
  // Tabs configuration
  const tabs = useMemo(() => [
    {
      id: TABS.TABLES,
      label: 'Mesas',
      icon: <Users className="h-4 w-4" />,
      badge: stats.occupiedTables > 0 && (
        <Badge variant="primary" size="sm">{stats.occupiedTables}</Badge>
      )
    },
    {
      id: TABS.ORDERS,
      label: 'Pedidos',
      icon: <Receipt className="h-4 w-4" />,
      badge: stats.activeOrders > 0 && (
        <Badge variant="danger" size="sm">{stats.activeOrders}</Badge>
      )
    },
    {
      id: TABS.MENU,
      label: 'Cardápio',
      icon: <BookOpen className="h-4 w-4" />
    }
  ], [stats]);
  
  // Removed full-page loading to allow progressive loading
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <NotificationContainer />
      
      {/* Pull to Refresh Indicator */}
      <PullToRefresh
        isPulling={isPulling}
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        pullProgress={pullProgress}
      />
      
      <WaiterHeader
        stats={stats}
        isOnline={isOnline}
        isConnected={isConnected}
        isFullscreen={isFullscreen}
        theme={theme}
        lastSync={lastSync}
        onRefresh={handleRefresh}
        onToggleFullscreen={toggleFullscreen}
        onToggleTheme={toggleTheme}
      />
      
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-20">
        <Card className="mb-6 hidden md:block">
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} fullWidth />
        </Card>
        
        {/* Tables Tab */}
        <TabPanel value={TABS.TABLES} activeValue={activeTab}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold select-none">Layout do Restaurante</h2>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {loading ? (
                      // Show skeletons while loading
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableSkeleton key={i} />
                      ))
                    ) : (
                      tables.map(table => (
                        <TableCard
                          key={table.id}
                          table={table}
                          isSelected={selectedTable?.id === table.id}
                          onSelect={handleTableSelect}
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              {selectedTable ? (
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold select-none">Mesa {selectedTable.number}</h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      variant="primary"
                      fullWidth
                      disabled={selectedTable.status !== TABLE_STATUS.OCCUPIED}
                      onClick={handleNewOrder}
                      icon={<Plus className="h-4 w-4" />}
                    >
                      Novo Pedido
                    </Button>
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={handleRequestHelp}
                    >
                      Solicitar Ajuda
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-8 select-none">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 select-none">
                      Selecione uma mesa
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabPanel>
        
        {/* Orders Tab */}
        <TabPanel value={TABS.ORDERS} activeValue={activeTab}>
          <div className="space-y-4">
            {loading ? (
              // Show skeletons while loading
              Array.from({ length: 3 }).map((_, i) => (
                <OrderSkeleton key={i} />
              ))
            ) : orders.length > 0 ? (
              orders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onDeliver={handleDeliverItems}
                />
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-12 select-none">
                  <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 select-none">
                    Nenhum pedido ativo
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabPanel>
        
        {/* Menu Tab */}
        <TabPanel value={TABS.MENU} activeValue={activeTab}>
          <Card>
            <CardContent className="text-center py-12 select-none">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 select-none">
                Cardápio: {menu.length} itens disponíveis
              </p>
            </CardContent>
          </Card>
        </TabPanel>
      </main>
      
      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md">
            <CardHeader>
              <h2 className="text-lg font-semibold select-none">Atalhos do Teclado</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">F1</kbd>
                <span>Ajuda</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">F5</kbd>
                <span>Atualizar</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">F11</kbd>
                <span>Tela Cheia</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+N</kbd>
                <span>Novo Pedido</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">1, 2, 3</kbd>
                <span>Navegar Abas</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button fullWidth onClick={() => setShowHelp(false)}>Fechar</Button>
            </CardFooter>
          </Card>
        </div>
      )}
      
      {/* Bottom Navigation for Mobile */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        badges={{
          tables: stats.occupiedTables,
          orders: stats.activeOrders
        }}
      />
    </div>
  );
};

export default WaiterMainPage;