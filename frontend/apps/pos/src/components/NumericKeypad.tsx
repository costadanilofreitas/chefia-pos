// src/components/NumericKeypad.tsx
// Cópia local do NumericKeypad do @common para evitar dependência
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert
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

interface PasswordDotProps {
  filled: boolean;
}

const PasswordDot = styled(Box)<PasswordDotProps>(({ theme, filled }) => ({
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  backgroundColor: filled ? theme.palette.primary.main : 'transparent',
  border: `2px solid ${theme.palette.primary.main}`,
  margin: '0 8px',
  transition: 'all 0.2s ease-in-out'
}));

interface NumericKeypadProps {
  length?: number;
  onComplete?: (password: string) => void;
  open?: boolean;
  onClose?: () => void;
  title?: string;
  loading?: boolean;
  error?: string | null;
  dialog?: boolean;
  // Propriedades adicionais para compatibilidade com CashierKeypad
  onValueChange?: (value: string) => void;
  value?: string;
  maxLength?: number;
  placeholder?: string;
}

const NumericKeypad: React.FC<NumericKeypadProps> = ({
  length = 6,
  onComplete,
  open = true,
  onClose,
  title = "Digite o valor",
  loading = false,
  error = null,
  dialog = false, // Mudado para false por padrão para compatibilidade
  onValueChange,
  value: externalValue,
  maxLength,
  placeholder
}) => {
  // Estado para armazenar o valor digitado
  const [internalValue, setInternalValue] = useState('');
  const [shake, setShake] = useState(false);

  // Usar valor externo se fornecido, senão usar interno
  const currentValue = externalValue !== undefined ? externalValue : internalValue;
  const setValue = externalValue !== undefined ? 
    (val: string) => onValueChange?.(val) : 
    setInternalValue;

  const effectiveLength = maxLength || length;

  // Efeito para verificar se o valor está completo
  useEffect(() => {
    if (currentValue.length === effectiveLength && onComplete) {
      onComplete(currentValue);
    }
  }, [currentValue, effectiveLength, onComplete]);

  // Efeito para limpar valor quando o diálogo é aberto
  useEffect(() => {
    if (open && dialog) {
      setValue('');
    }
  }, [open, dialog]);

  // Efeito para animação de erro
  useEffect(() => {
    if (error) {
      setShake(true);
      setValue('');
      const timer = setTimeout(() => {
        setShake(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Manipulador para adicionar dígito
  const handleAddDigit = (digit: string) => {
    if (currentValue.length < effectiveLength && !loading) {
      setValue(currentValue + digit);
    }
  };

  // Manipulador para remover último dígito
  const handleBackspace = () => {
    if (currentValue.length > 0 && !loading) {
      setValue(currentValue.slice(0, -1));
    }
  };

  // Manipulador para limpar valor
  const handleClear = () => {
    if (!loading) {
      setValue('');
    }
  };

  // Renderizar indicadores de valor (para modo senha) ou display (para modo valor)
  const renderDisplay = () => {
    if (placeholder && currentValue.length === 0) {
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          my: 2,
          minHeight: '40px',
          alignItems: 'center'
        }}>
          <Typography variant="h6" color="text.secondary">
            {placeholder}
          </Typography>
        </Box>
      );
    }

    // Se tem onValueChange, mostrar o valor como texto (modo calculadora)
    if (onValueChange) {
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          my: 2,
          minHeight: '40px',
          alignItems: 'center',
          animation: shake ? 'shake 0.5s' : 'none',
          '@keyframes shake': {
            '0%, 100%': { transform: 'translateX(0)' },
            '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
            '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' }
          }
        }}>
          <Typography variant="h4" fontFamily="monospace">
            {currentValue || '0'}
          </Typography>
        </Box>
      );
    }

    // Modo senha - mostrar pontos
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        my: 2,
        animation: shake ? 'shake 0.5s' : 'none',
        '@keyframes shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' }
        }
      }}>
        {Array.from({ length: effectiveLength }).map((_, index) => (
          <PasswordDot key={index} filled={index < currentValue.length} />
        ))}
      </Box>
    );
  };

  // Renderizar teclado numérico
  const renderKeypad = () => {
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
      {renderDisplay()}
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
          {renderDisplay()}
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

