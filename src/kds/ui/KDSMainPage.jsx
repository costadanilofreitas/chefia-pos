import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import './KDSMainPage.css';

// Componentes
import OrderCard from './OrderCard';
import StationSelector from './StationSelector';
import KDSHeader from './KDSHeader';
import KDSStats from './KDSStats';

// Enums e constantes
const OrderStatus = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY: 'ready',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

const OrderPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

const KDSMainPage = () => {
  // Estado
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [activeStation, setActiveStation] = useState('all');
  const [searchParams] = useSearchParams();
  const kdsId = searchParams.get('kds') || '1';
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(10); // segundos

  // Efeito para carregar a sessão do KDS
  useEffect(() => {
    const fetchSession = async () => {
      try {
        // Em um ambiente real, buscaríamos a sessão pelo ID
        // Por enquanto, simulamos uma sessão
        setSession({
          id: kdsId,
          name: `Estação KDS ${kdsId}`,
          station_type: 'all',
          active: true
        });
      } catch (err) {
        console.error('Erro ao carregar sessão do KDS:', err);
        setError('Não foi possível carregar a sessão do KDS');
      }
    };

    fetchSession();
  }, [kdsId]);

  // Efeito para carregar pedidos
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        // Em um ambiente real, faríamos uma chamada à API
        // Por enquanto, simulamos dados
        const response = await fetch(`/api/v1/kds/orders?station=${activeStation}`);
        if (!response.ok) {
          throw new Error('Falha ao buscar pedidos');
        }
        const data = await response.json();
        setOrders(data);
        setError(null);
      } catch (err) {
        console.error('Erro ao carregar pedidos:', err);
        setError('Não foi possível carregar os pedidos');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    // Configurar atualização periódica
    const intervalId = setInterval(fetchOrders, refreshInterval * 1000);
    return () => clearInterval(intervalId);
  }, [activeStation, refreshInterval]);

  // Efeito para carregar estatísticas
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Em um ambiente real, faríamos uma chamada à API
        // Por enquanto, simulamos dados
        const response = await fetch('/api/v1/kds/stats');
        if (!response.ok) {
          throw new Error('Falha ao buscar estatísticas');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Erro ao carregar estatísticas:', err);
      }
    };

    fetchStats();
    const intervalId = setInterval(fetchStats, 30000); // Atualiza a cada 30 segundos
    return () => clearInterval(intervalId);
  }, []);

  // Função para atualizar o status de um pedido
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      // Em um ambiente real, faríamos uma chamada à API
      // Por enquanto, simulamos a atualização
      const response = await fetch(`/api/v1/kds/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar pedido');
      }

      // Atualizar o estado local
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updated_at: new Date().toISOString() } 
          : order
      ));
    } catch (err) {
      console.error('Erro ao atualizar status do pedido:', err);
      alert('Não foi possível atualizar o status do pedido');
    }
  };

  // Função para atualizar o status de um item
  const updateItemStatus = async (orderId, itemId, newStatus) => {
    try {
      // Em um ambiente real, faríamos uma chamada à API
      // Por enquanto, simulamos a atualização
      const response = await fetch(`/api/v1/kds/orders/${orderId}/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar item');
      }

      // Atualizar o estado local
      setOrders(orders.map(order => {
        if (order.id === orderId) {
          const updatedItems = order.items.map(item => 
            item.id === itemId 
              ? { ...item, status: newStatus } 
              : item
          );
          
          // Verificar se todos os itens têm o mesmo status
          const allSameStatus = updatedItems.every(item => item.status === newStatus);
          
          return { 
            ...order, 
            items: updatedItems,
            // Se todos os itens tiverem o mesmo status, atualizar o status do pedido
            status: allSameStatus ? newStatus : order.status,
            updated_at: new Date().toISOString()
          };
        }
        return order;
      }));
    } catch (err) {
      console.error('Erro ao atualizar status do item:', err);
      alert('Não foi possível atualizar o status do item');
    }
  };

  // Filtrar pedidos por status
  const pendingOrders = orders.filter(order => order.status === OrderStatus.PENDING);
  const preparingOrders = orders.filter(order => order.status === OrderStatus.PREPARING);
  const readyOrders = orders.filter(order => order.status === OrderStatus.READY);

  // Ordenar pedidos por prioridade e tempo
  const sortOrders = (ordersList) => {
    return [...ordersList].sort((a, b) => {
      // Primeiro por prioridade (URGENT > HIGH > NORMAL > LOW)
      const priorityOrder = { 'urgent': 3, 'high': 2, 'normal': 1, 'low': 0 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // Depois por tempo (mais antigo primeiro)
      return new Date(a.created_at) - new Date(b.created_at);
    });
  };

  // Renderizar listas de pedidos ordenadas
  const sortedPendingOrders = sortOrders(pendingOrders);
  const sortedPreparingOrders = sortOrders(preparingOrders);
  const sortedReadyOrders = sortOrders(readyOrders);

  if (loading && !session) {
    return <div className="kds-loading">Carregando KDS...</div>;
  }

  if (error && !session) {
    return <div className="kds-error">{error}</div>;
  }

  return (
    <div className="kds-container">
      <KDSHeader 
        session={session} 
        refreshInterval={refreshInterval}
        onRefreshIntervalChange={setRefreshInterval}
      />
      
      <div className="kds-content">
        <div className="kds-sidebar">
          <StationSelector 
            activeStation={activeStation} 
            onStationChange={setActiveStation} 
          />
          <KDSStats stats={stats} />
        </div>
        
        <div className="kds-orders-container">
          <div className="kds-column">
            <div className="kds-column-header pending">
              <h2>Pendentes ({sortedPendingOrders.length})</h2>
            </div>
            <div className="kds-orders-list">
              {sortedPendingOrders.map(order => (
                <OrderCard 
                  key={order.id}
                  order={order}
                  onStatusChange={updateOrderStatus}
                  onItemStatusChange={updateItemStatus}
                  nextStatus={OrderStatus.PREPARING}
                />
              ))}
              {sortedPendingOrders.length === 0 && (
                <div className="kds-empty-list">Nenhum pedido pendente</div>
              )}
            </div>
          </div>
          
          <div className="kds-column">
            <div className="kds-column-header preparing">
              <h2>Em Preparo ({sortedPreparingOrders.length})</h2>
            </div>
            <div className="kds-orders-list">
              {sortedPreparingOrders.map(order => (
                <OrderCard 
                  key={order.id}
                  order={order}
                  onStatusChange={updateOrderStatus}
                  onItemStatusChange={updateItemStatus}
                  nextStatus={OrderStatus.READY}
                />
              ))}
              {sortedPreparingOrders.length === 0 && (
                <div className="kds-empty-list">Nenhum pedido em preparo</div>
              )}
            </div>
          </div>
          
          <div className="kds-column">
            <div className="kds-column-header ready">
              <h2>Prontos ({sortedReadyOrders.length})</h2>
            </div>
            <div className="kds-orders-list">
              {sortedReadyOrders.map(order => (
                <OrderCard 
                  key={order.id}
                  order={order}
                  onStatusChange={updateOrderStatus}
                  onItemStatusChange={updateItemStatus}
                  nextStatus={OrderStatus.DELIVERED}
                />
              ))}
              {sortedReadyOrders.length === 0 && (
                <div className="kds-empty-list">Nenhum pedido pronto</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KDSMainPage;
