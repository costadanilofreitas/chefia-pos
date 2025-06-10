import React, { useState, useEffect } from 'react';
import { 
  Box, Button, Typography, Paper, 
  Container, CircularProgress, Alert, Snackbar,
  Dialog, DialogTitle, DialogContent
} from '@mui/material';
import { VpnKey } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import NumericKeypad from './NumericKeypad';

// Estilos para o formulário de alteração de senha
const PasswordChangeContainer = styled(Container)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2)
}));

const PasswordChangePaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  maxWidth: '400px',
  width: '100%'
}));

const PasswordChangeIcon = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: '50%',
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2)
}));

// Define types for props
interface NumericPasswordChangeProps {
  operatorId: string;
  onSuccess: () => void;
  onCancel?: () => void;
  required?: boolean;
}

// Define types for state variables
interface NumericPasswordChangeState {
  step: 'current' | 'new' | 'confirm';
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  isKeypadOpen: boolean;
  keypadMode: 'current' | 'new' | 'confirm' | '';
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
}

/**
 * Componente para alteração de senha numérica
 */
const NumericPasswordChange: React.FC<NumericPasswordChangeProps> = ({
  operatorId,
  onSuccess,
  onCancel,
  required = false
}) => {
  // Estados para controle do formulário
  const [state, setState] = useState<NumericPasswordChangeState>({
    step: 'current',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    isKeypadOpen: false,
    keypadMode: '',
    isLoading: false,
    error: null,
    successMessage: null,
  });

  // Efeito para abrir automaticamente o teclado para senha atual
  useEffect(() => {
    if (required) {
      handleOpenKeypad('current');
    }
  }, [required]);

  // Manipulador para abrir o teclado numérico
  const handleOpenKeypad = (mode: 'current' | 'new' | 'confirm') => {
    setState((prevState) => ({
      ...prevState,
      error: null,
      keypadMode: mode,
      isKeypadOpen: true,
    }));
  };

  // Manipulador para fechar o teclado numérico
  const handleCloseKeypad = () => {
    setState((prevState) => ({
      ...prevState,
      isKeypadOpen: false,
    }));
  };

  // Manipulador para processar a senha completa
  const handlePasswordComplete = (password: string) => {
    if (state.keypadMode === 'current') {
      setState((prevState) => ({
        ...prevState,
        currentPassword: password,
        isKeypadOpen: false,
      }));
      setTimeout(() => {
        setState((prevState) => ({
          ...prevState,
          step: 'new',
        }));
        handleOpenKeypad('new');
      }, 300);
    } else if (state.keypadMode === 'new') {
      setState((prevState) => ({
        ...prevState,
        newPassword: password,
        isKeypadOpen: false,
      }));
      setTimeout(() => {
        setState((prevState) => ({
          ...prevState,
          step: 'confirm',
        }));
        handleOpenKeypad('confirm');
      }, 300);
    } else if (state.keypadMode === 'confirm') {
      setState((prevState) => ({
        ...prevState,
        confirmPassword: password,
        isKeypadOpen: false,
      }));
      if (password !== state.newPassword) {
        setState((prevState) => ({
          ...prevState,
          error: 'As senhas não coincidem',
        }));
        setTimeout(() => {
          setState((prevState) => ({
            ...prevState,
            step: 'new',
          }));
          handleOpenKeypad('new');
        }, 1000);
        return;
      }
      handleSubmitPasswordChange();
    }
  };

  // Manipulador para enviar solicitação de alteração de senha
  const handleSubmitPasswordChange = async () => {
    setState((prevState) => ({
      ...prevState,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await fetch(`/api/auth/credentials/${operatorId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: state.currentPassword,
          new_password: state.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Erro ao alterar senha');
      }

      setState((prevState) => ({
        ...prevState,
        successMessage: 'Senha alterada com sucesso!',
      }));

      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (error: any) {
      setState((prevState) => ({
        ...prevState,
        error: error.message || 'Erro ao alterar senha',
      }));

      if (error.message.includes('atual')) {
        setState((prevState) => ({
          ...prevState,
          step: 'current',
        }));
        setTimeout(() => {
          handleOpenKeypad('current');
        }, 1000);
      }
    } finally {
      setState((prevState) => ({
        ...prevState,
        isLoading: false,
      }));
    }
  };

  // Manipulador para cancelar alteração de senha
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // Manipulador para fechar mensagem de sucesso
  const handleCloseSuccessMessage = () => {
    setState((prevState) => ({
      ...prevState,
      successMessage: null,
    }));
  };

  // Determinar título do teclado com base no modo
  const getKeypadTitle = (): string => {
    switch (state.keypadMode) {
      case 'current':
        return 'Digite sua senha atual';
      case 'new':
        return 'Digite sua nova senha';
      case 'confirm':
        return 'Confirme sua nova senha';
      default:
        return 'Digite sua senha';
    }
  };

  // Renderizar conteúdo com base na etapa atual
  const renderStepContent = () => (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Typography variant="body1" gutterBottom>
        {state.step === 'current' && 'Por favor, digite sua senha atual para continuar.'}
        {state.step === 'new' && 'Agora, digite sua nova senha de 6 dígitos.'}
        {state.step === 'confirm' && 'Por favor, confirme sua nova senha.'}
      </Typography>

      {state.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {state.error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        {!required && (
          <Button
            variant="outlined"
            onClick={handleCancel}
            disabled={state.isLoading}
          >
            Cancelar
          </Button>
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={() => handleOpenKeypad(state.step)}
          disabled={state.isLoading}
          sx={{ ml: !required ? 1 : 0 }}
        >
          {state.isLoading ? <CircularProgress size={24} /> : 'Continuar'}
        </Button>
      </Box>
    </Box>
  );

  if (required) {
    return (
      <>
        <Dialog
          open={true}
          maxWidth="xs"
          fullWidth
          disableEscapeKeyDown
          onClose={(reason) => {
            if (reason !== "backdropClick") return;
          }}
        >
          <DialogTitle sx={{ textAlign: 'center' }}>
            <VpnKey sx={{ mr: 1, verticalAlign: 'middle' }} />
            Alteração de Senha Obrigatória
          </DialogTitle>

          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sua senha expirou ou é temporária. Por favor, defina uma nova senha para continuar.
            </Typography>

            {renderStepContent()}
          </DialogContent>
        </Dialog>

        <NumericKeypad
          open={state.isKeypadOpen}
          onClose={required ? undefined : handleCloseKeypad}
          onComplete={handlePasswordComplete}
          title={getKeypadTitle()}
          loading={state.isLoading}
          error={state.error}
          dialog={true}
        />

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
      </>
    );
  }

  return (
    <PasswordChangeContainer maxWidth="sm">
      <PasswordChangePaper elevation={3}>
        <PasswordChangeIcon>
          <VpnKey fontSize="large" />
        </PasswordChangeIcon>

        <Typography component="h1" variant="h5" gutterBottom>
          Alterar Senha
        </Typography>

        {renderStepContent()}
      </PasswordChangePaper>

      <NumericKeypad
        open={state.isKeypadOpen}
        onClose={handleCloseKeypad}
        onComplete={handlePasswordComplete}
        title={getKeypadTitle()}
        loading={state.isLoading}
        error={state.error}
        dialog={true}
      />

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
    </PasswordChangeContainer>
  );
};

export default NumericPasswordChange;
