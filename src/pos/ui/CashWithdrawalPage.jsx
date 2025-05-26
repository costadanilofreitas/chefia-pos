import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  IconButton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Add as AddIcon,
  Remove as RemoveIcon,
  MonetizationOn as MoneyIcon,
  CreditCard as CardIcon,
  Smartphone as PixIcon,
  Print as PrintIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useAuth } from '../../auth/hooks/useAuth';
import { useCashier } from '../hooks/useCashier';
import { useBusinessDay } from '../../business_day/hooks/useBusinessDay';
import { formatCurrency } from '../../utils/formatters';
import PrinterService from '../../services/PrinterService';

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

const ActionButton = styled(Button)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: '8px',
  fontWeight: 'bold',
  fontSize: '1rem',
  textTransform: 'none',
  minHeight: '60px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.2s ease',
  marginBottom: theme.spacing(2),
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
}));

const PaymentButton = styled(Button)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: '12px',
  fontWeight: 'bold',
  fontSize: '1.2rem',
  textTransform: 'none',
  minHeight: '80px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.2s ease',
  marginBottom: theme.spacing(3),
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
  },
}));

const CashWithdrawalPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { 
    cashierStatus, 
    performCashWithdrawal,
    isLoading 
  } = useCashier();
  const { businessDayStatus } = useBusinessDay();
  
  // Extrair o ID do POS dos parâmetros da URL
  const params = new URLSearchParams(location.search);
  const posId = params.get('pos') || '1';
  
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ open: false, message: '', severity: 'info' });
  
  useEffect(() => {
    // Verificar se o caixa está aberto
    if (!cashierStatus || cashierStatus.status !== 'open') {
      setAlertInfo({
        open: true,
        message: 'O caixa precisa estar aberto para realizar uma retirada.',
        severity: 'error'
      });
      
      // Redirecionar para a página principal após um breve delay
      setTimeout(() => {
        navigate(`/pos?pos=${posId}`);
      }, 2000);
    }
  }, [cashierStatus, navigate, posId]);
  
  const handleAmountChange = (e) => {
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
    
    setAmount(value);
  };
  
  const handleWithdrawal = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setAlertInfo({
        open: true,
        message: 'Por favor, informe um valor válido para a retirada.',
        severity: 'error'
      });
      return;
    }
    
    if (parseFloat(amount) > cashierStatus.expected_balance) {
      setAlertInfo({
        open: true,
        message: 'O valor da retirada não pode ser maior que o saldo disponível no caixa.',
        severity: 'error'
      });
      return;
    }
    
    setConfirmDialogOpen(true);
  };
  
  const confirmWithdrawal = async () => {
    try {
      await performCashWithdrawal({
        cashier_id: cashierStatus.id,
        amount: parseFloat(amount),
        reason: reason || 'Retirada de caixa',
        performed_by: user.id
      });
      
      // Imprimir comprovante de retirada
      await PrinterService.printCashWithdrawalReceipt({
        cashier_id: cashierStatus.id,
        terminal_id: `POS-${posId}`,
        user_name: user.name,
        amount: parseFloat(amount),
        reason: reason || 'Retirada de caixa',
        date: new Date()
      });
      
      setConfirmDialogOpen(false);
      setAlertInfo({
        open: true,
        message: 'Retirada realizada com sucesso!',
        severity: 'success'
      });
      
      // Limpar os campos
      setAmount('');
      setReason('');
      
      // Redirecionar para a página principal após um breve delay
      setTimeout(() => {
        navigate(`/pos?pos=${posId}`);
      }, 2000);
      
    } catch (error) {
      setConfirmDialogOpen(false);
      setAlertInfo({
        open: true,
        message: `Erro ao realizar retirada: ${error.message}`,
        severity: 'error'
      });
    }
  };
  
  const handleCancel = () => {
    navigate(`/pos?pos=${posId}`);
  };
  
  const handleCloseAlert = () => {
    setAlertInfo({ ...alertInfo, open: false });
  };
  
  if (isLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }
  
  // Se o caixa não estiver aberto, não renderizar o conteúdo principal
  if (!cashierStatus || cashierStatus.status !== 'open') {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <StyledPaper>
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography variant="h5" component="h1" gutterBottom>
              Caixa Fechado
            </Typography>
            <Typography variant="body1" paragraph>
              É necessário que o caixa esteja aberto para realizar uma retirada.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate(`/pos?pos=${posId}`)}
            >
              Voltar para a Página Principal
            </Button>
          </Box>
        </StyledPaper>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#333' }}>
          Retirada de Caixa (Ruptura)
        </Typography>
        <Box>
          <Typography variant="subtitle1" color="text.secondary">
            Terminal POS #{posId} | Operador: {user?.name || 'Não identificado'}
          </Typography>
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <StyledPaper>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
              Informações da Retirada
            </Typography>
            
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                Valor da Retirada:
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                InputProps={{
                  startAdornment: <Typography variant="body1" sx={{ mr: 1 }}>R$</Typography>,
                }}
                sx={{ mb: 1 }}
              />
              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Button 
                    variant="outlined" 
                    fullWidth
                    onClick={() => setAmount('10.00')}
                  >
                    R$ 10,00
                  </Button>
                </Grid>
                <Grid item xs={4}>
                  <Button 
                    variant="outlined" 
                    fullWidth
                    onClick={() => setAmount('50.00')}
                  >
                    R$ 50,00
                  </Button>
                </Grid>
                <Grid item xs={4}>
                  <Button 
                    variant="outlined" 
                    fullWidth
                    onClick={() => setAmount('100.00')}
                  >
                    R$ 100,00
                  </Button>
                </Grid>
              </Grid>
            </Box>
            
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                Motivo da Retirada:
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                multiline
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Informe o motivo da retirada..."
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 'auto' }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                size="large"
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<MoneyIcon />}
                onClick={handleWithdrawal}
                size="large"
                disabled={!amount || parseFloat(amount) <= 0}
              >
                Confirmar Retirada
              </Button>
            </Box>
          </StyledPaper>
        </Grid>
        
        <Grid item xs={12} md={5}>
          <StyledPaper>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
              Informações do Caixa
            </Typography>
            
            <Box sx={{ mb: 4 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Saldo Inicial:
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {formatCurrency(cashierStatus.opening_balance)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Saldo Atual:
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="success.main">
                    {formatCurrency(cashierStatus.expected_balance)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Vendas em Dinheiro:
                  </Typography>
                  <Typography variant="body1">
                    {formatCurrency(cashierStatus.cash_sales || 0)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Vendas em Cartão:
                  </Typography>
                  <Typography variant="body1">
                    {formatCurrency(cashierStatus.card_sales || 0)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Vendas em PIX:
                  </Typography>
                  <Typography variant="body1">
                    {formatCurrency(cashierStatus.pix_sales || 0)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Retiradas Anteriores:
                  </Typography>
                  <Typography variant="body1" color="error.main">
                    {formatCurrency(cashierStatus.cash_out || 0)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Após a Retirada:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Saldo Atual:
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="success.main">
                {formatCurrency(cashierStatus.expected_balance)}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Valor da Retirada:
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="error.main">
                {amount ? `- ${formatCurrency(parseFloat(amount))}` : '- R$ 0,00'}
              </Typography>
              
              <Divider sx={{ my: 1 }} />
              
              <Typography variant="body2" color="text.secondary">
                Novo Saldo:
              </Typography>
              <Typography variant="h5" fontWeight="bold" color={
                !amount ? 'text.primary' :
                parseFloat(amount) > cashierStatus.expected_balance ? 'error.main' : 'success.main'
              }>
                {!amount ? formatCurrency(cashierStatus.expected_balance) : 
                  formatCurrency(cashierStatus.expected_balance - parseFloat(amount))}
              </Typography>
              
              {amount && parseFloat(amount) > cashierStatus.expected_balance && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                  O valor da retirada não pode ser maior que o saldo disponível.
                </Typography>
              )}
            </Box>
          </StyledPaper>
        </Grid>
      </Grid>
      
      {/* Diálogo de Confirmação */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmar Retirada</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Você está prestes a realizar uma retirada de <strong>{formatCurrency(parseFloat(amount) || 0)}</strong> do caixa.
          </Typography>
          <Typography variant="body1" paragraph>
            Motivo: <strong>{reason || 'Retirada de caixa'}</strong>
          </Typography>
          <Typography variant="body1">
            Esta operação não pode ser desfeita. Deseja continuar?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button onClick={confirmWithdrawal} variant="contained" color="primary">
            Confirmar
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

export default CashWithdrawalPage;
