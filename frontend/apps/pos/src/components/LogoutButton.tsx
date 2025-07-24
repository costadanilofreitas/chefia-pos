import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert,
  CircularProgress,
  Box
} from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useParams } from 'react-router-dom';

interface LogoutButtonProps {
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({
  variant = 'outlined',
  size = 'medium',
  fullWidth = false,
  disabled = false
}) => {
  const { terminalId } = useParams<{ terminalId: string }>();
  const { logout, loading, error } = useAuth();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const isTablePOS = terminalId?.includes('mesa') || terminalId?.includes('table');

  const handleLogoutClick = () => {
    setConfirmDialogOpen(true);
    setLogoutError(null);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    
    try {
      await logout(terminalId);
      setConfirmDialogOpen(false);
      // Redirecionar para página de login ou inicial
      window.location.href = '/';
    } catch (error: any) {
      setLogoutError(error.message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleCancelLogout = () => {
    setConfirmDialogOpen(false);
    setLogoutError(null);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        disabled={disabled || loading}
        startIcon={<LogoutIcon />}
        onClick={handleLogoutClick}
        color="error"
      >
        Sair
      </Button>

      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelLogout}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" component="h2">
            Confirmar Logout
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" paragraph>
              Tem certeza que deseja sair do sistema?
            </Typography>
            
            {isTablePOS ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>POS de Mesa:</strong> Você pode fazer logout mesmo com caixa aberto.
                </Typography>
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>POS de Caixa:</strong> Certifique-se de que o caixa esteja fechado antes de fazer logout.
                </Typography>
              </Alert>
            )}
            
            <Typography variant="body2" color="text.secondary">
              Terminal: <strong>{terminalId}</strong>
            </Typography>
          </Box>
          
          {logoutError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {logoutError}
            </Alert>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
          <Button
            onClick={handleCancelLogout}
            disabled={isLoggingOut}
            variant="outlined"
            size="large"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmLogout}
            disabled={isLoggingOut}
            variant="contained"
            color="error"
            size="large"
            sx={{ minWidth: 120 }}
          >
            {isLoggingOut ? <CircularProgress size={24} /> : 'Confirmar Logout'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LogoutButton;

