import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Box,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Chip,
  Divider,
  Paper,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  AccountBalance,
  Close as CloseIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  AttachMoney,
  TrendingUp,
  TrendingDown,
  LockOpen as OpenIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useCashier } from '../../../../common/src/contexts/cashier/hooks/useCashier';
import LoginModal from '../components/LoginModal';
import { useBusinessDay } from '../hooks/mocks/useBusinessDay';
import { formatCurrency } from '../utils/formatters';
import NumericKeypad from '../components/NumericKeypad';
import PrinterService from '../services/PrinterService';

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  background: 'linear-gradient(to bottom, #ffffff, #f9f9f9)',
  border: '1px solid #e0e0e0',
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
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
}));

const OpenCashierButton = styled(ActionButton)(({ theme }) => ({
  backgroundColor: theme.palette.success.main,
  color: theme.palette.common.white,
  '&:hover': {
    backgroundColor: theme.palette.success.dark,
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
}));

const CloseCashierButton = styled(ActionButton)(({ theme }) => ({
  backgroundColor: theme.palette.error.main,
  color: theme.palette.common.white,
  '&:hover': {
    backgroundColor: theme.palette.error.dark,
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
}));

const LoginButton = styled(ActionButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
}));

const CashierOpeningClosingPage: React.FC = () => {
  const navigate = useNavigate();
  const { terminalId } = useParams<{ terminalId: string }>();
  const { user, isAuthenticated, login } = useAuth();
  const {
    openCashier,
    closeCashier,
    getCurrentCashier,
    cashierStatus,
    isLoading,
  } = useCashier();
  const { currentBusinessDay } = useBusinessDay();

  const [loginDialogVisible, setLoginDialogVisible] = useState(false);
  const [openDialogVisible, setOpenDialogVisible] = useState(false);
  const [closeDialogVisible, setCloseDialogVisible] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [observations, setObservations] = useState('');
  const [alertInfo, setAlertInfo] = useState({
    open: false,
    message: '',
    severity: 'info' as 'success' | 'error' | 'warning' | 'info',
  });

  useEffect(() => {
    const checkCashierStatus = async () => {
      try {
        await getCurrentCashier();
      } catch (error) {
        console.error('Erro ao verificar status do caixa:', error);
      }
    };

    checkCashierStatus();
  }, []); // Executa apenas uma vez na montagem do componente

  const handleLoginSuccess = () => {
    console.log('🎉 Login successful! Refreshing cashier status...');
    setAlertInfo({
      open: true,
      message: 'Login realizado com sucesso!',
      severity: 'success',
    });
    // Refresh cashier status after login
    getCurrentCashier();
  };

  const handleOpenCashier = async () => {
    if (!openingAmount || parseFloat(openingAmount) <= 0) {
      setAlertInfo({
        open: true,
        message: 'Por favor, informe um valor válido para abertura do caixa.',
        severity: 'error',
      });
      return;
    }

    try {
      await openCashier({
        terminal_id: `POS-${terminalId}`,
        business_day_id: currentBusinessDay?.id || 'default',
        opening_balance: parseFloat(openingAmount),
        notes,
      });

      await PrinterService.printOpeningReceipt({
        cashier_id: cashierStatus?.id,
        terminal_id: `POS-${terminalId}`,
        user_name: user?.name ?? '',
        opening_balance: parseFloat(openingAmount),
        date: new Date(),
        notes,
      });

      setOpenDialogVisible(false);
      setAlertInfo({
        open: true,
        message: 'Caixa aberto com sucesso!',
        severity: 'success',
      });

      // Redirecionar para a tela principal após abrir o caixa
      setTimeout(() => {
        navigate(`/pos/${terminalId}/main`);
      }, 1500);
    } catch (error: any) {
      setAlertInfo({
        open: true,
        message: `Erro ao abrir caixa: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handleCloseCashier = async () => {
    if (!closingAmount || parseFloat(closingAmount) < 0) {
      setAlertInfo({
        open: true,
        message: 'Por favor, informe um valor válido para fechamento do caixa.',
        severity: 'error',
      });
      return;
    }

    try {
      await closeCashier({
        id: cashierStatus?.id || '',
        closing_balance: parseFloat(closingAmount),
        notes,
      });

      await PrinterService.printClosingReceipt({
        cashier_id: cashierStatus?.id,
        terminal_id: `POS-${terminalId}`,
        user_name: user?.name ?? '',
        opening_balance: cashierStatus?.opening_balance,
        closing_balance: parseFloat(closingAmount),
        expected_balance: cashierStatus?.expected_balance,
        difference: parseFloat(closingAmount) - (cashierStatus?.expected_balance ?? 0),
        cash_sales: cashierStatus?.cash_sales,
        card_sales: cashierStatus?.card_sales,
        pix_sales: cashierStatus?.pix_sales,
        other_sales: cashierStatus?.other_sales,
        cash_in: cashierStatus?.cash_in,
        cash_out: cashierStatus?.cash_out,
        date: new Date(),
        notes,
      });

      setCloseDialogVisible(false);
      setAlertInfo({
        open: true,
        message: 'Caixa fechado com sucesso!',
        severity: 'success',
      });
    } catch (error: any) {
      setAlertInfo({
        open: true,
        message: `Erro ao fechar caixa: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handleKeypadInput = (value: string, isOpeningDialog: boolean) => {
    if (isOpeningDialog) {
      setOpeningAmount(value);
    } else {
      setClosingAmount(value);
    }
  };

  const handleCloseAlert = () => {
    setAlertInfo({ ...alertInfo, open: false });
  };

  if (isLoading) {
    return (
      <Container maxWidth="sm" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  // Se não está autenticado, mostrar opção de login
  if (!isAuthenticated) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <StyledPaper>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
              Sistema POS - Terminal {terminalId}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Faça login para acessar o sistema
            </Typography>
          </Box>
          
          <Grid container spacing={4} justifyContent="center">
            <Grid item xs={12} md={6}>
              <Card elevation={3}>
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                  <LoginIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h5" component="h2" gutterBottom>
                    Acesso ao Sistema
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    Entre com suas credenciais para acessar o sistema POS
                  </Typography>
                  <LoginButton
                    variant="contained"
                    startIcon={<LoginIcon />}
                    onClick={() => setLoginDialogVisible(true)}
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    Fazer Login
                  </LoginButton>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </StyledPaper>

        {/* Novo LoginModal */}
        <LoginModal
          open={loginDialogVisible}
          onClose={() => setLoginDialogVisible(false)}
          onSuccess={handleLoginSuccess}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <StyledPaper>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
            Gerenciamento de Caixa
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Terminal: {terminalId} | Operador: {user?.name || 'Não identificado'}
          </Typography>
          {currentBusinessDay && (
            <Typography variant="subtitle1" color="text.secondary">
              Dia de Operação: {new Date(currentBusinessDay.opened_at).toLocaleDateString()}
            </Typography>
          )}
        </Box>

        {/* Status do Caixa */}
        <Box sx={{ mb: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status do Caixa
              </Typography>
              <Typography 
                variant="h4" 
                color={cashierStatus?.status === 'open' ? 'success.main' : 'text.secondary'}
                sx={{ fontWeight: 'bold', mb: 2 }}
              >
                {cashierStatus?.status === 'open' ? '🟢 ABERTO' : '🔴 FECHADO'}
              </Typography>
              {cashierStatus?.status === 'open' && (
                <Typography variant="body2" color="text.secondary">
                  Aberto em: {new Date(cashierStatus.opened_at).toLocaleString()}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
        
        <Grid container spacing={4} justifyContent="center">
          {!cashierStatus || cashierStatus.status !== 'open' ? (
            <Grid item xs={12} md={6}>
              <Card elevation={3}>
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <OpenIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                  <Typography variant="h5" component="h2" gutterBottom>
                    Abrir Caixa
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    Inicie um novo turno de operação abrindo o caixa com o valor inicial.
                  </Typography>
                  <OpenCashierButton
                    variant="contained"
                    startIcon={<MoneyIcon />}
                    onClick={() => setOpenDialogVisible(true)}
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    Abrir Caixa
                  </OpenCashierButton>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            <Grid item xs={12} md={6}>
              <Card elevation={3}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <CloseIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                    <Typography variant="h5" component="h2" gutterBottom>
                      Fechar Caixa
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph>
                      Finalize o turno de operação fechando o caixa e contabilizando os valores.
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Saldo Inicial:
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {formatCurrency(cashierStatus.opening_balance)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Saldo Esperado:
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {formatCurrency(cashierStatus.expected_balance)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Vendas em Dinheiro:
                      </Typography>
                      <Typography variant="body1">
                        {formatCurrency(cashierStatus.cash_sales)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Vendas em Cartão:
                      </Typography>
                      <Typography variant="body1">
                        {formatCurrency(cashierStatus.card_sales)}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <CloseCashierButton
                    variant="contained"
                    startIcon={<CloseIcon />}
                    onClick={() => setCloseDialogVisible(true)}
                    fullWidth
                  >
                    Fechar Caixa
                  </CloseCashierButton>
                </CardContent>
              </Card>
            </Grid>
          )}
          
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <PersonIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h5" component="h2" gutterBottom>
                    Informações do Operador
                  </Typography>
                </Box>
                
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Nome:
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {user?.name || 'Não identificado'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Função:
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {user?.role || 'Não definida'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Terminal:
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      POS-{terminalId}
                    </Typography>
                  </Grid>
                </Grid>
                
                <ActionButton
                  variant="outlined"
                  color="primary"
                  startIcon={<ReceiptIcon />}
                  onClick={() => navigate(`/pos/${terminalId}/manager`)}
                  fullWidth
                >
                  Relatórios
                </ActionButton>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </StyledPaper>
      
      {/* Diálogo de Abertura de Caixa */}
      <Dialog 
        open={openDialogVisible} 
        onClose={() => setOpenDialogVisible(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '70vh' }
        }}
      >
        <DialogTitle>
          <Typography variant="h5">Abertura de Caixa</Typography>
          <Typography variant="body2" color="text.secondary">
            Terminal {terminalId} - {user?.name}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Valor Inicial em Caixa:
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                value={`R$ ${openingAmount}`}
                InputProps={{
                  readOnly: true,
                }}
                sx={{ mb: 3 }}
              />
              <Box sx={{ 
                border: '1px solid #e0e0e0', 
                borderRadius: 2, 
                p: 2,
                maxHeight: '400px',
                overflow: 'auto'
              }}>
                <NumericKeypad 
                  onValueChange={(value: string) => handleKeypadInput(value, true)} 
                  value={openingAmount}
                  placeholder="Digite o valor de abertura"
                  title="Valor de Abertura"
                  maxLength={10}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Observações:
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                multiline
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre a abertura do caixa..."
                sx={{ mb: 3 }}
              />
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Informações:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Terminal: POS-{terminalId}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Operador: {user?.name || 'Não identificado'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Data/Hora: {new Date().toLocaleString()}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setOpenDialogVisible(false)}
            color="inherit"
            size="large"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleOpenCashier}
            variant="contained"
            color="success"
            size="large"
            disabled={!openingAmount || parseFloat(openingAmount) <= 0}
          >
            Confirmar Abertura
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Fechamento de Caixa */}
      <Dialog 
        open={closeDialogVisible} 
        onClose={() => setCloseDialogVisible(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '70vh' }
        }}
      >
        <DialogTitle>
          <Typography variant="h5">Fechamento de Caixa</Typography>
          <Typography variant="body2" color="text.secondary">
            Terminal {terminalId} - {user?.name}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Valor Final em Caixa:
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                value={`R$ ${closingAmount}`}
                InputProps={{
                  readOnly: true,
                }}
                sx={{ mb: 3 }}
              />
              <Box sx={{ 
                border: '1px solid #e0e0e0', 
                borderRadius: 2, 
                p: 2,
                maxHeight: '400px',
                overflow: 'auto'
              }}>
                <NumericKeypad 
                  onValueChange={(value: string) => handleKeypadInput(value, false)} 
                  value={closingAmount}
                  placeholder="Digite o valor de fechamento"
                  title="Valor de Fechamento"
                  maxLength={10}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Resumo do Caixa:
              </Typography>
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2">Saldo Inicial:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(cashierStatus?.opening_balance || 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">Saldo Esperado:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(cashierStatus?.expected_balance || 0)}
                    </Typography>
                  </Grid>
                  {closingAmount && (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="body2">Diferença:</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography 
                          variant="body2" 
                          fontWeight="bold"
                          color={
                            parseFloat(closingAmount) - (cashierStatus?.expected_balance || 0) >= 0 
                              ? 'success.main' 
                              : 'error.main'
                          }
                        >
                          {formatCurrency(parseFloat(closingAmount) - (cashierStatus?.expected_balance || 0))}
                        </Typography>
                      </Grid>
                    </>
                  )}
                </Grid>
              </Box>
              
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Observações:
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                multiline
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre o fechamento do caixa..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setCloseDialogVisible(false)}
            color="inherit"
            size="large"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleCloseCashier}
            variant="contained"
            color="error"
            size="large"
            disabled={!closingAmount || parseFloat(closingAmount) < 0}
          >
            Confirmar Fechamento
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para alertas */}
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

export default CashierOpeningClosingPage;

