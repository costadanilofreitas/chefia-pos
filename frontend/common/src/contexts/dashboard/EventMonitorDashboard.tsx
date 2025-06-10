import React, { useState, useEffect } from 'react';
import './EventMonitorDashboard.css';

const EventMonitorDashboard = () => {
  const [events, setEvents] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState('all');
  const [eventTypes, setEventTypes] = useState([]);
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [isLive, setIsLive] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalEvents: 0,
    eventsByModule: {},
    eventsByType: {},
    eventsPerMinute: 0
  });

  // Simular recebimento de eventos
  useEffect(() => {
    // Lista de módulos do sistema
    const systemModules = [
      'order', 'payment', 'remote_orders', 'kds', 
      'waiter', 'peripherals', 'core'
    ];
    setModules(systemModules);

    // Lista de tipos de eventos
    const systemEventTypes = [
      'created', 'updated', 'status_changed', 'error',
      'connected', 'disconnected', 'command'
    ];
    setEventTypes(systemEventTypes);

    // Função para gerar evento simulado
    const generateEvent = () => {
      const module = systemModules[Math.floor(Math.random() * systemModules.length)];
      const type = systemEventTypes[Math.floor(Math.random() * systemEventTypes.length)];
      const eventId = `evt-${Math.random().toString(36).substring(2, 10)}`;
      
      return {
        id: eventId,
        timestamp: new Date().toISOString(),
        module: module,
        type: `${module}.${type}`,
        data: {
          id: `obj-${Math.random().toString(36).substring(2, 8)}`,
          status: ['pending', 'processing', 'completed', 'failed'][Math.floor(Math.random() * 4)]
        },
        metadata: {
          source: ['api', 'system', 'user'][Math.floor(Math.random() * 3)],
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`
        }
      };
    };

    // Gerar eventos iniciais
    const initialEvents = Array(20).fill().map(() => generateEvent());
    setEvents(initialEvents);
    updateStats(initialEvents);

    // Simular eventos em tempo real se estiver no modo live
    let interval;
    if (isLive) {
      interval = setInterval(() => {
        const newEvent = generateEvent();
        setEvents(prevEvents => {
          const updatedEvents = [newEvent, ...prevEvents].slice(0, 100); // Manter apenas os 100 mais recentes
          updateStats(updatedEvents);
          return updatedEvents;
        });
      }, 3000); // Novo evento a cada 3 segundos
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLive]);

  // Atualizar estatísticas
  const updateStats = (eventList) => {
    const eventsByModule = {};
    const eventsByType = {};
    
    eventList.forEach(event => {
      // Contar por módulo
      if (!eventsByModule[event.module]) {
        eventsByModule[event.module] = 0;
      }
      eventsByModule[event.module]++;
      
      // Contar por tipo
      const shortType = event.type.split('.')[1];
      if (!eventsByType[shortType]) {
        eventsByType[shortType] = 0;
      }
      eventsByType[shortType]++;
    });
    
    // Calcular eventos por minuto (simulado)
    const eventsPerMinute = Math.floor(Math.random() * 20) + 10;
    
    setStats({
      totalEvents: eventList.length,
      eventsByModule,
      eventsByType,
      eventsPerMinute
    });
  };

  // Filtrar eventos
  const filteredEvents = events.filter(event => {
    // Filtrar por módulo
    if (selectedModule !== 'all' && event.module !== selectedModule) {
      return false;
    }
    
    // Filtrar por tipo de evento
    if (selectedEventType !== 'all') {
      const shortType = event.type.split('.')[1];
      if (shortType !== selectedEventType) {
        return false;
      }
    }
    
    // Filtrar por termo de busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        event.id.toLowerCase().includes(searchLower) ||
        event.type.toLowerCase().includes(searchLower) ||
        JSON.stringify(event.data).toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Formatar data/hora
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Alternar modo ao vivo
  const toggleLiveMode = () => {
    setIsLive(!isLive);
  };

  return (
    <div className="event-monitor">
      <header className="monitor-header">
        <h1>POS Modern - Monitor de Eventos</h1>
        <div className="live-toggle">
          <button 
            className={`live-button ${isLive ? 'active' : ''}`}
            onClick={toggleLiveMode}
          >
            {isLive ? '● AO VIVO' : '○ PARADO'}
          </button>
        </div>
      </header>

      <div className="monitor-content">
        <div className="sidebar">
          <div className="stats-panel">
            <h2>Estatísticas</h2>
            <div className="stat-item">
              <span className="stat-label">Total de Eventos</span>
              <span className="stat-value">{stats.totalEvents}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Eventos/Minuto</span>
              <span className="stat-value">{stats.eventsPerMinute}</span>
            </div>
            
            <h3>Por Módulo</h3>
            <div className="stat-bars">
              {Object.entries(stats.eventsByModule).map(([module, count]) => (
                <div className="stat-bar-item" key={module}>
                  <div className="stat-bar-label">{module}</div>
                  <div className="stat-bar-container">
                    <div 
                      className="stat-bar" 
                      style={{ 
                        width: `${(count / stats.totalEvents) * 100}%`,
                        backgroundColor: getModuleColor(module)
                      }}
                    ></div>
                  </div>
                  <div className="stat-bar-value">{count}</div>
                </div>
              ))}
            </div>
            
            <h3>Por Tipo</h3>
            <div className="stat-bars">
              {Object.entries(stats.eventsByType).map(([type, count]) => (
                <div className="stat-bar-item" key={type}>
                  <div className="stat-bar-label">{type}</div>
                  <div className="stat-bar-container">
                    <div 
                      className="stat-bar" 
                      style={{ 
                        width: `${(count / stats.totalEvents) * 100}%`,
                        backgroundColor: getTypeColor(type)
                      }}
                    ></div>
                  </div>
                  <div className="stat-bar-value">{count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="main-content">
          <div className="filters">
            <div className="filter-group">
              <label>Módulo:</label>
              <select 
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
              >
                <option value="all">Todos</option>
                {modules.map(module => (
                  <option key={module} value={module}>{module}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Tipo:</label>
              <select 
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
              >
                <option value="all">Todos</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group search">
              <input 
                type="text" 
                placeholder="Buscar eventos..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="events-table-container">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Módulo</th>
                  <th>Tipo</th>
                  <th>ID</th>
                  <th>Dados</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length > 0 ? (
                  filteredEvents.map(event => (
                    <tr key={event.id} className={`event-row ${getEventRowClass(event)}`}>
                      <td>{formatTimestamp(event.timestamp)}</td>
                      <td>
                        <span 
                          className="module-badge"
                          style={{ backgroundColor: getModuleColor(event.module) }}
                        >
                          {event.module}
                        </span>
                      </td>
                      <td>
                        <span 
                          className="type-badge"
                          style={{ backgroundColor: getTypeColor(event.type.split('.')[1]) }}
                        >
                          {event.type.split('.')[1]}
                        </span>
                      </td>
                      <td>{event.data.id}</td>
                      <td>
                        <pre className="event-data">{JSON.stringify(event.data, null, 2)}</pre>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="no-events">
                      Nenhum evento encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Funções auxiliares para cores
function getModuleColor(module) {
  const colorMap = {
    'order': '#4caf50',
    'payment': '#2196f3',
    'remote_orders': '#ff9800',
    'kds': '#9c27b0',
    'waiter': '#e91e63',
    'peripherals': '#607d8b',
    'core': '#795548'
  };
  
  return colorMap[module] || '#9e9e9e';
}

function getTypeColor(type) {
  const colorMap = {
    'created': '#4caf50',
    'updated': '#2196f3',
    'status_changed': '#ff9800',
    'error': '#f44336',
    'connected': '#8bc34a',
    'disconnected': '#ff5722',
    'command': '#9c27b0'
  };
  
  return colorMap[type] || '#9e9e9e';
}

function getEventRowClass(event) {
  if (event.type.includes('error')) return 'error';
  if (event.data.status === 'failed') return 'warning';
  return '';
}

export default EventMonitorDashboard;
