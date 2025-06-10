import React, { useState } from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel } from '@mui/material';
import { Close as CloseIcon, Notifications as NotificationsIcon } from '@mui/icons-material';

const AlertsDialog = ({ open, onClose, onSubmit, dashboard }) => {
  const [alertType, setAlertType] = useState('threshold');
  const [metric, setMetric] = useState('');
  const [operator, setOperator] = useState('gt');
  const [threshold, setThreshold] = useState('');
  const [frequency, setFrequency] = useState('realtime');
  const [notificationChannels, setNotificationChannels] = useState(['email']);
  const [isActive, setIsActive] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setAlertType('threshold');
      setMetric('');
      setOperator('gt');
      setThreshold('');
      setFrequency('realtime');
      setNotificationChannels(['email']);
      setIsActive(true);
      setName('');
      setDescription('');
      setErrors({});
    }
  }, [open]);

  // Handle form submission
  const handleSubmit = () => {
    // Validate form
    const newErrors = {};
    
    if (!name.trim()) {
      newErrors.name = 'Este campo é obrigatório';
    }
    
    if (!metric) {
      newErrors.metric = 'Este campo é obrigatório';
    }
    
    if (!threshold.trim() || isNaN(parseFloat(threshold))) {
      newErrors.threshold = 'Digite um valor numérico válido';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Prepare data for submission
    const alertData = {
      name: name.trim(),
      description: description.trim() || null,
      type: alertType,
      metric,
      condition: {
        operator,
        value: parseFloat(threshold)
      },
      frequency,
      notification_channels: notificationChannels,
      is_active: isActive
    };
    
    onSubmit(alertData);
  };

  // Handle notification channel toggle
  const handleChannelToggle = (channel) => {
    if (notificationChannels.includes(channel)) {
      setNotificationChannels(notificationChannels.filter(c => c !== channel));
    } else {
      setNotificationChannels([...notificationChannels, channel]);
    }
  };

  // Get available metrics based on dashboard
  const getAvailableMetrics = () => {
    if (!dashboard || !dashboard.items) return [];
    
    const metrics = [];
    
    dashboard.items.forEach(item => {
      if (item.chart_configuration && item.chart_configuration.measures) {
        item.chart_configuration.measures.forEach(measure => {
          if (!metrics.some(m => m.id === measure)) {
            metrics.push({
              id: measure,
              name: item.chart_configuration.labels?.[measure] || measure,
              source: item.name
            });
          }
        });
      }
    });
    
    return metrics;
  };

  const availableMetrics = getAvailableMetrics();

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Configurar Alertas
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
            Configure alertas para ser notificado quando métricas importantes atingirem valores específicos.
          </Typography>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nome do Alerta"
              placeholder="Ex: Vendas abaixo da meta"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!!errors.name}
              helperText={errors.name || ''}
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Descrição (opcional)"
              placeholder="Descreva o propósito deste alerta"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="alert-type-label">Tipo de Alerta</InputLabel>
              <Select
                labelId="alert-type-label"
                value={alertType}
                label="Tipo de Alerta"
                onChange={(e) => setAlertType(e.target.value)}
              >
                <MenuItem value="threshold">Limite (threshold)</MenuItem>
                <MenuItem value="anomaly">Anomalia</MenuItem>
                <MenuItem value="trend">Tendência</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.metric} required>
              <InputLabel id="metric-label">Métrica</InputLabel>
              <Select
                labelId="metric-label"
                value={metric}
                label="Métrica"
                onChange={(e) => setMetric(e.target.value)}
              >
                {availableMetrics.map(m => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name} ({m.source})
                  </MenuItem>
                ))}
              </Select>
              {errors.metric && (
                <Typography variant="caption" color="error">
                  {errors.metric}
                </Typography>
              )}
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="operator-label">Operador</InputLabel>
              <Select
                labelId="operator-label"
                value={operator}
                label="Operador"
                onChange={(e) => setOperator(e.target.value)}
              >
                <MenuItem value="gt">Maior que (&gt;)</MenuItem>
                <MenuItem value="gte">Maior ou igual a (&gt;=)</MenuItem>
                <MenuItem value="lt">Menor que (&lt;)</MenuItem>
                <MenuItem value="lte">Menor ou igual a (&lt;=)</MenuItem>
                <MenuItem value="eq">Igual a (=)</MenuItem>
                <MenuItem value="neq">Diferente de (!=)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Valor Limite"
              placeholder="Ex: 1000"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              error={!!errors.threshold}
              helperText={errors.threshold || ''}
              required
              type="number"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="frequency-label">Frequência</InputLabel>
              <Select
                labelId="frequency-label"
                value={frequency}
                label="Frequência"
                onChange={(e) => setFrequency(e.target.value)}
              >
                <MenuItem value="realtime">Tempo real</MenuItem>
                <MenuItem value="hourly">A cada hora</MenuItem>
                <MenuItem value="daily">Diariamente</MenuItem>
                <MenuItem value="weekly">Semanalmente</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Canais de Notificação
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationChannels.includes('email')}
                      onChange={() => handleChannelToggle('email')}
                    />
                  }
                  label="E-mail"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationChannels.includes('sms')}
                      onChange={() => handleChannelToggle('sms')}
                    />
                  }
                  label="SMS"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationChannels.includes('push')}
                      onChange={() => handleChannelToggle('push')}
                    />
                  }
                  label="Push"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationChannels.includes('webhook')}
                      onChange={() => handleChannelToggle('webhook')}
                    />
                  }
                  label="Webhook"
                />
              </Grid>
            </Grid>
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
              }
              label="Ativar alerta imediatamente"
            />
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          startIcon={<NotificationsIcon />}
        >
          Criar Alerta
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AlertsDialog;
