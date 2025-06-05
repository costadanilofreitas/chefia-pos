// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useTerminalConfig } from './hooks/useTerminalConfig';
import { useAuth } from './hooks/mocks/useAuth';

// Componentes
import BusinessDayPage from './ui/BusinessDayPage';
import CashierOpeningClosingPage from './ui/CashierOpeningClosingPage';
import CashWithdrawalPage from './ui/CashWithdrawalPage';
import POSMainPage from './ui/POSMainPage';
import POSOrderPage from './ui/POSOrderPage';
import POSPaymentPage from './ui/POSPaymentPage';
import ManagerScreen from './ui/ManagerScreen';
import TableLayoutScreen from './ui/TableLayoutScreen';
import DeliveryScreen from './ui/DeliveryScreen';
import WaiterScreen from './ui/WaiterScreen';

// Componente de Loading
import { Box, CircularProgress, Typography } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const LoadingScreen = () => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    minHeight="100vh"
    gap={2}
  >
    <CircularProgress size={60} />
    <Typography variant="h6">Carregando configurações...</Typography>
  </Box>
);

const LoginScreen = () => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    minHeight="100vh"
    gap={2}
  >
    <Typography variant="h4">ChefIA POS</Typography>
    <Typography variant="body1">Sistema de Ponto de Venda</Typography>
    <Typography variant="body2" color="text.secondary">
      Faça login para continuar
    </Typography>
  </Box>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <LoginScreen />;
  }
  
  return <>{children}</>;
};

const App = () => {
  const { config, loading: configLoading, error } = useTerminalConfig();
  
  if (configLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoadingScreen />
      </ThemeProvider>
    );
  }
  
  if (error || !config) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
          gap={2}
        >
          <Typography variant="h5" color="error">
            Erro de Configuração
          </Typography>
          <Typography variant="body1">
            {error || 'Falha ao carregar configurações do terminal'}
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Rota raiz redireciona para pos/1 por padrão */}
          <Route path="/" element={<Navigate to="/pos/1" replace />} />
          
          {/* Rotas protegidas */}
          <Route 
            path="/pos/:terminalId/manager" 
            element={
              <ProtectedRoute>
                <ManagerScreen />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/pos/:terminalId/tables" 
            element={
              <ProtectedRoute>
                <TableLayoutScreen />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/pos/:terminalId/delivery" 
            element={
              <ProtectedRoute>
                <DeliveryScreen />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/pos/:terminalId/waiter/table/:tableId" 
            element={
              <ProtectedRoute>
                <WaiterScreen />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/business-day" 
            element={
              <ProtectedRoute>
                <BusinessDayPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/cashier" 
            element={
              <ProtectedRoute>
                <CashierOpeningClosingPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/cashier/withdrawal" 
            element={
              <ProtectedRoute>
                <CashWithdrawalPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/pos/:terminalId" 
            element={
              <ProtectedRoute>
                <POSMainPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/pos/:terminalId/order" 
            element={
              <ProtectedRoute>
                <POSOrderPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/pos/:terminalId/payment" 
            element={
              <ProtectedRoute>
                <POSPaymentPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Rota 404 */}
          <Route 
            path="*" 
            element={
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                minHeight="100vh"
                gap={2}
              >
                <Typography variant="h4">404</Typography>
                <Typography variant="body1">Página não encontrada</Typography>
              </Box>
            } 
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;

