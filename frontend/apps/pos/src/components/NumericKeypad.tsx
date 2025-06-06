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
  Alert,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Backspace, LockOpen } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Estilos para o teclado numérico
const KeypadContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
  boxShadow: theme.shadows[3],
  maxWidth: '100%',
  margin: '0 auto',
  [theme.breakpoints.up('sm')]: {
    maxWidth: '400px',
  }
}));

const KeypadButton = styled(Button)(({ theme }) => ({
  minWidth: '48px',
  minHeight: '48px',
  margin: theme.spacing(0.25),
  borderRadius: theme.shape.borderRadius,
  fontSize: '1.2rem',
  fontWeight: 'bold',
  transition: 'all 0.2s ease-in-out',
  flex: 1,
  [theme.breakpoints.up('sm')]: {
    minWidth: '64px',
    minHeight: '64px',
    margin: theme.spacing(0.5),
    fontSize: '1.5rem',
  },
  '&:active': {
    transform: 'scale(0.95)',
    backgroundColor: theme.palette.action.selected
  }
}));

interface PasswordDotProps {
  filled: boolean;
}

const PasswordDot = styled(Box)<PasswordDotProps>(({ theme, filled }) => ({
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  backgroundColor: filled ? theme.palette.primary.main : 'transparent',
  border: `2px solid ${theme.palette.primary.main}`,
  margin: '0 4px',
  transition: 'all 0.2s ease-in-out',
  [theme.breakpoints.up('sm')]: {
    width: '16px',
    height: '16px',
    margin: '0 8px',
  }
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
  dialog = false,
  onValueChange,
  value: externalValue,
  maxLength,
  placeholder
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
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
      // Para valores monetários, adicionar ponto decimal automaticamente
      if (onValueChange && digit !== '.') {
        const newValue = currentValue + digit;
        // Formatar como valor monetário se necessário
        if (newValue.length <= 2) {
          setValue('0.' + newValue.padStart(2, '0'));
        } else {
          const integerPart = newValue.slice(0, -2);
          const decimalPart = newValue.slice(-2);
          setValue(integerPart + '.' + decimalPart);
        }
      } else {
        setValue(currentValue + digit);
      }
    }
  };

  // Manipulador para remover último dígito
  const handleBackspace = () => {
    if (currentValue.length > 0 && !loading) {
      if (onValueChange) {
        // Para valores monetários, remover formatação
        const cleanValue = currentValue.replace('.', '');
        if (cleanValue.length <= 1) {
          setValue('0.00');
        } else {
          const newCleanValue = cleanValue.slice(0, -1);
          if (newCleanValue.length <= 2) {
            setValue('0.' + newCleanValue.padStart(2, '0'));
          } else {
            const integerPart = newCleanValue.slice(0, -2);
            const decimalPart = newCleanValue.slice(-2);
            setValue(integerPart + '.' + decimalPart);
          }
        }
      } else {
        setValue(currentValue.slice(0, -1));
      }
    }
  };

  // Manipulador para limpar valor
  const handleClear = () => {
    if (!loading) {
      setValue(onValueChange ? '0.00' : '');
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
          minHeight: isMobile ? '32px' : '40px',
          alignItems: 'center'
        }}>
          <Typography variant={isMobile ? "body1" : "h6"} color="text.secondary">
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
          minHeight: isMobile ? '32px' : '40px',
          alignItems: 'center',
          animation: shake ? 'shake 0.5s' : 'none',
          '@keyframes shake': {
            '0%, 100%': { transform: 'translateX(0)' },
            '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
            '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' }
          }
        }}>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            fontFamily="monospace"
            sx={{ 
              fontSize: isMobile ? '1.5rem' : '2rem',
              wordBreak: 'break-all'
            }}
          >
            {currentValue || '0.00'}
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
        flexWrap: 'wrap',
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
      <Box sx={{ width: '100%' }}>
        {keypadLayout.map((row, rowIndex) => (
          <Box 
            key={rowIndex} 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              gap: 0.5,
              mb: 0.5
            }}
          >
            {row.map((key) => {
              if (key === 'backspace') {
                return (
                  <KeypadButton
                    key={key}
                    variant="outlined"
                    onClick={handleBackspace}
                    disabled={loading}
                    sx={{ maxWidth: isMobile ? '80px' : '100px' }}
                  >
                    <Backspace sx={{ fontSize: isMobile ? '1rem' : '1.5rem' }} />
                  </KeypadButton>
                );
              } else if (key === 'clear') {
                return (
                  <KeypadButton
                    key={key}
                    variant="outlined"
                    onClick={handleClear}
                    disabled={loading}
                    sx={{ maxWidth: isMobile ? '80px' : '100px' }}
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
                    sx={{ maxWidth: isMobile ? '80px' : '100px' }}
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
      <Typography 
        variant={isMobile ? "subtitle1" : "h6"} 
        align="center" 
        gutterBottom
        sx={{ fontSize: isMobile ? '1rem' : '1.25rem' }}
      >
        {title}
      </Typography>
      {renderDisplay()}
      {error && (
        <Alert severity="error" sx={{ mb: 2, fontSize: isMobile ? '0.875rem' : '1rem' }}>
          {error}
        </Alert>
      )}
      {renderKeypad()}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={isMobile ? 20 : 24} />
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
        PaperProps={{
          sx: {
            m: isMobile ? 1 : 3,
            maxHeight: isMobile ? '90vh' : 'auto'
          }
        }}
      >
        <DialogTitle sx={{ 
          textAlign: 'center',
          pb: 1,
          fontSize: isMobile ? '1.1rem' : '1.25rem'
        }}>
          <LockOpen sx={{ mr: 1, verticalAlign: 'middle' }} />
          {title}
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          {renderDisplay()}
          {error && (
            <Alert severity="error" sx={{ mb: 2, fontSize: isMobile ? '0.875rem' : '1rem' }}>
              {error}
            </Alert>
          )}
          {renderKeypad()}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          {loading ? (
            <CircularProgress size={isMobile ? 20 : 24} />
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
    <KeypadContainer sx={{ 
      maxWidth: '100%',
      overflow: 'hidden'
    }}>
      {keypadContent}
    </KeypadContainer>
  );
};

export default NumericKeypad;

