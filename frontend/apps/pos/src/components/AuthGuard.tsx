// src/components/AuthGuard.tsx
import React, { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import { useAuth, UserRole } from '../hooks/mocks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  allowGuestAccess?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requiredRole,
  allowGuestAccess = false 
}) => {
  const { user, isAuthenticated, login } = useAuth();
  const { terminalId } = useParams<{ terminalId: string }>();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Se não está autenticado e não permite acesso de convidado
  if (!isAuthenticated && !allowGuestAccess) {
    return <Navigate to={`/pos/${terminalId || '1'}/cashier`} replace />;
  }

  // Se está autenticado mas não tem o papel necessário
  if (isAuthenticated && requiredRole && user?.role !== requiredRole) {
    if (!showLoginDialog) {
      setShowLoginDialog(true);
    }
  }

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) {
      setLoginError('Por favor, preencha todos os campos');
      return;
    }

    setIsLoading(true);
    setLoginError('');

    try {
      const credentials = {
        operator_id: loginForm.username,
        password: loginForm.password
      };
      const loggedUser = await login(credentials);
      
      if (requiredRole && loggedUser.role !== requiredRole) {
        setLoginError(`Acesso negado. É necessário ser ${requiredRole} para acessar esta área.`);
        return;
      }

      setShowLoginDialog(false);
      setLoginForm({ username: '', password: '' });
    } catch (error) {
      setLoginError('Credenciais inválidas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowLoginDialog(false);
    setLoginForm({ username: '', password: '' });
    setLoginError('');
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.MANAGER: return 'Gerente';
      case UserRole.WAITER: return 'Garçom';
      case UserRole.CASHIER: return 'Caixa';
      case UserRole.COOK: return 'Cozinheiro';
      default: return role;
    }
  };

  return (
    <>
      {children}
      
      <Dialog 
        open={showLoginDialog} 
        onClose={handleCancel}
        maxWidth="sm" 
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle>
          <Typography variant="h6">
            Autenticação Necessária
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {requiredRole 
              ? `É necessário ser ${getRoleLabel(requiredRole)} para acessar esta área`
              : 'Faça login para continuar'
            }
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {loginError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {loginError}
              </Alert>
            )}
            
            <TextField
              autoFocus
              margin="dense"
              label="Usuário"
              type="text"
              fullWidth
              variant="outlined"
              value={loginForm.username}
              onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
              disabled={isLoading}
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="dense"
              label="Senha"
              type="password"
              fullWidth
              variant="outlined"
              value={loginForm.password}
              onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
              disabled={isLoading}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleLogin();
                }
              }}
            />
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleCancel} 
            disabled={isLoading}
            color="inherit"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleLogin} 
            variant="contained"
            disabled={isLoading || !loginForm.username || !loginForm.password}
            startIcon={isLoading ? <CircularProgress size={16} /> : null}
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AuthGuard;

