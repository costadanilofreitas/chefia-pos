import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Nav, Alert, Spinner } from 'react-bootstrap';
import KDSOrderCard from './KDSOrderCard';
import './KDSDashboard.css';

/**
 * Dashboard principal do KDS com inteligência de sincronização
 * 
 * Exibe pedidos organizados por prioridade, com filtros por estação
 * e funcionalidades para gerenciar o fluxo de trabalho na cozinha.
 */
const KDSDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeStation, setActiveStation] = useState('all');
  const [highlightMode, setHighlightMode] = useState('auto');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [stations, setStations] = useState([
    { id: 'all', name: 'Todas Estações' },
    { id: 'grill', name: 'Grelha' },
    { id: 'fry', name: 'Fritadeira' },
    { id: 'salad', name: 'Saladas' },
    { id: 'dessert', name: 'Sobremesas' }
  ]);
  
  // Função para buscar pedidos do backend
  const fetchOrders = useCallback(async () => {
    try {
      // Em produção, substituir por chamada real à API
      // const response = await fetch('/api/kds/orders');
      // const data = await response.json();
      
      // Dados simulados para desenvolvimento
      const mockOrders = [
        {
          order_id: '1',
          order_number: '1001',
          created_at: new Date(Date.now() - 15 * 60000).toISOString(), // 15 minutos atrás
          updated_at: new Date(Date.now() - 5 * 60000).toISOString(),
          type: 'local',
          table_number: '12',
          customer_name: 'João Silva',
          priority: 'medium',
          items: [
            {
              item_id: '101',
              name: 'X-Burger',
              quantity: 1,
              status: 'pending',
              station: 'grill',
              estimated_prep_time: 300, // 5 minutos em segundos
              estimated_start_time: new Date(Date.now() - 30000).toISOString(), // 30 segundos atrás
              customizations: { 'Sem cebola': true, 'Ponto da carne': 'Ao ponto' }
            },
            {
              item_id: '102',
              name: 'Batata Frita',
              quantity: 1,
              status: 'preparing',
              station: 'fry',
              estimated_prep_time: 180, // 3 minutos em segundos
              estimated_start_time: new Date(Date.now() - 60000).toISOString(), // 1 minuto atrás
              customizations: {}
            },
            {
              item_id: '103',
              name: 'Refrigerante Cola',
              quantity: 1,
              status: 'ready',
              station: 'bar',
              estimated_prep_time: 60, // 1 minuto em segundos
              estimated_start_time: new Date(Date.now() - 120000).toISOString(), // 2 minutos atrás
              customizations: {}
            }
          ]
        },
        {
          order_id: '2',
          order_number: '1002',
          created_at: new Date(Date.now() - 5 * 60000).toISOString(), // 5 minutos atrás
          updated_at: new Date(Date.now() - 2 * 60000).toISOString(),
          type: 'delivery',
          customer_name: 'Maria Oliveira',
          priority: 'high',
          items: [
            {
              item_id: '201',
              name: 'Pizza Margherita',
              quantity: 1,
              status: 'pending',
              station: 'pizza',
              estimated_prep_time: 600, // 10 minutos em segundos
              estimated_start_time: new Date(Date.now()).toISOString(), // Agora
              customizations: { 'Borda': 'Catupiry' }
            },
            {
              item_id: '202',
              name: 'Salada Caesar',
              quantity: 1,
              status: 'pending',
              station: 'salad',
              estimated_prep_time: 180, // 3 minutos em segundos
              estimated_start_time: new Date(Date.now() + 420000).toISOString(), // 7 minutos no futuro
              customizations: {}
            }
          ]
        },
        {
          order_id: '3',
          order_number: '1003',
          created_at: new Date(Date.now() - 25 * 60000).toISOString(), // 25 minutos atrás
          updated_at: new Date(Date.now() - 10 * 60000).toISOString(),
          type: 'takeout',
          customer_name: 'Carlos Pereira',
          priority: 'high',
          items: [
            {
              item_id: '301',
              name: 'Hambúrguer Vegetariano',
              quantity: 2,
              status: 'preparing',
              station: 'grill',
              estimated_prep_time: 360, // 6 minutos em segundos
              estimated_start_time: new Date(Date.now() - 180000).toISOString(), // 3 minutos atrás
              customizations: {}
            },
            {
              item_id: '302',
              name: 'Onion Rings',
              quantity: 1,
              status: 'pending',
              station: 'fry',
              estimated_prep_time: 240, // 4 minutos em segundos
              estimated_start_time: new Date(Date.now() - 60000).toISOString(), // 1 minuto atrás
              customizations: {}
            },
            {
              item_id: '303',
              name: 'Milkshake Chocolate',
              quantity: 2,
              status: 'ready',
              station: 'dessert',
              estimated_prep_time: 180, // 3 minutos em segundos
              estimated_start_time: new Date(Date.now() - 240000).toISOString(), // 4 minutos atrás
              customizations: { 'Extra': 'Calda de caramelo' }
            }
          ]
        }
      ];
      
      setOrders(mockOrders);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
      setError('Falha ao carregar pedidos. Tente novamente.');
      setLoading(false);
    }
  }, []);
  
  // Efeito para buscar pedidos na inicialização
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  // Efeito para atualização automática
  useEffect(() => {
    let intervalId;
    
    if (autoRefresh) {
      intervalId = setInterval(() => {
        fetchOrders();
      }, 30000); // Atualizar a cada 30 segundos
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, fetchOrders]);
  
  // Função para alterar o status de um item
  const handleItemStatusChange = useCallback(async (orderId, itemId, newStatus) => {
    try {
      // Em produção, substituir por chamada real à API
      // await fetch(`/api/kds/orders/${orderId}/items/${itemId}/status`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ status: newStatus })
      // });
      
      // Atualização local para simulação
      setOrders(prevOrders => 
        prevOrders.map(order => {
          if (order.order_id === orderId) {
            return {
              ...order,
              items: order.items.map(item => {
                if (item.item_id === itemId) {
                  return { ...item, status: newStatus };
                }
                return item;
              }),
              updated_at: new Date().toISOString()
            };
          }
          return order;
        })
      );
      
      console.log(`Item ${itemId} do pedido ${orderId} atualizado para ${newStatus}`);
    } catch (err) {
      console.error('Erro ao atualizar status do item:', err);
      setError('Falha ao atualizar status. Tente novamente.');
    }
  }, []);
  
  // Função para marcar um pedido como completo
  const handleOrderComplete = useCallback(async (orderId) => {
    try {
      // Em produção, substituir por chamada real à API
      // await fetch(`/api/kds/orders/${orderId}/complete`, {
      //   method: 'PUT'
      // });
      
      // Atualização local para simulação
      setOrders(prevOrders => prevOrders.filter(order => order.order_id !== orderId));
      
      console.log(`Pedido ${orderId} marcado como completo`);
    } catch (err) {
      console.error('Erro ao completar pedido:', err);
      setError('Falha ao completar pedido. Tente novamente.');
    }
  }, []);
  
  // Filtrar pedidos por estação
  const filteredOrders = orders.filter(order => {
    if (activeStation === 'all') return true;
    
    return order.items.some(item => item.station === activeStation);
  });
  
  // Ordenar pedidos por prioridade e tempo de espera
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    // Primeiro por prioridade
    const priorityOrder = { high: 0, medium: 1, normal: 2 };
    const priorityA = priorityOrder[a.priority] || 2;
    const priorityB = priorityOrder[b.priority] || 2;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Depois por tempo de espera (mais antigo primeiro)
    return new Date(a.created_at) - new Date(b.created_at);
  });
  
  return (
    <Container fluid className="kds-dashboard py-3">
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <h2 className="mb-0">Kitchen Display System</h2>
                <div>
                  <Button 
                    variant="outline-primary" 
                    className="me-2"
                    onClick={fetchOrders}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-1" />
                        Atualizando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-clockwise me-1"></i>
                        Atualizar
                      </>
                    )}
                  </Button>
                  <Form.Check 
                    type="switch"
                    id="auto-refresh-switch"
                    label="Atualização Automática"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="d-inline-block ms-2"
                  />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {error && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          </Col>
        </Row>
      )}
      
      <Row className="mb-3">
        <Col>
          <Card>
            <Card.Body className="p-2">
              <div className="d-flex justify-content-between align-items-center">
                <Nav variant="pills" className="station-nav">
                  {stations.map(station => (
                    <Nav.Item key={station.id}>
                      <Nav.Link 
                        active={activeStation === station.id}
                        onClick={() => setActiveStation(station.id)}
                      >
                        {station.name}
                      </Nav.Link>
                    </Nav.Item>
                  ))}
                </Nav>
                
                <Form.Group className="highlight-control">
                  <Form.Label className="me-2 mb-0">Destaque:</Form.Label>
                  <Form.Select 
                    size="sm" 
                    value={highlightMode}
                    onChange={(e) => setHighlightMode(e.target.value)}
                    style={{ width: 'auto' }}
                  >
                    <option value="auto">Automático</option>
                    <option value="always">Sempre</option>
                    <option value="none">Nunca</option>
                  </Form.Select>
                </Form.Group>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        {loading ? (
          <Col className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Carregando pedidos...</p>
          </Col>
        ) : sortedOrders.length === 0 ? (
          <Col className="text-center py-5">
            <div className="empty-state">
              <i className="bi bi-check-circle-fill"></i>
              <h4>Nenhum pedido pendente</h4>
              <p>Todos os pedidos foram processados ou não há pedidos para esta estação.</p>
            </div>
          </Col>
        ) : (
          <>
            {sortedOrders.map(order => (
              <Col key={order.order_id} lg={4} md={6} className="mb-3">
                <KDSOrderCard 
                  order={order}
                  onItemStatusChange={handleItemStatusChange}
                  onOrderComplete={handleOrderComplete}
                  currentStation={activeStation === 'all' ? null : activeStation}
                  highlightMode={highlightMode}
                />
              </Col>
            ))}
          </>
        )}
      </Row>
      
      <Row className="mt-4">
        <Col>
          <Card className="bg-light">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Legenda: </strong>
                <Badge bg="danger" className="me-2">Alta Prioridade</Badge>
                <Badge bg="warning" text="dark" className="me-2">Média Prioridade</Badge>
                <Badge bg="primary" className="me-2">Prioridade Normal</Badge>
              </div>
              <div>
                <small className="text-muted">
                  Última atualização: {new Date().toLocaleTimeString()}
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default KDSDashboard;
