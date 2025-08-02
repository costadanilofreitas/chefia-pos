import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import ErrorBoundary from './components/ErrorBoundary';
import AuthGuard from './components/AuthGuard';
import TerminalValidator from './components/TerminalValidator';
import POSLayout from './components/POSLayout';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth, UserRole } from './hooks/useAuth';;

// Lazy load components for better performance
const POSMainPage = lazy(() => import('./ui/POSMainPage'));
const POSOrderPage = lazy(() => import('./ui/POSOrderPage'));
const CounterOrdersPage = lazy(() => import('./ui/CounterOrdersPage'));
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

// Route wrapper with layout
const LayoutRoute: React.FC<{
  children: React.ReactNode;
  title?: string;
  requireAuth?: boolean;
  requiredRole?: UserRole;
  requireOpenDay?: boolean;
}> = ({ children, title, requireAuth = false, requiredRole, requireOpenDay = false }) => (
  <TerminalValidator>
    <AuthGuard 
      requireAuth={requireAuth} 
      requiredRole={requiredRole}
      requireOpenDay={requireOpenDay}
    >
      <POSLayout title={title}>
        {children}
      </POSLayout>
    </AuthGuard>
  </TerminalValidator>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <AuthProvider>
          <Router>
            <Suspense fallback={<LoadingFallback message="Inicializando sistema POS..." />}>
            <Routes>
                  {/* Root redirects */}
                  <Route path="/" element={<Navigate to="/pos/1" replace />} />
                  <Route path="/pos" element={<Navigate to="/pos/1" replace />} />
                  
                  {/* Main POS Route - redirects based on auth */}
                  <Route path="/pos/:terminalId" element={
                    <TerminalValidator>
                      <AuthGuard requireAuth={false}>
                        <Navigate to="cashier" replace />
                      </AuthGuard>
                    </TerminalValidator>
                  } />
                  
                  {/* Cashier - Entry point, allows free access to products */}
                  <Route path="/pos/:terminalId/cashier" element={
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback message="Carregando caixa..." />}>
                        <LayoutRoute title="Caixa" requireAuth={false}>
                          <CashierOpeningClosingPage />
                        </LayoutRoute>
                      </Suspense>
                    </ErrorBoundary>
                  } />
                  
                  {/* Main POS Interface - Test without auth */}
                  <Route path="/pos/:terminalId/main" element={
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback message="Carregando POS..." />}>
                        <LayoutRoute title="POS Principal" requireAuth={false} requireOpenDay={false}>
                          <POSMainPage />
                        </LayoutRoute>
                      </Suspense>
                    </ErrorBoundary>
                  } />
                  
                  {/* Order management */}
                  <Route path="/pos/:terminalId/order" element={
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback message="Carregando pedidos..." />}>
                        <LayoutRoute title="Pedidos">
                          <POSOrderPage />
                        </LayoutRoute>
                      </Suspense>
                    </ErrorBoundary>
                  } />
                  
                  {/* Counter Orders - Pedidos do Balcão */}
                  <Route path="/pos/:terminalId/counter-orders" element={
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback message="Carregando pedidos do balcão..." />}>
                        <LayoutRoute title="Pedidos do Balcão" requireAuth={true}>
                          <CounterOrdersPage />
                        </LayoutRoute>
                      </Suspense>
                    </ErrorBoundary>
                  } />
                  
                  <Route path="/pos/:terminalId/payment" element={
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback message="Carregando pagamento..." />}>
                        <LayoutRoute title="Pagamento">
                          <POSPaymentPage />
                        </LayoutRoute>
                      </Suspense>
                    </ErrorBoundary>
                  } />
                  
                  {/* Management routes - Requires authentication for reports */}
                  <Route path="/pos/:terminalId/manager" element={
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback message="Carregando painel gerencial..." />}>
                        <LayoutRoute requireAuth={true} requiredRole={UserRole.MANAGER} title="Gestão Gerencial">
                          <ManagerScreen />
                        </LayoutRoute>
                      </Suspense>
                    </ErrorBoundary>
                  } />
                  
                  {/* Business Day - Requires authentication to open/close day */}
                  <Route path="/pos/:terminalId/business-day" element={
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback message="Carregando dia operacional..." />}>
                        <LayoutRoute requireAuth={true} title="Dia Operacional">
                          <BusinessDayPage />
                        </LayoutRoute>
                      </Suspense>
                    </ErrorBoundary>
                  } />
                  
                  <Route path="/pos/:terminalId/cash-withdrawal" element={
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback message="Carregando sangria..." />}>
                        <LayoutRoute title="Sangria">
                          <CashWithdrawalPage />
                        </LayoutRoute>
                      </Suspense>
                    </ErrorBoundary>
                  } />
                  
                  {/* Restaurant management */}
                  <Route path="/pos/:terminalId/tables" element={
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback message="Carregando layout das mesas..." />}>
                        <LayoutRoute title="Layout das Mesas">
                          <TableLayoutScreen />
                        </LayoutRoute>
                      </Suspense>
                    </ErrorBoundary>
                  } />
                  
                  <Route path="/pos/:terminalId/delivery" element={
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback message="Carregando delivery..." />}>
                        <LayoutRoute title="Delivery">
                          <DeliveryScreen />
                        </LayoutRoute>
                      </Suspense>
                    </ErrorBoundary>
                  } />
                  
                  <Route path="/pos/:terminalId/waiter/table/:tableId" element={
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback message="Carregando interface do garçom..." />}>
                        <LayoutRoute requiredRole={UserRole.WAITER} title="Interface do Garçom">
                          <WaiterScreen />
                        </LayoutRoute>
                      </Suspense>
                    </ErrorBoundary>
                  } />
                  
                  {/* Customer & Fiscal */}
                  <Route path="/pos/:terminalId/loyalty" element={
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback message="Carregando fidelidade..." />}>
                        <LayoutRoute title="Sistema de Fidelidade">
                          <LoyaltyScreen />
                        </LayoutRoute>
                      </Suspense>
                    </ErrorBoundary>
                  } />
                  
                  <Route path="/pos/:terminalId/fiscal" element={
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback message="Carregando módulo fiscal..." />}>
                        <LayoutRoute title="Módulo Fiscal">
                          <FiscalScreen />
                        </LayoutRoute>
                      </Suspense>
                    </ErrorBoundary>
                  } />
                  
                  {/* Legacy routes - redirect to new structure */}
                  <Route path="/reports" element={<Navigate to="/pos/1/manager" replace />} />
                  <Route path="/cash-withdrawal" element={<Navigate to="/pos/1/cash-withdrawal" replace />} />
                  <Route path="/fiscal" element={<Navigate to="/pos/1/fiscal" replace />} />
                  
                  {/* Fallback route */}
                  <Route path="*" element={<Navigate to="/pos/1" replace />} />
                </Routes>
              </Suspense>
            </Router>
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  export default App;

