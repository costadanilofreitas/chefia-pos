import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import apiInterceptor, { ApiInterceptor } from '../services/ApiInterceptor';
import NumericKeypad from './NumericKeypad';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ open, onClose, onSuccess }) => {
  
  const navigate = useNavigate();
  const { terminalId } = useParams<{ terminalId: string }>();
  const [operatorId, setOperatorId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0); // 0 = Teclado Numérico, 1 = Teclado Texto
  const [showPasswordKeypad, setShowPasswordKeypad] = useState(false);
  const { login } = useAuth();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOperatorIdComplete = (id: string) => {
    setOperatorId(id);
    setPassword(''); // Limpar senha antes de mostrar teclado de senha
    setShowPasswordKeypad(true);
  };

  const handlePasswordComplete = async (pwd: string) => {
    setPassword(pwd);
    await handleLogin(operatorId, pwd);
  };

  const handleLogin = async (id?: string, pwd?: string) => {
    const finalOperatorId = id || operatorId;
    const finalPassword = pwd || password;
    
    if (!finalOperatorId || !finalPassword) {
      setError('Por favor, preencha o código do operador e a senha');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Usar apenas o hook useAuth para fazer login
      const user = await login({
        operator_id: finalOperatorId,
        password: finalPassword
      });
      

      // Verificar status do caixa para decidir redirecionamento
      try {
        const response = await fetch(`http://localhost:8001/api/v1/cashier/terminal/${terminalId}/status`, {
          headers: {
            'Authorization': `Bearer ${ApiInterceptor.getInstance().getToken()?.access_token}`
          }
        });
        
        if (response.ok) {
          const cashierStatus = await response.json();
          
          if (cashierStatus.has_open_cashier) {
            // Caixa já aberto - vai para tela principal de pedidos
            navigate(`/pos/${terminalId}/main`);
          } else {
            // Caixa não aberto - permanece na tela de caixa para abrir o dia
            // Não redireciona, permanece na tela atual
          }
        } else {
          // Se não conseguir verificar status, vai para main por padrão
          navigate(`/pos/${terminalId}/main`);
        }
      } catch (error) {
        console.error('❌ Error checking cashier status:', error);
        // Em caso de erro, vai para main por padrão
        navigate(`/pos/${terminalId}/main`);
      }

      // Fechar modal e executar callback de sucesso
      onClose();
      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('❌ Login error:', error);
      setError(error instanceof Error ? error.message : 'Erro ao fazer login');
      setIsLoading(false);
    }
  };

  const handleTextLogin = async () => {
    await handleLogin();
  };

  const handleClosePasswordKeypad = () => {
    setShowPasswordKeypad(false);
  };

  const renderNumericLogin = () => {
    if (showPasswordKeypad) {
      return (
        <NumericKeypad
          key="password-keypad" // Força re-render
          open={true}
          onClose={handleClosePasswordKeypad}
          onComplete={handlePasswordComplete}
          title={`Digite sua senha (${operatorId})`}
          loading={isLoading}
          error={error}
          dialog={false}
        />
      );
    }

    return (
      <NumericKeypad
        key="operator-keypad" // Força re-render
        open={true}
        onClose={onClose}
        onComplete={handleOperatorIdComplete}
        title="Digite o código do operador"
        loading={isLoading}
        error={error}
        dialog={false}
        length={3} // ID do operador tem 3 dígitos
      />
    );
  };

  const renderTextLogin = () => (
    <Box sx={{ p: 2 }}>
      <TextField
        fullWidth
        label="Código do Operador"
        value={operatorId}
        onChange={(e) => setOperatorId(e.target.value)}
        margin="normal"
        disabled={isLoading}
        type="number"
        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
      />
      
      <TextField
        fullWidth
        label="Senha"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        margin="normal"
        disabled={isLoading}
        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
      />

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          onClick={handleTextLogin}
          disabled={isLoading || !operatorId || !password}
          size="large"
          sx={{ minWidth: 120 }}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Entrar'}
        </Button>
      </Box>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={isLoading}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        Login no Sistema
      </DialogTitle>
      
      <DialogContent sx={{ pb: 1 }}>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab label="TECLADO NUMÉRICO" />
          <Tab label="TECLADO TEXTO" />
        </Tabs>

        <Box sx={{ mt: 2 }}>
          {tabValue === 0 ? renderNumericLogin() : renderTextLogin()}
        </Box>

        {/* Credenciais de teste visíveis */}
        <Box sx={{ 
          mt: 2, 
          p: 1, 
          backgroundColor: '#f5f5f5', 
          borderRadius: 1,
          fontSize: '0.8rem',
          color: '#666'
        }}>
          <Typography variant="caption" display="block">
            <strong>Credenciais de teste:</strong>
          </Typography>
          <Typography variant="caption" display="block">
            • Manager: 123 / 456789
          </Typography>
          <Typography variant="caption" display="block">
            • Admin: 456 / 123456
          </Typography>
          <Typography variant="caption" display="block">
            • Cashier: 789 / 654321
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pt: 0, pb: 2 }}>
        <Button 
          onClick={onClose} 
          disabled={isLoading}
          variant="outlined"
        >
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoginModal;
