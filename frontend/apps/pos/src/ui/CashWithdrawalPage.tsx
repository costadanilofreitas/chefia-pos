import React, { useState, useEffect, ChangeEvent } from 'react';
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
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Cancel as CancelIcon, Money as MoneyIcon } from '@mui/icons-material';
import { useAuth } from '@common/contexts/auth/hooks/useAuth';
import { useCashier } from '@common/contexts/cashier/hooks/useCashier';
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

interface AlertInfo {
  open: boolean;
  message: string;
  severity: 'info' | 'success' | 'error' | 'warning';
}

const CashWithdrawalPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { cashierStatus, registerCashOut, isLoading } = useCashier();

  const params = new URLSearchParams(location.search);
  const posId: string = params.get('pos') || '1';

  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
  const [alertInfo, setAlertInfo] = useState<AlertInfo>({
    open: false,
    message: '',
    severity: 'info',
  });

  useEffect(() => {
    if (!cashierStatus || cashierStatus.status !== 'open') {
      setAlertInfo({
        open: true,
        message: 'O caixa precisa estar aberto para realizar uma retirada.',
        severity: 'error',
      });
      navigate(`/pos?pos=${posId}`);
    }
  }, [cashierStatus, navigate, posId]);

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) return;
    if (parts.length === 2 && parts[1] && parts[1].length > 2) return;
    setAmount(value);
  };

  const handleWithdrawal = async (): Promise<void> => {
    if (!amount || parseFloat(amount) <= 0) {
      setAlertInfo({
        open: true,
        message: 'Por favor, informe um valor válido para a retirada.',
        severity: 'error',
      });
      return;
    }

    if (parseFloat(amount) > (cashierStatus?.expected_balance || 0)) {
      setAlertInfo({
        open: true,
        message: 'O valor da retirada não pode ser maior que o saldo disponível no caixa.',
        severity: 'error',
      });
      return;
    }

    setConfirmDialogOpen(true);
  };

  const confirmWithdrawal = async (): Promise<void> => {
    try {
      await registerCashOut({
        id: cashierStatus?.id || '',
        type: 'exit',
        amount: parseFloat(amount),
        reason: reason || 'Retirada de caixa',
        performed_by: user?.id || '',
      });

      await PrinterService.printCashWithdrawalReceipt({
        cashier_id: cashierStatus?.id || '',
        terminal_id: `POS-${posId}`,
        user_name: user?.name || '',
        amount: parseFloat(amount),
        reason: reason || 'Retirada de caixa',
        date: new Date(),
      });

      setConfirmDialogOpen(false);
      setAlertInfo({
        open: true,
        message: 'Retirada realizada com sucesso!',
        severity: 'success',
      });

      setAmount('');
      setReason('');
      navigate(`/pos?pos=${posId}`);
    } catch (error: any) {
      setConfirmDialogOpen(false);
      setAlertInfo({
        open: true,
        message: `Erro ao realizar retirada: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handleCancel = (): void => {
    navigate(`/pos?pos=${posId}`);
  };

  const handleCloseAlert = (): void => {
    setAlertInfo({ ...alertInfo, open: false });
  };

  if (isLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#333' }}>
          Retirada de Caixa
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
                    {formatCurrency(cashierStatus?.opening_balance || 0)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Saldo Atual:
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="success.main">
                    {formatCurrency(cashierStatus?.expected_balance || 0)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </StyledPaper>
        </Grid>
      </Grid>

      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar Retirada</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Você está prestes a realizar uma retirada de <strong>{formatCurrency(parseFloat(amount) || 0)}</strong>.
          </Typography>
          <Typography variant="body1">
            Deseja continuar?
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
