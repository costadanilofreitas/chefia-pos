// src/components/TerminalValidator.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import { Error as ErrorIcon } from '@mui/icons-material';
import ConfigService from '../services/ConfigService';

interface TerminalValidatorProps {
  children: React.ReactNode;
}

export const TerminalValidator: React.FC<TerminalValidatorProps> = ({ children }) => {
  const { terminalId } = useParams<{ terminalId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [availableTerminals, setAvailableTerminals] = useState<string[]>([]);
  const configService = ConfigService.getInstance();

  useEffect(() => {
    const validateTerminal = async () => {
      if (!terminalId) {
        setIsLoading(false);
        return;
      }

      try {
        // Carregar terminais disponíveis
        const terminals = await configService.loadAvailableTerminals();
        setAvailableTerminals(terminals);

        // Verificar se o terminal é válido
        const valid = await configService.isValidTerminal(terminalId);
        setIsValid(valid);

        // Se válido, carregar configuração
        if (valid) {
          await configService.loadTerminalConfig(terminalId);
        }
      } catch (error) {
        console.error('Erro ao validar terminal:', error);
        setIsValid(false);
      } finally {
        setIsLoading(false);
      }
    };

    validateTerminal();
  }, [terminalId, configService]);

  // Loading state
  if (isLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        sx={{ p: 4 }}
      >
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Validando terminal {terminalId}...
        </Typography>
      </Box>
    );
  }

  // Redirect if no terminal ID
  if (!terminalId) {
    return <Navigate to="/pos/1" replace />;
  }

  // Invalid terminal
  if (!isValid) {
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
            <strong>Terminais disponíveis:</strong> {availableTerminals.length > 0 ? availableTerminals.join(', ') : 'Nenhum'}
          </Typography>
        </Alert>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          {availableTerminals.length > 0 && (
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => window.location.href = `/pos/${availableTerminals[0]}`}
            >
              Ir para Terminal {availableTerminals[0]}
            </Button>
          )}
          
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

