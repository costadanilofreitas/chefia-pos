import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTable, faUtensils, faCreditCard } from '@fortawesome/free-solid-svg-icons';

const TerminalTableLayout = ({ onTableSelect, onPaymentRequest }) => {
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Simular carregamento de mesas do servidor
  // Em um ambiente real, isso viria da API
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setIsLoading(true);
        
        // Simular atraso de rede
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Dados simulados
        const mockTables = Array.from({ length: 12 }, (_, i) => ({
          id: `table-${i + 1}`,
          number: `${i + 1}`,
          status: i % 3 === 0 ? 'available' : i % 3 === 1 ? 'occupied' : 'reserved',
          capacity: 4,
          current_order_id: i % 3 === 1 ? `order-${i + 1}` : null
        }));
        
        setTables(mockTables);
      } catch (err) {
        setError('Erro ao carregar mesas: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTables();
  }, []);
  
  if (isLoading) {
    return <div className="terminal-loading">Carregando mesas...</div>;
  }
  
  if (error) {
    return <div className="terminal-error">{error}</div>;
  }
  
  const getTableStatusClass = (status) => {
    switch (status) {
      case 'available':
        return 'terminal-table-available';
      case 'occupied':
        return 'terminal-table-occupied';
      case 'reserved':
        return 'terminal-table-reserved';
      default:
        return '';
    }
  };
  
  const getTableStatusText = (status) => {
    switch (status) {
      case 'available':
        return 'Disponível';
      case 'occupied':
        return 'Ocupada';
      case 'reserved':
        return 'Reservada';
      default:
        return status;
    }
  };
  
  const handleTableClick = (table) => {
    if (table.status === 'available' || table.status === 'occupied') {
      onTableSelect(table);
    }
  };
  
  const handlePaymentClick = (e, tableId) => {
    e.stopPropagation();
    onPaymentRequest(tableId);
  };
  
  return (
    <div className="terminal-table-layout">
      {tables.map(table => (
        <div 
          key={table.id}
          className={`terminal-table ${getTableStatusClass(table.status)}`}
          onClick={() => handleTableClick(table)}
        >
          <div className="terminal-table-number">
            <FontAwesomeIcon icon={faTable} /> {table.number}
          </div>
          <div className="terminal-table-status">
            {getTableStatusText(table.status)}
          </div>
          
          {table.status === 'occupied' && (
            <div className="terminal-table-actions">
              <button 
                className="terminal-table-action-button"
                onClick={(e) => handlePaymentClick(e, table.id)}
              >
                <FontAwesomeIcon icon={faCreditCard} />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TerminalTableLayout;
