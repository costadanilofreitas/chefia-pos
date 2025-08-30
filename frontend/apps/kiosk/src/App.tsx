import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppProvider';
import TerminalValidator from './components/TerminalValidator';
import KioskMainPage from './ui/KioskMainPage';

/**
 * Main App component with routing and terminal validation
 */
const App: React.FC = () => {
  return (
    <Routes>
      {/* Redirect root to terminal 1 */}
      <Route path="/" element={<Navigate to="/kiosk/1" replace />} />
      
      {/* Kiosk route with terminal ID */}
      <Route 
        path="/kiosk/:terminalId" 
        element={
          <TerminalValidator>
            <AppProvider>
              <KioskMainPage />
            </AppProvider>
          </TerminalValidator>
        } 
      />
      
      {/* Catch all - redirect to terminal 1 */}
      <Route path="*" element={<Navigate to="/kiosk/1" replace />} />
    </Routes>
  );
};

export default App;