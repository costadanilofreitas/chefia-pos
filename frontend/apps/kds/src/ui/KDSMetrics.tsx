import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Nav, Alert, Spinner, Badge } from 'react-bootstrap';
import { useApi } from '@common/contexts/core/hooks/useApi';
import './KDSMetrics.css';

interface MetricsPeriod {
  label: string;
  start_date?: string;
  end_date?: string;
}

interface PreparationTimes {
  average: number;
  max: number;
  by_type: {
    local: number;
    takeout: number;
    delivery: number;
  };
}

interface Synchronization {
  accuracy: number;
  average_deviation: number;
  perfect_sync: number;
}

interface StationData {
  items: number;
  average_time: number;
  efficiency: number;
  load: 'high' | 'medium' | 'low';
}

interface OrderItem {
  name: string;
  count: number;
  avg_time: number;
}

interface MetricsData {
  period: MetricsPeriod;
  orders: {
    total: number;
    completion_rate: number;
  };
  preparation_times: PreparationTimes;
  synchronization: Synchronization;
  stations: Record<string, StationData>;
  items: {
    most_ordered: OrderItem[];
    slowest: OrderItem[];
  };
}

type DateRangeType = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

/**
 * Componente de métricas e análise de desempenho do KDS
 * 
 * Exibe estatísticas de tempo de preparo, eficiência e desempenho
 * das estações de trabalho na cozinha.
 */
const KDSMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeType>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  const api = useApi();
  
  // Função para buscar métricas do backend
  const fetchMetrics = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (dateRange === 'custom') {
        params.append('start_date', customStartDate);
        params.append('end_date', customEndDate);
      } else {
        params.append('range', dateRange);
      }
      
      const response = await api.get(`/kds/metrics?${params.toString()}`);
      
      if (response.data && response.data.success) {
        setMetrics(response.data.data);
        setError(null);
      } else {
        setError('Falha ao carregar métricas: ' + (response.data?.message || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao buscar métricas:', err);
      setError('Falha ao carregar métricas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [api, dateRange, customStartDate, customEndDate]);
  
  // Efeito para buscar métricas na inicialização e quando o intervalo de datas mudar
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);
  
  // Função para lidar com a mudança no intervalo de datas
  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setDateRange(e.target.value as DateRangeType);
  };
  
  // Função para formatar o tempo em minutos
  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes.toFixed(1)} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins.toFixed(0)}min`;
    }
  };
  
  // Função para determinar a cor com base na eficiência
  const getEfficiencyColor = (efficiency: number): string => {
    if (efficiency >= 95) return 'success';
    if (efficiency >= 85) return 'warning';
    return 'danger';
  };
  
  // Função para determinar a cor com base na carga
  const getLoadColor = (load: string): string => {
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
                    onClick={() => fetchMetrics()}
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
        </>
      ) : (
        <Row>
          <Col className="text-center py-5">
            <Alert variant="info">
              Selecione um período e clique em Atualizar para visualizar as métricas.
            </Alert>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default KDSMetrics;
