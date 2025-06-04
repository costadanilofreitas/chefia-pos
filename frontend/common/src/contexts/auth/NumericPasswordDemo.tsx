import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Container, 
  Button, Alert, Snackbar
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

// Define types for state variables
interface NumericPasswordDemoState {
  showKeypad: boolean;
  keypadPassword: string;
  keypadError: string | null;
  keypadLoading: boolean;
  loginSuccess: boolean;
  changeSuccess: boolean;
  showChangePassword: boolean;
  showRequiredChange: boolean;
  successMessage: string | null;
}

/**
 * Componente de demonstração para o sistema de senha numérica
 * Mostra todos os componentes e fluxos em uma única página
 */
const NumericPasswordDemo: React.FC = () => {
  // Estados para controle da demonstração
  const [state, setState] = useState<NumericPasswordDemoState>({
    showKeypad: false,
    keypadPassword: '',
    keypadError: null,
    keypadLoading: false,
    loginSuccess: false,
    changeSuccess: false,
    showChangePassword: false,
    showRequiredChange: false,
    successMessage: null,
  });

  // Manipulador para demonstração do teclado numérico
  const handleKeypadComplete = (password: string) => {
    setState((prevState) => ({
      ...prevState,
      keypadLoading: true,
      keypadPassword: password,
    }));

    // Simular validação
    setTimeout(() => {
      if (password === '123456') {
        setState((prevState) => ({
          ...prevState,
          keypadError: 'Senha muito simples ou sequencial',
          keypadLoading: false,
        }));
      } else {
        setState((prevState) => ({
          ...prevState,
          successMessage: `Senha inserida: ${password}`,
          showKeypad: false,
          keypadLoading: false,
        }));
      }
    }, 1000);
  };

  // Manipulador para demonstração de login
  const handleLoginSuccess = (requireChange: boolean) => {
    setState((prevState) => ({
      ...prevState,
      loginSuccess: true,
      successMessage: `Login bem-sucedido! ${requireChange ? 'Alteração de senha necessária.' : ''}`,
    }));

    if (requireChange) {
      setTimeout(() => {
        setState((prevState) => ({
          ...prevState,
          showRequiredChange: true,
        }));
      }, 1000);
    }
  };

  // Manipulador para demonstração de alteração de senha
  const handleChangeSuccess = () => {
    setState((prevState) => ({
      ...prevState,
      changeSuccess: true,
      showChangePassword: false,
      showRequiredChange: false,
      successMessage: 'Senha alterada com sucesso!',
    }));
  };

  // Manipulador para fechar mensagem de sucesso
  const handleCloseSuccessMessage = () => {
    setState((prevState) => ({
      ...prevState,
      successMessage: null,
    }));
  };

  // Resetar demonstração
  const handleReset = () => {
    setState({
      showKeypad: false,
      keypadPassword: '',
      keypadError: null,
      keypadLoading: false,
      loginSuccess: false,
      changeSuccess: false,
      showChangePassword: false,
      showRequiredChange: false,
      successMessage: null,
    });
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
        <DemoTitle variant="h5">
          1. Teclado Numérico Básico
        </DemoTitle>

        <Typography variant="body1" paragraph>
          O componente de teclado numérico pode ser usado de forma independente ou como diálogo.
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Button 
            variant="contained" 
            onClick={() => setState((prevState) => ({ ...prevState, showKeypad: true }))}
            disabled={state.showKeypad}
          >
            Abrir Teclado Numérico
          </Button>
        </Box>

        {state.showKeypad && (
          <Box sx={{ maxWidth: 400, mx: 'auto' }}>
            <NumericKeypad
              dialog={false}
              onComplete={handleKeypadComplete}
              title="Digite uma senha de 6 dígitos"
              loading={state.keypadLoading}
              error={state.keypadError}
            />
          </Box>
        )}
      </DemoSection>

      <DemoSection elevation={2}>
        <DemoTitle variant="h5">
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
            onClick={() => setState((prevState) => ({ ...prevState, showRequiredChange: true }))}
          >
            Simular Senha Expirada
          </Button>
        </Box>

        {!state.loginSuccess && (
          <Box sx={{ maxWidth: 400, mx: 'auto', mt: 3 }}>
            <NumericPasswordLogin
              onLogin={handleLoginSuccess}
              onError={(error: Error) => setState((prevState) => ({ ...prevState, successMessage: `Erro: ${error.message}` }))}
            />
          </Box>
        )}
      </DemoSection>

      <DemoSection elevation={2}>
        <DemoTitle variant="h5">
          3. Alteração de Senha
        </DemoTitle>

        <Typography variant="body1" paragraph>
          Fluxo de alteração de senha numérica.
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Button 
            variant="contained" 
            onClick={() => setState((prevState) => ({ ...prevState, showChangePassword: true }))}
            disabled={state.showChangePassword}
          >
            Alterar Senha
          </Button>
        </Box>

        {state.showChangePassword && (
          <Box sx={{ maxWidth: 400, mx: 'auto', mt: 3 }}>
            <NumericPasswordChange
              operatorId="op123"
              onSuccess={handleChangeSuccess}
              onCancel={() => setState((prevState) => ({ ...prevState, showChangePassword: false }))}
              required={false}
            />
          </Box>
        )}
      </DemoSection>

      {/* Diálogo de alteração obrigatória de senha */}
      {state.showRequiredChange && (
        <NumericPasswordChange
          operatorId="op123"
          onSuccess={handleChangeSuccess}
          onCancel={() => setState((prevState) => ({ ...prevState, showRequiredChange: false }))}
          required={true}
        />
      )}

      {/* Mensagem de sucesso */}
      <Snackbar
        open={!!state.successMessage}
        autoHideDuration={3000}
        onClose={handleCloseSuccessMessage}
      >
        <Alert 
          onClose={handleCloseSuccessMessage} 
          severity="success"
          sx={{ width: '100%' }}
        >
          {state.successMessage}
        </Alert>
      </Snackbar>
    </DemoContainer>
  );
};

export default NumericPasswordDemo;
