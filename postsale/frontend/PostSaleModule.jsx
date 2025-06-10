import React, { useState, useEffect } from 'react';
import { 
  Container, Box, Typography, TextField, Button, 
  Dialog, DialogActions, DialogContent, DialogTitle,
  Paper, Grid, CircularProgress, Alert, Snackbar
} from '@mui/material';
import { Email, Sms, Send } from '@mui/icons-material';

// Componente para enviar solicitações de feedback
const FeedbackRequestSender = ({ restaurantId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    orderId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    message: ''
  });
  
  // Manipulador de alteração de campos
  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };
  
  // Manipulador de envio do formulário
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Validar campos obrigatórios
      if (!formData.orderId) {
        throw new Error('ID do pedido é obrigatório');
      }
      
      if (!formData.customerEmail && !formData.customerPhone) {
        throw new Error('Email ou telefone do cliente é obrigatório');
      }
      
      // Preparar dados para envio
      const requestData = {
        order_id: formData.orderId,
        restaurant_id: restaurantId,
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone,
        custom_message: formData.message,
        expiration_days: 7
      };
      
      // Em produção, substituir por chamada real à API
      const response = await fetch('/api/postsale/feedback-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Erro ao enviar solicitação de feedback');
      }
      
      setSuccess(true);
      
      // Limpar formulário
      setFormData({
        orderId: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        message: ''
      });
    } catch (error) {
      setError(error.message || 'Erro ao enviar solicitação de feedback');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fechar alerta de sucesso
  const handleCloseSuccess = () => {
    setSuccess(false);
  };
  
  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Enviar Solicitação de Feedback
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="ID do Pedido"
              variant="outlined"
              value={formData.orderId}
              onChange={handleChange('orderId')}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nome do Cliente"
              variant="outlined"
              value={formData.customerName}
              onChange={handleChange('customerName')}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email do Cliente"
              variant="outlined"
              type="email"
              value={formData.customerEmail}
              onChange={handleChange('customerEmail')}
              margin="normal"
              helperText="Email ou telefone é obrigatório"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Telefone do Cliente"
              variant="outlined"
              value={formData.customerPhone}
              onChange={handleChange('customerPhone')}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Mensagem Personalizada (opcional)"
              variant="outlined"
              multiline
              rows={3}
              value={formData.message}
              onChange={handleChange('message')}
              margin="normal"
            />
          </Grid>
          
          {error && (
            <Grid item xs={12}>
              <Alert severity="error">
                {error}
              </Alert>
            </Grid>
          )}
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={<Send />}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Enviar Solicitação'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
      
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={handleCloseSuccess}
      >
        <Alert 
          onClose={handleCloseSuccess} 
          severity="success"
          sx={{ width: '100%' }}
        >
          Solicitação de feedback enviada com sucesso!
        </Alert>
      </Snackbar>
    </Paper>
  );
};

// Componente para gerenciar benefícios
const BenefitManager = ({ restaurantId }) => {
  const [benefits, setBenefits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'discount',
    value: '',
    minRating: 4,
    expirationDays: 30,
    active: true
  });
  
  // Efeito para carregar benefícios
  useEffect(() => {
    const fetchBenefits = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Em produção, substituir por chamada real à API
        const response = await fetch(`/api/postsale/benefit/restaurant/${restaurantId}`);
        
        if (!response.ok) {
          throw new Error('Erro ao carregar benefícios');
        }
        
        const data = await response.json();
        setBenefits(data.benefits || []);
      } catch (error) {
        setError(error.message || 'Erro ao carregar benefícios');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBenefits();
  }, [restaurantId]);
  
  // Manipulador de alteração de campos
  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };
  
  // Abrir diálogo de criação
  const handleOpenDialog = () => {
    setDialogOpen(true);
  };
  
  // Fechar diálogo de criação
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  
  // Manipulador de envio do formulário
  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Validar campos obrigatórios
      if (!formData.name || !formData.description || !formData.value) {
        throw new Error('Todos os campos são obrigatórios');
      }
      
      // Preparar dados para envio
      const benefitData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        value: Number(formData.value),
        restaurant_id: restaurantId,
        min_rating: Number(formData.minRating),
        expiration_days: Number(formData.expirationDays),
        active: formData.active
      };
      
      // Em produção, substituir por chamada real à API
      const response = await fetch('/api/postsale/benefit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(benefitData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Erro ao criar benefício');
      }
      
      // Adicionar novo benefício à lista
      setBenefits([...benefits, data.benefit]);
      
      // Fechar diálogo
      handleCloseDialog();
      
      // Limpar formulário
      setFormData({
        name: '',
        description: '',
        type: 'discount',
        value: '',
        minRating: 4,
        expirationDays: 30,
        active: true
      });
    } catch (error) {
      setError(error.message || 'Erro ao criar benefício');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Renderizar conteúdo com base no estado de carregamento
  if (isLoading && benefits.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }
  
  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Gerenciar Benefícios
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenDialog}
        >
          Novo Benefício
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {benefits.length === 0 ? (
        <Alert severity="info">
          Nenhum benefício cadastrado.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {benefits.map((benefit) => (
            <Grid item xs={12} sm={6} md={4} key={benefit.id}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {benefit.name}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {benefit.description}
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">
                    {benefit.type === 'discount' ? 'Desconto:' : 'Valor:'} {benefit.value}
                    {benefit.type === 'discount' ? '%' : ''}
                  </Typography>
                  
                  <Typography variant="body2" color={benefit.active ? 'success.main' : 'error.main'}>
                    {benefit.active ? 'Ativo' : 'Inativo'}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Diálogo de criação de benefício */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Benefício</DialogTitle>
        
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Nome do Benefício"
                variant="outlined"
                value={formData.name}
                onChange={handleChange('name')}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Descrição"
                variant="outlined"
                multiline
                rows={3}
                value={formData.description}
                onChange={handleChange('description')}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                select
                label="Tipo"
                variant="outlined"
                value={formData.type}
                onChange={handleChange('type')}
                SelectProps={{
                  native: true
                }}
              >
                <option value="discount">Desconto (%)</option>
                <option value="fixed">Valor Fixo (R$)</option>
                <option value="free_item">Item Grátis</option>
              </TextField>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Valor"
                variant="outlined"
                type="number"
                value={formData.value}
                onChange={handleChange('value')}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Avaliação Mínima"
                variant="outlined"
                type="number"
                inputProps={{ min: 1, max: 5, step: 1 }}
                value={formData.minRating}
                onChange={handleChange('minRating')}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Dias para Expiração"
                variant="outlined"
                type="number"
                inputProps={{ min: 1 }}
                value={formData.expirationDays}
                onChange={handleChange('expirationDays')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

// Componente principal do módulo de pós-venda
const PostSaleModule = ({ restaurantId }) => {
  const [tabValue, setTabValue] = useState(0);
  
  // Manipulador de alteração de tab
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Módulo de Pós-Venda
      </Typography>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <FeedbackRequestSender restaurantId={restaurantId} />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <BenefitManager restaurantId={restaurantId} />
        </Grid>
      </Grid>
    </Container>
  );
};

export default PostSaleModule;
