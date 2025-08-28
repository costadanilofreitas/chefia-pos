import React, { lazy, Suspense } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import ErrorBoundary from './components/ErrorBoundary';
import POSLayout from './components/POSLayout';
import TerminalValidator from './components/TerminalValidator';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { UserRole } from './hooks/useAuth';

// Lazy load components for better performance
const POSMainPage = lazy(() => import('./ui/MainPage'));
const CounterOrdersPage = lazy(() => import('./ui/CounterOrdersPage'));
const POSPaymentPage = lazy(() => import('./ui/PaymentPage'));
const ManagerScreen = lazy(() => import('./ui/ManagerPage'));
const BusinessDayPage = lazy(() => import('./ui/BusinessDayPage'));
const CashWithdrawalPage = lazy(() => import('./ui/CashWithdrawalPage'));
const CashierOpeningClosingPage = lazy(() => import('./ui/CashierOpeningClosingPage'));
const TableLayoutScreen = lazy(() => import('./ui/TablePage'));
const DeliveryScreen = lazy(() => import('./ui/DeliveryPage'));
const RemoteOrdersScreen = lazy(() => import('./ui/RemoteOrdersPage'));
const WaiterScreen = lazy(() => import('./ui/WaiterPage'));
const LoyaltyScreen = lazy(() => import('./ui/LoyaltyPage'));
const FiscalScreen = lazy(() => import('./ui/FiscalPage'));
const TerminalMonitorScreen = lazy(() => import('./ui/TerminalMonitorPage'));
const QueueManagementScreen = lazy(() => import('./ui/QueueManagementPage'));

// Loading component
const LoadingFallback: React.FC<{ message?: string }> = ({ message = 'Carregando...' }) => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gray-50 dark:bg-gray-900">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full animate-spin border-t-blue-500 dark:border-t-blue-400"></div>
    </div>
    <p className="text-sm text-gray-600 dark:text-gray-400">
      {message}
    </p>
  </div>
);


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
    <ThemeProvider>
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
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
                            {/* Main POS interface - requires auth and open business day */}
                  <Route path="/pos/:terminalId/main" element={
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback message="Carregando POS..." />}>
                        <LayoutRoute title="POS Principal" requireAuth={true} requireOpenDay={true}>
                          <POSMainPage />
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
                  
                  {/* Terminal Monitor - System monitoring */}
                  <Route path="/pos/:terminalId/monitor" element={
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback message="Carregando monitor de terminais..." />}>
                        <LayoutRoute requireAuth={true} requiredRole={UserRole.MANAGER} title="Monitor de Terminais">
                          <TerminalMonitorScreen />
                        </LayoutRoute>
                      </Suspense>
                    </ErrorBoundary>
                  } />
                  
                  {/* Queue Management - Restaurant queue system */}
                  <Route path="/pos/:terminalId/queue" element={
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback message="Carregando gerenciamento de fila..." />}>
                        <LayoutRoute requireAuth={true} requiredRole={UserRole.OPERATOR} title="Gerenciamento de Fila">
                          <QueueManagementScreen />
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
                  
                  <Route path="/pos/:terminalId/remote-orders" element={
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback message="Carregando pedidos remotos..." />}>
                        <LayoutRoute title="Pedidos Remotos" requireAuth={true}>
                          <RemoteOrdersScreen />
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
          </ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  export default App;

