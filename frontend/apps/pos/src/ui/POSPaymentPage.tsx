import React, { useState, useEffect, ChangeEvent, useCallback, useMemo } from 'react';
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
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Payment as PaymentIcon,
  AttachMoney as CashIcon,
  CreditCard as CardIcon,
  Smartphone as PixIcon,
  ArrowBack as ArrowBackIcon,
  Print as PrintIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useCashier } from '../hooks/useCashier';
import { formatCurrency } from '../utils/formatters';

// Styled components
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

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: string;
  payment_status?: string;
  payment_method?: string;
}

const POSPaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { terminalId } = useParams<{ terminalId: string }>();
  const { user } = useAuth();
  const { currentCashier } = useCashier();

  // Estados estáveis
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState<boolean>(false);
  const [alertInfo, setAlertInfo] = useState<{ 
    open: boolean; 
    message: string; 
    severity: 'info' | 'error' | 'success' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Carregar pedido do state ou criar mock
  useEffect(() => {
    const orderFromState = location.state?.order;
    
    if (orderFromState) {
      setOrder(orderFromState);
      setPaymentAmount(orderFromState.total.toFixed(2));
    } else {
      // Mock order para demonstração
      const mockOrder: Order = {
        id: `ORDER-${Date.now()}`,
        items: [
          {
            id: '1',
            product_name: 'Hambúrguer Clássico',
            quantity: 2,
            unit_price: 25.90,
            total_price: 51.80
          },
          {
            id: '2',
            product_name: 'Refrigerante Lata',
            quantity: 2,
            unit_price: 5.50,
            total_price: 11.00
          }
        ],
        total: 62.80,
        status: 'pending'
      };
      setOrder(mockOrder);
      setPaymentAmount(mockOrder.total.toFixed(2));
    }
  }, [location.state]);

  // Calcular troco de forma estável
  const calculatedChange = useMemo(() => {
    if (order && paymentMethod === 'cash' && paymentAmount) {
      const change = parseFloat(paymentAmount) - order.total;
      return change > 0 ? change : 0;
    }
    return 0;
  }, [paymentAmount, order, paymentMethod]);

  useEffect(() => {
    setChangeAmount(calculatedChange);
  }, [calculatedChange]);

  // Funções estáveis com useCallback
  const handlePaymentAmountChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) return;
    if (parts.length === 2 && parts[1] && parts[1].length > 2) return;
    setPaymentAmount(value);
  }, []);

  const handleProcessPayment = useCallback(async () => {
    if (!order) return;

    if (paymentMethod === 'cash' && (!paymentAmount || parseFloat(paymentAmount) < order.total)) {
      setAlertInfo({
        open: true,
        message: 'O valor do pagamento deve ser igual ou maior que o total do pedido.',
        severity: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      // Simular processamento do pagamento
      await new Promise(resolve => setTimeout(resolve, 2000));

      const paymentData = {
        order_id: order.id,
        cashier_id: currentCashier?.id || 'CASHIER-1',
        terminal_id: `POS-${terminalId}`,
        operator_id: user?.id || 'USER-1',
        amount: order.total,
        payment_method: paymentMethod,
        status: 'completed',
        details: paymentMethod === 'cash' ? { 
          amount_received: parseFloat(paymentAmount), 
          change: changeAmount 
        } : {},
      };

      // Atualizar order com dados do pagamento
      const updatedOrder = {
        ...order,
        status: 'completed',
        payment_status: 'paid',
        payment_method: paymentMethod
      };
      setOrder(updatedOrder);

      setPaymentComplete(true);
      setPaymentDialogOpen(false);
      setAlertInfo({
        open: true,
        message: 'Pagamento realizado com sucesso!',
        severity: 'success',
      });

      // Simular impressão do recibo
      console.log('Imprimindo recibo...', paymentData);

    } catch (error: any) {
      setAlertInfo({
        open: true,
        message: `Erro ao processar pagamento: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [order, paymentMethod, paymentAmount, changeAmount, currentCashier?.id, terminalId, user?.id]);

  const handleReprintReceipt = useCallback(async () => {
    if (!order) {
      setAlertInfo({
        open: true,
        message: 'Pedido não encontrado para reimpressão.',
        severity: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      // Simular reimpressão
      await new Promise(resolve => setTimeout(resolve, 1000));

      setAlertInfo({
        open: true,
        message: 'Recibo reimpresso com sucesso!',
        severity: 'success',
      });
    } catch (error: any) {
      setAlertInfo({
        open: true,
        message: `Erro ao reimprimir recibo: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [order]);

  const handleFinish = useCallback(() => {
    navigate(`/pos/${terminalId}/main`);
  }, [navigate, terminalId]);

  const handleNewOrder = useCallback(() => {
    navigate(`/pos/${terminalId}/order`);
  }, [navigate, terminalId]);

  const handleCloseAlert = useCallback(() => {
    setAlertInfo(prev => ({ ...prev, open: false }));
  }, []);

  if (!order) {
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
          <IconButton color="inherit" onClick={handleFinish} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#333' }}>
            Pagamento
          </Typography>
          {paymentComplete && (
            <Chip 
              icon={<CheckIcon />} 
              label="Pago" 
              color="success" 
              sx={{ ml: 2 }}
            />
          )}
        </Box>
        <Box>
          <Typography variant="subtitle1" color="text.secondary">
            Terminal {terminalId} | Operador: {user?.name || 'Não identificado'}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Resumo do Pedido */}
        <Grid item xs={12} md={5}>
          <StyledPaper>
            <Typography variant="h5" component="h2" gutterBottom>
              Resumo do Pedido #{order.id.split('-').pop()}
            </Typography>
            <List>
              {order.items.map((item) => (
                <ListItem key={item.id} sx={{ px: 0 }}>
                  <ListItemText
                    primary={`${item.quantity}x ${item.product_name}`}
                    secondary={`${formatCurrency(item.unit_price)} cada`}
                  />
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(item.total_price)}
                  </Typography>
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h5" color="primary.main" fontWeight="bold">
                {formatCurrency(order.total)}
              </Typography>
            </Box>
          </StyledPaper>
        </Grid>

        {/* Forma de Pagamento */}
        <Grid item xs={12} md={7}>
          <StyledPaper>
            <Typography variant="h5" component="h2" gutterBottom>
              Forma de Pagamento
            </Typography>
            
            {!paymentComplete && (
              <>
                <Box sx={{ mb: 3 }}>
                  <Button
                    variant={paymentMethod === 'cash' ? 'contained' : 'outlined'}
                    startIcon={<CashIcon />}
                    onClick={() => setPaymentMethod('cash')}
                    sx={{ mr: 2, mb: 1 }}
                    size="large"
                  >
                    Dinheiro
                  </Button>
                  <Button
                    variant={paymentMethod === 'card' ? 'contained' : 'outlined'}
                    startIcon={<CardIcon />}
                    onClick={() => setPaymentMethod('card')}
                    sx={{ mr: 2, mb: 1 }}
                    size="large"
                  >
                    Cartão
                  </Button>
                  <Button
                    variant={paymentMethod === 'pix' ? 'contained' : 'outlined'}
                    startIcon={<PixIcon />}
                    onClick={() => setPaymentMethod('pix')}
                    sx={{ mb: 1 }}
                    size="large"
                  >
                    PIX
                  </Button>
                </Box>

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
                      sx={{ mb: 2 }}
                    />
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="h6" color="primary.main">
                        Troco: {formatCurrency(changeAmount)}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {paymentMethod === 'card' && (
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                    <Typography variant="body1" color="info.contrastText">
                      💳 Insira ou aproxime o cartão na máquina
                    </Typography>
                  </Box>
                )}

                {paymentMethod === 'pix' && (
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                    <Typography variant="body1" color="success.contrastText">
                      📱 QR Code será gerado para pagamento PIX
                    </Typography>
                  </Box>
                )}

                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  startIcon={<PaymentIcon />}
                  onClick={() => setPaymentDialogOpen(true)}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Confirmar Pagamento'}
                </Button>
              </>
            )}

            {paymentComplete && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                <Typography variant="h5" color="success.main" gutterBottom>
                  Pagamento Realizado!
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Método: {paymentMethod === 'cash' ? 'Dinheiro' : paymentMethod === 'card' ? 'Cartão' : 'PIX'}
                </Typography>
                {paymentMethod === 'cash' && changeAmount > 0 && (
                  <Typography variant="h6" color="primary.main" gutterBottom>
                    Troco: {formatCurrency(changeAmount)}
                  </Typography>
                )}
                
                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleNewOrder}
                    sx={{ mr: 2, mb: 1 }}
                  >
                    Novo Pedido
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="large"
                    startIcon={<PrintIcon />}
                    onClick={handleReprintReceipt}
                    sx={{ mb: 1 }}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={20} /> : 'Reimprimir'}
                  </Button>
                </Box>
              </Box>
            )}
          </StyledPaper>
        </Grid>
      </Grid>

      {/* Dialog de Confirmação */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar Pagamento</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Você está prestes a finalizar o pagamento do pedido #{order.id.split('-').pop()} no valor de <strong>{formatCurrency(order.total)}</strong>.
          </Typography>
          <Typography variant="body1" paragraph>
            Forma de pagamento: <strong>
              {paymentMethod === 'cash' ? 'Dinheiro' : 
               paymentMethod === 'card' ? 'Cartão' : 'PIX'}
            </strong>
          </Typography>
          {paymentMethod === 'cash' && changeAmount > 0 && (
            <Typography variant="body1" color="primary.main">
              Troco a ser dado: <strong>{formatCurrency(changeAmount)}</strong>
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button 
            onClick={handleProcessPayment} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificações */}
      <Snackbar
        open={alertInfo.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseAlert} severity={alertInfo.severity} sx={{ width: '100%' }}>
          {alertInfo.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default POSPaymentPage;

