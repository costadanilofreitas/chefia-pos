import React, { useState, useEffect, ChangeEvent } from 'react';
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
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Payment as PaymentIcon,
  AttachMoney as CashIcon,
  CreditCard as CardIcon,
  Smartphone as PixIcon,
  ArrowBack as ArrowBackIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { useAuth } from '@common/contexts/auth/hooks/useAuth';
import { useCashier } from '@common/contexts/cashier/hooks/useCashier';
import { useOrder } from '@common/contexts/order/hooks/useOrder';
import { formatCurrency } from '@common/utils/formatters';
import PrinterService from '../services/PrinterService';

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

const POSPaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const { cashierStatus } = useCashier();
  const { getOrderById, updateOrder, processPayment, loading } = useOrder();

  const params = new URLSearchParams(location.search);
  const posId = params.get('pos') || '1';

  const [order, setOrder] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const [alertInfo, setAlertInfo] = useState<{ open: boolean; message: string; severity: 'info' | 'error' | 'success' }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [paymentDialogOpen, setPaymentDialogOpen] = useState<boolean>(false);
  // Removed unused paymentComplete state

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const orderData = await getOrderById(orderId!);
        setOrder(orderData);
        setPaymentAmount(orderData.total.toFixed(2));
      } catch (error: any) {
        setAlertInfo({
          open: true,
          message: `Erro ao carregar pedido: ${error.message}`,
          severity: 'error',
        });
      }
    };

    if (orderId) {
      loadOrder();
    }
  }, [orderId, getOrderById]);

  useEffect(() => {
    if (order && paymentMethod === 'cash' && paymentAmount) {
      const change = parseFloat(paymentAmount) - order.total;
      setChangeAmount(change > 0 ? change : 0);
    } else {
      setChangeAmount(0);
    }
  }, [paymentAmount, order, paymentMethod]);

  const handlePaymentAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) return;
    if (parts.length === 2 && parts[1] && parts[1].length > 2) return;
    setPaymentAmount(value);
  };

  const handleProcessPayment = async () => {
    if (!order) return;

    if (paymentMethod === 'cash' && (!paymentAmount || parseFloat(paymentAmount) < order.total)) {
      setAlertInfo({
        open: true,
        message: 'O valor do pagamento deve ser igual ou maior que o total do pedido.',
        severity: 'error',
      });
      return;
    }

    try {
      const paymentData = {
        order_id: order.id,
        cashier_id: cashierStatus?.id,
        terminal_id: `POS-${posId}`,
        operator_id: user?.id,
        amount: order.total,
        payment_method: paymentMethod,
        status: 'completed',
        details: paymentMethod === 'cash' ? { amount_received: parseFloat(paymentAmount), change: changeAmount } : {},
      };

      await processPayment(paymentData);
      await updateOrder(order.id, { ...order, status: 'completed', payment_status: 'paid', payment_method: paymentMethod });

      // Removed setPaymentComplete as paymentComplete state is no longer used
      setPaymentDialogOpen(false);
      setAlertInfo({
        open: true,
        message: 'Pagamento realizado com sucesso!',
        severity: 'success',
      });
    } catch (error: any) {
      setAlertInfo({
        open: true,
        message: `Erro ao processar pagamento: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handleReprintReceipt = async () => {
    if (!order) {
      setAlertInfo({
        open: true,
        message: 'Pedido não encontrado para reimpressão.',
        severity: 'error',
      });
      return;
    }
  
    try {
      await PrinterService.printReceipt({
        order_id: order.id,
        cashier_id: cashierStatus?.id || 'Unknown',
        terminal_id: `POS-${posId}`,
        operator_name: user?.name || 'Desconhecido',
        items: order.items,
        total: order.total,
        payment_method: paymentMethod,
        change: changeAmount,
        date: new Date(),
      });
  
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
    }
  };

  const handleFinish = () => {
    navigate(`/pos?pos=${posId}`);
  };

  const handleCloseAlert = () => {
    setAlertInfo({ ...alertInfo, open: false });
  };

  if (loading || !order) {
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
        </Box>
        <Box>
          <Typography variant="subtitle1" color="text.secondary">
            Terminal POS #{posId} | Operador: {user?.name || 'Não identificado'}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <StyledPaper>
            <Typography variant="h5" component="h2" gutterBottom>
              Resumo do Pedido #{order.id}
            </Typography>
            <List>
              {order.items.map((item: any) => (
                <ListItem key={item.id}>
                  <ListItemText
                    primary={`${item.quantity}x ${item.product_name}`}
                    secondary={formatCurrency(item.total_price)}
                  />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" align="right">
              Total: {formatCurrency(order.total)}
            </Typography>
          </StyledPaper>
        </Grid>

        <Grid item xs={12} md={7}>
          <StyledPaper>
            <Typography variant="h5" component="h2" gutterBottom>
              Forma de Pagamento
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Button
                variant={paymentMethod === 'cash' ? 'contained' : 'outlined'}
                startIcon={<CashIcon />}
                onClick={() => setPaymentMethod('cash')}
                sx={{ mr: 2 }}
              >
                Dinheiro
              </Button>
              <Button
                variant={paymentMethod === 'card' ? 'contained' : 'outlined'}
                startIcon={<CardIcon />}
                onClick={() => setPaymentMethod('card')}
                sx={{ mr: 2 }}
              >
                Cartão
              </Button>
              <Button
                variant={paymentMethod === 'pix' ? 'contained' : 'outlined'}
                startIcon={<PixIcon />}
                onClick={() => setPaymentMethod('pix')}
              >
                PIX
              </Button>
            </Box>

            {paymentMethod === 'cash' && (
              <Box>
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
                />
                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                  Troco: {formatCurrency(changeAmount)}
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
              sx={{ mt: 3 }}
            >
              Confirmar Pagamento
            </Button>

            <Button
              variant="outlined"
              color="primary"
              fullWidth
              size="large"
              startIcon={<PrintIcon />}
              onClick={handleReprintReceipt}
              sx={{ mt: 2 }}
            >
              Reimprimir Recibo
            </Button>
          </StyledPaper>
        </Grid>
      </Grid>

      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar Pagamento</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Você está prestes a finalizar o pagamento do pedido #{order.id} no valor de <strong>{formatCurrency(order.total)}</strong>.
          </Typography>
          <Typography variant="body1">
            Forma de pagamento: <strong>{paymentMethod === 'cash' ? 'Dinheiro' : paymentMethod === 'card' ? 'Cartão' : 'PIX'}</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button onClick={handleProcessPayment} variant="contained" color="primary">
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

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
