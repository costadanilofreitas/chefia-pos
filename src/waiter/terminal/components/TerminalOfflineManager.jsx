import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const TerminalOfflineManager = ({ children, terminalId, sessionId }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAttempt, setLastSyncAttempt] = useState(null);
  
  // Monitorar status de conexão
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingData();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Verificar operações pendentes ao iniciar
    const pendingData = localStorage.getItem(`pending_operations_${terminalId}`);
    if (pendingData) {
      try {
        const operations = JSON.parse(pendingData);
        setPendingOperations(operations.length);
      } catch (error) {
        console.error('Erro ao carregar operações pendentes:', error);
      }
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [terminalId]);
  
  // Sincronizar dados pendentes quando ficar online
  const syncPendingData = async () => {
    if (!isOnline || isSyncing || !sessionId) return;
    
    try {
      setIsSyncing(true);
      
      // Implementar lógica de sincronização
      // Em um ambiente real, chamaríamos a API de sincronização
      
      // Simular sincronização
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Limpar operações pendentes após sincronização bem-sucedida
      localStorage.removeItem(`pending_operations_${terminalId}`);
      setPendingOperations(0);
      
      setLastSyncAttempt(new Date());
    } catch (error) {
      console.error('Erro ao sincronizar dados pendentes:', error);
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Adicionar operação pendente
  const addPendingOperation = (operation) => {
    try {
      const pendingData = localStorage.getItem(`pending_operations_${terminalId}`);
      const operations = pendingData ? JSON.parse(pendingData) : [];
      
      operations.push({
        ...operation,
        timestamp: new Date().toISOString()
      });
      
      localStorage.setItem(`pending_operations_${terminalId}`, JSON.stringify(operations));
      setPendingOperations(operations.length);
      
      return true;
    } catch (error) {
      console.error('Erro ao adicionar operação pendente:', error);
      return false;
    }
  };
  
  return (
    <div className="terminal-offline-manager">
      {!isOnline && pendingOperations > 0 && (
        <div className="terminal-offline-banner">
          <FontAwesomeIcon icon={faDatabase} />
          <span>{pendingOperations} operações pendentes de sincronização</span>
        </div>
      )}
      
      {isSyncing && (
        <div className="terminal-syncing-banner">
          <FontAwesomeIcon icon={faDatabase} spin />
          <span>Sincronizando dados...</span>
        </div>
      )}
      
      {React.Children.map(children, child =>
        React.cloneElement(child, { 
          isOnline, 
          addPendingOperation,
          pendingOperations,
          isSyncing
        })
      )}
    </div>
  );
};

export default TerminalOfflineManager;
