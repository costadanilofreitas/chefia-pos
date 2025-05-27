import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Grid,
  Button,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Payment as PaymentIcon,
  AttachMoney as CashIcon,
  CreditCard as CardIcon,
  Smartphone as PixIcon,
  Print as PrintIcon,
  ArrowBack as ArrowBackIcon,
  Receipt as ReceiptIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useAuth } from '@common/contexts/auth/hooks/useAuth';
import { useCashier } from '@common/contexts/cashier/hooks/useCashier';
import { useOrder } from '@common/contexts/order/hooks/useOrder';
import { formatCurrency } from '@common/utils/formatters';
import PrinterService from '../services/PrinterService';

// Estilos personalizados inspirados no sistema de exemplo, mas com identidade própria
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  background: 'linear-gradient(to bottom, #ffffff, #f9f9f9)',
  border: '1px solid #e0e0e0',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

const PaymentMethodCard = styled(Card)(({ theme, selected }) => ({
  borderRadius: '12px',
  padding: theme.spacing(2),
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  border: selected ? `2px solid ${theme.palette.primary.main}` : '1px solid #e0e0e0',
  backgroundColor: selected ? 'rgba(25, 118, 210, 0.08)' : 'white',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
  },
}));

const PaymentButton = styled(Button)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: '8px',
  fontWeight: 'bold',
  fontSize: '1.1rem',
  textTransform: 'none',
  minHeight: '60px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.2s ease',
  marginBottom: theme.spacing(2),
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
  },
}));

const POSPaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams();
  const { user } = useAuth();
  const { cashierStatus } = useCashier();
  const { 
    getOrderById, 
    updateOrder,
    processPayment,
    isLoading 
  } = useOrder();
  
  // Extrair o ID do POS dos parâmetros da URL
  const params = new URLSearchParams(location.search);
  const posId = params.get('pos') || '1';
  
  // Estados locais
  const [order, setOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [changeAmount, setChangeAmount] = useState(0);
  const [cardType, setCardType] = useState('credit');
  const [installments, setInstallments] = useState(1);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ open: false, message: '', severity: 'info' });
  const [paymentTab, setPaymentTab] = useState(0);
  const [paymentComplete, setPaymentComplete] = useState(false);
  
  // Carregar detalhes do pedido
  useEffect(() => {
    const loadOrder = async () => {
      try {
        const orderData = await getOrderById(orderId);
        setOrder(orderData);
        
        // Inicializar o valor do pagamento com o total do pedido
        if (orderData) {
          setPaymentAmount(orderData.total.toFixed(2));
        }
      } catch (error) {
        setAlertInfo({
          open: true,
          message: `Erro ao carregar pedido: ${error.message}`,
          severity: 'error'
        });
      }
    };
    
    if (orderId) {
      loadOrder();
    }
  }, [orderId, getOrderById]);
  
  // Calcular troco quando o valor do pagamento muda
  useEffect(() => {
    if (order && paymentMethod === 'cash' && paymentAmount) {
      const change = parseFloat(paymentAmount) - order.total;
      setChangeAmount(change > 0 ? change : 0);
    } else {
      setChangeAmount(0);
    }
  }, [paymentAmount, order, paymentMethod]);
  
  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    
    // Resetar valores específicos de cada método
    if (method === 'cash') {
      setPaymentAmount(order?.total.toFixed(2) || '');
    } else if (method === 'card') {
      setCardType('credit');
      setInstallments(1);
    } else if (method === 'pix') {
      // Nada específico para PIX por enquanto
    }
  };
  
  const handlePaymentAmountChange = (e) => {
    // Permitir apenas números e um ponto decimal
    const value = e.target.value.replace(/[^0-9.]/g, '');
    
    // Garantir que há apenas um ponto decimal
    const parts = value.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limitar a 2 casas decimais
    if (parts.length === 2 && parts[1].length > 2) {
      return;
    }
    
    setPaymentAmount(value);
  };
  
  const handleCardTypeChange = (event) => {
    setCardType(event.target.value);
    
    // Resetar parcelas se mudar para débito
    if (event.target.value === 'debit') {
      setInstallments(1);
    }
  };
  
  const handleInstallmentsChange = (event) => {
    setInstallments(parseInt(event.target.value));
  };
  
  const handleProcessPayment = () => {
    // Validar pagamento
    if (paymentMethod === 'cash' && (!paymentAmount || parseFloat(paymentAmount) < order.total)) {
      setAlertInfo({
        open: true,
        message: 'O valor do pagamento deve ser igual ou maior que o total do pedido',
        severity: 'error'
      });
      return;
    }
    
    setPaymentDialogOpen(true);
  };
  
  const confirmPayment = async () => {
    try {
      // Construir objeto de pagamento
      const paymentData = {
        order_id: order.id,
        cashier_id: cashierStatus?.id,
        terminal_id: `POS-${posId}`,
        operator_id: user?.id,
        amount: order.total,
        method: paymentMethod,
        status: 'completed',
        details: {}
      };
      
      // Adicionar detalhes específicos por método de pagamento
      if (paymentMethod === 'cash') {
        paymentData.details = {
          amount_received: parseFloat(paymentAmount),
          change: changeAmount
        };
      } else if (paymentMethod === 'card') {
        paymentData.details = {
          card_type: cardType,
          installments: installments
        };
      }
      
      // Processar pagamento
      await processPayment(paymentData);
      
      // Atualizar status do pedido
      await updateOrder({
        ...order,
        status: 'completed',
        payment_status: 'paid',
        payment_method: paymentMethod
      });
      
      // Imprimir recibo
      await PrinterService.printReceipt({
        order_id: order.id,
        terminal_id: `POS-${posId}`,
        cashier_id: cashierStatus?.id,
        operator_name: user?.name,
        items: order.items,
        total: order.total,
        payment_method: paymentMethod,
        payment_details: paymentData.details,
        date: new Date()
      });
      
      setPaymentDialogOpen(false);
      setPaymentComplete(true);
      setReceiptDialogOpen(true);
      
    } catch (error) {
      setPaymentDialogOpen(false);
      setAlertInfo({
        open: true,
        message: `Erro ao processar pagamento: ${error.message}`,
        severity: 'error'
      });
    }
  };
  
  const handleFinish = () => {
    setReceiptDialogOpen(false);
    navigate(`/pos?pos=${posId}`);
  };
  
  const handleCancel = () => {
    if (paymentComplete) {
      navigate(`/pos?pos=${posId}`);
    } else {
      navigate(`/pos/order?pos=${posId}`);
    }
  };
  
  const handleCloseAlert = () => {
    setAlertInfo({ ...alertInfo, open: false });
  };
  
  const handlePaymentTabChange = (event, newValue) => {
    setPaymentTab(newValue);
  };
  
  if (isLoading || !order) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            color="inherit" 
            onClick={handleCancel}
            sx={{ mr: 1 }}
            disabled={paymentComplete}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#333' }}>
            Pagamento
          </Typography>
        </Box>
        <Box>
          <Typography variant="subtitle1" color="text.secondary">
            Terminal POS #{posId} | Operador: {user?.name || 'Não identificado'}
          </Typography>
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        {/* Coluna de resumo do pedido */}
        <Grid item xs={12} md={5}>
          <StyledPaper>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2 }}>
              Resumo do Pedido #{order.id}
            </Typography>
            
            <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: '300px', mb: 2 }}>
              <List>
                {order.items.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body1" fontWeight="medium">
                              {item.quantity}x {item.product_name}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <>
                            {item.customizations?.length > 0 && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                {item.customizations.map(c => 
                                  `${c.action === 'remove' ? 'Sem' : c.action === 'extra' ? 'Extra' : ''} ${c.name}`
                                ).join(', ')}
                              </Typography>
                            )}
                            {item.notes && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                Obs: {item.notes}
                              </Typography>
                            )}
                          </>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(item.total_price)}
                        </Typography>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < order.items.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <Box>
              <Grid container spacing={1} sx={{ mb: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="body1">
                    Subtotal:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body1" align="right">
                    {formatCurrency(order.total)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body1">
                    Itens:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body1" align="right">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </Typography>
                </Grid>
              </Grid>
              
              <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: '8px', mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" fontWeight="bold">
                    Total a Pagar:
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary.main">
                    {formatCurrency(order.total)}
                  </Typography>
                </Box>
              </Box>
              
              {paymentComplete ? (
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: '8px' }}>
                  <CheckIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                  <Typography variant="h6" color="success.main" gutterBottom>
                    Pagamento Concluído
                  </Typography>
                  <Typography variant="body2">
                    Pedido finalizado com sucesso
                  </Typography>
                </Box>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  startIcon={<PaymentIcon />}
                  onClick={handleProcessPayment}
                  disabled={
                    (paymentMethod === 'cash' && (!paymentAmount || parseFloat(paymentAmount) < order.total))
                  }
                  sx={{ mt: 2 }}
                >
                  Finalizar Pagamento
                </Button>
              )}
            </Box>
          </StyledPaper>
        </Grid>
        
        {/* Coluna de métodos de pagamento */}
        <Grid item xs={12} md={7}>
          <StyledPaper>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2 }}>
              Forma de Pagamento
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <PaymentMethodCard 
                    selected={paymentMethod === 'cash'}
                    onClick={() => handlePaymentMethodChange('cash')}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <CashIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Dinheiro
                      </Typography>
                    </Box>
                  </PaymentMethodCard>
                </Grid>
                <Grid item xs={4}>
                  <PaymentMethodCard 
                    selected={paymentMethod === 'card'}
                    onClick={() => handlePaymentMethodChange('card')}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <CardIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Cartão
                      </Typography>
                    </Box>
                  </PaymentMethodCard>
                </Grid>
                <Grid item xs={4}>
                  <PaymentMethodCard 
                    selected={paymentMethod === 'pix'}
                    onClick={() => handlePaymentMethodChange('pix')}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <PixIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        PIX
                      </Typography>
                    </Box>
                  </PaymentMethodCard>
                </Grid>
              </Grid>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Tabs 
                value={paymentTab} 
                onChange={handlePaymentTabChange}
                variant="fullWidth"
                sx={{ mb: 2 }}
              >
                <Tab label="Detalhes" />
                <Tab label="Recibo" />
              </Tabs>
              
              {paymentTab === 0 && (
                <Box>
                  {paymentMethod === 'cash' && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Valor Recebido:
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        value={paymentAmount}
                        onChange={handlePaymentAmountChange}
                        placeholder="0.00"
                        InputProps={{
                          startAdornment: <Typography variant="body1" sx={{ mr: 1 }}>R$</Typography>,
                        }}
                        sx={{ mb: 1 }}
                      />
                      <Grid container spacing={1} sx={{ mb: 2 }}>
                        <Grid item xs={3}>
                          <Button 
                            variant="outlined" 
                            fullWidth
                            onClick={() => setPaymentAmount(order.total.toFixed(2))}
                          >
                            Exato
                          </Button>
                        </Grid>
                        <Grid item xs={3}>
                          <Button 
                            variant="outlined" 
                            fullWidth
                            onClick={() => setPaymentAmount((Math.ceil(order.total / 10) * 10).toFixed(2))}
                          >
                            Próx. 10
                          </Button>
                        </Grid>
                        <Grid item xs={3}>
                          <Button 
                            variant="outlined" 
                            fullWidth
                            onClick={() => setPaymentAmount((Math.ceil(order.total / 50) * 50).toFixed(2))}
                          >
                            Próx. 50
                          </Button>
                        </Grid>
                        <Grid item xs={3}>
                          <Button 
                            variant="outlined" 
                            fullWidth
                            onClick={() => setPaymentAmount((Math.ceil(order.total / 100) * 100).toFixed(2))}
                          >
                            Próx. 100
                          </Button>
                        </Grid>
                      </Grid>
                      
                      <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: '8px' }}>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="body1">
                              Total a Pagar:
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body1" align="right" fontWeight="bold">
                              {formatCurrency(order.total)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body1">
                              Valor Recebido:
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body1" align="right" fontWeight="bold">
                              {formatCurrency(parseFloat(paymentAmount) || 0)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body1">
                              Troco:
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body1" align="right" fontWeight="bold" color={changeAmount > 0 ? 'success.main' : 'text.primary'}>
                              {formatCurrency(changeAmount)}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    </Box>
                  )}
                  
                  {paymentMethod === 'card' && (
                    <Box sx={{ mb: 3 }}>
                      <FormControl component="fieldset" sx={{ mb: 3 }}>
                        <FormLabel component="legend">Tipo de Cartão</FormLabel>
                        <RadioGroup
                          row
                          value={cardType}
                          onChange={handleCardTypeChange}
                        >
                          <FormControlLabel value="credit" control={<Radio />} label="Crédito" />
                          <FormControlLabel value="debit" control={<Radio />} label="Débito" />
                        </RadioGroup>
                      </FormControl>
                      
                      {cardType === 'credit' && (
                        <FormControl component="fieldset" sx={{ mb: 3 }}>
                          <FormLabel component="legend">Parcelas</FormLabel>
                          <RadioGroup
                            row
                            value={installments.toString()}
                            onChange={handleInstallmentsChange}
                          >
                            <FormControlLabel value="1" control={<Radio />} label="1x" />
                            <FormControlLabel value="2" control={<Radio />} label="2x" />
                            <FormControlLabel value="3" control={<Radio />} label="3x" />
                            <FormControlLabel value="4" control={<Radio />} label="4x" />
                            <FormControlLabel value="5" control={<Radio />} label="5x" />
                            <FormControlLabel value="6" control={<Radio />} label="6x" />
                          </RadioGroup>
                        </FormControl>
                      )}
                      
                      <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: '8px' }}>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="body1">
                              Total a Pagar:
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body1" align="right" fontWeight="bold">
                              {formatCurrency(order.total)}
                            </Typography>
                          </Grid>
                          {cardType === 'credit' && installments > 1 && (
                            <>
                              <Grid item xs={6}>
                                <Typography variant="body1">
                                  Parcelas:
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="body1" align="right" fontWeight="bold">
                                  {installments}x de {formatCurrency(order.total / installments)}
                                </Typography>
                              </Grid>
                            </>
                          )}
                        </Grid>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                        Insira ou aproxime o cartão na máquina de pagamento
                      </Typography>
                    </Box>
                  )}
                  
                  {paymentMethod === 'pix' && (
                    <Box sx={{ mb: 3, textAlign: 'center' }}>
                      <Box sx={{ mb: 3, p: 3, border: '1px dashed #ccc', borderRadius: '8px' }}>
                        <Typography variant="body1" paragraph>
                          QR Code PIX
                        </Typography>
                        <Box sx={{ width: '200px', height: '200px', bgcolor: '#f0f0f0', mx: 'auto', mb: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                          Escaneie o QR Code com o aplicativo do seu banco
                        </Typography>
                      </Box>
                      
                      <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: '8px' }}>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="body1">
                              Total a Pagar:
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body1" align="right" fontWeight="bold">
                              {formatCurrency(order.total)}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Aguardando confirmação de pagamento...
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
              
              {paymentTab === 1 && (
                <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: '8px' }}>
                  <Typography variant="h6" gutterBottom align="center">
                    RECIBO DE VENDA
                  </Typography>
                  <Typography variant="body2" align="center" paragraph>
                    Terminal POS #{posId} | Operador: {user?.name || 'Não identificado'}
                  </Typography>
                  <Typography variant="body2" align="center" paragraph>
                    Data: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="body2" paragraph>
                    Pedido: #{order.id}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    {order.items.map((item, index) => (
                      <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">
                          {item.quantity}x {item.product_name}
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(item.total_price)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight="bold">
                      TOTAL:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(order.total)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">
                      Forma de Pagamento:
                    </Typography>
                    <Typography variant="body2">
                      {paymentMethod === 'cash' ? 'Dinheiro' : 
                       paymentMethod === 'card' ? `Cartão ${cardType === 'credit' ? 'de Crédito' : 'de Débito'}` : 
                       'PIX'}
                    </Typography>
                  </Box>
                  
                  {paymentMethod === 'cash' && (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">
                          Valor Recebido:
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(parseFloat(paymentAmount) || 0)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">
                          Troco:
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(changeAmount)}
                        </Typography>
                      </Box>
                    </>
                  )}
                  
                  {paymentMethod === 'card' && cardType === 'credit' && installments > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">
                        Parcelas:
                      </Typography>
                      <Typography variant="body2">
                        {installments}x de {formatCurrency(order.total / installments)}
                      </Typography>
                    </Box>
                  )}
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="body2" align="center">
                    Obrigado pela preferência!
                  </Typography>
                </Box>
              )}
            </Box>
          </StyledPaper>
        </Grid>
      </Grid>
      
      {/* Diálogo de confirmação de pagamento */}
      <Dialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmar Pagamento</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Você está prestes a finalizar o pagamento do pedido #{order.id} no valor de <strong>{formatCurrency(order.total)}</strong>.
          </Typography>
          <Typography variant="body1" paragraph>
            Forma de pagamento: <strong>
              {paymentMethod === 'cash' ? 'Dinheiro' : 
               paymentMethod === 'card' ? `Cartão ${cardType === 'credit' ? 'de Crédito' : 'de Débito'}` : 
               'PIX'}
            </strong>
          </Typography>
          {paymentMethod === 'cash' && (
            <>
              <Typography variant="body1">
                Valor recebido: <strong>{formatCurrency(parseFloat(paymentAmount) || 0)}</strong>
              </Typography>
              <Typography variant="body1">
                Troco: <strong>{formatCurrency(changeAmount)}</strong>
              </Typography>
            </>
          )}
          {paymentMethod === 'card' && cardType === 'credit' && installments > 1 && (
            <Typography variant="body1">
              Parcelas: <strong>{installments}x de {formatCurrency(order.total / installments)}</strong>
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button onClick={confirmPayment} variant="contained" color="primary">
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de recibo */}
      <Dialog
        open={receiptDialogOpen}
        onClose={() => setReceiptDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Pagamento Concluído</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <CheckIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" color="success.main" gutterBottom>
              Pagamento Realizado com Sucesso!
            </Typography>
            <Typography variant="body1" paragraph>
              O pedido #{order.id} foi finalizado e o pagamento foi processado.
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={() => {
                // Reimprimir recibo
                PrinterService.printReceipt({
                  order_id: order.id,
                  terminal_id: `POS-${posId}`,
                  cashier_id: cashierStatus?.id,
                  operator_name: user?.name,
                  items: order.items,
                  total: order.total,
                  payment_method: paymentMethod,
                  payment_details: {
                    card_type: cardType,
                    installments: installments,
                    amount_received: parseFloat(paymentAmount),
                    change: changeAmount
                  },
                  date: new Date()
                });
              }}
            >
              Imprimir Recibo
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFinish} variant="contained" color="primary">
            Concluir
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Alerta de notificação */}
      <Snackbar
        open={alertInfo.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseAlert} severity={alertInfo.severity} sx={{ width: '100%' }}>
          {alertInfo.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default POSPaymentPage;
