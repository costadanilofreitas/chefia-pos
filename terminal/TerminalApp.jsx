import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './TerminalApp.css';

// Componentes
import TerminalHeader from './components/TerminalHeader';
import TerminalLogin from './components/TerminalLogin';
import TerminalTableLayout from './components/TerminalTableLayout';
import TerminalOrderEntry from './components/TerminalOrderEntry';
import TerminalPayment from './components/TerminalPayment';
import TerminalOfflineIndicator from './components/TerminalOfflineIndicator';
import TerminalSyncStatus from './components/TerminalSyncStatus';
import TerminalBatteryStatus from './components/TerminalBatteryStatus';

// Serviços
import { getTerminalConfig, createTerminalSession, updateTerminalStatus } from '../services/terminal_api';

const TerminalApp = ({ terminalId }) => {
  const navigate = useNavigate();
  
  // Estados
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [terminalConfig, setTerminalConfig] = useState(null);
  const [session, setSession] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [selectedTable, setSelectedTable] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  // Carregar configuração do terminal
  useEffect(() => {
    const loadTerminalConfig = async () => {
      try {
        setIsLoading(true);
        const config = await getTerminalConfig(terminalId);
        setTerminalConfig(config);
      } catch (err) {
        setError('Erro ao carregar configuração do terminal: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTerminalConfig();
  }, [terminalId]);
  
  // Monitorar status de conexão
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Monitorar nível de bateria (se disponível)
  useEffect(() => {
    if (!navigator.getBattery) return;
    
    const handleBatteryStatus = (battery) => {
      setBatteryLevel(Math.round(battery.level * 100));
      
      battery.addEventListener('levelchange', () => {
        setBatteryLevel(Math.round(battery.level * 100));
      });
    };
    
    navigator.getBattery().then(handleBatteryStatus);
  }, []);
  
  // Atualizar status do terminal periodicamente
  useEffect(() => {
    if (!session) return;
    
    const updateStatus = async () => {
      try {
        await updateTerminalStatus(
          session.id, 
          isOnline ? 'online' : 'offline',
          batteryLevel,
          null // signal_strength
        );
      } catch (err) {
        console.error('Erro ao atualizar status do terminal:', err);
      }
    };
    
    // Atualizar a cada 60 segundos
    const intervalId = setInterval(updateStatus, 60000);
    
    // Atualizar imediatamente quando o status de conexão mudar
    updateStatus();
    
    return () => clearInterval(intervalId);
  }, [session, isOnline, batteryLevel]);
  
  // Sincronizar dados periodicamente quando online
  useEffect(() => {
    if (!session || !isOnline) return;
    
    const syncData = async () => {
      try {
        // Implementar lógica de sincronização
        setLastSyncTime(new Date());
      } catch (err) {
        console.error('Erro ao sincronizar dados:', err);
      }
    };
    
    // Sincronizar a cada 5 minutos
    const intervalId = setInterval(syncData, 300000);
    
    // Sincronizar imediatamente quando ficar online
    syncData();
    
    return () => clearInterval(intervalId);
  }, [session, isOnline]);
  
  // Lidar com login
  const handleLogin = async (waiterId) => {
    try {
      setIsLoading(true);
      const newSession = await createTerminalSession(terminalId, waiterId);
      setSession(newSession);
      setCurrentView('tables');
    } catch (err) {
      setError('Erro ao iniciar sessão: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Lidar com seleção de mesa
  const handleTableSelect = (table) => {
    setSelectedTable(table);
    setCurrentView('order');
  };
  
  // Lidar com criação de pedido
  const handleOrderCreated = () => {
    setCurrentView('tables');
    setSelectedTable(null);
  };
  
  // Lidar com pagamento
  const handlePaymentRequest = (tableId) => {
    setSelectedTable({ id: tableId });
    setCurrentView('payment');
  };
  
  // Lidar com pagamento concluído
  const handlePaymentComplete = () => {
    setCurrentView('tables');
    setSelectedTable(null);
  };
  
  // Renderizar conteúdo com base na visualização atual
  const renderContent = () => {
    if (isLoading) {
      return <div className="terminal-loading">Carregando...</div>;
    }
    
    if (error) {
      return <div className="terminal-error">{error}</div>;
    }
    
    if (!terminalConfig) {
      return <div className="terminal-error">Configuração do terminal não encontrada</div>;
    }
    
    switch (currentView) {
      case 'login':
        return <TerminalLogin onLogin={handleLogin} />;
      
      case 'tables':
        return (
          <TerminalTableLayout 
            onTableSelect={handleTableSelect}
            onPaymentRequest={handlePaymentRequest}
          />
        );
      
      case 'order':
        return (
          <TerminalOrderEntry 
            tableId={selectedTable?.id}
            onOrderCreated={handleOrderCreated}
            onCancel={() => {
              setCurrentView('tables');
              setSelectedTable(null);
            }}
          />
        );
      
      case 'payment':
        return (
          <TerminalPayment 
            tableId={selectedTable?.id}
            onComplete={handlePaymentComplete}
            onCancel={() => {
              setCurrentView('tables');
              setSelectedTable(null);
            }}
          />
        );
      
      default:
        return <div className="terminal-error">Visualização inválida</div>;
    }
  };
  
  return (
    <div className="terminal-app">
      <TerminalHeader 
        title={terminalConfig?.name || 'Terminal POS'}
        waiterId={session?.waiter_id}
        onLogout={() => {
          setSession(null);
          setCurrentView('login');
        }}
      />
      
      <div className="terminal-content">
        {renderContent()}
      </div>
      
      <div className="terminal-status-bar">
        {!isOnline && <TerminalOfflineIndicator />}
        {batteryLevel !== null && <TerminalBatteryStatus level={batteryLevel} />}
        {lastSyncTime && <TerminalSyncStatus lastSync={lastSyncTime} />}
      </div>
    </div>
  );
};

export default TerminalApp;
