import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Nav, Alert, Spinner, Badge } from 'react-bootstrap';
import './KDSMetrics.css';

/**
 * Componente de métricas e análise de desempenho do KDS
 * 
 * Exibe estatísticas de tempo de preparo, eficiência e desempenho
 * das estações de trabalho na cozinha.
 */
const KDSMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Função para buscar métricas do backend
  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      
      // Em produção, substituir por chamada real à API
      // const params = new URLSearchParams();
      // if (dateRange === 'custom') {
      //   params.append('start_date', customStartDate);
      //   params.append('end_date', customEndDate);
      // } else {
      //   params.append('range', dateRange);
      // }
      // const response = await fetch(`/api/kds/metrics?${params.toString()}`);
      // const data = await response.json();
      
      // Dados simulados para desenvolvimento
      // Simular um pequeno atraso para mostrar o loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dados simulados
      const mockMetrics = {
        period: {
          start: '2025-05-24T00:00:00Z',
          end: '2025-05-25T00:00:00Z',
          label: 'Últimas 24 horas'
        },
        orders: {
          total: 128,
          completed: 124,
          in_progress: 4,
          completion_rate: 96.9
        },
        preparation_times: {
          average: 12.3, // minutos
          median: 10.5,
          min: 2.1,
          max: 35.8,
          by_type: {
            local: 13.2,
            takeout: 10.8,
            delivery: 11.5
          }
        },
        synchronization: {
          accuracy: 87.5, // porcentagem de pedidos com itens finalizados dentro de 2 minutos
          average_deviation: 1.8, // minutos de diferença média entre primeiro e último item
          perfect_sync: 45.2 // porcentagem de pedidos com todos os itens prontos dentro de 1 minuto
        },
        stations: {
          grill: {
            items: 245,
            average_time: 8.5,
            efficiency: 92.3,
            load: 'medium'
          },
          fry: {
            items: 187,
            average_time: 5.2,
            efficiency: 95.1,
            load: 'high'
          },
          salad: {
            items: 112,
            average_time: 4.3,
            efficiency: 97.8,
            load: 'low'
          },
          pizza: {
            items: 98,
            average_time: 12.7,
            efficiency: 88.5,
            load: 'medium'
          },
          dessert: {
            items: 76,
            average_time: 6.8,
            efficiency: 94.2,
            load: 'low'
          }
        },
        peak_hours: [
          { hour: 12, orders: 24 },
          { hour: 13, orders: 28 },
          { hour: 19, orders: 22 },
          { hour: 20, orders: 26 }
        ],
        items: {
          most_ordered: [
            { name: 'X-Burger', count: 87, avg_time: 7.8 },
            { name: 'Batata Frita', count: 76, avg_time: 4.5 },
            { name: 'Pizza Margherita', count: 42, avg_time: 13.2 },
            { name: 'Salada Caesar', count: 38, avg_time: 3.8 },
            { name: 'Milkshake Chocolate', count: 35, avg_time: 5.2 }
          ],
          slowest: [
            { name: 'Pizza Especial', avg_time: 18.5, count: 22 },
            { name: 'Costela ao Molho', avg_time: 16.2, count: 18 },
            { name: 'Risoto de Camarão', avg_time: 15.8, count: 15 },
            { name: 'Lasanha à Bolonhesa', avg_time: 14.3, count: 28 },
            { name: 'Picanha Grelhada', avg_time: 13.7, count: 32 }
          ]
        }
      };
      
      setMetrics(mockMetrics);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao buscar métricas:', err);
      setError('Falha ao carregar métricas. Tente novamente.');
      setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate]);
  
  // Efeito para buscar métricas na inicialização e quando o intervalo de datas mudar
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);
  
  // Função para lidar com a mudança no intervalo de datas
  const handleDateRangeChange = (e) => {
    setDateRange(e.target.value);
  };
  
  // Função para formatar o tempo em minutos
  const formatTime = (minutes) => {
    if (minutes < 60) {
      return `${minutes.toFixed(1)} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins.toFixed(0)}min`;
    }
  };
  
  // Função para determinar a cor com base na eficiência
  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 95) return 'success';
    if (efficiency >= 85) return 'warning';
    return 'danger';
  };
  
  // Função para determinar a cor com base na carga
  const getLoadColor = (load) => {
    switch (load) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'secondary';
    }
  };
  
  return (
    <Container fluid className="kds-metrics py-3">
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center flex-wrap">
                <h2 className="mb-0">Métricas de Desempenho do KDS</h2>
                <div className="d-flex align-items-center mt-2 mt-md-0">
                  <Form.Group className="me-3">
                    <Form.Select 
                      value={dateRange}
                      onChange={handleDateRangeChange}
                      className="date-range-select"
                    >
                      <option value="today">Hoje</option>
                      <option value="yesterday">Ontem</option>
                      <option value="week">Últimos 7 dias</option>
                      <option value="month">Últimos 30 dias</option>
                      <option value="custom">Personalizado</option>
                    </Form.Select>
                  </Form.Group>
                  
                  {dateRange === 'custom' && (
                    <div className="d-flex align-items-center custom-date-range">
                      <Form.Control
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="me-2"
                      />
                      <span className="me-2">até</span>
                      <Form.Control
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="me-3"
                      />
                    </div>
                  )}
                  
                  <Button 
                    variant="primary" 
                    onClick={fetchMetrics}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-1" />
                        Carregando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-clockwise me-1"></i>
                        Atualizar
                      </>
                    )}
                  </Button>
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
      
      {loading ? (
        <Row>
          <Col className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Carregando métricas...</p>
          </Col>
        </Row>
      ) : metrics ? (
        <>
          <Row className="mb-4">
            <Col md={12}>
              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">Resumo do Período: {metrics.period.label}</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={3} sm={6} className="metric-summary-item">
                      <div className="metric-value">{metrics.orders.total}</div>
                      <div className="metric-label">Pedidos Totais</div>
                    </Col>
                    <Col md={3} sm={6} className="metric-summary-item">
                      <div className="metric-value">{metrics.preparation_times.average.toFixed(1)} min</div>
                      <div className="metric-label">Tempo Médio de Preparo</div>
                    </Col>
                    <Col md={3} sm={6} className="metric-summary-item">
                      <div className="metric-value">{metrics.synchronization.accuracy.toFixed(1)}%</div>
                      <div className="metric-label">Precisão de Sincronização</div>
                    </Col>
                    <Col md={3} sm={6} className="metric-summary-item">
                      <div className="metric-value">{metrics.orders.completion_rate.toFixed(1)}%</div>
                      <div className="metric-label">Taxa de Conclusão</div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Row className="mb-4">
            <Col lg={6}>
              <Card className="h-100">
                <Card.Header>
                  <h5 className="mb-0">Desempenho por Estação</h5>
                </Card.Header>
                <Card.Body>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Estação</th>
                          <th>Itens</th>
                          <th>Tempo Médio</th>
                          <th>Eficiência</th>
                          <th>Carga</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(metrics.stations).map(([station, data]) => (
                          <tr key={station}>
                            <td className="station-name">{station.charAt(0).toUpperCase() + station.slice(1)}</td>
                            <td>{data.items}</td>
                            <td>{data.average_time.toFixed(1)} min</td>
                            <td>
                              <Badge bg={getEfficiencyColor(data.efficiency)}>
                                {data.efficiency.toFixed(1)}%
                              </Badge>
                            </td>
                            <td>
                              <Badge bg={getLoadColor(data.load)}>
                                {data.load.toUpperCase()}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col lg={6}>
              <Card className="h-100">
                <Card.Header>
                  <h5 className="mb-0">Sincronização de Preparo</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={4} className="text-center mb-3">
                      <div className="metric-circle" style={{ 
                        backgroundColor: metrics.synchronization.accuracy >= 90 ? '#28a745' : 
                                        metrics.synchronization.accuracy >= 75 ? '#ffc107' : '#dc3545' 
                      }}>
                        <span>{metrics.synchronization.accuracy.toFixed(1)}%</span>
                      </div>
                      <div className="mt-2">Precisão de Sincronização</div>
                      <small className="text-muted">Itens finalizados dentro de 2 min</small>
                    </Col>
                    
                    <Col md={4} className="text-center mb-3">
                      <div className="metric-circle" style={{ 
                        backgroundColor: metrics.synchronization.average_deviation <= 1 ? '#28a745' : 
                                        metrics.synchronization.average_deviation <= 3 ? '#ffc107' : '#dc3545' 
                      }}>
                        <span>{metrics.synchronization.average_deviation.toFixed(1)} min</span>
                      </div>
                      <div className="mt-2">Desvio Médio</div>
                      <small className="text-muted">Diferença entre primeiro e último item</small>
                    </Col>
                    
                    <Col md={4} className="text-center mb-3">
                      <div className="metric-circle" style={{ 
                        backgroundColor: metrics.synchronization.perfect_sync >= 60 ? '#28a745' : 
                                        metrics.synchronization.perfect_sync >= 40 ? '#ffc107' : '#dc3545' 
                      }}>
                        <span>{metrics.synchronization.perfect_sync.toFixed(1)}%</span>
                      </div>
                      <div className="mt-2">Sincronização Perfeita</div>
                      <small className="text-muted">Todos os itens prontos dentro de 1 min</small>
                    </Col>
                  </Row>
                  
                  <hr />
                  
                  <div className="mt-3">
                    <h6>Tempos de Preparo por Tipo de Pedido</h6>
                    <div className="prep-time-bars">
                      <div className="prep-time-bar-item">
                        <div className="d-flex justify-content-between mb-1">
                          <span>Mesa</span>
                          <span>{metrics.preparation_times.by_type.local.toFixed(1)} min</span>
                        </div>
                        <div className="progress">
                          <div 
                            className="progress-bar bg-info" 
                            style={{ width: `${(metrics.preparation_times.by_type.local / metrics.preparation_times.max) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="prep-time-bar-item mt-2">
                        <div className="d-flex justify-content-between mb-1">
                          <span>Para Viagem</span>
                          <span>{metrics.preparation_times.by_type.takeout.toFixed(1)} min</span>
                        </div>
                        <div className="progress">
                          <div 
                            className="progress-bar bg-warning" 
                            style={{ width: `${(metrics.preparation_times.by_type.takeout / metrics.preparation_times.max) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="prep-time-bar-item mt-2">
                        <div className="d-flex justify-content-between mb-1">
                          <span>Delivery</span>
                          <span>{metrics.preparation_times.by_type.delivery.toFixed(1)} min</span>
                        </div>
                        <div className="progress">
                          <div 
                            className="progress-bar bg-danger" 
                            style={{ width: `${(metrics.preparation_times.by_type.delivery / metrics.preparation_times.max) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Row className="mb-4">
            <Col md={6}>
              <Card className="h-100">
                <Card.Header>
                  <h5 className="mb-0">Itens Mais Pedidos</h5>
                </Card.Header>
                <Card.Body>
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Quantidade</th>
                          <th>Tempo Médio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.items.most_ordered.map((item, index) => (
                          <tr key={index}>
                            <td>{item.name}</td>
                            <td>{item.count}</td>
                            <td>{item.avg_time.toFixed(1)} min</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6}>
              <Card className="h-100">
                <Card.Header>
                  <h5 className="mb-0">Itens Mais Demorados</h5>
                </Card.Header>
                <Card.Body>
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Tempo Médio</th>
                          <th>Quantidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.items.slowest.map((item, index) => (
                          <tr key={index}>
                            <td>{item.name}</td>
                            <td>{item.avg_time.toFixed(1)} min</td>
                            <td>{item.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Row>
            <Col md={12}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Horários de Pico</h5>
                </Card.Header>
                <Card.Body>
                  <div className="peak-hours-chart">
                    {metrics.peak_hours.map((hour, index) => (
                      <div key={index} className="peak-hour-bar">
                        <div className="peak-hour-label">{hour.hour}:00</div>
                        <div 
                          className="peak-hour-value" 
                          style={{ 
                            height: `${(hour.orders / Math.max(...metrics.peak_hours.map(h => h.orders))) * 100}%` 
                          }}
                        >
                          <span className="peak-hour-count">{hour.orders}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      ) : null}
    </Container>
  );
};

export default KDSMetrics;
