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
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Today as TodayIcon,
  LockOpen as OpenIcon,
  Lock as CloseIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  Store as StoreIcon
} from '@mui/icons-material';
import { useAuth } from '@common/contexts/auth/hooks/useAuth';
import { useBusinessDay } from '@common/contexts/core/hooks/useBusinessDay';
import { formatCurrency, formatDate } from '@common/utils/formatters';
import PrinterService from '../services/PrinterService';

// Estilos personalizados inspirados no sistema de exemplo, mas com identidade própria
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

const OpenDayButton = styled(ActionButton)(({ theme }) => ({
  backgroundColor: theme.palette.success.main,
  color: theme.palette.common.white,
  '&:hover': {
    backgroundColor: theme.palette.success.dark,
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
}));

const CloseDayButton = styled(ActionButton)(({ theme }) => ({
  backgroundColor: theme.palette.error.main,
  color: theme.palette.common.white,
  '&:hover': {
    backgroundColor: theme.palette.error.dark,
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
}));

const BusinessDayPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    openBusinessDay, 
    closeBusinessDay, 
    getCurrentBusinessDay,
    businessDayStatus,
    isLoading 
  } = useBusinessDay();
  
  const [openDialogVisible, setOpenDialogVisible] = useState(false);
  const [closeDialogVisible, setCloseDialogVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [alertInfo, setAlertInfo] = useState({ open: false, message: '', severity: 'info' });
  const [hasOpenCashiers, setHasOpenCashiers] = useState(false);
  
  useEffect(() => {
    // Verificar status do dia de operação ao carregar a página
    const checkBusinessDayStatus = async () => {
      await getCurrentBusinessDay();
      
      // Em produção, verificaria se há caixas abertos
      // Simulação: assume que não há caixas abertos
      setHasOpenCashiers(false);
    };
    
    checkBusinessDayStatus();
  }, [getCurrentBusinessDay]);
  
  const handleOpenBusinessDay = async () => {
    try {
      await openBusinessDay({
        store_id: 'STORE-001', // Em produção, seria obtido da configuração
        notes: notes
      });
      
      // Imprimir comprovante de abertura do dia
      await PrinterService.printBusinessDayOpeningReceipt({
        business_day_id: businessDayStatus.id,
        store_id: 'STORE-001',
        user_name: user.name,
        date: new Date(),
        notes: notes
      });
      
      setOpenDialogVisible(false);
      setAlertInfo({
        open: true,
        message: 'Dia de operação aberto com sucesso!',
        severity: 'success'
      });
      
      // Redirecionar para a tela de abertura de caixa
      setTimeout(() => {
        navigate('/pos/cashier');
      }, 1500);
      
    } catch (error) {
      setAlertInfo({
        open: true,
        message: `Erro ao abrir dia de operação: ${error.message}`,
        severity: 'error'
      });
    }
  };
  
  const handleCloseBusinessDay = async () => {
    if (hasOpenCashiers) {
      setAlertInfo({
        open: true,
        message: 'Existem caixas abertos. Feche todos os caixas antes de encerrar o dia.',
        severity: 'error'
      });
      return;
    }
    
    try {
      await closeBusinessDay({
        business_day_id: businessDayStatus.id,
        notes: notes
      });
      
      // Imprimir comprovante de fechamento do dia
      await PrinterService.printBusinessDayClosingReceipt({
        business_day_id: businessDayStatus.id,
        store_id: 'STORE-001',
        user_name: user.name,
        opened_at: new Date(businessDayStatus.opened_at),
        closed_at: new Date(),
        total_sales: businessDayStatus.total_sales,
        total_orders: businessDayStatus.total_orders,
        notes: notes
      });
      
      setCloseDialogVisible(false);
      setAlertInfo({
        open: true,
        message: 'Dia de operação fechado com sucesso!',
        severity: 'success'
      });
      
      // Redirecionar para a tela de login
      setTimeout(() => {
        navigate('/login');
      }, 1500);
      
    } catch (error) {
      setAlertInfo({
        open: true,
        message: `Erro ao fechar dia de operação: ${error.message}`,
        severity: 'error'
      });
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
            Gerenciamento do Dia de Operação
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Loja: STORE-001 | Gerente: {user?.name || 'Não identificado'}
          </Typography>
        </Box>
        
        <Grid container spacing={4} justifyContent="center">
          {!businessDayStatus || businessDayStatus.status !== 'open' ? (
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
                <OpenDayButton
                  variant="contained"
                  startIcon={<TodayIcon />}
                  onClick={() => setOpenDialogVisible(true)}
                  fullWidth
                >
                  Abrir Dia
                </OpenDayButton>
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
                        {formatDate(businessDayStatus.opened_at)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Total de Vendas:
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {formatCurrency(businessDayStatus.total_sales || 0)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Total de Pedidos:
                      </Typography>
                      <Typography variant="body1">
                        {businessDayStatus.total_orders || 0}
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
                <CloseDayButton
                  variant="contained"
                  startIcon={<CloseIcon />}
                  onClick={() => setCloseDialogVisible(true)}
                  disabled={hasOpenCashiers}
                  fullWidth
                >
                  Fechar Dia
                </CloseDayButton>
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
                      color={businessDayStatus?.status === 'open' ? 'success.main' : 'text.primary'}
                    >
                      {businessDayStatus?.status === 'open' ? 'Aberto' : 'Fechado'}
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
                {businessDayStatus?.status === 'open' && (
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
      
      {/* Diálogo de Abertura do Dia */}
      <Dialog 
        open={openDialogVisible} 
        onClose={() => setOpenDialogVisible(false)}
        maxWidth="sm"
        fullWidth
      >
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
                  <Typography variant="body1">
                    STORE-001
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Gerente:
                  </Typography>
                  <Typography variant="body1">
                    {user?.name || 'Não identificado'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Data:
                  </Typography>
                  <Typography variant="body1">
                    {new Date().toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Hora:
                  </Typography>
                  <Typography variant="body1">
                    {new Date().toLocaleTimeString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialogVisible(false)} color="inherit">
            Cancelar
          </Button>
          <Button 
            onClick={handleOpenBusinessDay} 
            variant="contained" 
            color="primary"
          >
            Confirmar Abertura
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de Fechamento do Dia */}
      <Dialog 
        open={closeDialogVisible} 
        onClose={() => setCloseDialogVisible(false)}
        maxWidth="sm"
        fullWidth
      >
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
                  <Typography variant="body1">
                    {formatDate(businessDayStatus.opened_at)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Fechamento:
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(new Date())}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total de Vendas:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatCurrency(businessDayStatus.total_sales || 0)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total de Pedidos:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {businessDayStatus.total_orders || 0}
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
          <Button 
            onClick={handleCloseBusinessDay} 
            variant="contained" 
            color="error"
            disabled={hasOpenCashiers}
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

export default BusinessDayPage;
