import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Cancel as CancelIcon,
  Money as MoneyIcon,
  ArrowBack as ArrowBackIcon,
  Receipt as ReceiptIcon,
  History as HistoryIcon,
  TrendingDown as WithdrawIcon,
  TrendingUp as DepositIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  AccountBalance as BalanceIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/mocks/useAuth';
import { useCashier } from '../hooks/mocks/useCashier';
import { formatCurrency } from '../utils/formatters';
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

const StatsCard = styled(Card)(({ theme }) => ({
  borderRadius: '12px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },
}));

interface AlertInfo {
  open: boolean;
  message: string;
  severity: 'info' | 'success' | 'error' | 'warning';
}

interface CashMovement {
  id: string;
  type: 'withdrawal' | 'deposit' | 'opening' | 'closing';
  amount: number;
  reason: string;
  performed_by: string;
  performed_by_name: string;
  date: string;
  receipt_printed: boolean;
}

const CashWithdrawalPage: React.FC = () => {
  const navigate = useNavigate();
  const { terminalId } = useParams<{ terminalId: string }>();
  const { user } = useAuth();
  const { currentCashier, loading } = useCashier();

  // Estados principais
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [operationType, setOperationType] = useState<'withdrawal' | 'deposit'>('withdrawal');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState<boolean>(false);
  const [alertInfo, setAlertInfo] = useState<AlertInfo>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Estados para histórico
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([
    {
      id: '1',
      type: 'opening',
      amount: 200.00,
      reason: 'Abertura de caixa',
      performed_by: 'user1',
      performed_by_name: 'João Silva',
      date: '2024-01-15T08:00:00Z',
      receipt_printed: true
    },
    {
      id: '2',
      type: 'withdrawal',
      amount: 50.00,
      reason: 'Troco para cliente',
      performed_by: 'user1',
      performed_by_name: 'João Silva',
      date: '2024-01-15T10:30:00Z',
      receipt_printed: true
    },
    {
      id: '3',
      type: 'deposit',
      amount: 100.00,
      reason: 'Depósito de vendas',
      performed_by: 'user2',
      performed_by_name: 'Maria Santos',
      date: '2024-01-15T12:15:00Z',
      receipt_printed: true
    },
    {
      id: '4',
      type: 'withdrawal',
      amount: 30.00,
      reason: 'Sangria de segurança',
      performed_by: 'user1',
      performed_by_name: 'João Silva',
      date: '2024-01-15T14:45:00Z',
      receipt_printed: true
    }
  ]);

  // Estados para estatísticas
  const [cashStats, setCashStats] = useState({
    totalWithdrawals: 80.00,
    totalDeposits: 100.00,
    movementsToday: 4,
    lastMovement: '14:45'
  });

  useEffect(() => {
    if (!currentCashier || currentCashier.status !== 'open') {
      setAlertInfo({
        open: true,
        message: 'O caixa precisa estar aberto para realizar operações de sangria.',
        severity: 'error',
      });
      setTimeout(() => {
        navigate(`/pos/${terminalId}/main`);
      }, 2000);
    }
  }, [currentCashier, navigate, terminalId]);

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) return;
    if (parts.length === 2 && parts[1] && parts[1].length > 2) return;
    setAmount(value);
  };

  const handleOperation = async (): Promise<void> => {
    if (!amount || parseFloat(amount) <= 0) {
      setAlertInfo({
        open: true,
        message: 'Por favor, informe um valor válido para a operação.',
        severity: 'error',
      });
      return;
    }

    if (operationType === 'withdrawal' && parseFloat(amount) > (currentCashier?.current_amount || 0)) {
      setAlertInfo({
        open: true,
        message: 'O valor da retirada não pode ser maior que o saldo disponível no caixa.',
        severity: 'error',
      });
      return;
    }

    if (!reason.trim()) {
      setAlertInfo({
        open: true,
        message: 'Por favor, informe o motivo da operação.',
        severity: 'error',
      });
      return;
    }

    setConfirmDialogOpen(true);
  };

  const confirmOperation = async (): Promise<void> => {
    try {
      const operationAmount = parseFloat(amount);
      const newMovement: CashMovement = {
        id: Date.now().toString(),
        type: operationType,
        amount: operationAmount,
        reason: reason.trim(),
        performed_by: user?.id || '',
        performed_by_name: user?.name || '',
        date: new Date().toISOString(),
        receipt_printed: true
      };

      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Atualizar histórico
      setCashMovements(prev => [newMovement, ...prev]);

      // Atualizar estatísticas
      setCashStats(prev => ({
        ...prev,
        totalWithdrawals: operationType === 'withdrawal' 
          ? prev.totalWithdrawals + operationAmount 
          : prev.totalWithdrawals,
        totalDeposits: operationType === 'deposit' 
          ? prev.totalDeposits + operationAmount 
          : prev.totalDeposits,
        movementsToday: prev.movementsToday + 1,
        lastMovement: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }));

      // Imprimir recibo
      await PrinterService.printCashWithdrawalReceipt({
        cashier_id: currentCashier?.id || '',
        terminal_id: `POS-${terminalId}`,
        user_name: user?.name || '',
        amount: operationAmount,
        reason: reason.trim(),
        date: new Date()
      });

      setConfirmDialogOpen(false);
      setAlertInfo({
        open: true,
        message: `${operationType === 'withdrawal' ? 'Retirada' : 'Depósito'} realizada com sucesso!`,
        severity: 'success',
      });

      // Limpar formulário
      setAmount('');
      setReason('');
    } catch (error: any) {
      setConfirmDialogOpen(false);
      setAlertInfo({
        open: true,
        message: `Erro ao realizar operação: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handlePrintReceipt = async (movement: CashMovement) => {
    try {
      await PrinterService.printCashWithdrawalReceipt({
        cashier_id: currentCashier?.id || '',
        terminal_id: `POS-${terminalId}`,
        user_name: movement.performed_by_name,
        amount: movement.amount,
        reason: movement.reason,
        date: new Date(movement.date)
      });

      setAlertInfo({
        open: true,
        message: 'Recibo impresso com sucesso!',
        severity: 'success',
      });
    } catch (error) {
      setAlertInfo({
        open: true,
        message: 'Erro ao imprimir recibo',
        severity: 'error',
      });
    }
  };

  const handleCancel = (): void => {
    navigate(`/pos/${terminalId}/main`);
  };

  const handleCloseAlert = (): void => {
    setAlertInfo({ ...alertInfo, open: false });
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'withdrawal': return <WithdrawIcon color="error" />;
      case 'deposit': return <DepositIcon color="success" />;
      case 'opening': return <BalanceIcon color="primary" />;
      case 'closing': return <SecurityIcon color="warning" />;
      default: return <MoneyIcon />;
    }
  };

  const getMovementText = (type: string) => {
    switch (type) {
      case 'withdrawal': return 'Retirada';
      case 'deposit': return 'Depósito';
      case 'opening': return 'Abertura';
      case 'closing': return 'Fechamento';
      default: return type;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'withdrawal': return 'error';
      case 'deposit': return 'success';
      case 'opening': return 'primary';
      case 'closing': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={handleCancel}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Sangria de Caixa - Terminal {terminalId}
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => setHistoryDialogOpen(true)}
          >
            Histórico
          </Button>
          <Typography variant="h6" color="textSecondary">
            {user?.name} • Caixa #{currentCashier?.id}
          </Typography>
        </Box>
      </Box>

      {/* Estatísticas */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard>
            <CardContent>
              <Box display="flex" alignItems="center">
                <BalanceIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Saldo Atual
                  </Typography>
                  <Typography variant="h5" color="primary.main">
                    {formatCurrency(currentCashier?.current_amount || 0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard>
            <CardContent>
              <Box display="flex" alignItems="center">
                <WithdrawIcon sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Retiradas Hoje
                  </Typography>
                  <Typography variant="h5" color="error.main">
                    {formatCurrency(cashStats.totalWithdrawals)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard>
            <CardContent>
              <Box display="flex" alignItems="center">
                <DepositIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Depósitos Hoje
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    {formatCurrency(cashStats.totalDeposits)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard>
            <CardContent>
              <Box display="flex" alignItems="center">
                <HistoryIcon sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Movimentações
                  </Typography>
                  <Typography variant="h5" color="info.main">
                    {cashStats.movementsToday}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Última: {cashStats.lastMovement}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </StatsCard>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Formulário de Operação */}
        <Grid item xs={12} md={8}>
          <StyledPaper>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
              Nova Operação de Caixa
            </Typography>

            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Operação</InputLabel>
                <Select
                  value={operationType}
                  label="Tipo de Operação"
                  onChange={(e) => setOperationType(e.target.value as 'withdrawal' | 'deposit')}
                >
                  <MenuItem value="withdrawal">
                    <Box display="flex" alignItems="center" gap={1}>
                      <WithdrawIcon color="error" />
                      Retirada (Sangria)
                    </Box>
                  </MenuItem>
                  <MenuItem value="deposit">
                    <Box display="flex" alignItems="center" gap={1}>
                      <DepositIcon color="success" />
                      Depósito
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Valor da {operationType === 'withdrawal' ? 'Retirada' : 'Depósito'}:
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
                helperText={operationType === 'withdrawal' 
                  ? `Saldo disponível: ${formatCurrency(currentCashier?.current_amount || 0)}`
                  : 'Valor a ser adicionado ao caixa'
                }
              />
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                Motivo da {operationType === 'withdrawal' ? 'Retirada' : 'Depósito'}:
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                multiline
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={operationType === 'withdrawal' 
                  ? 'Ex: Sangria de segurança, troco para cliente...'
                  : 'Ex: Depósito de vendas, reposição de troco...'
                }
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
                color={operationType === 'withdrawal' ? 'error' : 'success'}
                startIcon={operationType === 'withdrawal' ? <WithdrawIcon /> : <DepositIcon />}
                onClick={handleOperation}
                size="large"
                disabled={!amount || parseFloat(amount) <= 0 || !reason.trim()}
              >
                Confirmar {operationType === 'withdrawal' ? 'Retirada' : 'Depósito'}
              </Button>
            </Box>
          </StyledPaper>
        </Grid>

        {/* Informações do Caixa */}
        <Grid item xs={12} md={4}>
          <StyledPaper>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
              Informações do Caixa
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon>
                  <BalanceIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Saldo Inicial"
                  secondary={formatCurrency(currentCashier?.initial_amount || 0)}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <MoneyIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Saldo Atual"
                  secondary={formatCurrency(currentCashier?.current_amount || 0)}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <WithdrawIcon color="error" />
                </ListItemIcon>
                <ListItemText
                  primary="Total Retiradas"
                  secondary={formatCurrency(cashStats.totalWithdrawals)}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <DepositIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Total Depósitos"
                  secondary={formatCurrency(cashStats.totalDeposits)}
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Últimas Movimentações
              </Typography>
              {cashMovements.slice(0, 3).map((movement) => (
                <Box key={movement.id} display="flex" justifyContent="space-between" alignItems="center" py={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getMovementIcon(movement.type)}
                    <Box>
                      <Typography variant="body2">
                        {getMovementText(movement.type)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(movement.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography 
                    variant="body2" 
                    color={movement.type === 'withdrawal' ? 'error.main' : 'success.main'}
                    fontWeight="bold"
                  >
                    {movement.type === 'withdrawal' ? '-' : '+'}{formatCurrency(movement.amount)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </StyledPaper>
        </Grid>
      </Grid>

      {/* Dialog de Confirmação */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Confirmar {operationType === 'withdrawal' ? 'Retirada' : 'Depósito'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Você está prestes a realizar uma <strong>{operationType === 'withdrawal' ? 'retirada' : 'depósito'}</strong> de{' '}
            <strong>{formatCurrency(parseFloat(amount) || 0)}</strong>.
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Motivo:</strong> {reason}
          </Typography>
          <Typography variant="body1">
            Deseja continuar?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button 
            onClick={confirmOperation} 
            variant="contained" 
            color={operationType === 'withdrawal' ? 'error' : 'success'}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Histórico */}
      <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Histórico de Movimentações
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => {
                // Simular atualização
                setAlertInfo({
                  open: true,
                  message: 'Histórico atualizado!',
                  severity: 'info',
                });
              }}
            >
              Atualizar
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Data/Hora</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Motivo</TableCell>
                  <TableCell>Operador</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cashMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      {new Date(movement.date).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getMovementIcon(movement.type)}
                        label={getMovementText(movement.type)}
                        color={getMovementColor(movement.type) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        color={movement.type === 'withdrawal' ? 'error.main' : 'success.main'}
                        fontWeight="bold"
                      >
                        {movement.type === 'withdrawal' ? '-' : '+'}{formatCurrency(movement.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>{movement.reason}</TableCell>
                    <TableCell>{movement.performed_by_name}</TableCell>
                    <TableCell>
                      <Tooltip title="Reimprimir recibo">
                        <IconButton
                          size="small"
                          onClick={() => handlePrintReceipt(movement)}
                        >
                          <PrintIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>
            Fechar
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

export default CashWithdrawalPage;

