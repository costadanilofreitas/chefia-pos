import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, FormControl, InputLabel, Select,
  MenuItem, FormHelperText, Grid, Paper, Divider, Chip
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

const CampaignForm = ({ templates, onSubmit, onCancel }) => {
  // Estados do formulário
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [endDate, setEndDate] = useState(null);
  const [targetAudience, setTargetAudience] = useState({
    inactive_days: 30,
    min_orders: 0,
    order_value: 0,
    specific_items: []
  });
  const [aiParameters, setAiParameters] = useState({
    tone: 'friendly',
    style: 'casual',
    max_length: 500
  });
  
  // Estados de validação
  const [errors, setErrors] = useState({});
  
  // Validar formulário
  const validateForm = () => {
    const newErrors = {};
    
    if (!name) newErrors.name = 'Nome é obrigatório';
    if (!type) newErrors.type = 'Tipo é obrigatório';
    if (!templateId) newErrors.templateId = 'Template é obrigatório';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Manipular envio do formulário
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Preparar dados da campanha
    const campaignData = {
      name,
      description,
      type,
      message_template: templateId,
      scheduled_date: scheduledDate.toISOString(),
      target_audience: targetAudience,
      ai_parameters: aiParameters
    };
    
    if (endDate) {
      campaignData.end_date = endDate.toISOString();
    }
    
    // Enviar para o componente pai
    onSubmit(campaignData);
  };
  
  // Atualizar parâmetros de segmentação
  const handleTargetAudienceChange = (field, value) => {
    setTargetAudience({
      ...targetAudience,
      [field]: value
    });
  };
  
  // Atualizar parâmetros de IA
  const handleAIParameterChange = (field, value) => {
    setAiParameters({
      ...aiParameters,
      [field]: value
    });
  };
  
  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Informações Básicas
            </Typography>
            
            <TextField
              label="Nome da Campanha"
              fullWidth
              margin="normal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              required
            />
            
            <TextField
              label="Descrição"
              fullWidth
              margin="normal"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
            />
            
            <FormControl fullWidth margin="normal" error={!!errors.type} required>
              <InputLabel>Tipo de Campanha</InputLabel>
              <Select
                value={type}
                onChange={(e) => setType(e.target.value)}
                label="Tipo de Campanha"
              >
                <MenuItem value="reengagement">Reengajamento</MenuItem>
                <MenuItem value="promotion">Promoção</MenuItem>
                <MenuItem value="feedback">Feedback</MenuItem>
                <MenuItem value="loyalty">Fidelidade</MenuItem>
                <MenuItem value="announcement">Anúncio</MenuItem>
              </Select>
              {errors.type && <FormHelperText>{errors.type}</FormHelperText>}
            </FormControl>
            
            <FormControl fullWidth margin="normal" error={!!errors.templateId} required>
              <InputLabel>Template de Mensagem</InputLabel>
              <Select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                label="Template de Mensagem"
              >
                {templates.map(template => (
                  <MenuItem key={template.template_id} value={template.template_id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
              {errors.templateId && <FormHelperText>{errors.templateId}</FormHelperText>}
            </FormControl>
            
            <Box sx={{ mt: 2 }}>
              <DateTimePicker
                label="Data de Agendamento"
                value={scheduledDate}
                onChange={setScheduledDate}
                renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
              />
              
              <DateTimePicker
                label="Data de Término (opcional)"
                value={endDate}
                onChange={setEndDate}
                renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
              />
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Segmentação de Público
            </Typography>
            
            <TextField
              label="Dias de Inatividade"
              type="number"
              fullWidth
              margin="normal"
              value={targetAudience.inactive_days}
              onChange={(e) => handleTargetAudienceChange('inactive_days', parseInt(e.target.value) || 0)}
              helperText="Clientes inativos por pelo menos este número de dias"
            />
            
            <TextField
              label="Número Mínimo de Pedidos"
              type="number"
              fullWidth
              margin="normal"
              value={targetAudience.min_orders}
              onChange={(e) => handleTargetAudienceChange('min_orders', parseInt(e.target.value) || 0)}
              helperText="Clientes com pelo menos este número de pedidos"
            />
            
            <TextField
              label="Valor Médio de Pedido"
              type="number"
              fullWidth
              margin="normal"
              value={targetAudience.order_value}
              onChange={(e) => handleTargetAudienceChange('order_value', parseFloat(e.target.value) || 0)}
              helperText="Clientes com valor médio de pedido acima deste valor"
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>R$</Typography>,
              }}
            />
          </Paper>
          
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Parâmetros de IA
            </Typography>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Tom da Mensagem</InputLabel>
              <Select
                value={aiParameters.tone}
                onChange={(e) => handleAIParameterChange('tone', e.target.value)}
                label="Tom da Mensagem"
              >
                <MenuItem value="friendly">Amigável</MenuItem>
                <MenuItem value="professional">Profissional</MenuItem>
                <MenuItem value="casual">Casual</MenuItem>
                <MenuItem value="enthusiastic">Entusiasmado</MenuItem>
                <MenuItem value="formal">Formal</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Estilo</InputLabel>
              <Select
                value={aiParameters.style}
                onChange={(e) => handleAIParameterChange('style', e.target.value)}
                label="Estilo"
              >
                <MenuItem value="casual">Casual</MenuItem>
                <MenuItem value="concise">Conciso</MenuItem>
                <MenuItem value="detailed">Detalhado</MenuItem>
                <MenuItem value="persuasive">Persuasivo</MenuItem>
                <MenuItem value="informative">Informativo</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Tamanho Máximo (caracteres)"
              type="number"
              fullWidth
              margin="normal"
              value={aiParameters.max_length}
              onChange={(e) => handleAIParameterChange('max_length', parseInt(e.target.value) || 500)}
              helperText="Limite de caracteres para a mensagem gerada"
            />
          </Paper>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button variant="outlined" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="contained" color="primary" type="submit">
          Criar Campanha
        </Button>
      </Box>
    </Box>
  );
};

export default CampaignForm;
