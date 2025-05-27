import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Container, 
  Button, CircularProgress, Alert, Snackbar
} from '@mui/material';
import { styled } from '@mui/material/styles';
import NumericKeypad from './NumericKeypad';
import NumericPasswordLogin from './NumericPasswordLogin';
import NumericPasswordChange from './NumericPasswordChange';

// Estilos para o container de demonstração
const DemoContainer = styled(Container)(({ theme }) => ({
  padding: theme.spacing(4),
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4)
}));

const DemoSection = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(4)
}));

const DemoTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(2)
}));

/**
 * Componente de demonstração para o sistema de senha numérica
 * Mostra todos os componentes e fluxos em uma única página
 */
const NumericPasswordDemo = () => {
  // Estados para controle da demonstração
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadPassword, setKeypadPassword] = useState('');
  const [keypadError, setKeypadError] = useState(null);
  const [keypadLoading, setKeypadLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [changeSuccess, setChangeSuccess] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showRequiredChange, setShowRequiredChange] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Manipulador para demonstração do teclado numérico
  const handleKeypadComplete = (password) => {
    setKeypadLoading(true);
    setKeypadPassword(password);
    
    // Simular validação
    setTimeout(() => {
      if (password === '123456') {
        setKeypadError('Senha muito simples ou sequencial');
      } else {
        setSuccessMessage(`Senha inserida: ${password}`);
        setShowKeypad(false);
      }
      setKeypadLoading(false);
    }, 1000);
  };
  
  // Manipulador para demonstração de login
  const handleLoginSuccess = (data, requireChange) => {
    setLoginSuccess(true);
    setSuccessMessage(`Login bem-sucedido! ${requireChange ? 'Alteração de senha necessária.' : ''}`);
    
    if (requireChange) {
      setTimeout(() => {
        setShowRequiredChange(true);
      }, 1000);
    }
  };
  
  // Manipulador para demonstração de alteração de senha
  const handleChangeSuccess = () => {
    setChangeSuccess(true);
    setShowChangePassword(false);
    setShowRequiredChange(false);
    setSuccessMessage('Senha alterada com sucesso!');
  };
  
  // Manipulador para fechar mensagem de sucesso
  const handleCloseSuccessMessage = () => {
    setSuccessMessage(null);
  };
  
  // Resetar demonstração
  const handleReset = () => {
    setShowKeypad(false);
    setKeypadPassword('');
    setKeypadError(null);
    setKeypadLoading(false);
    setLoginSuccess(false);
    setChangeSuccess(false);
    setShowChangePassword(false);
    setShowRequiredChange(false);
    setSuccessMessage(null);
  };
  
  return (
    <DemoContainer maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Sistema de Senha Numérica - Demonstração
      </Typography>
      
      <Typography variant="body1" paragraph align="center">
        Esta página demonstra os componentes e fluxos do sistema de senha numérica para operadores.
      </Typography>
      
      <DemoSection elevation={2}>
        <DemoTitle variant="h5" component="h2">
          1. Teclado Numérico Básico
        </DemoTitle>
        
        <Typography variant="body1" paragraph>
          O componente de teclado numérico pode ser usado de forma independente ou como diálogo.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Button 
            variant="contained" 
            onClick={() => setShowKeypad(true)}
            disabled={showKeypad}
          >
            Abrir Teclado Numérico
          </Button>
        </Box>
        
        {showKeypad && (
          <Box sx={{ maxWidth: 400, mx: 'auto' }}>
            <NumericKeypad
              dialog={false}
              onComplete={handleKeypadComplete}
              title="Digite uma senha de 6 dígitos"
              loading={keypadLoading}
              error={keypadError}
            />
          </Box>
        )}
      </DemoSection>
      
      <DemoSection elevation={2}>
        <DemoTitle variant="h5" component="h2">
          2. Fluxo de Login
        </DemoTitle>
        
        <Typography variant="body1" paragraph>
          O fluxo completo de login com senha numérica.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Button 
            variant="contained" 
            onClick={handleReset}
            sx={{ mr: 2 }}
          >
            Resetar Demonstração
          </Button>
          
          <Button 
            variant="contained" 
            color="secondary"
            onClick={() => setShowRequiredChange(true)}
          >
            Simular Senha Expirada
          </Button>
        </Box>
        
        {!loginSuccess && (
          <Box sx={{ maxWidth: 400, mx: 'auto', mt: 3 }}>
            <NumericPasswordLogin
              onLogin={handleLoginSuccess}
              onError={(error) => setSuccessMessage(`Erro: ${error.message}`)}
            />
          </Box>
        )}
      </DemoSection>
      
      <DemoSection elevation={2}>
        <DemoTitle variant="h5" component="h2">
          3. Alteração de Senha
        </DemoTitle>
        
        <Typography variant="body1" paragraph>
          Fluxo de alteração de senha numérica.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Button 
            variant="contained" 
            onClick={() => setShowChangePassword(true)}
            disabled={showChangePassword}
          >
            Alterar Senha
          </Button>
        </Box>
        
        {showChangePassword && (
          <Box sx={{ maxWidth: 400, mx: 'auto', mt: 3 }}>
            <NumericPasswordChange
              operatorId="op123"
              onSuccess={handleChangeSuccess}
              onCancel={() => setShowChangePassword(false)}
              required={false}
            />
          </Box>
        )}
      </DemoSection>
      
      {/* Diálogo de alteração obrigatória de senha */}
      {showRequiredChange && (
        <NumericPasswordChange
          operatorId="op123"
          onSuccess={handleChangeSuccess}
          required={true}
        />
      )}
      
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
    </DemoContainer>
  );
};

export default NumericPasswordDemo;
