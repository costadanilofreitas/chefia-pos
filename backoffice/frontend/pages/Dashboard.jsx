import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const { selectedBrand, selectedRestaurant } = useOutletContext();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // In a real app, fetch dashboard metrics from API
    const fetchDashboardMetrics = async () => {
      setLoading(true);
      try {
        // Build query params
        let queryParams = '';
        if (selectedBrand) {
          queryParams += `brand_id=${selectedBrand}`;
        }
        if (selectedRestaurant) {
          queryParams += queryParams ? '&' : '';
          queryParams += `restaurant_id=${selectedRestaurant}`;
        }

        // const url = `/api/backoffice/dashboard${queryParams ? `?${queryParams}` : ''}`;
        // const response = await fetch(url);
        // if (!response.ok) throw new Error('Failed to fetch dashboard metrics');
        // const data = await response.json();
        // setMetrics(data);
        
        // Mock data for demo
        setTimeout(() => {
          setMetrics({
            sales_today: 3245.78,
            sales_week: 18765.32,
            sales_month: 67890.45,
            sales_growth: 12.5,
            active_orders: 8,
            completed_orders_today: 47,
            average_order_value: 69.06,
            top_selling_products: [
              { name: 'Hambúrguer Clássico', quantity: 32, revenue: 576.00 },
              { name: 'Batata Frita', quantity: 28, revenue: 252.00 },
              { name: 'Refrigerante', quantity: 45, revenue: 225.00 },
              { name: 'Milk Shake', quantity: 18, revenue: 198.00 },
              { name: 'Salada Caesar', quantity: 12, revenue: 180.00 }
            ],
            inventory_alerts: [
              { item: 'Carne', current_stock: 5, minimum_stock: 10, status: 'low' },
              { item: 'Queijo', current_stock: 3, minimum_stock: 15, status: 'low' }
            ],
            recent_activities: [
              { activity: 'Novo pedido recebido', timestamp: '2025-05-25T01:45:23Z', user: 'Sistema' },
              { activity: 'Pedido entregue', timestamp: '2025-05-25T01:30:12Z', user: 'admin' },
              { activity: 'Estoque atualizado', timestamp: '2025-05-25T01:15:45Z', user: 'admin' },
              { activity: 'Novo cliente registrado', timestamp: '2025-05-25T01:05:33Z', user: 'Sistema' },
              { activity: 'Pagamento processado', timestamp: '2025-05-25T00:55:18Z', user: 'Sistema' }
            ]
          });
          setLoading(false);
        }, 800);
      } catch (err) {
        console.error('Error fetching dashboard metrics:', err);
        setError('Failed to load dashboard metrics');
        setLoading(false);
      }
    };

    fetchDashboardMetrics();
  }, [selectedBrand, selectedRestaurant]);

  if (loading) return <div className="dashboard-loading">Carregando dashboard...</div>;
  if (error) return <div className="dashboard-error">{error}</div>;
  if (!metrics) return <div className="dashboard-empty">Nenhum dado disponível</div>;

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Dashboard</h1>
      
      {/* Sales metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Vendas Hoje</h3>
          <p className="metric-value">{formatCurrency(metrics.sales_today)}</p>
        </div>
        
        <div className="metric-card">
          <h3>Vendas na Semana</h3>
          <p className="metric-value">{formatCurrency(metrics.sales_week)}</p>
        </div>
        
        <div className="metric-card">
          <h3>Vendas no Mês</h3>
          <p className="metric-value">{formatCurrency(metrics.sales_month)}</p>
        </div>
        
        <div className="metric-card">
          <h3>Crescimento</h3>
          <p className={`metric-value ${metrics.sales_growth >= 0 ? 'positive' : 'negative'}`}>
            {metrics.sales_growth >= 0 ? '+' : ''}{metrics.sales_growth}%
          </p>
        </div>
      </div>
      
      {/* Order metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Pedidos Ativos</h3>
          <p className="metric-value">{metrics.active_orders}</p>
        </div>
        
        <div className="metric-card">
          <h3>Pedidos Concluídos Hoje</h3>
          <p className="metric-value">{metrics.completed_orders_today}</p>
        </div>
        
        <div className="metric-card">
          <h3>Valor Médio do Pedido</h3>
          <p className="metric-value">{formatCurrency(metrics.average_order_value)}</p>
        </div>
      </div>
      
      {/* Top selling products */}
      <div className="dashboard-section">
        <h2>Produtos Mais Vendidos</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Receita</th>
              </tr>
            </thead>
            <tbody>
              {metrics.top_selling_products.map((product, index) => (
                <tr key={index}>
                  <td>{product.name}</td>
                  <td>{product.quantity}</td>
                  <td>{formatCurrency(product.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Inventory alerts */}
      {metrics.inventory_alerts.length > 0 && (
        <div className="dashboard-section">
          <h2>Alertas de Estoque</h2>
          <div className="alerts-container">
            {metrics.inventory_alerts.map((alert, index) => (
              <div key={index} className="alert-card">
                <h3>{alert.item}</h3>
                <p>Estoque atual: <span className="alert-value">{alert.current_stock}</span></p>
                <p>Estoque mínimo: <span>{alert.minimum_stock}</span></p>
                <div className={`alert-status ${alert.status}`}>
                  {alert.status === 'low' ? 'Estoque Baixo' : 'Crítico'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Recent activities */}
      <div className="dashboard-section">
        <h2>Atividades Recentes</h2>
        <div className="activities-container">
          {metrics.recent_activities.map((activity, index) => (
            <div key={index} className="activity-item">
              <div className="activity-icon">📝</div>
              <div className="activity-details">
                <p className="activity-text">{activity.activity}</p>
                <p className="activity-meta">
                  <span className="activity-time">{formatDate(activity.timestamp)}</span>
                  <span className="activity-user">por {activity.user}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
