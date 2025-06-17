import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Lock
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const LoginDialog: React.FC<LoginDialogProps> = ({ open, onClose, onSuccess }) => {
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState({
    operator_id: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Limpar erro quando usuário começar a digitar
    if (error) setError(null);
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    // Permitir apenas dígitos e máximo 6 caracteres
    if (/^\d{0,6}$/.test(value)) {
      setFormData(prev => ({
        ...prev,
        password: value
      }));
    }
    if (error) setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!formData.operator_id.trim()) {
      setError('ID do operador é obrigatório');
      return;
    }

    if (formData.password.length !== 6) {
      setError('Senha deve ter exatamente 6 dígitos');
      return;
    }

    try {
      await login(formData.operator_id.trim(), formData.password);
      
      // Reset form
      setFormData({ operator_id: '', password: '' });
      setError(null);
      
      // Callback de sucesso
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ operator_id: '', password: '' });
      setError(null);
      onClose();
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSubmit(event as any);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Lock color="primary" />
          <Typography variant="h6">
            Autenticação do Sistema
          </Typography>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3}>
            {error && (
              <Alert severity="error" variant="outlined">
                {error}
              </Alert>
            )}

            <TextField
              label="ID do Operador"
              value={formData.operator_id}
              onChange={handleInputChange('operator_id')}
              onKeyPress={handleKeyPress}
              fullWidth
              required
              disabled={loading}
              placeholder="Ex: admin, manager, cashier"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="action" />
                  </InputAdornment>
                ),
              }}
              helperText="Digite seu ID de operador"
            />

            <TextField
              label="Senha Numérica"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handlePasswordChange}
              onKeyPress={handleKeyPress}
              fullWidth
              required
              disabled={loading}
              placeholder="6 dígitos"
              inputProps={{
                maxLength: 6,
                pattern: '[0-9]{6}',
                inputMode: 'numeric'
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              helperText="Senha de 6 dígitos numéricos"
            />

            <Box 
              sx={{ 
                p: 2, 
                bgcolor: 'grey.50', 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.200'
              }}
            >
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Credenciais de Teste:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Admin: <code>admin</code> / <code>147258</code><br/>
                • Manager: <code>manager</code> / <code>123456</code><br/>
                • Cashier: <code>cashier</code> / <code>654321</code>
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleClose} 
            disabled={loading}
            color="inherit"
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            variant="contained" 
            disabled={loading || !formData.operator_id.trim() || formData.password.length !== 6}
            startIcon={loading ? <CircularProgress size={20} /> : <Lock />}
          >
            {loading ? 'Autenticando...' : 'Entrar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default LoginDialog;

