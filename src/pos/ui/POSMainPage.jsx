import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Grid,
  Button,
  Card,
  CardContent,
  CardActionArea,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  ShoppingCart as CartIcon,
  Receipt as ReceiptIcon,
  MonetizationOn as CashIcon,
  LocalDining as DiningIcon,
  Print as PrintIcon,
  Notifications as NotificationsIcon,
  ExitToApp as LogoutIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Restaurant as RestaurantIcon,
  History as HistoryIcon,
  Fastfood as FastfoodIcon,
  LocalMall as OrdersIcon,
  Storefront as StoreIcon
} from '@mui/icons-material';
import { useAuth } from '../../auth/hooks/useAuth';
import { useCashier } from '../hooks/useCashier';
import { useBusinessDay } from '../../business_day/hooks/useBusinessDay';
import { useOrder } from '../../order/hooks/useOrder';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

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

const ActionCard = styled(Card)(({ theme }) => ({
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s ease',
  height: '100%',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },
}));

const StatusBadge = styled(Box)(({ theme, status }) => {
  const colors = {
    open: theme.palette.success.main,
    closed: theme.palette.error.main,
    pending: theme.palette.warning.main,
  };
  
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: theme.spacing(0.5, 1.5),
    borderRadius: '16px',
    backgroundColor: colors[status] || theme.palette.grey[500],
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '0.75rem',
  };
});

const POSMainPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { 
    cashierStatus, 
    openCashier,
    closeCashier,
    isLoading: cashierLoading 
  } = useCashier();
  const { 
    businessDayStatus,
    isLoading: businessDayLoading 
  } = useBusinessDay();
  const { 
    getPendingOrders,
    pendingOrders,
    isLoading: orderLoading 
  } = useOrder();
  
  // Extrair o ID do POS dos parâmetros da URL
  const params = new URLSearchParams(location.search);
  const posId = params.get('pos') || '1';
  
  // Estados locais
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ open: false, message: '', severity: 'info' });
  const [notifications, setNotifications] = useState([]);
  
  // Carregar status do caixa e do dia
  useEffect(() => {
    // Carregar pedidos pendentes
    const loadPendingOrders = async () => {
      try {
        await getPendingOrders();
      } catch (error) {
        console.error('Erro ao carregar pedidos pendentes:', error);
      }
    };
    
    loadPendingOrders();
    
    // Configurar polling para atualizar pedidos pendentes a cada 30 segundos
    const interval = setInterval(loadPendingOrders, 30000);
    
    return () => clearInterval(interval);
  }, [getPendingOrders]);
  
  // Processar notificações com base em pedidos pendentes
  useEffect(() => {
    if (pendingOrders && pendingOrders.length > 0) {
      // Filtrar apenas pedidos externos (iFood, WhatsApp, etc.)
      const externalOrders = pendingOrders.filter(order => 
        order.source === 'ifood' || order.source === 'whatsapp'
      );
      
      if (externalOrders.length > 0) {
        setNotifications(externalOrders.map(order => ({
          id: order.id,
          title: `Novo pedido ${order.source === 'ifood' ? 'iFood' : 'WhatsApp'}`,
          message: `Pedido #${order.id} - ${order.items.length} itens`,
          time: new Date(order.created_at),
          read: false
        })));
      }
    }
  }, [pendingOrders]);
  
  const handleNewOrder = () => {
    navigate(`/pos/order?pos=${posId}`);
  };
  
  const handlePendingOrders = () => {
    navigate(`/pos/pending-orders?pos=${posId}`);
  };
  
  const handleCashWithdrawal = () => {
    navigate(`/pos/cash-withdrawal?pos=${posId}`);
  };
  
  const handleOpenCloseCashier = async () => {
    try {
      if (cashierStatus && cashierStatus.status === 'open') {
        // Redirecionar para página de fechamento de caixa
        navigate(`/pos/cashier/close?pos=${posId}`);
      } else {
        // Redirecionar para página de abertura de caixa
        navigate(`/pos/cashier/open?pos=${posId}`);
      }
    } catch (error) {
      setAlertInfo({
        open: true,
        message: `Erro: ${error.message}`,
        severity: 'error'
      });
    }
  };
  
  const handleLogout = () => {
    setLogoutDialogOpen(true);
  };
  
  const confirmLogout = async () => {
    try {
      // Se o caixa estiver aberto, verificar se o usuário realmente quer sair
      if (cashierStatus && cashierStatus.status === 'open' && cashierStatus.operator_id === user.id) {
        if (!window.confirm('Você tem um caixa aberto. Deseja realmente sair? O caixa permanecerá aberto.')) {
          setLogoutDialogOpen(false);
          return;
        }
      }
      
      await logout();
      navigate('/login');
    } catch (error) {
      setAlertInfo({
        open: true,
        message: `Erro ao fazer logout: ${error.message}`,
        severity: 'error'
      });
      setLogoutDialogOpen(false);
    }
  };
  
  const handleCloseAlert = () => {
    setAlertInfo({ ...alertInfo, open: false });
  };
  
  if (cashierLoading || businessDayLoading || orderLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }
  
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#333' }}>
            Terminal POS #{posId}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Operador: {user?.name || 'Não identificado'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            color="inherit" 
            sx={{ mr: 2 }}
            onClick={() => navigate(`/pos/notifications?pos=${posId}`)}
          >
            <Badge badgeContent={notifications.filter(n => !n.read).length} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
          >
            Sair
          </Button>
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        {/* Coluna de status */}
        <Grid item xs={12} md={4}>
          <StyledPaper>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
              Status do Sistema
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  <StoreIcon color={businessDayStatus?.status === 'open' ? 'success' : 'error'} />
                </ListItemIcon>
                <ListItemText
                  primary="Dia de Operação"
                  secondary={
                    businessDayStatus?.status === 'open' 
                      ? `Aberto desde ${formatDateTime(businessDayStatus.opened_at)}` 
                      : 'Fechado'
                  }
                />
                <StatusBadge status={businessDayStatus?.status || 'closed'}>
                  {businessDayStatus?.status === 'open' ? 'Aberto' : 'Fechado'}
                </StatusBadge>
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <CashIcon color={cashierStatus?.status === 'open' ? 'success' : 'error'} />
                </ListItemIcon>
                <ListItemText
                  primary="Caixa"
                  secondary={
                    cashierStatus?.status === 'open' 
                      ? `Aberto por ${cashierStatus.operator_name || user?.name}` 
                      : 'Fechado'
                  }
                />
                <StatusBadge status={cashierStatus?.status || 'closed'}>
                  {cashierStatus?.status === 'open' ? 'Aberto' : 'Fechado'}
                </StatusBadge>
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <OrdersIcon color={pendingOrders && pendingOrders.length > 0 ? 'warning' : 'success'} />
                </ListItemIcon>
                <ListItemText
                  primary="Pedidos Pendentes"
                  secondary={
                    pendingOrders && pendingOrders.length > 0
                      ? `${pendingOrders.length} pedido(s) aguardando`
                      : 'Nenhum pedido pendente'
                  }
                />
                {pendingOrders && pendingOrders.length > 0 && (
                  <Badge badgeContent={pendingOrders.length} color="warning" sx={{ mr: 2 }} />
                )}
              </ListItem>
            </List>
            
            <Divider sx={{ my: 2 }} />
            
            {cashierStatus?.status === 'open' && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Resumo do Caixa
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Saldo Inicial:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatCurrency(cashierStatus.opening_balance)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Saldo Atual:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium" color="success.main">
                      {formatCurrency(cashierStatus.expected_balance)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total de Vendas:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatCurrency(cashierStatus.total_sales || 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Retiradas:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium" color="error.main">
                      {formatCurrency(cashierStatus.cash_out || 0)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
            
            <Box sx={{ mt: 'auto' }}>
              <Button
                variant={cashierStatus?.status === 'open' ? 'outlined' : 'contained'}
                color={cashierStatus?.status === 'open' ? 'error' : 'success'}
                fullWidth
                size="large"
                onClick={handleOpenCloseCashier}
                disabled={!businessDayStatus || businessDayStatus.status !== 'open'}
              >
                {cashierStatus?.status === 'open' ? 'Fechar Caixa' : 'Abrir Caixa'}
              </Button>
            </Box>
          </StyledPaper>
        </Grid>
        
        {/* Coluna de ações principais */}
        <Grid item xs={12} md={8}>
          <StyledPaper>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
              Ações
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <ActionCard>
                  <CardActionArea 
                    onClick={handleNewOrder}
                    disabled={!cashierStatus || cashierStatus.status !== 'open'}
                    sx={{ height: '100%', p: 2 }}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <CartIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                      <Typography variant="h6" component="div" gutterBottom>
                        Novo Pedido
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Criar um novo pedido
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </ActionCard>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <ActionCard>
                  <CardActionArea 
                    onClick={handlePendingOrders}
                    disabled={!cashierStatus || cashierStatus.status !== 'open'}
                    sx={{ height: '100%', p: 2 }}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Badge badgeContent={pendingOrders?.length || 0} color="error" sx={{ mb: 2 }}>
                        <ReceiptIcon sx={{ fontSize: 48, color: 'warning.main' }} />
                      </Badge>
                      <Typography variant="h6" component="div" gutterBottom>
                        Pedidos Pendentes
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Gerenciar pedidos em aberto
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </ActionCard>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <ActionCard>
                  <CardActionArea 
                    onClick={handleCashWithdrawal}
                    disabled={!cashierStatus || cashierStatus.status !== 'open'}
                    sx={{ height: '100%', p: 2 }}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <CashIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                      <Typography variant="h6" component="div" gutterBottom>
                        Retirada de Caixa
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Registrar retirada de dinheiro
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </ActionCard>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <ActionCard>
                  <CardActionArea 
                    onClick={() => navigate(`/pos/kitchen-status?pos=${posId}`)}
                    sx={{ height: '100%', p: 2 }}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <DiningIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                      <Typography variant="h6" component="div" gutterBottom>
                        Status da Cozinha
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Visualizar pedidos em preparo
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </ActionCard>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <ActionCard>
                  <CardActionArea 
                    onClick={() => navigate(`/pos/reports?pos=${posId}`)}
                    sx={{ height: '100%', p: 2 }}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <HistoryIcon sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
                      <Typography variant="h6" component="div" gutterBottom>
                        Histórico e Relatórios
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Consultar vendas e operações
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </ActionCard>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <ActionCard>
                  <CardActionArea 
                    onClick={() => navigate(`/pos/menu?pos=${posId}`)}
                    sx={{ height: '100%', p: 2 }}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <RestaurantIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
                      <Typography variant="h6" component="div" gutterBottom>
                        Cardápio
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Visualizar produtos e preços
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </ActionCard>
              </Grid>
            </Grid>
            
            {user?.role === 'manager' && (
              <>
                <Divider sx={{ my: 3 }} />
                
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  Funções Administrativas
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={4}>
                    <ActionCard>
                      <CardActionArea 
                        onClick={() => navigate(`/pos/business-day?pos=${posId}`)}
                        sx={{ height: '100%', p: 2 }}
                      >
                        <CardContent sx={{ textAlign: 'center' }}>
                          <StoreIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                          <Typography variant="h6" component="div" gutterBottom>
                            Gerenciar Dia
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Abrir/fechar dia de operação
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </ActionCard>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <ActionCard>
                      <CardActionArea 
                        onClick={() => navigate(`/pos/settings?pos=${posId}`)}
                        sx={{ height: '100%', p: 2 }}
                      >
                        <CardContent sx={{ textAlign: 'center' }}>
                          <SettingsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                          <Typography variant="h6" component="div" gutterBottom>
                            Configurações
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Ajustar parâmetros do sistema
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </ActionCard>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <ActionCard>
                      <CardActionArea 
                        onClick={() => navigate(`/pos/users?pos=${posId}`)}
                        sx={{ height: '100%', p: 2 }}
                      >
                        <CardContent sx={{ textAlign: 'center' }}>
                          <PersonIcon sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
                          <Typography variant="h6" component="div" gutterBottom>
                            Usuários
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Gerenciar operadores
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </ActionCard>
                  </Grid>
                </Grid>
              </>
            )}
          </StyledPaper>
        </Grid>
      </Grid>
      
      {/* Diálogo de confirmação de logout */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirmar Saída</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Tem certeza que deseja sair do sistema?
          </Typography>
          {cashierStatus?.status === 'open' && cashierStatus.operator_id === user?.id && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              Atenção: Você possui um caixa aberto. Ao sair, o caixa permanecerá aberto.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutDialogOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button onClick={confirmLogout} variant="contained" color="primary">
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

export default POSMainPage;
