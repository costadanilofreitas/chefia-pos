import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Slider,
  TimePicker
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Restore as RestoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

interface PlatformConfig {
  platform: 'ifood' | 'ubereats' | 'rappi';
  enabled: boolean;
  auto_accept: boolean;
  auto_accept_conditions: {
    min_value?: number;
    max_value?: number;
    time_start?: string;
    time_end?: string;
    max_preparation_time?: number;
  };
  rejection_reasons: string[];
  notification_settings: {
    sound_enabled: boolean;
    sound_volume: number;
    visual_alerts: boolean;
    push_notifications: boolean;
  };
}

interface RemoteOrderConfigProps {
  open: boolean;
  onClose: () => void;
  onSave: (configs: PlatformConfig[]) => void;
}

const RemoteOrderConfig: React.FC<RemoteOrderConfigProps> = ({
  open,
  onClose,
  onSave
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [configs, setConfigs] = useState<PlatformConfig[]>([
    {
      platform: 'ifood',
      enabled: true,
      auto_accept: false,
      auto_accept_conditions: {
        min_value: 0,
        max_value: 1000,
        time_start: '08:00',
        time_end: '22:00',
        max_preparation_time: 30
      },
      rejection_reasons: [
        'Produto em falta',
        'Horário de funcionamento',
        'Problema técnico',
        'Valor muito baixo',
        'Endereço fora da área'
      ],
      notification_settings: {
        sound_enabled: true,
        sound_volume: 80,
        visual_alerts: true,
        push_notifications: true
      }
    },
    {
      platform: 'ubereats',
      enabled: true,
      auto_accept: false,
      auto_accept_conditions: {
        min_value: 0,
        max_value: 1000,
        time_start: '08:00',
        time_end: '22:00',
        max_preparation_time: 25
      },
      rejection_reasons: [
        'Produto em falta',
        'Horário de funcionamento',
        'Problema técnico',
        'Valor muito baixo',
        'Endereço fora da área'
      ],
      notification_settings: {
        sound_enabled: true,
        sound_volume: 80,
        visual_alerts: true,
        push_notifications: true
      }
    },
    {
      platform: 'rappi',
      enabled: false,
      auto_accept: false,
      auto_accept_conditions: {
        min_value: 0,
        max_value: 1000,
        time_start: '08:00',
        time_end: '22:00',
        max_preparation_time: 35
      },
      rejection_reasons: [
        'Produto em falta',
        'Horário de funcionamento',
        'Problema técnico',
        'Valor muito baixo',
        'Endereço fora da área'
      ],
      notification_settings: {
        sound_enabled: true,
        sound_volume: 80,
        visual_alerts: true,
        push_notifications: true
      }
    }
  ]);
  
  const [newReason, setNewReason] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const platforms = [
    { value: 'ifood', label: 'iFood', color: '#EA1D2C' },
    { value: 'ubereats', label: 'Uber Eats', color: '#06C167' },
    { value: 'rappi', label: 'Rappi', color: '#FF441F' }
  ];

  const currentConfig = configs[selectedTab];
  const currentPlatform = platforms[selectedTab];

  // Carregar configurações do backend
  useEffect(() => {
    if (open) {
      loadConfigs();
    }
  }, [open]);

  const loadConfigs = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8001/api/v1/remote-platforms/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setConfigs(data);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const updateConfig = (field: string, value: any) => {
    const newConfigs = [...configs];
    const configPath = field.split('.');
    
    let target = newConfigs[selectedTab];
    for (let i = 0; i < configPath.length - 1; i++) {
      target = target[configPath[i] as keyof PlatformConfig] as any;
    }
    
    target[configPath[configPath.length - 1]] = value;
    setConfigs(newConfigs);
  };

  const addRejectionReason = () => {
    if (newReason.trim()) {
      const newConfigs = [...configs];
      newConfigs[selectedTab].rejection_reasons.push(newReason.trim());
      setConfigs(newConfigs);
      setNewReason('');
    }
  };

  const removeRejectionReason = (index: number) => {
    const newConfigs = [...configs];
    newConfigs[selectedTab].rejection_reasons.splice(index, 1);
    setConfigs(newConfigs);
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      // Salvar cada configuração
      for (const config of configs) {
        await fetch(`http://localhost:8001/api/v1/remote-platforms/${config.platform}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(config)
        });
      }

      setSnackbar({ open: true, message: 'Configurações salvas com sucesso!', severity: 'success' });
      onSave(configs);
      
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao salvar configurações', severity: 'error' });
    }
  };

  const resetToDefaults = () => {
    // Reset apenas a configuração atual
    const newConfigs = [...configs];
    newConfigs[selectedTab] = {
      ...newConfigs[selectedTab],
      auto_accept: false,
      auto_accept_conditions: {
        min_value: 0,
        max_value: 1000,
        time_start: '08:00',
        time_end: '22:00',
        max_preparation_time: 30
      },
      notification_settings: {
        sound_enabled: true,
        sound_volume: 80,
        visual_alerts: true,
        push_notifications: true
      }
    };
    setConfigs(newConfigs);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Configurações de Pedidos Remotos</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Tabs das Plataformas */}
        <Tabs 
          value={selectedTab} 
          onChange={(_, newValue) => setSelectedTab(newValue)}
          sx={{ mb: 3 }}
        >
          {platforms.map((platform, index) => (
            <Tab 
              key={platform.value}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Box
                    width={12}
                    height={12}
                    borderRadius="50%"
                    bgcolor={platform.color}
                  />
                  {platform.label}
                  {configs[index]?.enabled && (
                    <Chip label="Ativo" size="small" color="success" />
                  )}
                </Box>
              }
            />
          ))}
        </Tabs>

        <Grid container spacing={3}>
          {/* Configurações Gerais */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configurações Gerais
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={currentConfig.enabled}
                      onChange={(e) => updateConfig('enabled', e.target.checked)}
                    />
                  }
                  label="Plataforma Habilitada"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={currentConfig.auto_accept}
                      onChange={(e) => updateConfig('auto_accept', e.target.checked)}
                      disabled={!currentConfig.enabled}
                    />
                  }
                  label="Aceitação Automática"
                />

                {currentConfig.auto_accept && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Condições para Aceitação Automática
                    </Typography>
                    
                    <Grid container spacing={2} mt={1}>
                      <Grid item xs={6}>
                        <TextField
                          label="Valor Mínimo (R$)"
                          type="number"
                          size="small"
                          fullWidth
                          value={currentConfig.auto_accept_conditions.min_value || 0}
                          onChange={(e) => updateConfig('auto_accept_conditions.min_value', parseFloat(e.target.value))}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Valor Máximo (R$)"
                          type="number"
                          size="small"
                          fullWidth
                          value={currentConfig.auto_accept_conditions.max_value || 1000}
                          onChange={(e) => updateConfig('auto_accept_conditions.max_value', parseFloat(e.target.value))}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Horário Início"
                          type="time"
                          size="small"
                          fullWidth
                          value={currentConfig.auto_accept_conditions.time_start || '08:00'}
                          onChange={(e) => updateConfig('auto_accept_conditions.time_start', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Horário Fim"
                          type="time"
                          size="small"
                          fullWidth
                          value={currentConfig.auto_accept_conditions.time_end || '22:00'}
                          onChange={(e) => updateConfig('auto_accept_conditions.time_end', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" gutterBottom>
                          Tempo Máximo de Preparação: {currentConfig.auto_accept_conditions.max_preparation_time || 30} minutos
                        </Typography>
                        <Slider
                          value={currentConfig.auto_accept_conditions.max_preparation_time || 30}
                          onChange={(_, value) => updateConfig('auto_accept_conditions.max_preparation_time', value)}
                          min={10}
                          max={60}
                          step={5}
                          marks
                          valueLabelDisplay="auto"
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Notificações */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Notificações
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={currentConfig.notification_settings.sound_enabled}
                      onChange={(e) => updateConfig('notification_settings.sound_enabled', e.target.checked)}
                    />
                  }
                  label="Som Habilitado"
                />

                {currentConfig.notification_settings.sound_enabled && (
                  <Box mt={2}>
                    <Typography variant="body2" gutterBottom>
                      Volume do Som: {currentConfig.notification_settings.sound_volume}%
                    </Typography>
                    <Slider
                      value={currentConfig.notification_settings.sound_volume}
                      onChange={(_, value) => updateConfig('notification_settings.sound_volume', value)}
                      min={0}
                      max={100}
                      step={10}
                      marks
                      valueLabelDisplay="auto"
                    />
                  </Box>
                )}

                <FormControlLabel
                  control={
                    <Switch
                      checked={currentConfig.notification_settings.visual_alerts}
                      onChange={(e) => updateConfig('notification_settings.visual_alerts', e.target.checked)}
                    />
                  }
                  label="Alertas Visuais"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={currentConfig.notification_settings.push_notifications}
                      onChange={(e) => updateConfig('notification_settings.push_notifications', e.target.checked)}
                    />
                  }
                  label="Notificações Push"
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Motivos de Rejeição */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Motivos de Rejeição
                </Typography>

                <Box display="flex" gap={1} mb={2}>
                  <TextField
                    label="Novo motivo"
                    size="small"
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addRejectionReason()}
                    sx={{ flexGrow: 1 }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addRejectionReason}
                    disabled={!newReason.trim()}
                  >
                    Adicionar
                  </Button>
                </Box>

                <Box display="flex" flexWrap="wrap" gap={1}>
                  {currentConfig.rejection_reasons.map((reason, index) => (
                    <Chip
                      key={index}
                      label={reason}
                      onDelete={() => removeRejectionReason(index)}
                      deleteIcon={<DeleteIcon />}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={resetToDefaults}
          startIcon={<RestoreIcon />}
          color="warning"
        >
          Restaurar Padrões
        </Button>
        <Button onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={<SaveIcon />}
        >
          Salvar Configurações
        </Button>
      </DialogActions>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default RemoteOrderConfig;

