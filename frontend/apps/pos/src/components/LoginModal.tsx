import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { ApiInterceptor } from '../services/ApiInterceptor';
import NumericKeyboard from './NumericKeyboard';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ open, onClose, onSuccess }) => {
  console.log('🚀 LoginModal component loaded');
  
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0); // 0 = Teclado, 1 = Texto
  const { login } = useAuth();

  const [activeField, setActiveField] = useState<'username' | 'password'>('username');

  const handleKeyPress = (key: string) => {
    setCredentials(prev => ({
      ...prev,
      [activeField]: prev[activeField] + key
    }));
  };

  const handleBackspace = () => {
    setCredentials(prev => ({
      ...prev,
      [activeField]: prev[activeField].slice(0, -1)
    }));
  };

  const handleClear = () => {
    setCredentials(prev => ({
      ...prev,
      [activeField]: ''
    }));
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('🔥 FORM SUBMIT TRIGGERED! 🔥');
    console.log('📝 Credentials:', { 
      username: credentials.username, 
      password: credentials.password ? '***' : 'empty' 
    });
    
    if (!credentials.username || !credentials.password) {
      console.log('❌ Empty fields');
      setError('Por favor, preencha todos os campos');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      console.log('🔥 FORM SUBMIT TRIGGERED! 🔥');
      
      const response = await fetch('http://localhost:8001/api/v1/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: credentials.username,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const tokenData = await response.json();
      console.log('✅ Login successful:', tokenData);

      // Salvar token usando ApiInterceptor
      const apiInterceptor = ApiInterceptor.getInstance();
      apiInterceptor.setToken(tokenData);
      
      // Reset form
      setCredentials({ username: '', password: '' });
      setError('');
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
      
      // Close modal
      onClose();
      
      console.log('🎉 Login process completed successfully');
      
    } catch (error) {
      console.log('❌ Login error:', error);
      console.error('🚨 Detailed error:', error);
      setError('Credenciais inválidas. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    console.log('🚪 Modal closing');
    setCredentials({ username: '', password: '' });
    setError('');
    onClose();
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('👤 Username changed:', e.target.value);
    setCredentials(prev => ({ ...prev, username: e.target.value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔒 Password changed: ***');
    setCredentials(prev => ({ ...prev, password: e.target.value }));
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: '300px' }
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Typography variant="h5" component="h2" sx={{ textAlign: 'center' }}>
            Login no Sistema
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {/* Abas para alternar entre Teclado e Texto */}
            <Tabs value={tabValue} onChange={handleTabChange} centered sx={{ mb: 2 }}>
              <Tab label="Teclado Numérico" />
              <Tab label="Teclado Texto" />
            </Tabs>
            
            {/* Campos de entrada */}
            <Box sx={{ mb: 2 }}>
              <TextField
                margin="dense"
                label="Código do Operador"
                type="text"
                fullWidth
                variant="outlined"
                value={credentials.username}
                onChange={handleUsernameChange}
                onClick={() => setActiveField('username')}
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: activeField === 'username' ? '#e3f2fd' : 'transparent'
                  }
                }}
                disabled={isLoading || tabValue === 0}
                inputProps={{ 
                  readOnly: tabValue === 0,
                  style: { 
                    fontSize: '1.2rem', 
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }
                }}
              />
              
              <TextField
                margin="dense"
                label="Senha"
                type="password"
                fullWidth
                variant="outlined"
                value={credentials.password}
                onChange={handlePasswordChange}
                onClick={() => setActiveField('password')}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: activeField === 'password' ? '#e3f2fd' : 'transparent'
                  }
                }}
                disabled={isLoading || tabValue === 0}
                inputProps={{ 
                  readOnly: tabValue === 0,
                  style: { 
                    fontSize: '1.2rem', 
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }
                }}
              />
            </Box>
            
            {/* Seletor de campo ativo para teclado numérico */}
            {tabValue === 0 && (
              <Box sx={{ mb: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Campo ativo:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Button
                    variant={activeField === 'username' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setActiveField('username')}
                    disabled={isLoading}
                  >
                    Código
                  </Button>
                  <Button
                    variant={activeField === 'password' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setActiveField('password')}
                    disabled={isLoading}
                  >
                    Senha
                  </Button>
                </Box>
              </Box>
            )}
            
            {/* Teclado numérico */}
            {tabValue === 0 && (
              <NumericKeyboard
                onKeyPress={handleKeyPress}
                onBackspace={handleBackspace}
                onClear={handleClear}
                disabled={isLoading}
              />
            )}
            
            {/* Credenciais de teste */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Credenciais de teste:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Código: <strong>123</strong> | Senha: <strong>456</strong> (Gerente)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Código: <strong>789</strong> | Senha: <strong>321</strong> (Caixa)
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
          <Button 
            onClick={handleClose} 
            disabled={isLoading}
            variant="outlined"
            size="large"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={isLoading || !credentials.username || !credentials.password}
            size="large"
            sx={{ minWidth: 120 }}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Entrar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default LoginModal;

