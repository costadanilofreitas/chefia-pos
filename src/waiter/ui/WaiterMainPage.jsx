import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import './WaiterMainPage.css';

// Componentes
import TableGrid from './TableGrid';
import OrderForm from './OrderForm';
import OrderList from './OrderList';
import WaiterHeader from './WaiterHeader';
import WaiterStats from './WaiterStats';

// Enums e constantes
const OrderStatus = {
  DRAFT: 'draft',
  SENT: 'sent',
  PREPARING: 'preparing',
  READY: 'ready',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

const TableStatus = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  RESERVED: 'reserved',
  CLEANING: 'cleaning'
};

const WaiterMainPage = () => {
  // Estado
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [view, setView] = useState('tables'); // 'tables', 'order', 'orders'
  const [searchParams] = useSearchParams();
  const waiterId = searchParams.get('waiter') || '1';
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncActions, setPendingSyncActions] = useState([]);

  // Efeito para monitorar conexão
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingActions();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Efeito para carregar a sessão do garçom
  useEffect(() => {
    const fetchSession = async () => {
      try {
        // Em um ambiente real, buscaríamos a sessão pelo ID do dispositivo
        // Por enquanto, simulamos uma sessão
        setSession({
          id: waiterId,
          waiter_id: waiterId,
          waiter_name: `Garçom ${waiterId}`,
          device_id: 'device-123',
          device_type: 'tablet',
          active: true
        });
      } catch (err) {
        console.error('Erro ao carregar sessão do garçom:', err);
        setError('Não foi possível carregar a sessão do garçom');
      }
    };

    fetchSession();
  }, [waiterId]);

  // Efeito para carregar mesas
  useEffect(() => {
    const fetchTables = async () => {
      setLoading(true);
      try {
        // Em um ambiente real, faríamos uma chamada à API
        // Por enquanto, simulamos dados
        const response = await fetch('/api/v1/waiter/tables');
        if (!response.ok) {
          throw new Error('Falha ao buscar mesas');
        }
        const data = await response.json();
        setTables(data);
        setError(null);
      } catch (err) {
        console.error('Erro ao carregar mesas:', err);
        setError('Não foi possível carregar as mesas');
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchTables();
    }
  }, [session]);

  // Efeito para carregar pedidos do garçom
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Em um ambiente real, faríamos uma chamada à API
        // Por enquanto, simulamos dados
        const response = await fetch(`/api/v1/waiter/orders?waiter_id=${waiterId}`);
        if (!response.ok) {
          throw new Error('Falha ao buscar pedidos');
        }
        const data = await response.json();
        setOrders(data);
      } catch (err) {
        console.error('Erro ao carregar pedidos:', err);
      }
    };

    if (session) {
      fetchOrders();
      const intervalId = setInterval(fetchOrders, 30000); // Atualiza a cada 30 segundos
      return () => clearInterval(intervalId);
    }
  }, [session, waiterId]);

  // Efeito para carregar estatísticas
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Em um ambiente real, faríamos uma chamada à API
        // Por enquanto, simulamos dados
        const response = await fetch('/api/v1/waiter/stats');
        if (!response.ok) {
          throw new Error('Falha ao buscar estatísticas');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Erro ao carregar estatísticas:', err);
      }
    };

    if (session) {
      fetchStats();
      const intervalId = setInterval(fetchStats, 60000); // Atualiza a cada minuto
      return () => clearInterval(intervalId);
    }
  }, [session]);

  // Função para selecionar uma mesa
  const handleTableSelect = (table) => {
    setSelectedTable(table);
    
    // Verificar se há pedido ativo para esta mesa
    const activeOrder = orders.find(
      order => order.table_number === table.number && 
      [OrderStatus.DRAFT, OrderStatus.SENT].includes(order.status)
    );
    
    if (activeOrder) {
      setSelectedOrder(activeOrder);
      setView('order');
    } else {
      setSelectedOrder(null);
      setView('order'); // Vai para tela de novo pedido
    }
  };

  // Função para criar um novo pedido
  const handleCreateOrder = async (orderData) => {
    try {
      if (!isOnline) {
        // Modo offline: armazenar ação para sincronização posterior
        const offlineOrder = {
          ...orderData,
          id: `offline-${Date.now()}`,
          local_id: `offline-${Date.now()}`,
          created_at: new Date().toISOString(),
          sync_status: 'pending_sync'
        };
        
        setPendingSyncActions([
          ...pendingSyncActions,
          { type: 'CREATE_ORDER', data: offlineOrder }
        ]);
        
        // Atualizar UI
        setOrders([...orders, offlineOrder]);
        setSelectedOrder(offlineOrder);
        
        // Atualizar mesa localmente
        const updatedTables = tables.map(t => 
          t.number === selectedTable.number 
            ? { ...t, status: TableStatus.OCCUPIED, current_order_id: offlineOrder.id }
            : t
        );
        setTables(updatedTables);
        
        return offlineOrder;
      }
      
      // Modo online: chamar API
      const response = await fetch('/api/v1/waiter/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error('Falha ao criar pedido');
      }

      const newOrder = await response.json();
      
      // Atualizar estado local
      setOrders([...orders, newOrder]);
      setSelectedOrder(newOrder);
      
      // Atualizar mesa
      const updatedTables = tables.map(t => 
        t.number === selectedTable.number 
          ? { ...t, status: TableStatus.OCCUPIED, current_order_id: newOrder.id }
          : t
      );
      setTables(updatedTables);
      
      return newOrder;
    } catch (err) {
      console.error('Erro ao criar pedido:', err);
      alert('Não foi possível criar o pedido');
      return null;
    }
  };

  // Função para atualizar um pedido
  const handleUpdateOrder = async (orderId, updateData) => {
    try {
      if (!isOnline) {
        // Modo offline: armazenar ação para sincronização posterior
        setPendingSyncActions([
          ...pendingSyncActions,
          { type: 'UPDATE_ORDER', orderId, data: updateData }
        ]);
        
        // Atualizar UI
        const updatedOrders = orders.map(order => 
          order.id === orderId 
            ? { ...order, ...updateData, updated_at: new Date().toISOString(), sync_status: 'pending_sync' }
            : order
        );
        setOrders(updatedOrders);
        
        const updatedOrder = updatedOrders.find(o => o.id === orderId);
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(updatedOrder);
        }
        
        return updatedOrder;
      }
      
      // Modo online: chamar API
      const response = await fetch(`/api/v1/waiter/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar pedido');
      }

      const updatedOrder = await response.json();
      
      // Atualizar estado local
      const updatedOrders = orders.map(order => 
        order.id === orderId ? updatedOrder : order
      );
      setOrders(updatedOrders);
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updatedOrder);
      }
      
      return updatedOrder;
    } catch (err) {
      console.error('Erro ao atualizar pedido:', err);
      alert('Não foi possível atualizar o pedido');
      return null;
    }
  };

  // Função para enviar pedido para a cozinha
  const handleSendOrder = async (orderId) => {
    try {
      if (!isOnline) {
        // Modo offline: armazenar ação para sincronização posterior
        setPendingSyncActions([
          ...pendingSyncActions,
          { type: 'SEND_ORDER', orderId }
        ]);
        
        // Atualizar UI
        const updatedOrders = orders.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                status: OrderStatus.SENT, 
                updated_at: new Date().toISOString(),
                sent_at: new Date().toISOString(),
                sync_status: 'pending_sync' 
              }
            : order
        );
        setOrders(updatedOrders);
        
        const updatedOrder = updatedOrders.find(o => o.id === orderId);
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(updatedOrder);
        }
        
        return updatedOrder;
      }
      
      // Modo online: chamar API
      const response = await fetch(`/api/v1/waiter/orders/${orderId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar pedido para a cozinha');
      }

      const updatedOrder = await response.json();
      
      // Atualizar estado local
      const updatedOrders = orders.map(order => 
        order.id === orderId ? updatedOrder : order
      );
      setOrders(updatedOrders);
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updatedOrder);
      }
      
      return updatedOrder;
    } catch (err) {
      console.error('Erro ao enviar pedido para a cozinha:', err);
      alert('Não foi possível enviar o pedido para a cozinha');
      return null;
    }
  };

  // Função para cancelar um pedido
  const handleCancelOrder = async (orderId, reason) => {
    try {
      if (!isOnline) {
        // Modo offline: armazenar ação para sincronização posterior
        setPendingSyncActions([
          ...pendingSyncActions,
          { type: 'CANCEL_ORDER', orderId, reason }
        ]);
        
        // Atualizar UI
        const updatedOrders = orders.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                status: OrderStatus.CANCELLED, 
                updated_at: new Date().toISOString(),
                notes: reason ? `Cancelado: ${reason}` : order.notes,
                sync_status: 'pending_sync' 
              }
            : order
        );
        setOrders(updatedOrders);
        
        // Atualizar mesa
        const orderToCancel = orders.find(o => o.id === orderId);
        if (orderToCancel) {
          const updatedTables = tables.map(t => 
            t.number === orderToCancel.table_number 
              ? { ...t, status: TableStatus.AVAILABLE, current_order_id: null }
              : t
          );
          setTables(updatedTables);
        }
        
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(null);
          setView('tables');
        }
        
        return true;
      }
      
      // Modo online: chamar API
      const url = reason 
        ? `/api/v1/waiter/orders/${orderId}/cancel?reason=${encodeURIComponent(reason)}`
        : `/api/v1/waiter/orders/${orderId}/cancel`;
        
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao cancelar pedido');
      }

      const updatedOrder = await response.json();
      
      // Atualizar estado local
      const updatedOrders = orders.map(order => 
        order.id === orderId ? updatedOrder : order
      );
      setOrders(updatedOrders);
      
      // Atualizar mesa
      const orderToCancel = orders.find(o => o.id === orderId);
      if (orderToCancel) {
        const updatedTables = tables.map(t => 
          t.number === orderToCancel.table_number 
            ? { ...t, status: TableStatus.AVAILABLE, current_order_id: null }
            : t
        );
        setTables(updatedTables);
      }
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
        setView('tables');
      }
      
      return true;
    } catch (err) {
      console.error('Erro ao cancelar pedido:', err);
      alert('Não foi possível cancelar o pedido');
      return false;
    }
  };

  // Função para sincronizar ações pendentes
  const syncPendingActions = async () => {
    if (!isOnline || pendingSyncActions.length === 0) {
      return;
    }
    
    // Processar cada ação pendente
    for (const action of pendingSyncActions) {
      try {
        switch (action.type) {
          case 'CREATE_ORDER':
            await fetch('/api/v1/waiter/orders', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...action.data,
                local_id: action.data.id // Enviar ID local para referência
              }),
            });
            break;
            
          case 'UPDATE_ORDER':
            await fetch(`/api/v1/waiter/orders/${action.orderId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(action.data),
            });
            break;
            
          case 'SEND_ORDER':
            await fetch(`/api/v1/waiter/orders/${action.orderId}/send`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            break;
            
          case 'CANCEL_ORDER':
            const url = action.reason 
              ? `/api/v1/waiter/orders/${action.orderId}/cancel?reason=${encodeURIComponent(action.reason)}`
              : `/api/v1/waiter/orders/${action.orderId}/cancel`;
              
            await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            break;
        }
      } catch (err) {
        console.error(`Erro ao sincronizar ação ${action.type}:`, err);
      }
    }
    
    // Limpar ações pendentes
    setPendingSyncActions([]);
    
    // Atualizar dados
    const fetchOrders = async () => {
      const response = await fetch(`/api/v1/waiter/orders?waiter_id=${waiterId}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    };
    
    const fetchTables = async () => {
      const response = await fetch('/api/v1/waiter/tables');
      if (response.ok) {
        const data = await response.json();
        setTables(data);
      }
    };
    
    await Promise.all([fetchOrders(), fetchTables()]);
    
    // Sincronizar com o servidor
    if (session) {
      await fetch(`/api/v1/waiter/sync/${session.device_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }
  };

  // Renderização condicional com base na view atual
  const renderContent = () => {
    if (loading) {
      return <div className="waiter-loading">Carregando...</div>;
    }
    
    if (error) {
      return <div className="waiter-error">{error}</div>;
    }
    
    switch (view) {
      case 'tables':
        return (
          <TableGrid 
            tables={tables} 
            onTableSelect={handleTableSelect}
            orders={orders}
          />
        );
        
      case 'order':
        return (
          <OrderForm 
            table={selectedTable}
            order={selectedOrder}
            onCreateOrder={handleCreateOrder}
            onUpdateOrder={handleUpdateOrder}
            onSendOrder={handleSendOrder}
            onCancelOrder={handleCancelOrder}
            onBack={() => setView('tables')}
            isOffline={!isOnline}
            waiterId={waiterId}
            waiterName={session?.waiter_name}
          />
        );
        
      case 'orders':
        return (
          <OrderList 
            orders={orders}
            onSelectOrder={(order) => {
              setSelectedOrder(order);
              setSelectedTable(tables.find(t => t.number === order.table_number) || null);
              setView('order');
            }}
            onBack={() => setView('tables')}
          />
        );
        
      default:
        return <div>Visualização não encontrada</div>;
    }
  };

  return (
    <div className="waiter-container">
      <WaiterHeader 
        session={session}
        view={view}
        onChangeView={setView}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncActions.length}
        onSyncRequest={syncPendingActions}
      />
      
      <div className="waiter-content">
        {renderContent()}
      </div>
      
      <div className="waiter-footer">
        <WaiterStats stats={stats} />
        {!isOnline && (
          <div className="offline-indicator">
            Modo Offline - {pendingSyncActions.length} ações pendentes
          </div>
        )}
      </div>
    </div>
  );
};

export default WaiterMainPage;
