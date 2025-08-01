import { useState, useEffect, FC } from 'react';
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
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useBusinessDay } from '../hooks/useBusinessDay';
import { useAuth } from '../hooks/useAuth';
import {
  Today as TodayIcon,
  LockOpen as OpenIcon,
  Lock as CloseIcon,
  Receipt as ReceiptIcon,
  Store as StoreIcon,
} from '@mui/icons-material';
import PrinterService from '../services/PrinterService';
import { useCashier } from '../hooks/useCashier';
import { formatCurrency, formatDate } from '../utils/formatters';

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

const BusinessDayPage: FC = () => {
  const navigate = useNavigate();
  
  const {
    currentDay,
    loading,
    error,
    openDay: openBusinessDay,
    closeDay: closeBusinessDay,
    getCurrentDay: getCurrentBusinessDay,
    isOpen
  } = useBusinessDay();

  const { user } = useAuth();
  const { currentCashier } = useCashier();

  const currentBusinessDay = currentDay;

  const [openDialogVisible, setOpenDialogVisible] = useState<boolean>(false);
  const [closeDialogVisible, setCloseDialogVisible] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [alertInfo, setAlertInfo] = useState<{
    open: boolean;
    message: string;
    severity: 'error' | 'info' | 'success' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [hasOpenCashiers, setHasOpenCashiers] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await getCurrentBusinessDay();
        // Verificar se há caixas abertos seria feito via API
        setHasOpenCashiers(currentCashier?.status === 'open');
      } catch (error) {
        console.error('Erro ao buscar status do dia de operação ou caixas:', error);
      }
    };

    fetchData();
  }, [getCurrentBusinessDay, currentCashier]);

  const handleOpenBusinessDay = async () => {
    try {
      await openBusinessDay({
        store_id: 'STORE-001',
        notes,
      });

      if (!currentBusinessDay) return;

      await PrinterService.printBusinessDayOpeningReceipt({
        business_day_id: currentBusinessDay.id,
        store_id: 'STORE-001',
        user_name: user?.name || 'Desconhecido',
        date: new Date(),
        notes,
      });

      setOpenDialogVisible(false);
      setAlertInfo({
        open: true,
        message: 'Dia de operação aberto com sucesso!',
        severity: 'success',
      });

      setTimeout(() => {
        navigate('/pos/cashier');
      }, 1500);
    } catch (error: any) {
      setAlertInfo({
        open: true,
        message: `Erro ao abrir dia de operação: ${error?.message || 'Erro desconhecido'}`,
        severity: 'error',
      });
    }
  };

  const handleCloseBusinessDay = async () => {
    if (hasOpenCashiers) {
      setAlertInfo({
        open: true,
        message: 'Existem caixas abertos. Feche todos os caixas antes de encerrar o dia.',
        severity: 'error',
      });
      return;
    }

    try {
      if (!currentBusinessDay) return;

      await closeBusinessDay({
        notes,
      });

      await PrinterService.printBusinessDayClosingReceipt({
        business_day_id: currentBusinessDay.id,
        store_id: 'STORE-001',
        user_name: user?.name || 'Desconhecido',
        opened_at: new Date(currentBusinessDay.opened_at),
        closed_at: new Date(),
        total_sales: currentBusinessDay.total_sales || 0,
        total_orders: currentBusinessDay.total_orders || 0,
        notes,
      });

      setCloseDialogVisible(false);
      setAlertInfo({
        open: true,
        message: 'Dia de operação fechado com sucesso!',
        severity: 'success',
      });

      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error: any) {
      setAlertInfo({
        open: true,
        message: `Erro ao fechar dia de operação: ${error?.message || 'Erro desconhecido'}`,
        severity: 'error',
      });
    }
  };

  const handleCloseAlert = () => {
    setAlertInfo({ ...alertInfo, open: false });
  };

  if (loading) {
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
            Gerenciamento do Dia de Operação
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Loja: STORE-001 | Gerente: {user?.name || 'Não identificado'}
          </Typography>
        </Box>
        <Grid container spacing={4} justifyContent="center">
          {!currentBusinessDay || currentBusinessDay.status !== 'open' ? (
            <Grid item xs={12} md={6}>
              <StyledPaper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <OpenIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                  <Typography variant="h5" component="h2" gutterBottom>
                    Abrir Dia de Operação
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    Inicie um novo dia de operação para permitir a abertura de caixas e realização de vendas.
                  </Typography>
                </Box>
                <ActionButton
                  variant="contained"
                  startIcon={<TodayIcon />}
                  onClick={() => setOpenDialogVisible(true)}
                  fullWidth
                >
                  Abrir Dia
                </ActionButton>
              </StyledPaper>
            </Grid>
          ) : (
            <Grid item xs={12} md={6}>
              <StyledPaper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <CloseIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                  <Typography variant="h5" component="h2" gutterBottom>
                    Fechar Dia de Operação
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    Finalize o dia de operação após o fechamento de todos os caixas.
                  </Typography>
                </Box>
                <Box sx={{ mb: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Abertura:
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {formatDate(currentBusinessDay.opened_at)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Total de Vendas:
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {formatCurrency(currentBusinessDay.total_sales || 0)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Total de Pedidos:
                      </Typography>
                      <Typography variant="body1">
                        {currentBusinessDay.total_orders || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Caixas Abertos:
                      </Typography>
                      <Typography variant="body1" color={hasOpenCashiers ? 'error.main' : 'success.main'}>
                        {hasOpenCashiers ? 'Sim' : 'Não'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
                <ActionButton
                  variant="contained"
                  startIcon={<CloseIcon />}
                  onClick={() => setCloseDialogVisible(true)}
                  disabled={hasOpenCashiers}
                  fullWidth
                >
                  Fechar Dia
                </ActionButton>
                {hasOpenCashiers && (
                  <Typography variant="caption" color="error" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
                    É necessário fechar todos os caixas antes de encerrar o dia.
                  </Typography>
                )}
              </StyledPaper>
            </Grid>
          )}
          <Grid item xs={12} md={6}>
            <StyledPaper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <StoreIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" component="h2" gutterBottom>
                  Informações da Loja
                </Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Loja:
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      STORE-001
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Gerente:
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {user?.name || 'Não identificado'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Status do Dia:
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight="bold"
                      color={currentBusinessDay?.status === 'open' ? 'success.main' : 'text.primary'}
                    >
                      {currentBusinessDay?.status === 'open' ? 'Aberto' : 'Fechado'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <ActionButton
                    variant="outlined"
                    color="primary"
                    startIcon={<ReceiptIcon />}
                    onClick={() => navigate('/pos/reports')}
                    fullWidth
                  >
                    Relatórios
                  </ActionButton>
                </Grid>
                {currentBusinessDay?.status === 'open' && (
                  <Grid item xs={12}>
                    <ActionButton
                      variant="contained"
                      color="primary"
                      onClick={() => navigate('/pos/cashier')}
                      fullWidth
                    >
                      Gerenciar Caixas
                    </ActionButton>
                  </Grid>
                )}
              </Grid>
            </StyledPaper>
          </Grid>
        </Grid>
      </StyledPaper>
      {/* Diálogos e Snackbar */}
      <Dialog open={openDialogVisible} onClose={() => setOpenDialogVisible(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Abertura do Dia de Operação</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
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
              placeholder="Observações sobre a abertura do dia..."
            />
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Informações:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Loja:
                  </Typography>
                  <Typography variant="body1">STORE-001</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Gerente:
                  </Typography>
                  <Typography variant="body1">{user?.name || 'Não identificado'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Data:
                  </Typography>
                  <Typography variant="body1">{new Date().toLocaleDateString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Hora:
                  </Typography>
                  <Typography variant="body1">{new Date().toLocaleTimeString()}</Typography>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialogVisible(false)} color="inherit">
            Cancelar
          </Button>
          <Button onClick={handleOpenBusinessDay} variant="contained" color="primary">
            Confirmar Abertura
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={closeDialogVisible} onClose={() => setCloseDialogVisible(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Fechamento do Dia de Operação</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
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
              placeholder="Observações sobre o fechamento do dia..."
            />
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Resumo do Dia:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Abertura:
                  </Typography>
                  <Typography variant="body1">{formatDate(currentBusinessDay?.opened_at)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Fechamento:
                  </Typography>
                  <Typography variant="body1">{formatDate(new Date())}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total de Vendas:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatCurrency(currentBusinessDay?.total_sales || 0)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total de Pedidos:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {currentBusinessDay?.total_orders || 0}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDialogVisible(false)} color="inherit">
            Cancelar
          </Button>
          <Button onClick={handleCloseBusinessDay} variant="contained" color="error" disabled={hasOpenCashiers}>
            Confirmar Fechamento
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={alertInfo.open}
        autoHideDuration={4000}
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

export default BusinessDayPage;
