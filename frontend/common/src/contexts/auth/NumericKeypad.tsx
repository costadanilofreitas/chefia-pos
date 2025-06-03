import React, { useState, useEffect } from 'react';
import { 
  Box, Grid, Button, Typography, Paper, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Fade, Alert
} from '@mui/material';
import { Backspace, LockOpen } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Estilos para o teclado numérico
const KeypadContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
  boxShadow: theme.shadows[3],
  maxWidth: '400px',
  margin: '0 auto'
}));

const KeypadButton = styled(Button)(({ theme }) => ({
  minWidth: '64px',
  minHeight: '64px',
  margin: theme.spacing(0.5),
  borderRadius: theme.shape.borderRadius,
  fontSize: '1.5rem',
  fontWeight: 'bold',
  transition: 'all 0.2s ease-in-out',
  '&:active': {
    transform: 'scale(0.95)',
    backgroundColor: theme.palette.action.selected
  }
}));

const PasswordDot = styled(Box)(({ theme, filled }) => ({
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  backgroundColor: filled ? theme.palette.primary.main : 'transparent',
  border: `2px solid ${theme.palette.primary.main}`,
  margin: '0 8px',
  transition: 'all 0.2s ease-in-out'
}));

/**
 * Componente de teclado numérico para entrada de senha
 * 
 * @param {Object} props - Propriedades do componente
 * @param {number} props.length - Comprimento da senha (padrão: 6)
 * @param {function} props.onComplete - Callback chamado quando a senha estiver completa
 * @param {boolean} props.open - Se o teclado está visível em modo de diálogo
 * @param {function} props.onClose - Callback para fechar o diálogo
 * @param {string} props.title - Título do diálogo
 * @param {boolean} props.loading - Se está carregando
 * @param {string} props.error - Mensagem de erro
 * @param {boolean} props.dialog - Se deve ser renderizado como diálogo
 */
const NumericKeypad = ({
  length = 6,
  onComplete,
  open = true,
  onClose,
  title = "Digite sua senha",
  loading = false,
  error = null,
  dialog = true
}) => {
  // Estado para armazenar a senha digitada
  const [password, setPassword] = useState('');
  
  // Estado para animação de erro
  const [shake, setShake] = useState(false);
  
  // Efeito para verificar se a senha está completa
  useEffect(() => {
    if (password.length === length && onComplete) {
      onComplete(password);
    }
  }, [password, length, onComplete]);
  
  // Efeito para limpar senha quando o diálogo é aberto
  useEffect(() => {
    if (open) {
      setPassword('');
    }
  }, [open]);
  
  // Efeito para animação de erro
  useEffect(() => {
    if (error) {
      setShake(true);
      setPassword('');
      const timer = setTimeout(() => {
        setShake(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [error]);
  
  // Manipulador para adicionar dígito
  const handleAddDigit = (digit) => {
    if (password.length < length && !loading) {
      setPassword(prev => prev + digit);
    }
  };
  
  // Manipulador para remover último dígito
  const handleBackspace = () => {
    if (password.length > 0 && !loading) {
      setPassword(prev => prev.slice(0, -1));
    }
  };
  
  // Manipulador para limpar senha
  const handleClear = () => {
    if (!loading) {
      setPassword('');
    }
  };
  
  // Renderizar indicadores de senha
  const renderPasswordDots = () => {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          my: 2,
          animation: shake ? 'shake 0.5s' : 'none',
          '@keyframes shake': {
            '0%, 100%': { transform: 'translateX(0)' },
            '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
            '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' }
          }
        }}
      >
        {Array.from({ length }).map((_, index) => (
          <PasswordDot key={index} filled={index < password.length} />
        ))}
      </Box>
    );
  };
  
  // Renderizar teclado numérico
  const renderKeypad = () => {
    // Definir layout do teclado
    const keypadLayout = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['clear', '0', 'backspace']
    ];
    
    return (
      <Box>
        {keypadLayout.map((row, rowIndex) => (
          <Box key={rowIndex} sx={{ display: 'flex', justifyContent: 'center' }}>
            {row.map((key) => {
              if (key === 'backspace') {
                return (
                  <KeypadButton
                    key={key}
                    variant="outlined"
                    onClick={handleBackspace}
                    disabled={loading}
                  >
                    <Backspace />
                  </KeypadButton>
                );
              } else if (key === 'clear') {
                return (
                  <KeypadButton
                    key={key}
                    variant="outlined"
                    onClick={handleClear}
                    disabled={loading}
                  >
                    C
                  </KeypadButton>
                );
              } else {
                return (
                  <KeypadButton
                    key={key}
                    variant="outlined"
                    onClick={() => handleAddDigit(key)}
                    disabled={loading}
                  >
                    {key}
                  </KeypadButton>
                );
              }
            })}
          </Box>
        ))}
      </Box>
    );
  };
  
  // Conteúdo principal do teclado
  const keypadContent = (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" align="center" gutterBottom>
        {title}
      </Typography>
      
      {renderPasswordDots()}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {renderKeypad()}
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
    </Box>
  );
  
  // Renderizar como diálogo ou componente normal
  if (dialog) {
    return (
      <Dialog 
        open={open} 
        onClose={loading ? undefined : onClose}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center' }}>
          <LockOpen sx={{ mr: 1, verticalAlign: 'middle' }} />
          {title}
        </DialogTitle>
        
        <DialogContent>
          {renderPasswordDots()}
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {renderKeypad()}
        </DialogContent>
        
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            <Button onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  }
  
  return (
    <KeypadContainer>
      {keypadContent}
    </KeypadContainer>
  );
};

export default NumericKeypad;
