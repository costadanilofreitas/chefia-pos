import React, { useState } from 'react';
import { Box, Button, Grid } from '@mui/material';

interface CashierKeypadProps {
  onInput: (value: string) => void;
  initialValue?: string;
}

const CashierKeypad: React.FC<CashierKeypadProps> = ({ onInput, initialValue = '' }) => {
  const [inputValue, setInputValue] = useState(initialValue);

  const handleButtonClick = (value: string) => {
    const newValue = inputValue + value;
    setInputValue(newValue);
    onInput(newValue);
  };

  const handleClear = () => {
    setInputValue('');
    onInput('');
  };

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Grid container spacing={1}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((num) => (
          <Grid item xs={4} key={num}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => handleButtonClick(num)}
              sx={{ fontSize: '1.5rem', padding: '10px' }}
            >
              {num}
            </Button>
          </Grid>
        ))}
        <Grid item xs={6}>
          <Button
            variant="outlined"
            fullWidth
            onClick={handleClear}
            sx={{ fontSize: '1rem', padding: '10px' }}
          >
            Limpar
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CashierKeypad;
