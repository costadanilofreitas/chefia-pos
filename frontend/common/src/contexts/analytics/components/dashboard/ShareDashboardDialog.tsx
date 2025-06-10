import React, { useState } from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const ShareDashboardDialog = ({ open, onClose, onSubmit, dashboard }) => {
  const [shareType, setShareType] = useState('user');
  const [recipients, setRecipients] = useState('');
  const [permissions, setPermissions] = useState('view');
  const [expirationDays, setExpirationDays] = useState(0);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setShareType('user');
      setRecipients('');
      setPermissions('view');
      setExpirationDays(0);
      setMessage('');
      setErrors({});
    }
  }, [open]);

  // Handle form submission
  const handleSubmit = () => {
    // Validate form
    const newErrors = {};
    
    if (!recipients.trim()) {
      newErrors.recipients = 'Este campo é obrigatório';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Prepare data for submission
    const shareData = {
      type: shareType,
      recipients: shareType === 'user' 
        ? recipients.split(',').map(email => email.trim()) 
        : recipients,
      permissions,
      expiration_days: expirationDays > 0 ? expirationDays : null,
      message: message.trim() || null
    };
    
    onSubmit(shareData);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Compartilhar Dashboard
        <Button
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {dashboard?.name || 'Dashboard'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {dashboard?.description || 'Compartilhe este dashboard com outros usuários ou grupos.'}
          </Typography>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="share-type-label">Compartilhar com</InputLabel>
              <Select
                labelId="share-type-label"
                value={shareType}
                label="Compartilhar com"
                onChange={(e) => setShareType(e.target.value)}
              >
                <MenuItem value="user">Usuários (por e-mail)</MenuItem>
                <MenuItem value="role">Papel/Função</MenuItem>
                <MenuItem value="public">Público (qualquer pessoa com o link)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            {shareType === 'user' ? (
              <TextField
                fullWidth
                label="E-mails dos destinatários"
                placeholder="Digite os e-mails separados por vírgula"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                error={!!errors.recipients}
                helperText={errors.recipients || 'Digite os e-mails separados por vírgula'}
                required
              />
            ) : shareType === 'role' ? (
              <FormControl fullWidth error={!!errors.recipients} required>
                <InputLabel id="role-label">Papel/Função</InputLabel>
                <Select
                  labelId="role-label"
                  value={recipients}
                  label="Papel/Função"
                  onChange={(e) => setRecipients(e.target.value)}
                >
                  <MenuItem value="admin">Administradores</MenuItem>
                  <MenuItem value="manager">Gerentes</MenuItem>
                  <MenuItem value="analyst">Analistas</MenuItem>
                  <MenuItem value="operator">Operadores</MenuItem>
                </Select>
                {errors.recipients && (
                  <Typography variant="caption" color="error">
                    {errors.recipients}
                  </Typography>
                )}
              </FormControl>
            ) : (
              <Typography variant="body2">
                Qualquer pessoa com o link poderá acessar este dashboard.
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="permissions-label">Permissões</InputLabel>
              <Select
                labelId="permissions-label"
                value={permissions}
                label="Permissões"
                onChange={(e) => setPermissions(e.target.value)}
              >
                <MenuItem value="view">Visualizar</MenuItem>
                <MenuItem value="edit">Editar</MenuItem>
                <MenuItem value="admin">Administrar</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="expiration-label">Expiração</InputLabel>
              <Select
                labelId="expiration-label"
                value={expirationDays}
                label="Expiração"
                onChange={(e) => setExpirationDays(e.target.value)}
              >
                <MenuItem value={0}>Sem expiração</MenuItem>
                <MenuItem value={1}>1 dia</MenuItem>
                <MenuItem value={7}>7 dias</MenuItem>
                <MenuItem value={30}>30 dias</MenuItem>
                <MenuItem value={90}>90 dias</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Mensagem (opcional)"
              placeholder="Adicione uma mensagem para os destinatários"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              multiline
              rows={3}
            />
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Compartilhar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareDashboardDialog;
