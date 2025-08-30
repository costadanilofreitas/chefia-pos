import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import TerminalValidator from './components/TerminalValidator';
import KDSMainPage from './ui/KDSMainPage';
import ErrorBoundary from './components/ErrorBoundary';

/**
 * Main App component with routing and terminal validation
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Routes>
          {/* Redirect root to terminal 1 */}
          <Route path="/" element={<Navigate to="/kds/1" replace />} />
          
          {/* KDS route with terminal ID */}
          <Route 
            path="/kds/:terminalId" 
            element={
              <TerminalValidator>
                <KDSMainPage />
              </TerminalValidator>
            } 
          />
          
          {/* Catch all - redirect to terminal 1 */}
          <Route path="*" element={<Navigate to="/kds/1" replace />} />
        </Routes>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;