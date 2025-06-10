import React, { useState, useEffect } from 'react';
import { fetchOrders, updateOrderStatus } from '../services/orderService';
import { Order, OrderStatus } from '../models/types';

/**
 * Main component for the Post-sale management application
 */
const PostsaleApp: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  // Fetch orders on component mount
  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const ordersData = await fetchOrders();
        setOrders(ordersData);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading orders:', err);
        setError('Falha ao carregar pedidos. Por favor, tente novamente.');
        setIsLoading(false);
      }
    };
    
    loadOrders();
  }, []);

  // Filter orders by status
  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(order => order.status === statusFilter);

  // Handle order selection
  const handleOrderSelect = (order: Order) => {
    setSelectedOrder(order);
  };

  // Handle status update
  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const updatedOrder = await updateOrderStatus(orderId, newStatus);
      
      // Update orders list with the updated order
      setOrders(orders.map(order => 
        order.id === updatedOrder.id ? updatedOrder : order
      ));
      
      // Update selected order if it's the one being updated
      if (selectedOrder && selectedOrder.id === updatedOrder.id) {
        setSelectedOrder(updatedOrder);
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      alert('Falha ao atualizar status do pedido. Por favor, tente novamente.');
    }
  };

  if (isLoading) {
    return <div className="loading">Carregando pedidos...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="postsale-app">
      <header className="postsale-header">
        <h1>Gerenciamento Pós-Venda</h1>
        <div className="status-filter">
          <label>Filtrar por status:</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendente</option>
            <option value="processing">Em processamento</option>
            <option value="shipped">Enviado</option>
            <option value="delivered">Entregue</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </header>
      
      <div className="orders-container">
        <div className="orders-list">
          <h2>Pedidos ({filteredOrders.length})</h2>
          {filteredOrders.length === 0 ? (
            <p>Nenhum pedido encontrado.</p>
          ) : (
            <ul>
              {filteredOrders.map(order => (
                <li 
                  key={order.id} 
                  className={`order-item ${selectedOrder?.id === order.id ? 'selected' : ''}`}
                  onClick={() => handleOrderSelect(order)}
                >
                  <div className="order-summary">
                    <span className="order-id">#{order.id}</span>
                    <span className={`order-status status-${order.status}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <div className="order-details">
                    <span className="order-customer">{order.customer.name}</span>
                    <span className="order-date">{new Date(order.createdAt).toLocaleDateString()}</span>
                    <span className="order-total">R$ {order.total.toFixed(2)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {selectedOrder && (
          <div className="order-detail-panel">
            <h2>Detalhes do Pedido #{selectedOrder.id}</h2>
            <div className="order-info">
              <div className="info-group">
                <h3>Cliente</h3>
                <p>{selectedOrder.customer.name}</p>
                <p>{selectedOrder.customer.email}</p>
                <p>{selectedOrder.customer.phone}</p>
              </div>
              
              <div className="info-group">
                <h3>Endereço de Entrega</h3>
                <p>{selectedOrder.shippingAddress.street}, {selectedOrder.shippingAddress.number}</p>
                <p>{selectedOrder.shippingAddress.complement}</p>
                <p>{selectedOrder.shippingAddress.neighborhood}, {selectedOrder.shippingAddress.city} - {selectedOrder.shippingAddress.state}</p>
                <p>CEP: {selectedOrder.shippingAddress.zipCode}</p>
              </div>
              
              <div className="info-group">
                <h3>Status</h3>
                <div className="status-controls">
                  <span className={`status-badge status-${selectedOrder.status}`}>
                    {getStatusLabel(selectedOrder.status)}
                  </span>
                  <select 
                    value={selectedOrder.status}
                    onChange={(e) => handleStatusUpdate(selectedOrder.id, e.target.value as OrderStatus)}
                  >
                    <option value="pending">Pendente</option>
                    <option value="processing">Em processamento</option>
                    <option value="shipped">Enviado</option>
                    <option value="delivered">Entregue</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="order-items">
              <h3>Itens do Pedido</h3>
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Quantidade</th>
                    <th>Preço Unit.</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map(item => (
                    <tr key={item.id}>
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>R$ {item.unitPrice.toFixed(2)}</td>
                      <td>R$ {item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Subtotal</td>
                    <td>R$ {selectedOrder.subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3}>Frete</td>
                    <td>R$ {selectedOrder.shippingCost.toFixed(2)}</td>
                  </tr>
                  <tr className="total-row">
                    <td colSpan={3}>Total</td>
                    <td>R$ {selectedOrder.total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get status label
const getStatusLabel = (status: OrderStatus): string => {
  switch (status) {
    case 'pending':
      return 'Pendente';
    case 'processing':
      return 'Em processamento';
    case 'shipped':
      return 'Enviado';
    case 'delivered':
      return 'Entregue';
    case 'cancelled':
      return 'Cancelado';
    default:
      return 'Desconhecido';
  }
};

export default PostsaleApp;
