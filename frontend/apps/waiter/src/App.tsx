import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import TerminalValidator from './components/TerminalValidator';
import WaiterMainPage from './ui/WaiterMainPage';

/**
 * Main App component with routing and terminal validation
 */
const App: React.FC = () => {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <Routes>
          {/* Redirect root to terminal 1 */}
          <Route path="/" element={<Navigate to="/waiter/1" replace />} />
          
          {/* Waiter route with terminal ID */}
          <Route 
            path="/waiter/:terminalId" 
            element={
              <TerminalValidator>
                <WaiterMainPage />
              </TerminalValidator>
            } 
          />
          
          {/* Catch all - redirect to terminal 1 */}
          <Route path="*" element={<Navigate to="/waiter/1" replace />} />
        </Routes>
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;