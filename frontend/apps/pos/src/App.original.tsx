import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load components for better performance
const POSMainPage = lazy(() => import('./ui/POSMainPage'));
const POSOrderPage = lazy(() => import('./ui/POSOrderPage'));
const POSPaymentPage = lazy(() => import('./ui/POSPaymentPage'));
const ManagerScreen = lazy(() => import('./ui/ManagerScreen'));
const BusinessDayPage = lazy(() => import('./ui/BusinessDayPage'));
const CashWithdrawalPage = lazy(() => import('./ui/CashWithdrawalPage'));
const CashierOpeningClosingPage = lazy(() => import('./ui/CashierOpeningClosingPage'));
const TableLayoutScreen = lazy(() => import('./ui/TableLayoutScreen'));
const DeliveryScreen = lazy(() => import('./ui/DeliveryScreen'));
const WaiterScreen = lazy(() => import('./ui/WaiterScreen'));
const LoyaltyScreen = lazy(() => import('./ui/LoyaltyScreen'));
const FiscalScreen = lazy(() => import('./ui/FiscalScreen'));

// Loading component
const LoadingFallback: React.FC<{ message?: string }> = ({ message = 'Carregando...' }) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    minHeight="100vh"
    gap={2}
  >
    <CircularProgress size={40} />
    <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
      {message}
    </Box>
  </Box>
);

// Theme configuration
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
    secondary: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

// Protected Route component with lazy loading
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Add authentication logic here if needed
  return <>{children}</>;
};

// Terminal redirect component
const TerminalRedirect: React.FC = () => {
  return <Navigate to="/pos/1" replace />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <Router>
          <Suspense fallback={<LoadingFallback message="Inicializando sistema POS..." />}>
            <Routes>
              {/* Root redirect */}
              <Route path="/" element={<TerminalRedirect />} />
              
              {/* POS Routes with terminal ID */}
              <Route path="/pos/:terminalId" element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback message="Carregando POS..." />}>
                    <POSMainPage />
                  </Suspense>
                </ErrorBoundary>
              } />
              
              {/* Order management */}
              <Route path="/pos/:terminalId/order" element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback message="Carregando pedidos..." />}>
                    <POSOrderPage />
                  </Suspense>
                </ErrorBoundary>
              } />
              
              <Route path="/pos/:terminalId/payment" element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback message="Carregando pagamento..." />}>
                    <POSPaymentPage />
                  </Suspense>
                </ErrorBoundary>
              } />
              
              {/* Management routes */}
              <Route path="/pos/:terminalId/manager" element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback message="Carregando painel gerencial..." />}>
                    <ManagerScreen />
                  </Suspense>
                </ErrorBoundary>
              } />
              
              <Route path="/pos/:terminalId/business-day" element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback message="Carregando dia operacional..." />}>
                    <BusinessDayPage />
                  </Suspense>
                </ErrorBoundary>
              } />
              
              <Route path="/pos/:terminalId/cash-withdrawal" element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback message="Carregando sangria..." />}>
                    <CashWithdrawalPage />
                  </Suspense>
                </ErrorBoundary>
              } />
              
              <Route path="/pos/:terminalId/cashier" element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback message="Carregando caixa..." />}>
                    <CashierOpeningClosingPage />
                  </Suspense>
                </ErrorBoundary>
              } />
              
              {/* Restaurant management */}
              <Route path="/pos/:terminalId/tables" element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback message="Carregando layout das mesas..." />}>
                    <TableLayoutScreen />
                  </Suspense>
                </ErrorBoundary>
              } />
              
              <Route path="/pos/:terminalId/delivery" element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback message="Carregando delivery..." />}>
                    <DeliveryScreen />
                  </Suspense>
                </ErrorBoundary>
              } />
              
              <Route path="/pos/:terminalId/waiter/table/:tableId" element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback message="Carregando interface do garçom..." />}>
                    <WaiterScreen />
                  </Suspense>
                </ErrorBoundary>
              } />
              
              {/* Customer & Fiscal */}
              <Route path="/pos/:terminalId/loyalty" element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback message="Carregando fidelidade..." />}>
                    <LoyaltyScreen />
                  </Suspense>
                </ErrorBoundary>
              } />
              
              <Route path="/pos/:terminalId/fiscal" element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback message="Carregando módulo fiscal..." />}>
                    <FiscalScreen />
                  </Suspense>
                </ErrorBoundary>
              } />
              
              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/pos/1" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;

