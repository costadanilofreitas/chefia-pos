import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './auth/context/AuthContext';
import { BusinessDayProvider } from './business_day/context/BusinessDayContext';
import { CashierProvider } from './pos/context/CashierContext';
import { OrderProvider } from './order/context/OrderContext';
import { ProductProvider } from './product/context/ProductContext';

// Páginas de autenticação
import LoginPage from './auth/ui/LoginPage';
import RegisterPage from './auth/ui/RegisterPage';
import ForgotPasswordPage from './auth/ui/ForgotPasswordPage';

// Páginas do POS
import BusinessDayPage from './pos/ui/BusinessDayPage';
import CashierOpeningClosingPage from './pos/ui/CashierOpeningClosingPage';
import POSMainPage from './pos/ui/POSMainPage';
import POSOrderPage from './pos/ui/POSOrderPage';
import POSPaymentPage from './pos/ui/POSPaymentPage';
import POSReportsPage from './pos/ui/POSReportsPage';

// Páginas do KDS
import KDSMainPage from './kdsmonitor/ui/KDSMainPage';

// Componentes de layout
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import POSLayout from './layouts/POSLayout';
import KDSLayout from './layouts/KDSLayout';

// Componentes utilitários
import ProtectedRoute from './components/ProtectedRoute';
import NotFoundPage from './components/NotFoundPage';
import LoadingScreen from './components/LoadingScreen';

// Tema personalizado
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#f50057',
      light: '#ff4081',
      dark: '#c51162',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    info: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 500,
    },
    h2: {
      fontWeight: 500,
    },
    h3: {
      fontWeight: 500,
    },
    h4: {
      fontWeight: 500,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

// Componente para redirecionar com base nos parâmetros da URL
const ModuleRouter = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    // Verificar se estamos na rota raiz
    if (location.pathname === '/') {
      // Verificar parâmetros para decidir para onde redirecionar
      const posId = params.get('pos');
      const kdsId = params.get('kds');
      
      if (posId) {
        navigate(`/pos?pos=${posId}`);
      } else if (kdsId) {
        navigate(`/kds?kds=${kdsId}`);
      } else {
        // Padrão: redirecionar para login
        navigate('/login');
      }
    }
  }, [location, navigate]);
  
  return null;
};

// Componente para extrair parâmetros de sessão
const useSessionParams = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  
  return {
    posId: params.get('pos'),
    kdsId: params.get('kds'),
  };
};

// Componente principal da aplicação
const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BusinessDayProvider>
          <CashierProvider>
            <OrderProvider>
              <ProductProvider>
                <Router>
                  <ModuleRouter />
                  <Routes>
                    {/* Rotas de autenticação */}
                    <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
                    <Route path="/register" element={<AuthLayout><RegisterPage /></AuthLayout>} />
                    <Route path="/forgot-password" element={<AuthLayout><ForgotPasswordPage /></AuthLayout>} />
                    
                    {/* Rotas do POS */}
                    <Route path="/pos" element={
                      <ProtectedRoute>
                        <POSLayout>
                          <POSMainPage />
                        </POSLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/pos/business-day" element={
                      <ProtectedRoute requiredPermissions={['business_day:manage']}>
                        <POSLayout>
                          <BusinessDayPage />
                        </POSLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/pos/cashier" element={
                      <ProtectedRoute requiredPermissions={['cashier:manage']}>
                        <POSLayout>
                          <CashierOpeningClosingPage />
                        </POSLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/pos/order" element={
                      <ProtectedRoute requiredPermissions={['order:create']}>
                        <POSLayout>
                          <POSOrderPage />
                        </POSLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/pos/payment/:orderId" element={
                      <ProtectedRoute requiredPermissions={['payment:process']}>
                        <POSLayout>
                          <POSPaymentPage />
                        </POSLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/pos/reports" element={
                      <ProtectedRoute requiredPermissions={['report:view']}>
                        <POSLayout>
                          <POSReportsPage />
                        </POSLayout>
                      </ProtectedRoute>
                    } />
                    
                    {/* Rotas do KDS */}
                    <Route path="/kds" element={
                      <ProtectedRoute requiredPermissions={['kds:view']}>
                        <KDSLayout>
                          <KDSMainPage />
                        </KDSLayout>
                      </ProtectedRoute>
                    } />
                    
                    {/* Rota padrão e 404 */}
                    <Route path="/" element={<Navigate to="/login" />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Router>
              </ProductProvider>
            </OrderProvider>
          </CashierProvider>
        </BusinessDayProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
