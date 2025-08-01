// src/components/POSLayout.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Divider,
  Badge,
  Tooltip
} from '@mui/material';
import {
  AccountCircle,
  ExitToApp,
  Dashboard,
  Restaurant,
  TableRestaurant,
  LocalShipping,
  CardGiftcard,
  Receipt,
  Settings,
  AttachMoney,
  Business,
  Assessment,
  Notifications
} from '@mui/icons-material';
import { useAuth, UserRole } from '../hooks/useAuth';
import LoginDialog from './LoginDialog';

interface POSLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const POSLayout: React.FC<POSLayoutProps> = ({ children, title }) => {
  const navigate = useNavigate();
  const { terminalId } = useParams<{ terminalId: string }>();
  const location = useLocation();
  const { user, logout, hasPermission, hasRole, isAuthenticated } = useAuth();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  // Força o fechamento do menu quando a rota muda
  useEffect(() => {
    setAnchorEl(null);
    setUserMenuAnchor(null);
  }, [location.pathname]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    logout();
    navigate(`/pos/${terminalId}/cashier`);
    handleUserMenuClose();
  };

  const navigateTo = (path: string) => {
    // Força o fechamento do menu imediatamente
    setAnchorEl(null);
    
    // Navega para a nova rota
    navigate(`/pos/${terminalId}${path}`);
  };

  const getCurrentPageTitle = () => {
    if (title) return title;
    
    const path = location.pathname;
    if (path.includes('/manager')) return 'Gestão Gerencial';
    if (path.includes('/tables')) return 'Layout das Mesas';
    if (path.includes('/delivery')) return 'Delivery';
    if (path.includes('/loyalty')) return 'Fidelidade';
    if (path.includes('/fiscal')) return 'Módulo Fiscal';
    if (path.includes('/cashier')) return 'Caixa';
    if (path.includes('/order')) return 'Pedidos';
    if (path.includes('/payment')) return 'Pagamento';
    if (path.includes('/business-day')) return 'Dia Operacional';
    if (path.includes('/cash-withdrawal')) return 'Sangria';
    if (path.includes('/waiter')) return 'Garçom';
    return 'POS Modern';
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.MANAGER: return 'error';
      case UserRole.CASHIER: return 'primary';
      case UserRole.WAITER: return 'secondary';
      case UserRole.COOK: return 'success';
      default: return 'default';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.MANAGER: return 'Gerente';
      case UserRole.CASHIER: return 'Caixa';
      case UserRole.WAITER: return 'Garçom';
      case UserRole.COOK: return 'Cozinheiro';
      default: return role;
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          {/* Logo/Title */}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {getCurrentPageTitle()}
          </Typography>

          {/* Terminal Info */}
          <Chip
            label={`Terminal ${terminalId}`}
            size="small"
            variant="outlined"
            sx={{ 
              color: 'white', 
              borderColor: 'rgba(255,255,255,0.3)',
              mr: 2 
            }}
          />

          {/* Navigation Menu */}
          <Button
            color="inherit"
            onClick={handleMenuOpen}
            startIcon={<Dashboard />}
          >
            Menu
          </Button>

          {/* User Menu */}
          {isAuthenticated ? (
            <>
              <IconButton
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-controls="user-menu"
                aria-haspopup="true"
                onClick={handleUserMenuOpen}
                color="inherit"
                sx={{ ml: 1 }}
              >
                <Badge badgeContent={0} color="error">
                  <AccountCircle />
                </Badge>
              </IconButton>
            </>
          ) : (
            <Button
              color="inherit"
              onClick={() => setLoginDialogOpen(true)}
              startIcon={<AccountCircle />}
              sx={{ ml: 1 }}
            >
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Navigation Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { minWidth: 250 }
        }}
        // Força fechamento correto
        disableAutoFocus={true}
        disableEnforceFocus={true}
        disableRestoreFocus={true}
        // Adiciona key para forçar re-render quando rota muda
        key={location.pathname}
      >
        {/* Main POS */}
        <MenuItem onClick={() => navigateTo('')}>
          <Restaurant sx={{ mr: 2 }} />
          POS Principal
        </MenuItem>

        <Divider />

        {/* Restaurant Operations */}
        <MenuItem onClick={() => navigateTo('/tables')}>
          <TableRestaurant sx={{ mr: 2 }} />
          Layout das Mesas
        </MenuItem>

        <MenuItem onClick={() => navigateTo('/delivery')}>
          <LocalShipping sx={{ mr: 2 }} />
          Delivery
        </MenuItem>

        <MenuItem onClick={() => navigateTo('/loyalty')}>
          <CardGiftcard sx={{ mr: 2 }} />
          Fidelidade
        </MenuItem>

        <Divider />

        {/* Financial */}
        <MenuItem onClick={() => navigateTo('/cashier')}>
          <AttachMoney sx={{ mr: 2 }} />
          Caixa
        </MenuItem>

        <MenuItem onClick={() => navigateTo('/cash-withdrawal')}>
          <Receipt sx={{ mr: 2 }} />
          Sangria
        </MenuItem>

        <MenuItem onClick={() => navigateTo('/business-day')}>
          <Business sx={{ mr: 2 }} />
          Dia Operacional
        </MenuItem>

        <MenuItem onClick={() => navigateTo('/fiscal')}>
          <Assessment sx={{ mr: 2 }} />
          Módulo Fiscal
        </MenuItem>

        <Divider />

        {/* Management */}
        {hasRole('admin') && (
          <MenuItem onClick={() => navigateTo('/manager')}>
            <Settings sx={{ mr: 2 }} />
            Gestão Gerencial
          </MenuItem>
        )}
      </Menu>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
        {user && (
          <>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {user.operator_name}
              </Typography>
              <Chip
                label={user.roles[0]?.toUpperCase() || 'USER'}
                size="small"
                color={user.roles.includes('admin') ? 'error' : 'primary'}
                sx={{ mt: 0.5 }}
              />
            </Box>

            <MenuItem onClick={handleLogout}>
              <ExitToApp sx={{ mr: 2 }} />
              Sair
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Login Dialog */}
      <LoginDialog
        open={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
        onSuccess={() => {
          setLoginDialogOpen(false);
          // Redirecionar para página principal após login
          navigate(`/pos/${terminalId}/main`);
        }}
      />

      {/* Main Content */}
      <Box component="main">
        {children}
      </Box>
    </Box>
  );
};

export default POSLayout;

