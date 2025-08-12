import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  CardActions,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Badge,
  IconButton,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  CheckCircle as AcceptIcon,
  Cancel as RejectIcon,
  LocalShipping as DispatchIcon,
  Restaurant as ReadyIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import RemoteOrderConfig from '../components/RemoteOrderConfig';

// Interfaces
interface RemoteOrderItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
}

interface RemoteOrderCustomer {
  name: string;
  phone?: string;
  email?: string;
  address?: any;
}

interface RemoteOrder {
  id: string;
  external_order_id: string;
  platform: 'ifood' | 'ubereats' | 'rappi';
  status: 'pending' | 'accepted' | 'rejected' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
  items: RemoteOrderItem[];
  customer: RemoteOrderCustomer;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  notes?: string;
  created_at: string;
  scheduled_for?: string;
}

interface OrdersSummary {
  status_counts: Record<string, number>;
  platform_counts: Record<string, number>;
  pending_orders: number;
  active_orders: number;
  total_today: number;
  revenue_today: number;
}

const RemoteOrdersScreen: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<RemoteOrder[]>([]);
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<RemoteOrder | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Filtros por status
  const statusTabs = [
    { label: 'Todos', value: 'all' },
    { label: 'Pendentes', value: 'pending' },
    { label: 'Aceitos', value: 'accepted' },
    { label: 'Preparando', value: 'preparing' },
    { label: 'Prontos', value: 'ready' },
    { label: 'Despachados', value: 'delivering' }
  ];

  // Cores por plataforma
  const platformColors = {
    ifood: '#EA1D2C',
    ubereats: '#06C167',
    rappi: '#FF441F'
  };

  // Cores por status
  const statusColors = {
    pending: '#FF9800',
    accepted: '#2196F3',
    rejected: '#F44336',
    preparing: '#9C27B0',
    ready: '#4CAF50',
    delivering: '#00BCD4',
    delivered: '#8BC34A',
    cancelled: '#757575'
  };

  // Carregar dados
  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      // Carregar pedidos
      const ordersResponse = await fetch('http://localhost:8001/api/v1/remote-orders/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setOrders(ordersData);
      }

      // Carregar resumo
      const summaryResponse = await fetch('http://localhost:8001/api/v1/remote-orders/stats/summary', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showSnackbar('Erro ao carregar dados dos pedidos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filtrar pedidos por status
  const filteredOrders = orders.filter(order => {
    if (selectedTab === 0) return true; // Todos
    const tabValue = statusTabs[selectedTab].value;
    return order.status === tabValue;
  });

  // Ações de pedidos
  const handleAcceptOrder = async (orderId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8001/api/v1/remote-orders/${orderId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showSnackbar('Pedido aceito com sucesso!', 'success');
        loadData();
      } else {
        throw new Error('Erro ao aceitar pedido');
      }
    } catch (error) {
      showSnackbar('Erro ao aceitar pedido', 'error');
    }
  };

  const handleRejectOrder = async () => {
    if (!selectedOrder || !rejectReason.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8001/api/v1/remote-orders/${selectedOrder.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason })
      });

      if (response.ok) {
        showSnackbar('Pedido rejeitado com sucesso!', 'success');
        setRejectDialogOpen(false);
        setRejectReason('');
        setSelectedOrder(null);
        loadData();
      } else {
        throw new Error('Erro ao rejeitar pedido');
      }
    } catch (error) {
      showSnackbar('Erro ao rejeitar pedido', 'error');
    }
  };

  const handleDispatchOrder = async (orderId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8001/api/v1/remote-orders/${orderId}/dispatch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showSnackbar('Pedido despachado com sucesso!', 'success');
        loadData();
      } else {
        throw new Error('Erro ao despachar pedido');
      }
    } catch (error) {
      showSnackbar('Erro ao despachar pedido', 'error');
    }
  };

  const handleMarkReady = async (orderId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8001/api/v1/remote-orders/${orderId}/ready`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showSnackbar('Pedido marcado como pronto!', 'success');
        loadData();
      } else {
        throw new Error('Erro ao marcar pedido como pronto');
      }
    } catch (error) {
      showSnackbar('Erro ao marcar pedido como pronto', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSaveConfig = (configs: any[]) => {
    showSnackbar('Configurações salvas com sucesso!', 'success');
    // Recarregar dados se necessário
    loadData();
  };

  // Calcular tempo desde criação
  const getTimeAgo = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Agora';
    if (diffMinutes < 60) return `${diffMinutes}min`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ${diffMinutes % 60}min`;
  };

  // Renderizar card de pedido
  const renderOrderCard = (order: RemoteOrder) => (
    <Card key={order.id} sx={{ mb: 2, border: `2px solid ${statusColors[order.status]}` }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h6" component="div">
              Pedido #{order.external_order_id}
            </Typography>
            <Box display="flex" gap={1} mt={1}>
              <Chip 
                label={order.platform.toUpperCase()} 
                size="small"
                sx={{ 
                  backgroundColor: platformColors[order.platform], 
                  color: 'white',
                  fontWeight: 'bold'
                }}
              />
              <Chip 
                label={order.status.toUpperCase()} 
                size="small"
                sx={{ 
                  backgroundColor: statusColors[order.status], 
                  color: 'white'
                }}
              />
            </Box>
          </Box>
          <Box textAlign="right">
            <Typography variant="h6" color="primary">
              R$ {order.total.toFixed(2)}
            </Typography>
            <Box display="flex" alignItems="center" gap={0.5}>
              <TimerIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {getTimeAgo(order.created_at)}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" mb={1}>
          <strong>Cliente:</strong> {order.customer.name}
          {order.customer.phone && ` - ${order.customer.phone}`}
        </Typography>

        <Typography variant="body2" color="text.secondary" mb={2}>
          <strong>Itens:</strong> {order.items.length} item(s)
          {order.items.slice(0, 2).map(item => (
            <span key={item.id}> • {item.quantity}x {item.name}</span>
          ))}
          {order.items.length > 2 && <span> • +{order.items.length - 2} mais...</span>}
        </Typography>

        {order.notes && (
          <Typography variant="body2" color="text.secondary" mb={2}>
            <strong>Observações:</strong> {order.notes}
          </Typography>
        )}
      </CardContent>

      <CardActions>
        <Button
          size="small"
          startIcon={<InfoIcon />}
          onClick={() => {
            setSelectedOrder(order);
            setDetailsOpen(true);
          }}
        >
          Detalhes
        </Button>

        {order.status === 'pending' && (
          <>
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<AcceptIcon />}
              onClick={() => handleAcceptOrder(order.id)}
            >
              Aceitar
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<RejectIcon />}
              onClick={() => {
                setSelectedOrder(order);
                setRejectDialogOpen(true);
              }}
            >
              Rejeitar
            </Button>
          </>
        )}

        {order.status === 'preparing' && (
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<ReadyIcon />}
            onClick={() => handleMarkReady(order.id)}
          >
            Marcar Pronto
          </Button>
        )}

        {order.status === 'ready' && (
          <Button
            size="small"
            variant="contained"
            color="info"
            startIcon={<DispatchIcon />}
            onClick={() => handleDispatchOrder(order.id)}
          >
            Despachar
          </Button>
        )}
      </CardActions>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Pedidos Remotos
        </Typography>
        <Box display="flex" gap={1}>
          <IconButton onClick={loadData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setConfigDialogOpen(true)}
          >
            Configurações
          </Button>
        </Box>
      </Box>

      {/* Resumo */}
      {summary && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Pendentes
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {summary.pending_orders}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Ativos
                </Typography>
                <Typography variant="h4" color="primary">
                  {summary.active_orders}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Hoje
                </Typography>
                <Typography variant="h4" color="success.main">
                  {summary.total_today}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Receita Hoje
                </Typography>
                <Typography variant="h4" color="success.main">
                  R$ {summary.revenue_today.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filtros por Status */}
      <Tabs 
        value={selectedTab} 
        onChange={(_, newValue) => setSelectedTab(newValue)}
        sx={{ mb: 3 }}
      >
        {statusTabs.map((tab, index) => (
          <Tab 
            key={tab.value}
            label={
              <Badge 
                badgeContent={
                  tab.value === 'all' 
                    ? orders.length 
                    : orders.filter(o => o.status === tab.value).length
                } 
                color="primary"
              >
                {tab.label}
              </Badge>
            }
          />
        ))}
      </Tabs>

      {/* Lista de Pedidos */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : filteredOrders.length === 0 ? (
        <Box textAlign="center" p={4}>
          <Typography variant="h6" color="text.secondary">
            Nenhum pedido encontrado
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredOrders.map(order => (
            <Grid item xs={12} md={6} lg={4} key={order.id}>
              {renderOrderCard(order)}
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog de Detalhes */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalhes do Pedido #{selectedOrder?.external_order_id}
          <IconButton
            onClick={() => setDetailsOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Typography variant="h6" mb={2}>Informações do Cliente</Typography>
              <Typography><strong>Nome:</strong> {selectedOrder.customer.name}</Typography>
              {selectedOrder.customer.phone && (
                <Typography><strong>Telefone:</strong> {selectedOrder.customer.phone}</Typography>
              )}
              {selectedOrder.customer.email && (
                <Typography><strong>Email:</strong> {selectedOrder.customer.email}</Typography>
              )}

              <Typography variant="h6" mt={3} mb={2}>Itens do Pedido</Typography>
              {selectedOrder.items.map(item => (
                <Box key={item.id} display="flex" justifyContent="space-between" mb={1}>
                  <Typography>
                    {item.quantity}x {item.name}
                    {item.notes && <span style={{ fontStyle: 'italic' }}> ({item.notes})</span>}
                  </Typography>
                  <Typography>R$ {item.total_price.toFixed(2)}</Typography>
                </Box>
              ))}

              <Box mt={3}>
                <Typography><strong>Subtotal:</strong> R$ {selectedOrder.subtotal.toFixed(2)}</Typography>
                <Typography><strong>Taxa de Entrega:</strong> R$ {selectedOrder.delivery_fee.toFixed(2)}</Typography>
                <Typography><strong>Desconto:</strong> R$ {selectedOrder.discount.toFixed(2)}</Typography>
                <Typography variant="h6"><strong>Total:</strong> R$ {selectedOrder.total.toFixed(2)}</Typography>
              </Box>

              {selectedOrder.notes && (
                <Box mt={2}>
                  <Typography variant="h6">Observações</Typography>
                  <Typography>{selectedOrder.notes}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
        <DialogTitle>Rejeitar Pedido</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Motivo da rejeição"
            fullWidth
            multiline
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleRejectOrder}
            variant="contained"
            color="error"
            disabled={!rejectReason.trim()}
          >
            Rejeitar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Dialog de Configurações */}
      <RemoteOrderConfig
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        onSave={handleSaveConfig}
      />
    </Box>
  );
};

export default RemoteOrdersScreen;

