import React, { useState, useEffect } from 'react';
import { 
  Box, TextField, Button, Typography, Paper, 
  Container, CircularProgress, Alert, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { LockOutlined, VpnKey } from '@mui/icons-material';
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

/**
 * Componente para alteração de senha numérica
 * 
 * @param {Object} props - Propriedades do componente
 * @param {string} props.operatorId - ID do operador
 * @param {function} props.onSuccess - Callback chamado quando a alteração for bem-sucedida
 * @param {function} props.onCancel - Callback chamado quando o usuário cancelar
 * @param {boolean} props.required - Se a alteração de senha é obrigatória
 */
const NumericPasswordChange = ({
  operatorId,
  onSuccess,
  onCancel,
  required = false
}) => {
  // Estados para controle do formulário
  const [step, setStep] = useState('current'); // 'current', 'new', 'confirm'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [keypadMode, setKeypadMode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Efeito para abrir automaticamente o teclado para senha atual
  useEffect(() => {
    if (required) {
      handleOpenKeypad('current');
    }
  }, [required]);
  
  // Manipulador para abrir o teclado numérico
  const handleOpenKeypad = (mode) => {
    setError(null);
    setKeypadMode(mode);
    setIsKeypadOpen(true);
  };
  
  // Manipulador para fechar o teclado numérico
  const handleCloseKeypad = () => {
    setIsKeypadOpen(false);
  };
  
  // Manipulador para processar a senha completa
  const handlePasswordComplete = (password) => {
    if (keypadMode === 'current') {
      setCurrentPassword(password);
      setIsKeypadOpen(false);
      // Avançar para próxima etapa após um breve delay
      setTimeout(() => {
        setStep('new');
        handleOpenKeypad('new');
      }, 300);
    } else if (keypadMode === 'new') {
      setNewPassword(password);
      setIsKeypadOpen(false);
      // Avançar para próxima etapa após um breve delay
      setTimeout(() => {
        setStep('confirm');
        handleOpenKeypad('confirm');
      }, 300);
    } else if (keypadMode === 'confirm') {
      setConfirmPassword(password);
      setIsKeypadOpen(false);
      // Verificar se as senhas coincidem
      if (password !== newPassword) {
        setError('As senhas não coincidem');
        // Voltar para etapa de nova senha
        setTimeout(() => {
          setStep('new');
          handleOpenKeypad('new');
        }, 1000);
        return;
      }
      
      // Enviar solicitação de alteração de senha
      handleSubmitPasswordChange();
    }
  };
  
  // Manipulador para enviar solicitação de alteração de senha
  const handleSubmitPasswordChange = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Em produção, substituir por chamada real à API
      const response = await fetch(`/api/auth/credentials/${operatorId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Erro ao alterar senha');
      }
      
      setSuccessMessage('Senha alterada com sucesso!');
      
      // Chamar callback de sucesso após um breve delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 1500);
    } catch (error) {
      setError(error.message || 'Erro ao alterar senha');
      
      // Se o erro for na senha atual, voltar para a primeira etapa
      if (error.message.includes('atual')) {
        setStep('current');
        setTimeout(() => {
          handleOpenKeypad('current');
        }, 1000);
      }
    } finally {
      setIsLoading(false);
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
    setSuccessMessage(null);
  };
  
  // Determinar título do teclado com base no modo
  const getKeypadTitle = () => {
    switch (keypadMode) {
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
  const renderStepContent = () => {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <Typography variant="body1" gutterBottom>
          {step === 'current' && 'Por favor, digite sua senha atual para continuar.'}
          {step === 'new' && 'Agora, digite sua nova senha de 6 dígitos.'}
          {step === 'confirm' && 'Por favor, confirme sua nova senha.'}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          {!required && (
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
          )}
          
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleOpenKeypad(step)}
            disabled={isLoading}
            sx={{ ml: !required ? 1 : 0 }}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Continuar'}
          </Button>
        </Box>
      </Box>
    );
  };
  
  // Se a alteração é obrigatória, renderizar como diálogo
  if (required) {
    return (
      <>
        <Dialog
          open={true}
          maxWidth="xs"
          fullWidth
          disableEscapeKeyDown
          disableBackdropClick
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
        
        {/* Teclado numérico em diálogo */}
        <NumericKeypad
          open={isKeypadOpen}
          onClose={required ? undefined : handleCloseKeypad}
          onComplete={handlePasswordComplete}
          title={getKeypadTitle()}
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
      </>
    );
  }
  
  // Renderização normal (não obrigatória)
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
      
      {/* Teclado numérico em diálogo */}
      <NumericKeypad
        open={isKeypadOpen}
        onClose={handleCloseKeypad}
        onComplete={handlePasswordComplete}
        title={getKeypadTitle()}
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
    </PasswordChangeContainer>
  );
};

export default NumericPasswordChange;
