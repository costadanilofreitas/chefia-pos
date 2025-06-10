import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Payment as PaymentIcon,
  PersonAdd as PersonAddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';

// Interface para abas
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`payment-tabpanel-${index}`}
      aria-labelledby={`payment-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Componente principal
const PartialPaymentInterface = ({ orderId, orderTotal, onComplete }) => {
  // Estado para controle de abas
  const [tabValue, setTabValue] = useState(0);
  
  // Estado para sessão de pagamento
  const [session, setSession] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estado para pagamento parcial
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [customerName, setCustomerName] = useState('');
  
  // Estado para divisão de conta
  const [splitMethod, setSplitMethod] = useState('equal');
  const [numberOfParts, setNumberOfParts] = useState(2);
  const [customParts, setCustomParts] = useState([
    { name: 'Pessoa 1', amount: '' },
    { name: 'Pessoa 2', amount: '' }
  ]);
  
  // Estado para diálogos
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  
  // Estado para notificações
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Carregar ou criar sessão de pagamento ao montar
  useEffect(() => {
    const initializeSession = async () => {
      setLoading(true);
      try {
        // Verificar se já existe uma sessão para este pedido
        const response = await fetch(`/api/payment/partial/sessions/order/${orderId}`);
        const data = await response.json();
        
        if (data.sessions && data.sessions.length > 0) {
          // Usar a sessão existente
          const existingSession = data.sessions[0];
          setSession(existingSession);
          
          // Carregar pagamentos
          const paymentsResponse = await fetch(`/api/payment/partial/payments/session/${existingSession.id}`);
          const paymentsData = await paymentsResponse.json();
          setPayments(paymentsData.payments || []);
        } else {
          // Criar nova sessão
          const createResponse = await fetch('/api/payment/partial/sessions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              order_id: orderId,
              total_amount: orderTotal
            }),
          });
          
          const createData = await createResponse.json();
          setSession(createData.session);
        }
      } catch (error) {
        console.error('Erro ao inicializar sessão:', error);
        showNotification('Erro ao inicializar sessão de pagamento', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    if (orderId && orderTotal) {
      initializeSession();
    }
  }, [orderId, orderTotal]);
  
  // Funções auxiliares
  const showNotification = (message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };
  
  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Funções para pagamento parcial
  const handleAddPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      showNotification('Informe um valor válido para o pagamento', 'error');
      return;
    }
    
    if (parseFloat(paymentAmount) > session.remaining_amount) {
      showNotification(`O valor não pode exceder o valor restante (${session.remaining_amount.toFixed(2)})`, 'error');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/payment/partial/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: session.id,
          method: paymentMethod,
          amount: parseFloat(paymentAmount),
          customer_name: customerName || undefined,
          description: `Pagamento parcial - ${customerName || 'Cliente'}`
        }),
      });
      
      const data = await response.json();
      
      // Atualizar estado
      setSession(data.session);
      setPayments([...payments, data.payment]);
      
      // Limpar campos
      setPaymentAmount('');
      
      showNotification('Pagamento registrado com sucesso!', 'success');
      
      // Se o pagamento completou o valor total, notificar
      if (data.remaining <= 0) {
        showNotification('Pagamento concluído! Conta fechada.', 'success');
        if (onComplete) {
          onComplete();
        }
      }
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      showNotification('Erro ao registrar pagamento', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Funções para divisão de conta
  const handleAddCustomPart = () => {
    setCustomParts([
      ...customParts,
      { name: `Pessoa ${customParts.length + 1}`, amount: '' }
    ]);
  };
  
  const handleRemoveCustomPart = (index) => {
    const newParts = [...customParts];
    newParts.splice(index, 1);
    setCustomParts(newParts);
  };
  
  const handleCustomPartChange = (index, field, value) => {
    const newParts = [...customParts];
    newParts[index] = {
      ...newParts[index],
      [field]: value
    };
    setCustomParts(newParts);
  };
  
  const handleCreateSplit = async () => {
    setLoading(true);
    try {
      let response;
      
      if (splitMethod === 'equal') {
        // Divisão igualitária
        response = await fetch('/api/payment/partial/splits/equal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: session.id,
            number_of_parts: numberOfParts,
            names: Array.from({ length: numberOfParts }, (_, i) => `Pessoa ${i + 1}`)
          }),
        });
      } else {
        // Divisão personalizada
        // Validar se os valores somam o total
        const total = customParts.reduce((sum, part) => sum + (parseFloat(part.amount) || 0), 0);
        
        if (Math.abs(total - session.total_amount) > 0.01) {
          showNotification(`A soma dos valores (${total.toFixed(2)}) deve ser igual ao valor total (${session.total_amount.toFixed(2)})`, 'error');
          setLoading(false);
          return;
        }
        
        response = await fetch('/api/payment/partial/splits/custom', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: session.id,
            parts: customParts.map(part => ({
              name: part.name,
              amount: parseFloat(part.amount)
            }))
          }),
        });
      }
      
      const data = await response.json();
      
      // Recarregar a divisão
      await loadSplit();
      
      showNotification('Divisão de conta criada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao criar divisão:', error);
      showNotification('Erro ao criar divisão de conta', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const loadSplit = async () => {
    try {
      const response = await fetch(`/api/payment/partial/splits/session/${session.id}`);
      const data = await response.json();
      
      if (data.split) {
        setSplit(data.split);
        setSplitParts(data.parts);
      }
    } catch (error) {
      console.error('Erro ao carregar divisão:', error);
    }
  };
  
  // Estado para divisão
  const [split, setSplit] = useState(null);
  const [splitParts, setSplitParts] = useState([]);
  
  // Carregar divisão existente
  useEffect(() => {
    if (session) {
      loadSplit();
    }
  }, [session]);
  
  // Função para pagar uma parte da divisão
  const handlePayPart = (part) => {
    setSelectedPart(part);
    setPaymentDialogOpen(true);
  };
  
  const handleConfirmPartPayment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/payment/partial/splits/parts/${selectedPart.id}/pay?method=${paymentMethod}&customer_name=${encodeURIComponent(customerName || selectedPart.name || '')}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      // Atualizar estado
      setSession(data.session);
      await loadSplit();
      
      // Recarregar pagamentos
      const paymentsResponse = await fetch(`/api/payment/partial/payments/session/${session.id}`);
      const paymentsData = await paymentsResponse.json();
      setPayments(paymentsData.payments || []);
      
      showNotification('Pagamento registrado com sucesso!', 'success');
      
      // Fechar diálogo
      setPaymentDialogOpen(false);
      setSelectedPart(null);
      
      // Se o pagamento completou o valor total, notificar
      if (data.session.remaining_amount <= 0) {
        showNotification('Pagamento concluído! Conta fechada.', 'success');
        if (onComplete) {
          onComplete();
        }
      }
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      showNotification('Erro ao registrar pagamento', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Renderização condicional enquanto carrega
  if (loading && !session) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Renderização principal
  return (
    <Box sx={{ width: '100%' }}>
      {session && (
        <>
          <Paper sx={{ mb: 2, p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle1">
                  Valor Total: R$ {session.total_amount.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle1">
                  Valor Pago: R$ {session.paid_amount.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle1" color={session.remaining_amount > 0 ? 'error' : 'success'}>
                  {session.remaining_amount > 0 
                    ? `Valor Restante: R$ ${session.remaining_amount.toFixed(2)}`
                    : 'Pagamento Concluído'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
          
          <Paper sx={{ width: '100%', mb: 2 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              centered
            >
              <Tab label="Pagamento Parcial" />
              <Tab label="Divisão de Conta" />
              <Tab label="Histórico" />
            </Tabs>
            
            {/* Aba de Pagamento Parcial */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper elevation={2} sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Registrar Pagamento Parcial
                    </Typography>
                    
                    <TextField
                      label="Valor"
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      fullWidth
                      margin="normal"
                      InputProps={{
                        startAdornment: <Typography sx={{ mr: 1 }}>R$</Typography>,
                      }}
                      disabled={session.remaining_amount <= 0}
                    />
                    
                    <FormControl fullWidth margin="normal">
                      <InputLabel id="payment-method-label">Método de Pagamento</InputLabel>
                      <Select
                        labelId="payment-method-label"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        label="Método de Pagamento"
                        disabled={session.remaining_amount <= 0}
                      >
                        <MenuItem value="pix">PIX</MenuItem>
                        <MenuItem value="credit_card">Cartão de Crédito</MenuItem>
                        <MenuItem value="debit_card">Cartão de Débito</MenuItem>
                        <MenuItem value="cash">Dinheiro</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <TextField
                      label="Nome do Cliente (opcional)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      fullWidth
                      margin="normal"
                      disabled={session.remaining_amount <= 0}
                    />
                    
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<PaymentIcon />}
                        onClick={handleAddPayment}
                        disabled={session.remaining_amount <= 0 || loading}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Registrar Pagamento'}
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper elevation={2} sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Resumo do Pagamento
                    </Typography>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body1" gutterBottom>
                        <strong>Valor Total:</strong> R$ {session.total_amount.toFixed(2)}
                      </Typography>
                      
                      <Typography variant="body1" gutterBottom>
                        <strong>Valor Pago:</strong> R$ {session.paid_amount.toFixed(2)}
                      </Typography>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Typography variant="body1" color={session.remaining_amount > 0 ? 'error' : 'success'}>
                        <strong>Valor Restante:</strong> R$ {session.remaining_amount.toFixed(2)}
                      </Typography>
                      
                      {session.remaining_amount <= 0 && (
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                          <Chip
                            icon={<CheckIcon />}
                            label="Pagamento Concluído"
                            color="success"
                            variant="outlined"
                          />
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>
            
            {/* Aba de Divisão de Conta */}
            <TabPanel value={tabValue} index={1}>
              {split ? (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        Divisão de Conta
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Chip
                          label={`Método: ${split.split_method === 'equal' ? 'Igualitária' : 'Personalizada'}`}
                          color="primary"
                          variant="outlined"
                          sx={{ mr: 1 }}
                        />
                        <Chip
                          label={`Partes: ${split.number_of_parts}`}
                          color="secondary"
                          variant="outlined"
                        />
                      </Box>
                      
                      <List>
                        {splitParts.map((part) => (
                          <ListItem
                            key={part.id}
                            secondaryAction={
                              part.is_paid ? (
                                <Chip
                                  icon={<CheckIcon />}
                                  label="Pago"
                                  color="success"
                                  variant="outlined"
                                />
                              ) : (
                                <Button
                                  variant="outlined"
                                  color="primary"
                                  onClick={() => handlePayPart(part)}
                                  disabled={loading}
                                >
                                  Pagar
                                </Button>
                              )
                            }
                          >
                            <ListItemText
                              primary={part.name || `Parte ${splitParts.indexOf(part) + 1}`}
                              secondary={`R$ ${part.amount.toFixed(2)}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </Grid>
                </Grid>
              ) : (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        Criar Divisão de Conta
                      </Typography>
                      
                      <FormControl fullWidth margin="normal">
                        <InputLabel id="split-method-label">Método de Divisão</InputLabel>
                        <Select
                          labelId="split-method-label"
                          value={splitMethod}
                          onChange={(e) => setSplitMethod(e.target.value)}
                          label="Método de Divisão"
                          disabled={session.remaining_amount <= 0}
                        >
                          <MenuItem value="equal">Igualitária</MenuItem>
                          <MenuItem value="custom">Personalizada</MenuItem>
                        </Select>
                      </FormControl>
                      
                      {splitMethod === 'equal' ? (
                        <TextField
                          label="Número de Pessoas"
                          type="number"
                          value={numberOfParts}
                          onChange={(e) => setNumberOfParts(Math.max(2, parseInt(e.target.value) || 2))}
                          fullWidth
                          margin="normal"
                          InputProps={{ inputProps: { min: 2 } }}
                          disabled={session.remaining_amount <= 0}
                        />
                      ) : (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Divisão Personalizada
                          </Typography>
                          
                          {customParts.map((part, index) => (
                            <Box key={index} sx={{ display: 'flex', mb: 2 }}>
                              <TextField
                                label={`Nome ${index + 1}`}
                                value={part.name}
                                onChange={(e) => handleCustomPartChange(index, 'name', e.target.value)}
                                sx={{ mr: 1, flex: 1 }}
                                disabled={session.remaining_amount <= 0}
                              />
                              <TextField
                                label="Valor"
                                type="number"
                                value={part.amount}
                                onChange={(e) => handleCustomPartChange(index, 'amount', e.target.value)}
                                sx={{ flex: 1 }}
                                InputProps={{
                                  startAdornment: <Typography sx={{ mr: 1 }}>R$</Typography>,
                                }}
                                disabled={session.remaining_amount <= 0}
                              />
                              <IconButton
                                color="error"
                                onClick={() => handleRemoveCustomPart(index)}
                                disabled={customParts.length <= 2 || session.remaining_amount <= 0}
                                sx={{ ml: 1 }}
                              >
                                <RemoveIcon />
                              </IconButton>
                            </Box>
                          ))}
                          
                          <Button
                            startIcon={<AddIcon />}
                            onClick={handleAddCustomPart}
                            disabled={session.remaining_amount <= 0}
                          >
                            Adicionar Pessoa
                          </Button>
                        </Box>
                      )}
                      
                      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<PersonAddIcon />}
                          onClick={handleCreateSplit}
                          disabled={session.remaining_amount <= 0 || loading}
                        >
                          {loading ? <CircularProgress size={24} /> : 'Criar Divisão'}
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        Prévia da Divisão
                      </Typography>
                      
                      {splitMethod === 'equal' ? (
                        <Box>
                          <Typography variant="body1" gutterBottom>
                            Divisão igualitária entre {numberOfParts} pessoas:
                          </Typography>
                          
                          <Typography variant="body1" gutterBottom>
                            <strong>Valor por pessoa:</strong> R$ {(session.total_amount / numberOfParts).toFixed(2)}
                          </Typography>
                          
                          <List>
                            {Array.from({ length: numberOfParts }, (_, i) => (
                              <ListItem key={i}>
                                <ListItemText
                                  primary={`Pessoa ${i + 1}`}
                                  secondary={`R$ ${(session.total_amount / numberOfParts).toFixed(2)}`}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      ) : (
                        <Box>
                          <Typography variant="body1" gutterBottom>
                            Divisão personalizada:
                          </Typography>
                          
                          <List>
                            {customParts.map((part, index) => (
                              <ListItem key={index}>
                                <ListItemText
                                  primary={part.name}
                                  secondary={part.amount ? `R$ ${parseFloat(part.amount).toFixed(2)}` : 'Valor não definido'}
                                />
                              </ListItem>
                            ))}
                          </List>
                          
                          <Divider sx={{ my: 2 }} />
                          
                          <Typography variant="body1">
                            <strong>Total:</strong> R$ {customParts.reduce((sum, part) => sum + (parseFloat(part.amount) || 0), 0).toFixed(2)}
                          </Typography>
                          
                          {Math.abs(customParts.reduce((sum, part) => sum + (parseFloat(part.amount) || 0), 0) - session.total_amount) > 0.01 && (
                            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                              A soma dos valores deve ser igual ao valor total (R$ {session.total_amount.toFixed(2)})
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
              )}
            </TabPanel>
            
            {/* Aba de Histórico */}
            <TabPanel value={tabValue} index={2}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Histórico de Pagamentos
                </Typography>
                
                {payments.length === 0 ? (
                  <Typography variant="body1" sx={{ textAlign: 'center', my: 3, color: 'text.secondary' }}>
                    Nenhum pagamento registrado
                  </Typography>
                ) : (
                  <List>
                    {payments.map((payment) => (
                      <ListItem key={payment.id}>
                        <ListItemText
                          primary={`R$ ${payment.amount.toFixed(2)} - ${payment.method === 'pix' ? 'PIX' : 
                                    payment.method === 'credit_card' ? 'Cartão de Crédito' : 
                                    payment.method === 'debit_card' ? 'Cartão de Débito' : 'Dinheiro'}`}
                          secondary={`${payment.customer_name || 'Cliente'} - ${new Date(payment.created_at).toLocaleString()}`}
                        />
                        <ListItemSecondaryAction>
                          <Chip
                            label={payment.status === 'confirmed' ? 'Confirmado' : 
                                  payment.status === 'pending' ? 'Pendente' : payment.status}
                            color={payment.status === 'confirmed' ? 'success' : 
                                  payment.status === 'pending' ? 'warning' : 'default'}
                            variant="outlined"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </TabPanel>
          </Paper>
        </>
      )}
      
      {/* Diálogo de pagamento de parte */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)}>
        <DialogTitle>Registrar Pagamento</DialogTitle>
        <DialogContent>
          {selectedPart && (
            <>
              <Typography variant="body1" gutterBottom>
                <strong>Cliente:</strong> {selectedPart.name || `Parte ${splitParts.indexOf(selectedPart) + 1}`}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Valor:</strong> R$ {selectedPart.amount.toFixed(2)}
              </Typography>
              
              <FormControl fullWidth margin="normal">
                <InputLabel id="payment-method-dialog-label">Método de Pagamento</InputLabel>
                <Select
                  labelId="payment-method-dialog-label"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  label="Método de Pagamento"
                >
                  <MenuItem value="pix">PIX</MenuItem>
                  <MenuItem value="credit_card">Cartão de Crédito</MenuItem>
                  <MenuItem value="debit_card">Cartão de Débito</MenuItem>
                  <MenuItem value="cash">Dinheiro</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="Nome do Cliente"
                value={customerName || selectedPart.name || ''}
                onChange={(e) => setCustomerName(e.target.value)}
                fullWidth
                margin="normal"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleConfirmPartPayment} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Confirmar Pagamento'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notificações */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PartialPaymentInterface;
