import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync } from '@fortawesome/free-solid-svg-icons';

const TerminalSyncStatus = ({ lastSync }) => {
  // Formatar o tempo desde a última sincronização
  const getTimeSinceLastSync = () => {
    const now = new Date();
    const syncTime = new Date(lastSync);
    const diffMs = now - syncTime;
    
    // Converter para minutos
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) {
      return 'agora mesmo';
    } else if (diffMins === 1) {
      return 'há 1 minuto';
    } else if (diffMins < 60) {
      return `há ${diffMins} minutos`;
    } else {
      const hours = Math.floor(diffMins / 60);
      if (hours === 1) {
        return 'há 1 hora';
      } else {
        return `há ${hours} horas`;
      }
    }
  };
  
  return (
    <div className="terminal-sync-status">
      <FontAwesomeIcon icon={faSync} className="terminal-sync-icon" />
      <span className="terminal-sync-text">Sincronizado {getTimeSinceLastSync()}</span>
    </div>
  );
};

export default TerminalSyncStatus;
