import React from 'react';
import {
  Box, Typography, TextField, Button, FormControl, InputLabel, Select,
  MenuItem, FormHelperText, Grid, Paper, Divider, Chip
} from '@mui/material';
import { WhatsApp as WhatsAppIcon, Telegram as TelegramIcon } from '@mui/icons-material';

const MessagePreview = ({ message, onSendTest }) => {
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSendTest = async () => {
    if (!phoneNumber) {
      setError('Por favor, informe um número de telefone');
      return;
    }

    if (!phoneNumber.match(/^\+?[0-9]{10,15}$/)) {
      setError('Formato de telefone inválido. Use o formato +5511999999999');
      return;
    }

    setError('');
    setSending(true);
    
    try {
      await onSendTest(phoneNumber);
      setPhoneNumber('');
    } catch (err) {
      setError(`Erro ao enviar mensagem: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Paper 
        sx={{ 
          p: 2, 
          mb: 3, 
          backgroundColor: '#e5f7ff',
          borderRadius: '10px',
          position: 'relative',
          maxWidth: '80%',
          ml: 'auto',
          mr: 2,
          '&:after': {
            content: '""',
            position: 'absolute',
            right: '-10px',
            top: '15px',
            border: '10px solid transparent',
            borderLeft: '10px solid #e5f7ff',
          }
        }}
      >
        <Typography 
          variant="body1" 
          sx={{ 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {message}
        </Typography>
      </Paper>

      <Divider sx={{ my: 3 }}>
        <Chip 
          icon={<WhatsAppIcon />} 
          label="Enviar Teste" 
          color="primary" 
          variant="outlined" 
        />
      </Divider>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          label="Número de Telefone"
          placeholder="+5511999999999"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          error={!!error}
          helperText={error}
          fullWidth
          size="small"
        />
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSendTest}
          disabled={sending}
          startIcon={<WhatsAppIcon />}
        >
          {sending ? 'Enviando...' : 'Enviar'}
        </Button>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        * A mensagem será enviada como teste para o número informado. Certifique-se de que o número está correto e possui WhatsApp.
      </Typography>
    </Box>
  );
};

export default MessagePreview;
