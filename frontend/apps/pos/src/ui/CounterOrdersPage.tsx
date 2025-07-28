import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  Snackbar,
  Badge,
  Tabs,
  Tab,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  ShoppingCart as CartIcon,
  Restaurant as RestaurantIcon,
  AttachMoney as MoneyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Category as CategoryIcon,
  Save as SaveIcon,
  Receipt as ReceiptIcon,
  Refresh as RefreshIcon,
  CheckCircle as CompleteIcon,
  Cancel as CancelIcon,
  Schedule as PendingIcon,
  LocalShipping as DeliveryIcon,
  Store as StoreIcon,
  TakeoutDining as TakeawayIcon,
  CheckCircle
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useOrder } from '../hooks/useOrder';
import { formatCurrency } from '../utils/formatters';
import { 
  Order,
  OrderStatus,
  OrderType,
  PaymentStatus 
} from '../types/order';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`counter-tabpanel-${index}`}
      aria-labelledby={`counter-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CounterOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { terminalId } = useParams<{ terminalId: string }>();
  const { user, isAuthenticated } = useAuth();
  
  const {
    orders,
    loading,
    error,
    getOrders,
    updateOrder,
    cancelOrder,
    completeOrder,
    clearError
  } = useOrder();

  const [currentTab, setCurrentTab] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/pos/${terminalId}/cashier`);
      return;
    }

    // Carregar pedidos ao montar o componente
    loadOrders();
  }, [isAuthenticated, navigate, terminalId]);

  useEffect(() => {
    if (error) {
      setSnackbarMessage(error);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }, [error]);

  const loadOrders = async () => {
    try {
      await getOrders();
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Filtrar pedidos por status
  const pendingOrders = orders.filter(order => order.status === OrderStatus.PENDING);
  const preparingOrders = orders.filter(order => order.status === OrderStatus.PREPARING);
  const readyOrders = orders.filter(order => order.status === OrderStatus.READY);
  const completedOrders = orders.filter(order => 
    order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED
  );

  // Filtrar apenas pedidos do balcão (DINE_IN e TAKEAWAY)
  const counterOrders = orders.filter(order => 
    order.order_type === OrderType.DINE_IN || order.order_type === OrderType.TAKEAWAY
  );

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setOrderDialogOpen(true);
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrder(orderId, { status: newStatus });
      showSnackbar('Status do pedido atualizado com sucesso', 'success');
      loadOrders(); // Recarregar pedidos
    } catch (err) {
      showSnackbar('Erro ao atualizar status do pedido', 'error');
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      await completeOrder(orderId);
      showSnackbar('Pedido finalizado com sucesso', 'success');
      loadOrders();
    } catch (err) {
      showSnackbar('Erro ao finalizar pedido', 'error');
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder || !cancelReason.trim()) return;

    try {
      await cancelOrder(selectedOrder.id, cancelReason);
      showSnackbar('Pedido cancelado com sucesso', 'success');
      setCancelDialogOpen(false);
      setOrderDialogOpen(false);
      setCancelReason('');
      loadOrders();
    } catch (err) {
      showSnackbar('Erro ao cancelar pedido', 'error');
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'warning';
      case OrderStatus.PREPARING:
        return 'info';
      case OrderStatus.READY:
        return 'success';
      case OrderStatus.DELIVERED:
        return 'default';
      case OrderStatus.CANCELLED:
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return <PendingIcon />;
      case OrderStatus.PREPARING:
        return <RestaurantIcon />;
      case OrderStatus.READY:
        return <CompleteIcon />;
      case OrderStatus.DELIVERED:
        return <CheckCircle />;
      case OrderStatus.CANCELLED:
        return <CancelIcon />;
      default:
        return <PendingIcon />;
    }
  };

  const getOrderTypeIcon = (orderType: OrderType) => {
    switch (orderType) {
      case OrderType.DINE_IN:
        return <StoreIcon />;
      case OrderType.TAKEAWAY:
        return <TakeawayIcon />;
      case OrderType.DELIVERY:
        return <DeliveryIcon />;
      default:
        return <StoreIcon />;
    }
  };

  const getOrderTypeLabel = (orderType: OrderType) => {
    switch (orderType) {
      case OrderType.DINE_IN:
        return 'Balcão';
      case OrderType.TAKEAWAY:
        return 'Viagem';
      case OrderType.DELIVERY:
        return 'Delivery';
      default:
        return 'Balcão';
    }
  };

  const renderOrderCard = (order: Order) => (
    <Card 
      key={order.id} 
      sx={{ 
        mb: 2, 
        cursor: 'pointer',
        '&:hover': { 
          boxShadow: 4 
        }
      }}
      onClick={() => handleOrderClick(order)}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" component="div">
              Pedido #{order.id.slice(-6)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {order.customer_name || 'Cliente'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date(order.created_at).toLocaleString()}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
            <Chip
              icon={getStatusIcon(order.status)}
              label={order.status.replace('_', ' ').toUpperCase()}
              color={getStatusColor(order.status)}
              size="small"
            />
            <Chip
              icon={getOrderTypeIcon(order.order_type)}
              label={getOrderTypeLabel(order.order_type)}
              variant="outlined"
              size="small"
            />
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Itens ({order.items.length}):
          </Typography>
          {order.items.slice(0, 3).map((item, index) => (
            <Typography key={index} variant="body2">
              {item.quantity}x {item.product_name}
            </Typography>
          ))}
          {order.items.length > 3 && (
            <Typography variant="body2" color="text.secondary">
              +{order.items.length - 3} mais...
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" color="primary">
            {formatCurrency(order.total)}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {order.status === OrderStatus.PENDING && (
              <Button
                size="small"
                variant="contained"
                color="info"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange(order.id, OrderStatus.PREPARING);
                }}
              >
                Iniciar
              </Button>
            )}
            
            {order.status === OrderStatus.PREPARING && (
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange(order.id, OrderStatus.READY);
                }}
              >
                Pronto
              </Button>
            )}
            
            {order.status === OrderStatus.READY && (
              <Button
                size="small"
                variant="contained"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCompleteOrder(order.id);
                }}
              >
                Entregar
              </Button>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (!isAuthenticated) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="h1">
            Pedidos do Balcão
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadOrders}
              disabled={loading}
            >
              Atualizar
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(`/pos/${terminalId}/main`)}
            >
              Novo Pedido
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label={
              <Badge badgeContent={pendingOrders.length} color="warning">
                Pendentes
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={preparingOrders.length} color="info">
                Preparando
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={readyOrders.length} color="success">
                Prontos
              </Badge>
            } 
          />
          <Tab label="Finalizados" />
        </Tabs>

        {/* Tab Panels */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <TabPanel value={currentTab} index={0}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : pendingOrders.length === 0 ? (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <PendingIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Nenhum pedido pendente
                </Typography>
              </Box>
            ) : (
              pendingOrders.map(renderOrderCard)
            )}
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : preparingOrders.length === 0 ? (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <RestaurantIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Nenhum pedido em preparo
                </Typography>
              </Box>
            ) : (
              preparingOrders.map(renderOrderCard)
            )}
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : readyOrders.length === 0 ? (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <CompleteIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Nenhum pedido pronto
                </Typography>
              </Box>
            ) : (
              readyOrders.map(renderOrderCard)
            )}
          </TabPanel>

          <TabPanel value={currentTab} index={3}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : completedOrders.length === 0 ? (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <CheckCircle sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Nenhum pedido finalizado hoje
                </Typography>
              </Box>
            ) : (
              completedOrders.map(renderOrderCard)
            )}
          </TabPanel>
        </Box>
      </Paper>

      {/* Dialog de Detalhes do Pedido */}
      <Dialog 
        open={orderDialogOpen} 
        onClose={() => setOrderDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalhes do Pedido #{selectedOrder?.id.slice(-6)}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Cliente:
                  </Typography>
                  <Typography variant="body1">
                    {selectedOrder.customer_name || 'Cliente'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Tipo:
                  </Typography>
                  <Typography variant="body1">
                    {getOrderTypeLabel(selectedOrder.order_type)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Status:
                  </Typography>
                  <Chip
                    icon={getStatusIcon(selectedOrder.status)}
                    label={selectedOrder.status.replace('_', ' ').toUpperCase()}
                    color={getStatusColor(selectedOrder.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Mesa:
                  </Typography>
                  <Typography variant="body1">
                    {selectedOrder.table_number || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ mb: 2 }} />

              <Typography variant="h6" gutterBottom>
                Itens do Pedido
              </Typography>
              <List>
                {selectedOrder.items.map((item, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={item.product_name}
                      secondary={`Quantidade: ${item.quantity} | Preço unitário: ${formatCurrency(item.unit_price)}`}
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="body1" fontWeight="bold">
                        {formatCurrency(item.unit_price * item.quantity)}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ mt: 2, mb: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Total:
                </Typography>
                <Typography variant="h5" color="primary" fontWeight="bold">
                  {formatCurrency(selectedOrder.total)}
                </Typography>
              </Box>

              {selectedOrder.notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Observações:
                  </Typography>
                  <Typography variant="body1">
                    {selectedOrder.notes}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedOrder?.status !== OrderStatus.CANCELLED && 
           selectedOrder?.status !== OrderStatus.DELIVERED && (
            <Button
              onClick={() => setCancelDialogOpen(true)}
              color="error"
            >
              Cancelar Pedido
            </Button>
          )}
          <Button onClick={() => setOrderDialogOpen(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Cancelamento */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>Cancelar Pedido</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Tem certeza que deseja cancelar este pedido?
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Motivo do cancelamento"
            fullWidth
            variant="outlined"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>
            Voltar
          </Button>
          <Button 
            onClick={handleCancelOrder}
            color="error"
            variant="contained"
            disabled={!cancelReason.trim()}
          >
            Confirmar Cancelamento
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CounterOrdersPage;

