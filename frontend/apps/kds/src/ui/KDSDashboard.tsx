import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Nav, Alert, Spinner, Badge } from 'react-bootstrap';
import { kdsService, Order } from '../services/kdsService';
import './KDSDashboard.css';

interface Station {
  id: string;
  name: string;
}

type HighlightMode = 'auto' | 'always' | 'none';

/**
 * Dashboard principal do KDS com inteligência de sincronização
 * 
 * Exibe pedidos organizados por prioridade, com filtros por estação
 * e funcionalidades para gerenciar o fluxo de trabalho na cozinha.
 */
const KDSDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStation, setActiveStation] = useState<string>('all');
  const [highlightMode, setHighlightMode] = useState<HighlightMode>('auto');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [stations, setStations] = useState<Station[]>([
    { id: 'all', name: 'Todas Estações' },
    { id: 'grill', name: 'Grelha' },
    { id: 'fry', name: 'Fritadeira' },
    { id: 'salad', name: 'Saladas' },
    { id: 'dessert', name: 'Sobremesas' }
  ]);
  
  // Função para buscar pedidos do backend
  const fetchOrders = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const ordersData = await kdsService.getOrders();
      setOrders(ordersData);
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
      setError('Falha ao carregar pedidos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Efeito para buscar pedidos na inicialização
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  // Efeito para atualização automática
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    
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
  
  // Função para buscar estações do backend
  useEffect(() => {
    const fetchStations = async (): Promise<void> => {
      try {
        const stationsData = await kdsService.getStations();
        
        // Adicionar a opção "Todas Estações" no início
        const allStations = [
          { id: 'all', name: 'Todas Estações' },
          ...stationsData
        ];
        setStations(allStations);
      } catch (err) {
        console.error('Erro ao buscar estações:', err);
        // Manter as estações padrão em caso de erro
      }
    };
    
    fetchStations();
  }, []);
  
  // Função para alterar o status de um item
  const handleItemStatusChange = useCallback(async (orderId: string, itemId: string, newStatus: string): Promise<void> => {
    try {
      const success = await kdsService.updateItemStatus(orderId, itemId, newStatus);
      
      if (success) {
        // Atualização local para feedback imediato
        setOrders(prevOrders => 
          prevOrders.map(order => {
            if (order.id === Number(orderId)) {
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
      } else {
        setError('Falha ao atualizar status do item. Tente novamente.');
      }
    } catch (err) {
      console.error('Erro ao atualizar status do item:', err);
      setError('Falha ao atualizar status. Tente novamente.');
    }
  }, []);
  
  // Função para marcar um pedido como completo
  const handleOrderComplete = useCallback(async (orderId: string): Promise<void> => {
    try {
      const success = await kdsService.completeOrder(orderId);
      
      if (success) {
        // Remover o pedido da lista local
        setOrders(prevOrders => prevOrders.filter(order => order.id !== Number(orderId)));
        console.log(`Pedido ${orderId} marcado como completo`);
      } else {
        setError('Falha ao completar pedido. Tente novamente.');
      }
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
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, normal: 2 };
    const priorityA = priorityOrder[a.priority] || 2;
    const priorityB = priorityOrder[b.priority] || 2;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Depois por tempo de espera (mais antigo primeiro)
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
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
                    onClick={() => fetchOrders()}
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
                    onChange={(e) => setHighlightMode(e.target.value as HighlightMode)}
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
              <Col key={order.id} lg={4} md={6} className="mb-3">
                <Card className={`order-card priority-${order.priority}`}>
                  <Card.Header>
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">Pedido #{order.order_number}</h5>
                      <Badge bg={order.priority === 'high' ? 'danger' : 
                                order.priority === 'medium' ? 'warning' : 'primary'}>
                        {order.priority === 'high' ? 'Alta' : 
                         order.priority === 'medium' ? 'Média' : 'Normal'}
                      </Badge>
                    </div>
                    <div className="order-meta">
                      <small>
                        {order.source === 'ifood' ? 'iFood' : 
                         order.source === 'whatsapp' ? 'WhatsApp' : 
                         order.table_number ? `Mesa ${order.table_number}` : 'Balcão'}
                      </small>
                      <small className="ms-2">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </small>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <div className="order-items">
                      {order.items.map(item => (
                        <div 
                          key={item.item_id} 
                          className={`order-item ${item.status === 'ready' ? 'item-ready' : ''}`}
                        >
                          <div className="d-flex justify-content-between">
                            <div>
                              <strong>{item.quantity}x</strong> {item.name}
                              {item.notes && <div className="item-notes">{item.notes}</div>}
                            </div>
                            <div>
                              <Button 
                                variant={item.status === 'ready' ? 'success' : 'outline-success'} 
                                size="sm"
                                onClick={() => handleItemStatusChange(
                                  order.id.toString(), 
                                  item.item_id, 
                                  item.status === 'ready' ? 'preparing' : 'ready'
                                )}
                              >
                                {item.status === 'ready' ? 'Pronto' : 'Marcar Pronto'}
                              </Button>
                            </div>
                          </div>
                          <div className="item-station">
                            <Badge bg="secondary">{item.station}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card.Body>
                  <Card.Footer>
                    <Button 
                      variant="primary" 
                      className="w-100"
                      onClick={() => handleOrderComplete(order.id.toString())}
                    >
                      Completar Pedido
                    </Button>
                  </Card.Footer>
                </Card>
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
