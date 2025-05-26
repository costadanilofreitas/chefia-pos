import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import TerminalApp from './TerminalApp';
import TerminalOfflineManager from './components/TerminalOfflineManager';

// Componente para detecção de terminal e redirecionamento
const TerminalDetector = () => {
  const [terminalId, setTerminalId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const detectTerminal = async () => {
      try {
        setIsLoading(true);
        
        // Em um ambiente real, detectaríamos o ID do terminal
        // com base em informações do dispositivo ou configuração
        
        // Para simulação, usamos um ID fixo ou parâmetros da URL
        const urlParams = new URLSearchParams(window.location.search);
        const termId = urlParams.get('terminal_id') || 'terminal-1';
        
        setTerminalId(termId);
      } catch (err) {
        setError('Erro ao detectar terminal: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    detectTerminal();
  }, []);
  
  if (isLoading) {
    return <div className="terminal-loading">Detectando terminal...</div>;
  }
  
  if (error) {
    return <div className="terminal-error">{error}</div>;
  }
  
  if (!terminalId) {
    return <div className="terminal-error">Terminal não identificado</div>;
  }
  
  return <Navigate to={`/terminal/${terminalId}`} replace />;
};

// Componente principal para roteamento
const TerminalRouter = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TerminalDetector />} />
        <Route 
          path="/terminal/:terminalId" 
          element={({ match }) => (
            <TerminalOfflineManager 
              terminalId={match.params.terminalId}
            >
              <TerminalApp terminalId={match.params.terminalId} />
            </TerminalOfflineManager>
          )} 
        />
      </Routes>
    </Router>
  );
};

export default TerminalRouter;
