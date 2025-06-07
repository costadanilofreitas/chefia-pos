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
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
  boxShadow: theme.shadows[3],
  maxWidth: '100%',
  margin: '0 auto',
  // Responsividade melhorada
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1),
    maxWidth: '280px',
  },
  [theme.breakpoints.up('sm')]: {
    maxWidth: '350px',
    padding: theme.spacing(2),
  },
  [theme.breakpoints.up('md')]: {
    maxWidth: '400px',
  }
}));

const KeypadButton = styled(Button)(({ theme }) => ({
  minWidth: '40px',
  minHeight: '40px',
  margin: theme.spacing(0.25),
  borderRadius: theme.shape.borderRadius,
  fontSize: '1rem',
  fontWeight: 'bold',
  transition: 'all 0.2s ease-in-out',
  flex: 1,
  // Responsividade melhorada para diferentes tamanhos de tela
  [theme.breakpoints.down('sm')]: {
    minWidth: '36px',
    minHeight: '36px',
    margin: theme.spacing(0.2),
    fontSize: '0.9rem',
  },
  [theme.breakpoints.up('sm')]: {
    minWidth: '48px',
    minHeight: '48px',
    margin: theme.spacing(0.3),
    fontSize: '1.1rem',
  },
  [theme.breakpoints.up('md')]: {
    minWidth: '56px',
    minHeight: '56px',
    margin: theme.spacing(0.4),
    fontSize: '1.3rem',
  },
  '&:active': {
    transform: 'scale(0.95)',
    backgroundColor: theme.palette.action.selected
  }
}));

// Container responsivo para o grid de botões
const KeypadGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: theme.spacing(0.5),
  width: '100%',
  maxWidth: '100%',
  [theme.breakpoints.down('sm')]: {
    gap: theme.spacing(0.3),
  },
  [theme.breakpoints.up('md')]: {
    gap: theme.spacing(0.8),
  }
}));

// Container para o display de valor
const DisplayContainer = styled(Box)(({ theme }) => ({
  minHeight: '60px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(2),
  padding: theme.spacing(1),
  backgroundColor: theme.palette.grey[50],
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  [theme.breakpoints.down('sm')]: {
    minHeight: '50px',
    marginBottom: theme.spacing(1.5),
    padding: theme.spacing(0.8),
  }
}));

interface PasswordDotProps {
  filled: boolean;
}

const PasswordDot = styled(Box)<PasswordDotProps>(({ theme, filled }) => ({
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  backgroundColor: filled ? theme.palette.primary.main : 'transparent',
  border: `2px solid ${theme.palette.primary.main}`,
  margin: '0 3px',
  transition: 'all 0.2s ease-in-out',
  [theme.breakpoints.up('sm')]: {
    width: '12px',
    height: '12px',
    margin: '0 4px',
  },
  [theme.breakpoints.up('md')]: {
    width: '14px',
    height: '14px',
    margin: '0 6px',
  }
}));

// Dialog responsivo
const ResponsiveDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    margin: theme.spacing(1),
    maxHeight: 'calc(100vh - 16px)',
    width: 'calc(100vw - 16px)',
    maxWidth: '450px',
    [theme.breakpoints.down('sm')]: {
      margin: theme.spacing(0.5),
      maxHeight: 'calc(100vh - 8px)',
      width: 'calc(100vw - 8px)',
      maxWidth: '320px',
    }
  },
  '& .MuiDialogContent-root': {
    padding: theme.spacing(1),
    [theme.breakpoints.up('sm')]: {
      padding: theme.spacing(2),
    }
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
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
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
        <DisplayContainer>
          <Typography 
            variant={isMobile ? "h6" : "h5"} 
            color="textSecondary"
            sx={{ fontWeight: 'normal' }}
          >
            {placeholder}
          </Typography>
        </DisplayContainer>
      );
    }

    if (onValueChange) {
      // Modo valor monetário
      return (
        <DisplayContainer>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            color="primary"
            sx={{ 
              fontWeight: 'bold',
              fontFamily: 'monospace',
              fontSize: isMobile ? '1.5rem' : '2rem'
            }}
          >
            R$ {currentValue || '0.00'}
          </Typography>
        </DisplayContainer>
      );
    } else {
      // Modo senha (pontos)
      return (
        <DisplayContainer>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {Array.from({ length: effectiveLength }).map((_, index) => (
              <PasswordDot key={index} filled={index < currentValue.length} />
            ))}
          </Box>
        </DisplayContainer>
      );
    }
  };

  // Renderizar teclado numérico
  const renderKeypad = () => (
    <KeypadContainer
      sx={{
        transform: shake ? 'translateX(-5px)' : 'none',
        transition: 'transform 0.1s ease-in-out'
      }}
    >
      {renderDisplay()}
      
      <KeypadGrid>
        {/* Primeira linha */}
        <KeypadButton
          variant="outlined"
          onClick={() => handleAddDigit('1')}
          disabled={loading}
        >
          1
        </KeypadButton>
        <KeypadButton
          variant="outlined"
          onClick={() => handleAddDigit('2')}
          disabled={loading}
        >
          2
        </KeypadButton>
        <KeypadButton
          variant="outlined"
          onClick={() => handleAddDigit('3')}
          disabled={loading}
        >
          3
        </KeypadButton>

        {/* Segunda linha */}
        <KeypadButton
          variant="outlined"
          onClick={() => handleAddDigit('4')}
          disabled={loading}
        >
          4
        </KeypadButton>
        <KeypadButton
          variant="outlined"
          onClick={() => handleAddDigit('5')}
          disabled={loading}
        >
          5
        </KeypadButton>
        <KeypadButton
          variant="outlined"
          onClick={() => handleAddDigit('6')}
          disabled={loading}
        >
          6
        </KeypadButton>

        {/* Terceira linha */}
        <KeypadButton
          variant="outlined"
          onClick={() => handleAddDigit('7')}
          disabled={loading}
        >
          7
        </KeypadButton>
        <KeypadButton
          variant="outlined"
          onClick={() => handleAddDigit('8')}
          disabled={loading}
        >
          8
        </KeypadButton>
        <KeypadButton
          variant="outlined"
          onClick={() => handleAddDigit('9')}
          disabled={loading}
        >
          9
        </KeypadButton>

        {/* Quarta linha */}
        <KeypadButton
          variant="outlined"
          color="error"
          onClick={handleClear}
          disabled={loading}
          sx={{ fontSize: isMobile ? '0.8rem' : '1rem' }}
        >
          C
        </KeypadButton>
        <KeypadButton
          variant="outlined"
          onClick={() => handleAddDigit('0')}
          disabled={loading}
        >
          0
        </KeypadButton>
        <KeypadButton
          variant="outlined"
          color="warning"
          onClick={handleBackspace}
          disabled={loading}
          sx={{ 
            minWidth: isMobile ? '36px' : '48px',
            padding: isMobile ? '8px' : '12px'
          }}
        >
          <Backspace sx={{ fontSize: isMobile ? '1rem' : '1.2rem' }} />
        </KeypadButton>
      </KeypadGrid>

      {loading && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          mt: 2,
          alignItems: 'center',
          gap: 1
        }}>
          <CircularProgress size={isMobile ? 20 : 24} />
          <Typography variant="body2" color="textSecondary">
            Processando...
          </Typography>
        </Box>
      )}
    </KeypadContainer>
  );

  // Se for um diálogo, renderizar dentro do Dialog
  if (dialog) {
    return (
      <ResponsiveDialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={loading}
      >
        <DialogTitle sx={{ 
          textAlign: 'center',
          pb: 1,
          fontSize: isMobile ? '1.1rem' : '1.25rem'
        }}>
          {title}
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2,
                fontSize: isMobile ? '0.8rem' : '0.875rem'
              }}
            >
              {error}
            </Alert>
          )}
          {renderKeypad()}
        </DialogContent>
        {onClose && (
          <DialogActions sx={{ 
            justifyContent: 'center',
            pt: 0,
            pb: 2
          }}>
            <Button 
              onClick={onClose} 
              disabled={loading}
              variant="outlined"
              size={isMobile ? "small" : "medium"}
            >
              Cancelar
            </Button>
          </DialogActions>
        )}
      </ResponsiveDialog>
    );
  }

  // Renderizar diretamente se não for um diálogo
  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: '100%',
      display: 'flex',
      justifyContent: 'center',
      p: 1
    }}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2,
            width: '100%',
            maxWidth: '400px'
          }}
        >
          {error}
        </Alert>
      )}
      {renderKeypad()}
    </Box>
  );
};

export default NumericKeypad;

