import React, { useState, useEffect } from 'react';
import './ModuleMonitorDashboard.css';

const ModuleMonitorDashboard = () => {
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  useEffect(() => {
    // Simular carregamento de dados dos módulos
    const fetchModules = () => {
      // Em um ambiente real, isso seria uma chamada de API
      const mockModules = [
        {
          id: 'order',
          name: 'Pedidos',
          status: 'online',
          uptime: '3d 5h 12m',
          version: '1.2.3',
          lastRestart: '2025-05-22T10:15:30Z',
          eventCount: 1243,
          errorCount: 2,
          cpu: 12.5,
          memory: 128.4,
          endpoints: [
            { path: '/api/orders', method: 'GET', count: 532, avgResponseTime: 45 },
            { path: '/api/orders', method: 'POST', count: 231, avgResponseTime: 120 },
            { path: '/api/orders/{id}', method: 'GET', count: 345, avgResponseTime: 38 },
            { path: '/api/orders/{id}/status', method: 'PUT', count: 135, avgResponseTime: 85 }
          ],
          dependencies: ['payment', 'customer', 'product'],
          metrics: {
            requestsPerMinute: [4, 6, 8, 7, 9, 12, 10, 8, 7, 6, 8, 9],
            errorRate: [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0],
            responseTime: [42, 45, 48, 43, 44, 46, 45, 47, 44, 43, 45, 46]
          }
        },
        {
          id: 'payment',
          name: 'Pagamentos',
          status: 'online',
          uptime: '3d 5h 12m',
          version: '1.1.5',
          lastRestart: '2025-05-22T10:15:30Z',
          eventCount: 987,
          errorCount: 5,
          cpu: 8.2,
          memory: 112.7,
          endpoints: [
            { path: '/api/payments', method: 'GET', count: 321, avgResponseTime: 52 },
            { path: '/api/payments', method: 'POST', count: 198, avgResponseTime: 230 },
            { path: '/api/payments/{id}', method: 'GET', count: 245, avgResponseTime: 42 },
            { path: '/api/payments/split-config', method: 'GET', count: 89, avgResponseTime: 65 }
          ],
          dependencies: ['order', 'customer'],
          metrics: {
            requestsPerMinute: [3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 5, 6],
            errorRate: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
            responseTime: [50, 52, 55, 53, 51, 54, 52, 53, 51, 50, 52, 53]
          }
        },
        {
          id: 'remote_orders',
          name: 'Pedidos Remotos',
          status: 'online',
          uptime: '3d 5h 12m',
          version: '1.0.8',
          lastRestart: '2025-05-22T10:15:30Z',
          eventCount: 756,
          errorCount: 8,
          cpu: 9.8,
          memory: 145.2,
          endpoints: [
            { path: '/api/remote-orders', method: 'GET', count: 287, avgResponseTime: 62 },
            { path: '/api/remote-orders/ifood', method: 'POST', count: 156, avgResponseTime: 180 },
            { path: '/api/remote-orders/rappi', method: 'POST', count: 132, avgResponseTime: 175 },
            { path: '/api/remote-orders/{id}/status', method: 'PUT', count: 181, avgResponseTime: 95 }
          ],
          dependencies: ['order', 'product'],
          metrics: {
            requestsPerMinute: [2, 3, 4, 5, 6, 5, 4, 3, 4, 5, 6, 5],
            errorRate: [0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
            responseTime: [60, 62, 65, 63, 61, 64, 62, 63, 61, 60, 62, 63]
          }
        },
        {
          id: 'kds',
          name: 'KDS',
          status: 'online',
          uptime: '3d 5h 12m',
          version: '1.1.2',
          lastRestart: '2025-05-22T10:15:30Z',
          eventCount: 543,
          errorCount: 1,
          cpu: 7.3,
          memory: 98.6,
          endpoints: [
            { path: '/api/kds/orders', method: 'GET', count: 432, avgResponseTime: 38 },
            { path: '/api/kds/orders/{id}/items', method: 'GET', count: 321, avgResponseTime: 42 },
            { path: '/api/kds/orders/{id}/items/{itemId}/status', method: 'PUT', count: 287, avgResponseTime: 75 }
          ],
          dependencies: ['order'],
          metrics: {
            requestsPerMinute: [3, 4, 5, 6, 5, 4, 3, 4, 5, 6, 5, 4],
            errorRate: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            responseTime: [38, 40, 42, 39, 38, 41, 40, 39, 38, 40, 41, 39]
          }
        },
        {
          id: 'waiter',
          name: 'Garçom',
          status: 'online',
          uptime: '3d 5h 12m',
          version: '1.0.5',
          lastRestart: '2025-05-22T10:15:30Z',
          eventCount: 432,
          errorCount: 3,
          cpu: 6.7,
          memory: 87.3,
          endpoints: [
            { path: '/api/waiter/tables', method: 'GET', count: 321, avgResponseTime: 45 },
            { path: '/api/waiter/tables/{id}', method: 'GET', count: 245, avgResponseTime: 38 },
            { path: '/api/waiter/tables/{id}/orders', method: 'GET', count: 198, avgResponseTime: 52 },
            { path: '/api/waiter/layout', method: 'GET', count: 156, avgResponseTime: 65 }
          ],
          dependencies: ['order'],
          metrics: {
            requestsPerMinute: [2, 3, 4, 3, 2, 3, 4, 5, 4, 3, 2, 3],
            errorRate: [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
            responseTime: [45, 47, 49, 46, 45, 48, 47, 46, 45, 47, 48, 46]
          }
        },
        {
          id: 'peripherals',
          name: 'Periféricos',
          status: 'online',
          uptime: '3d 5h 12m',
          version: '1.0.2',
          lastRestart: '2025-05-22T10:15:30Z',
          eventCount: 321,
          errorCount: 4,
          cpu: 5.2,
          memory: 76.8,
          endpoints: [
            { path: '/api/peripherals/keyboards', method: 'GET', count: 187, avgResponseTime: 35 },
            { path: '/api/peripherals/keyboards/{id}', method: 'GET', count: 132, avgResponseTime: 32 },
            { path: '/api/peripherals/keyboards/{id}/config', method: 'PUT', count: 98, avgResponseTime: 85 },
            { path: '/api/peripherals/discover', method: 'POST', count: 45, avgResponseTime: 320 }
          ],
          dependencies: ['kds'],
          metrics: {
            requestsPerMinute: [1, 2, 1, 2, 3, 2, 1, 2, 1, 2, 3, 2],
            errorRate: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            responseTime: [35, 37, 39, 36, 35, 38, 37, 36, 35, 37, 38, 36]
          }
        }
      ];

      setModules(mockModules);
      if (!selectedModule && mockModules.length > 0) {
        setSelectedModule(mockModules[0]);
      }
    };

    fetchModules();

    // Configurar atualização automática
    let interval;
    if (isAutoRefresh) {
      interval = setInterval(fetchModules, 10000); // Atualizar a cada 10 segundos
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoRefresh, selectedModule]);

  const handleModuleSelect = (module) => {
    setSelectedModule(module);
  };

  const toggleAutoRefresh = () => {
    setIsAutoRefresh(!isAutoRefresh);
  };

  // Renderizar gráfico de linha
  const renderLineChart = (data, label, color) => {
    if (!data || data.length === 0) return null;

    const max = Math.max(...data) * 1.2; // 20% de margem acima do valor máximo
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value / max) * 100);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="chart-container">
        <div className="chart-header">
          <span className="chart-label">{label}</span>
          <span className="chart-value">{data[data.length - 1]}</span>
        </div>
        <div className="chart">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="module-monitor">
      <header className="monitor-header">
        <h1>POS Modern - Monitor de Módulos</h1>
        <div className="refresh-toggle">
          <button 
            className={`refresh-button ${isAutoRefresh ? 'active' : ''}`}
            onClick={toggleAutoRefresh}
          >
            {isAutoRefresh ? '↻ Auto Refresh ON' : '↻ Auto Refresh OFF'}
          </button>
        </div>
      </header>

      <div className="monitor-content">
        <div className="modules-sidebar">
          <h2>Módulos</h2>
          <ul className="module-list">
            {modules.map(module => (
              <li 
                key={module.id}
                className={`module-item ${selectedModule?.id === module.id ? 'selected' : ''} ${module.status}`}
                onClick={() => handleModuleSelect(module)}
              >
                <div className="module-status-indicator"></div>
                <div className="module-info">
                  <h3>{module.name}</h3>
                  <div className="module-meta">
                    <span className="version">v{module.version}</span>
                    <span className={`status ${module.status}`}>
                      {module.status === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {selectedModule && (
          <div className="module-details">
            <div className="module-header">
              <h2>{selectedModule.name}</h2>
              <div className="module-badges">
                <span className="badge version">v{selectedModule.version}</span>
                <span className={`badge status ${selectedModule.status}`}>
                  {selectedModule.status === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon uptime-icon">⏱️</div>
                <div className="stat-content">
                  <div className="stat-value">{selectedModule.uptime}</div>
                  <div className="stat-label">Uptime</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon event-icon">📊</div>
                <div className="stat-content">
                  <div className="stat-value">{selectedModule.eventCount}</div>
                  <div className="stat-label">Eventos</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon error-icon">⚠️</div>
                <div className="stat-content">
                  <div className="stat-value">{selectedModule.errorCount}</div>
                  <div className="stat-label">Erros</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon cpu-icon">🔄</div>
                <div className="stat-content">
                  <div className="stat-value">{selectedModule.cpu}%</div>
                  <div className="stat-label">CPU</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon memory-icon">💾</div>
                <div className="stat-content">
                  <div className="stat-value">{selectedModule.memory} MB</div>
                  <div className="stat-label">Memória</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon restart-icon">🔄</div>
                <div className="stat-content">
                  <div className="stat-value">{new Date(selectedModule.lastRestart).toLocaleString()}</div>
                  <div className="stat-label">Último Restart</div>
                </div>
              </div>
            </div>

            <div className="charts-container">
              {renderLineChart(selectedModule.metrics.requestsPerMinute, 'Requisições/Minuto', '#2196f3')}
              {renderLineChart(selectedModule.metrics.errorRate, 'Taxa de Erro', '#f44336')}
              {renderLineChart(selectedModule.metrics.responseTime, 'Tempo de Resposta (ms)', '#4caf50')}
            </div>

            <div className="section">
              <h3>Endpoints</h3>
              <table className="endpoints-table">
                <thead>
                  <tr>
                    <th>Caminho</th>
                    <th>Método</th>
                    <th>Requisições</th>
                    <th>Tempo Médio (ms)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedModule.endpoints.map((endpoint, index) => (
                    <tr key={index}>
                      <td>{endpoint.path}</td>
                      <td>
                        <span className={`method-badge ${endpoint.method.toLowerCase()}`}>
                          {endpoint.method}
                        </span>
                      </td>
                      <td>{endpoint.count}</td>
                      <td>{endpoint.avgResponseTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="section">
              <h3>Dependências</h3>
              <div className="dependencies-list">
                {selectedModule.dependencies.map(dep => (
                  <span 
                    key={dep} 
                    className="dependency-badge"
                    onClick={() => {
                      const depModule = modules.find(m => m.id === dep);
                      if (depModule) setSelectedModule(depModule);
                    }}
                  >
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleMonitorDashboard;
