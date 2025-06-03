import React, { useState, useEffect } from 'react';
import { 
  Box, TextField, Button, Typography, Paper, 
  Container, CircularProgress, Alert, Snackbar
} from '@mui/material';
import { LockOutlined, Person } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import NumericKeypad from './NumericKeypad';

// Estilos para o formulário de login
const LoginContainer = styled(Container)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: theme.spacing(2)
}));

const LoginPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  maxWidth: '400px',
  width: '100%'
}));

const LoginIcon = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: '50%',
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2)
}));

/**
 * Componente de login com senha numérica
 * 
 * @param {Object} props - Propriedades do componente
 * @param {function} props.onLogin - Callback chamado quando o login for bem-sucedido
 * @param {function} props.onError - Callback chamado quando ocorrer um erro
 */
const NumericPasswordLogin = ({
  onLogin,
  onError
}) => {
  // Estados para controle do formulário
  const [operatorId, setOperatorId] = useState('');
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Manipulador para abrir o teclado numérico
  const handleOpenKeypad = () => {
    if (!operatorId) {
      setError('Por favor, informe o ID do operador');
      return;
    }
    
    setError(null);
    setIsKeypadOpen(true);
  };
  
  // Manipulador para fechar o teclado numérico
  const handleCloseKeypad = () => {
    setIsKeypadOpen(false);
  };
  
  // Manipulador para processar a senha completa
  const handlePasswordComplete = async (password) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Em produção, substituir por chamada real à API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operator_id: operatorId,
          password: password
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Erro ao fazer login');
      }
      
      // Verificar se precisa alterar a senha
      if (data.require_password_change) {
        setSuccessMessage('Login bem-sucedido! Você precisa alterar sua senha.');
        // Redirecionar para tela de alteração de senha
        setTimeout(() => {
          if (onLogin) {
            onLogin(data, true);
          }
        }, 1500);
      } else {
        setSuccessMessage('Login bem-sucedido!');
        // Redirecionar para tela principal
        setTimeout(() => {
          if (onLogin) {
            onLogin(data, false);
          }
        }, 1000);
      }
      
      // Fechar teclado numérico
      setIsKeypadOpen(false);
    } catch (error) {
      setError(error.message || 'Erro ao fazer login');
      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manipulador para fechar mensagem de sucesso
  const handleCloseSuccessMessage = () => {
    setSuccessMessage(null);
  };
  
  return (
    <LoginContainer maxWidth="sm">
      <LoginPaper elevation={3}>
        <LoginIcon>
          <LockOutlined fontSize="large" />
        </LoginIcon>
        
        <Typography component="h1" variant="h5" gutterBottom>
          Login do Operador
        </Typography>
        
        <Box sx={{ width: '100%', mt: 2 }}>
          <TextField
            fullWidth
            label="ID do Operador"
            variant="outlined"
            margin="normal"
            value={operatorId}
            onChange={(e) => setOperatorId(e.target.value)}
            InputProps={{
              startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            disabled={isLoading}
            autoFocus
          />
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          
          <Button
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            onClick={handleOpenKeypad}
            disabled={isLoading}
            sx={{ mt: 3, mb: 2 }}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Continuar'}
          </Button>
        </Box>
      </LoginPaper>
      
      {/* Teclado numérico em diálogo */}
      <NumericKeypad
        open={isKeypadOpen}
        onClose={handleCloseKeypad}
        onComplete={handlePasswordComplete}
        title={`Digite sua senha (${operatorId})`}
        loading={isLoading}
        error={error}
        dialog={true}
      />
      
      {/* Mensagem de sucesso */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={handleCloseSuccessMessage}
      >
        <Alert 
          onClose={handleCloseSuccessMessage} 
          severity="success"
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </LoginContainer>
  );
};

export default NumericPasswordLogin;
