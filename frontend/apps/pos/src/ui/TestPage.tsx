import React from 'react';
import { Box, Typography, Button } from '@mui/material';

const TestPage: React.FC = () => {
  console.log('🧪 TestPage rendered');

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 2,
        backgroundColor: '#f5f5f5'
      }}
    >
      <Typography variant="h4" gutterBottom>
        🧪 Página de Teste
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 2 }}>
        Esta é uma página de teste simples para diagnosticar problemas de loop.
      </Typography>
      
      <Button 
        variant="contained" 
        color="primary"
        onClick={() => console.log('🔘 Botão clicado!')}
      >
        Testar Clique
      </Button>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption">
          Timestamp: {new Date().toLocaleTimeString()}
        </Typography>
      </Box>
    </Box>
  );
};

export default TestPage;

