import React from 'react';
import { Box, Button, Grid, Typography } from '@mui/material';
import { Backspace } from '@mui/icons-material';

interface NumericKeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  disabled?: boolean;
}

const NumericKeyboard: React.FC<NumericKeyboardProps> = ({
  onKeyPress,
  onBackspace,
  onClear,
  disabled = false
}) => {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['C', '0', '⌫']
  ];

  const handleKeyClick = (key: string) => {
    if (disabled) return;
    
    if (key === 'C') {
      onClear();
    } else if (key === '⌫') {
      onBackspace();
    } else {
      onKeyPress(key);
    }
  };

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: 300, 
      mx: 'auto',
      mt: 2,
      p: 2,
      border: '1px solid #e0e0e0',
      borderRadius: 2,
      backgroundColor: '#f9f9f9'
    }}>
      <Typography 
        variant="subtitle2" 
        sx={{ 
          textAlign: 'center', 
          mb: 2, 
          color: '#666',
          fontWeight: 'bold'
        }}
      >
        Teclado Numérico
      </Typography>
      
      <Grid container spacing={1}>
        {keys.map((row, rowIndex) => (
          row.map((key, keyIndex) => (
            <Grid item xs={4} key={`${rowIndex}-${keyIndex}`}>
              <Button
                variant={key === 'C' ? 'outlined' : key === '⌫' ? 'outlined' : 'contained'}
                color={key === 'C' ? 'error' : key === '⌫' ? 'warning' : 'primary'}
                fullWidth
                size="large"
                disabled={disabled}
                onClick={() => handleKeyClick(key)}
                sx={{
                  height: 60,
                  fontSize: key === '⌫' ? '1.2rem' : '1.5rem',
                  fontWeight: 'bold',
                  minWidth: 0,
                  '&:hover': {
                    transform: 'scale(1.05)',
                    transition: 'transform 0.1s ease-in-out'
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                    transition: 'transform 0.05s ease-in-out'
                  }
                }}
              >
                {key === '⌫' ? <Backspace /> : key}
              </Button>
            </Grid>
          ))
        ))}
      </Grid>
      
      <Typography 
        variant="caption" 
        sx={{ 
          display: 'block',
          textAlign: 'center', 
          mt: 1, 
          color: '#999'
        }}
      >
        C = Limpar | ⌫ = Apagar
      </Typography>
    </Box>
  );
};

export default NumericKeyboard;

