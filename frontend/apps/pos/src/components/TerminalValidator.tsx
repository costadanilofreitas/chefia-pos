// src/components/TerminalValidator.tsx
import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Box, Typography, Button, Alert } from '@mui/material';
import { Error as ErrorIcon } from '@mui/icons-material';

interface TerminalValidatorProps {
  children: React.ReactNode;
}

export const TerminalValidator: React.FC<TerminalValidatorProps> = ({ children }) => {
  const { terminalId } = useParams<{ terminalId: string }>();

  // Lista de terminais válidos (pode ser carregada de uma API ou config)
  const validTerminals = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

  // Verificar se o terminal é válido
  if (!terminalId) {
    return <Navigate to="/pos/1" replace />;
  }

  if (!validTerminals.includes(terminalId)) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        sx={{ p: 4, textAlign: 'center' }}
      >
        <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
        
        <Typography variant="h4" gutterBottom color="error">
          Terminal Não Encontrado
        </Typography>
        
        <Typography variant="h6" color="textSecondary" paragraph>
          O terminal {terminalId} não existe ou não está configurado.
        </Typography>
        
        <Alert severity="error" sx={{ mb: 3, maxWidth: 500 }}>
          <Typography variant="body2">
            <strong>Terminal solicitado:</strong> {terminalId}<br />
            <strong>Terminais disponíveis:</strong> {validTerminals.join(', ')}
          </Typography>
        </Alert>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => window.location.href = '/pos/1'}
          >
            Ir para Terminal 1
          </Button>
          
          <Button 
            variant="outlined" 
            color="secondary"
            onClick={() => window.history.back()}
          >
            Voltar
          </Button>
        </Box>
        
        <Typography variant="body2" color="textSecondary" sx={{ mt: 4 }}>
          Se você acredita que este terminal deveria existir, entre em contato com o administrador do sistema.
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
};

export default TerminalValidator;

