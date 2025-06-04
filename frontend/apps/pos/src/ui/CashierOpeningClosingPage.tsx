import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  TextField,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  MonetizationOn as MoneyIcon,
  LockOpen as OpenIcon,
  Lock as CloseIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '@common/contexts/auth/hooks/useAuth';
import { useCashier } from '@common/contexts/cashier/hooks/useCashier';
import { useBusinessDay } from '@common/contexts/core/hooks/useBusinessDay';
import { formatCurrency } from '@common/utils/formatters';
import CashierKeypad from '@common/components/CashierKeypad';
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

const CashierOpeningClosingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    openCashier,
    closeCashier,
    getCurrentCashier,
    cashierStatus,
    isLoading,
  } = useCashier();
  const { currentBusinessDay } = useBusinessDay();

  const [openingAmount, setOpeningAmount] = useState<string | null>(null);
  const [closingAmount, setClosingAmount] = useState<string | null>(null);
  const [openDialogVisible, setOpenDialogVisible] = useState<boolean>(false);
  const [closeDialogVisible, setCloseDialogVisible] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [alertInfo, setAlertInfo] = useState<{
    open: boolean;
    message: string;
    severity: 'info' | 'success' | 'warning' | 'error';
  }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    const checkCashierStatus = async () => {
      await getCurrentCashier();
    };

    checkCashierStatus();
  }, [getCurrentCashier]);

  const handleOpenCashier = async () => {
    if (!openingAmount || parseFloat(openingAmount) <= 0) {
      setAlertInfo({
        open: true,
        message: 'Por favor, informe um valor válido para abertura do caixa.',
        severity: 'error',
      });
      return;
    }

    if (!currentBusinessDay || !currentBusinessDay.id) {
      setAlertInfo({
        open: true,
        message: 'Não há um dia de operação aberto. Por favor, abra o dia primeiro.',
        severity: 'error',
      });
      return;
    }

    try {
      await openCashier({
        terminal_id: 'POS-001',
        business_day_id: currentBusinessDay.id,
        opening_balance: parseFloat(openingAmount),
        notes,
      });

      await PrinterService.printOpeningReceipt({
        cashier_id: cashierStatus?.id,
        terminal_id: 'POS-001',
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

      setTimeout(() => {
        navigate('/pos/main');
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
        terminal_id: 'POS-001',
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

      setTimeout(() => {
        navigate('/login');
      }, 1500);
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

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <StyledPaper>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
            Gerenciamento de Caixa
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Terminal: POS-001 | Operador: {user?.name || 'Não identificado'}
          </Typography>
          {currentBusinessDay && (
            <Typography variant="subtitle1" color="text.secondary">
              Dia de Operação: {new Date(currentBusinessDay.opened_at).toLocaleDateString()}
            </Typography>
          )}
        </Box>
        
        <Grid container spacing={4} justifyContent="center">
          {!cashierStatus || cashierStatus.status !== 'open' ? (
            <Grid item xs={12} md={6}>
              <StyledPaper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <OpenIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                  <Typography variant="h5" component="h2" gutterBottom>
                    Abrir Caixa
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    Inicie um novo turno de operação abrindo o caixa com o valor inicial.
                  </Typography>
                </Box>
                <OpenCashierButton
                  variant="contained"
                  startIcon={<MoneyIcon />}
                  onClick={() => setOpenDialogVisible(true)}
                  disabled={!currentBusinessDay || !currentBusinessDay.id}
                  fullWidth
                >
                  Abrir Caixa
                </OpenCashierButton>
                {(!currentBusinessDay || !currentBusinessDay.id) && (
                  <Typography variant="caption" color="error" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
                    É necessário abrir o dia de operação primeiro.
                  </Typography>
                )}
              </StyledPaper>
            </Grid>
          ) : (
            <Grid item xs={12} md={6}>
              <StyledPaper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <CloseIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                  <Typography variant="h5" component="h2" gutterBottom>
                    Fechar Caixa
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    Finalize o turno de operação fechando o caixa e contabilizando os valores.
                  </Typography>
                </Box>
                <Box sx={{ mb: 3 }}>
                  <Grid container spacing={2}>
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
                </Box>
                <CloseCashierButton
                  variant="contained"
                  startIcon={<CloseIcon />}
                  onClick={() => setCloseDialogVisible(true)}
                  fullWidth
                >
                  Fechar Caixa
                </CloseCashierButton>
              </StyledPaper>
            </Grid>
          )}
          
          <Grid item xs={12} md={6}>
            <StyledPaper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <PersonIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" component="h2" gutterBottom>
                  Informações do Operador
                </Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
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
                      Status do Caixa:
                    </Typography>
                    <Typography 
                      variant="body1" 
                      fontWeight="bold"
                      color={cashierStatus?.status === 'open' ? 'success.main' : 'text.primary'}
                    >
                      {cashierStatus?.status === 'open' ? 'Aberto' : 'Fechado'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              <ActionButton
                variant="outlined"
                color="primary"
                startIcon={<ReceiptIcon />}
                onClick={() => navigate('/pos/reports')}
                fullWidth
              >
                Relatórios
              </ActionButton>
            </StyledPaper>
          </Grid>
        </Grid>
      </StyledPaper>
      
      {/* Diálogo de Abertura de Caixa */}
      <Dialog 
        open={openDialogVisible} 
        onClose={() => setOpenDialogVisible(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Abertura de Caixa</DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Valor Inicial em Caixa:
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                value={openingAmount}
                InputProps={{
                  readOnly: true,
                  startAdornment: <Typography variant="body1">R$</Typography>
                }}
                sx={{ mb: 2 }}
              />
              <CashierKeypad 
                onInput={(value: string) => handleKeypadInput(value, true)} 
                initialValue={openingAmount ?? ''}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
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
              />
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Informações:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Terminal: POS-001
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Operador: {user?.name || 'Não identificado'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialogVisible(false)}>Cancelar</Button>
          <Button 
            onClick={handleOpenCashier} 
            variant="contained" 
            color="success"
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
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Fechamento de Caixa</DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Valor Final em Caixa:
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                value={closingAmount}
                InputProps={{
                  readOnly: true,
                  startAdornment: <Typography variant="body1">R$</Typography>
                }}
                sx={{ mb: 2 }}
              />
              <CashierKeypad 
                onInput={(value: string) => handleKeypadInput(value, false)} 
                initialValue={closingAmount ?? ''}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
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
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Resumo:
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Saldo Esperado:
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {cashierStatus && formatCurrency(cashierStatus.expected_balance)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Saldo Informado:
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {closingAmount ? formatCurrency(parseFloat(closingAmount)) : 'R$ 0,00'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Diferença:
                    </Typography>
                    <Typography 
                      variant="body1" 
                      fontWeight="bold"
                      color={
                        !closingAmount ? 'text.primary' :
                        parseFloat(closingAmount) === cashierStatus?.expected_balance ? 'success.main' :
                        parseFloat(closingAmount) > cashierStatus?.expected_balance! ? 'primary.main' : 'error.main'
                      }
                    >
                      {!closingAmount ? 'R$ 0,00' : 
                        formatCurrency(parseFloat(closingAmount) - (cashierStatus?.expected_balance || 0))}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDialogVisible(false)}>Cancelar</Button>
          <Button 
            onClick={handleCloseCashier} 
            variant="contained" 
            color="error"
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
      >
        <Alert onClose={handleCloseAlert} severity={alertInfo.severity}>
          {alertInfo.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CashierOpeningClosingPage;