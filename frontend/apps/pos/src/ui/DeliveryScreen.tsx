import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDelivery } from '../hooks/useDelivery';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Paper
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  LocationOn,
  Phone,
  Person,
  TwoWheeler,
  CheckCircle,
  Schedule,
  LocalShipping
} from '@mui/icons-material';

interface DeliveryAddress {
  id: string;
  customerId: string;
  customerName: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  zipCode: string;
  phone: string;
  isDefault: boolean;
}

interface DeliveryOrder {
  id: string;
  customerId: string;
  customerName: string;
  address: DeliveryAddress;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  deliveryFee: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled';
  paymentMethod: 'cash' | 'card' | 'pix' | 'paid_online';
  paymentStatus: 'pending' | 'paid';
  estimatedTime: string;
  motoboyId?: string;
  motoboyName?: string;
  createdAt: string;
  dispatchedAt?: string;
  deliveredAt?: string;
}

interface Motoboy {
  id: string;
  name: string;
  phone: string;
  status: 'available' | 'busy' | 'offline';
  currentDeliveries: number;
  maxDeliveries: number;
  location?: {
    lat: number;
    lng: number;
  };
}

const DeliveryScreen: React.FC = () => {
  const { terminalId } = useParams<{ terminalId: string }>();
  const navigate = useNavigate();
  
  // Hook para integração com backend
  const {
    deliveryOrders,
    couriers,
    loading,
    error,
    loadDeliveryOrders,
    loadCouriers,
    assignCourier,
    startDelivery,
    completeDelivery,
    cancelDeliveryOrder,
    clearError
  } = useDelivery();
  
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'motoboys'>('orders');

  useEffect(() => {
    // Carregar dados reais do backend (com fallback)
    try {
      loadDeliveryOrders();
      loadCouriers();
    } catch (error) {
      console.error('Erro ao carregar dados de delivery:', error);
    }
  }, [loadDeliveryOrders, loadCouriers]);

  // Converter dados do backend para formato da interface local (temporário)
  // Com fallback para arrays vazios se não houver dados
  const convertedOrders: DeliveryOrder[] = React.useMemo(() => {
    if (!deliveryOrders || !Array.isArray(deliveryOrders)) {
      return [];
    }
    
    return deliveryOrders.map(order => ({
      id: order.id,
      customerId: order.customer_id,
      customerName: 'Cliente', // Será preenchido quando tivermos integração com customers
      address: {
        id: order.address_id,
        customerId: order.customer_id,
        customerName: 'Cliente',
        street: 'Endereço não carregado',
        number: '',
        neighborhood: '',
        city: '',
        zipCode: '',
        phone: '',
        isDefault: true
      },
      items: [], // Será preenchido quando tivermos integração com order items
      total: 0,
      deliveryFee: order.delivery_fee,
      status: order.status as any,
      paymentMethod: order.payment_method as any || 'cash',
      paymentStatus: 'pending',
      estimatedTime: order.estimated_delivery_time || '30 min',
      motoboyId: order.courier_id,
      motoboyName: couriers?.find(c => c.id === order.courier_id)?.name,
      createdAt: new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      dispatchedAt: undefined,
      deliveredAt: order.actual_delivery_time ? new Date(order.actual_delivery_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined
    }));
  }, [deliveryOrders, couriers]);

  const convertedMotoboys: Motoboy[] = React.useMemo(() => {
    if (!couriers || !Array.isArray(couriers)) {
      return [];
    }
    
    return couriers.map(courier => ({
      id: courier.id,
      name: courier.name,
      phone: courier.phone,
      status: courier.status as any,
      currentDeliveries: 0, // Será calculado quando tivermos mais dados
      maxDeliveries: 3,
      location: courier.current_location ? {
        lat: courier.current_location.latitude,
        lng: courier.current_location.longitude
      } : undefined
    }));
  }, [couriers]);

  const getStatusColor = (status: DeliveryOrder['status']) => {
    switch (status) {
      case 'pending': return 'default';
      case 'confirmed': return 'info';
      case 'preparing': return 'warning';
      case 'ready': return 'success';
      case 'dispatched': return 'primary';
      case 'delivered': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: DeliveryOrder['status']) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'confirmed': return 'Confirmado';
      case 'preparing': return 'Preparando';
      case 'ready': return 'Pronto';
      case 'dispatched': return 'Saiu para Entrega';
      case 'delivered': return 'Entregue';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const handleOrderAction = async (orderId: string, action: string, motoboyId?: string) => {
    try {
      switch (action) {
        case 'confirm':
          // Implementar quando tivermos endpoint específico de confirmação
          break;
        case 'prepare':
          // Implementar quando tivermos endpoint específico de preparação
          break;
        case 'ready':
          // Implementar quando tivermos endpoint específico de pronto
          break;
        case 'dispatch':
          if (motoboyId) {
            await assignCourier(orderId, motoboyId);
            await startDelivery(orderId);
          }
          break;
        case 'deliver':
          await completeDelivery(orderId);
          break;
        case 'cancel':
          await cancelDeliveryOrder(orderId, 'Cancelado pelo usuário');
          break;
        default:
          break;
      }
      
      // Recarregar dados após ação
      await loadDeliveryOrders();
      await loadCouriers();
    } catch (error) {
      console.error('Erro ao executar ação:', error);
    }
  };

  const renderOrderCard = (order: DeliveryOrder) => (
    <Card key={order.id} sx={{ mb: 2, cursor: 'pointer' }} onClick={() => { setSelectedOrder(order); setDialogOpen(true); }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Pedido #{order.id}
          </Typography>
          <Chip 
            label={getStatusText(order.status)}
            color={getStatusColor(order.status)}
            size="small"
          />
        </Box>

        <Typography variant="body2" color="text.secondary" mb={1}>
          <Person fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
          {order.customerName}
        </Typography>

        <Typography variant="body2" color="text.secondary" mb={1}>
          <LocationOn fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
          {order.address.street}, {order.address.number} - {order.address.neighborhood}
        </Typography>

        <Typography variant="body2" color="text.secondary" mb={1}>
          <Phone fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
          {order.address.phone}
        </Typography>

        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
          <Typography variant="body2">
            Total: R$ {(order.total + order.deliveryFee).toFixed(2)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {order.estimatedTime} • {order.createdAt}
          </Typography>
        </Box>

        {order.motoboyName && (
          <Typography variant="body2" color="primary" mt={1}>
            <TwoWheeler fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
            {order.motoboyName}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const renderMotoboyCard = (motoboy: Motoboy) => (
    <Card key={motoboy.id} sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            {motoboy.name}
          </Typography>
          <Chip 
            label={motoboy.status === 'available' ? 'Disponível' : motoboy.status === 'busy' ? 'Ocupado' : 'Offline'}
            color={motoboy.status === 'available' ? 'success' : motoboy.status === 'busy' ? 'warning' : 'default'}
            size="small"
          />
        </Box>

        <Typography variant="body2" color="text.secondary" mb={1}>
          <Phone fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
          {motoboy.phone}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Entregas: {motoboy.currentDeliveries}/{motoboy.maxDeliveries}
        </Typography>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Carregando sistema de delivery...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Sistema de Delivery - Terminal {terminalId}
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate(`/pos/${terminalId}/tables`)}
        >
          Voltar às Mesas
        </Button>
      </Box>

      {/* Estatísticas */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pedidos Ativos
              </Typography>
              <Typography variant="h5" component="div">
                {convertedOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Prontos para Entrega
              </Typography>
              <Typography variant="h5" component="div" color="green">
                {convertedOrders.filter(o => o.status === 'ready').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Em Entrega
              </Typography>
              <Typography variant="h5" component="div" color="blue">
                {convertedOrders.filter(o => o.status === 'dispatched').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Motoboys Disponíveis
              </Typography>
              <Typography variant="h5" component="div" color="green">
                {convertedMotoboys.filter(m => m.status === 'available').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Button
          variant={activeTab === 'orders' ? 'contained' : 'text'}
          onClick={() => setActiveTab('orders')}
          sx={{ mr: 2 }}
        >
          Pedidos
        </Button>
        <Button
          variant={activeTab === 'motoboys' ? 'contained' : 'text'}
          onClick={() => setActiveTab('motoboys')}
        >
          Motoboys
        </Button>
      </Box>

      {/* Conteúdo */}
      <Grid container spacing={3}>
        {activeTab === 'orders' && (
          <>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" mb={2}>Pendentes/Preparando</Typography>
              {convertedOrders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).map(renderOrderCard)}
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" mb={2}>Prontos</Typography>
              {convertedOrders.filter(o => o.status === 'ready').map(renderOrderCard)}
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" mb={2}>Em Entrega/Entregues</Typography>
              {convertedOrders.filter(o => ['dispatched', 'delivered'].includes(o.status)).map(renderOrderCard)}
            </Grid>
          </>
        )}

        {activeTab === 'motoboys' && (
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {convertedMotoboys.map(motoboy => (
                <Grid item xs={12} md={4} key={motoboy.id}>
                  {renderMotoboyCard(motoboy)}
                </Grid>
              ))}
            </Grid>
          </Grid>
        )}
      </Grid>

      {/* Dialog de Detalhes do Pedido */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Pedido #{selectedOrder?.id} - {getStatusText(selectedOrder?.status || 'pending')}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Typography variant="h6" mb={2}>Cliente</Typography>
              <Typography variant="body2" mb={1}>{selectedOrder.customerName}</Typography>
              <Typography variant="body2" mb={1}>{selectedOrder.address.phone}</Typography>
              
              <Typography variant="h6" mt={3} mb={2}>Endereço</Typography>
              <Typography variant="body2" mb={1}>
                {selectedOrder.address.street}, {selectedOrder.address.number}
                {selectedOrder.address.complement && ` - ${selectedOrder.address.complement}`}
              </Typography>
              <Typography variant="body2" mb={1}>
                {selectedOrder.address.neighborhood} - {selectedOrder.address.city}
              </Typography>
              <Typography variant="body2" mb={1}>CEP: {selectedOrder.address.zipCode}</Typography>

              <Typography variant="h6" mt={3} mb={2}>Itens</Typography>
              {selectedOrder.items.map(item => (
                <Box key={item.id} display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">
                    {item.quantity}x {item.name}
                  </Typography>
                  <Typography variant="body2">
                    R$ {(item.quantity * item.price).toFixed(2)}
                  </Typography>
                </Box>
              ))}
              
              <Divider sx={{ my: 2 }} />
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Subtotal:</Typography>
                <Typography variant="body2">R$ {selectedOrder.total.toFixed(2)}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Taxa de Entrega:</Typography>
                <Typography variant="body2">R$ {selectedOrder.deliveryFee.toFixed(2)}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body1" fontWeight="bold">Total:</Typography>
                <Typography variant="body1" fontWeight="bold">
                  R$ {(selectedOrder.total + selectedOrder.deliveryFee).toFixed(2)}
                </Typography>
              </Box>

              <Typography variant="h6" mt={3} mb={2}>Pagamento</Typography>
              <Typography variant="body2" mb={1}>
                Método: {selectedOrder.paymentMethod === 'cash' ? 'Dinheiro' : 
                         selectedOrder.paymentMethod === 'card' ? 'Cartão' :
                         selectedOrder.paymentMethod === 'pix' ? 'PIX' : 'Pago Online'}
              </Typography>
              <Typography variant="body2">
                Status: {selectedOrder.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
              </Typography>

              {selectedOrder.motoboyName && (
                <>
                  <Typography variant="h6" mt={3} mb={2}>Entregador</Typography>
                  <Typography variant="body2">{selectedOrder.motoboyName}</Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Fechar
          </Button>
          
          {selectedOrder?.status === 'pending' && (
            <Button onClick={() => handleOrderAction(selectedOrder.id, 'confirm')} color="primary">
              Confirmar Pedido
            </Button>
          )}
          
          {selectedOrder?.status === 'confirmed' && (
            <Button onClick={() => handleOrderAction(selectedOrder.id, 'prepare')} color="warning">
              Iniciar Preparo
            </Button>
          )}
          
          {selectedOrder?.status === 'preparing' && (
            <Button onClick={() => handleOrderAction(selectedOrder.id, 'ready')} color="success">
              Marcar como Pronto
            </Button>
          )}
          
          {selectedOrder?.status === 'ready' && (
            <FormControl sx={{ minWidth: 120, mr: 2 }}>
              <InputLabel>Motoboy</InputLabel>
              <Select
                value=""
                onChange={(e) => handleOrderAction(selectedOrder.id, 'dispatch', e.target.value)}
              >
                {convertedMotoboys.filter(m => m.status === 'available' || m.currentDeliveries < m.maxDeliveries).map(motoboy => (
                  <MenuItem key={motoboy.id} value={motoboy.id}>
                    {motoboy.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          
          {selectedOrder?.status === 'dispatched' && (
            <Button onClick={() => handleOrderAction(selectedOrder.id, 'deliver')} color="success" variant="contained">
              Marcar como Entregue
            </Button>
          )}
          
          {!['delivered', 'cancelled'].includes(selectedOrder?.status || '') && (
            <Button onClick={() => handleOrderAction(selectedOrder?.id || '', 'cancel')} color="error">
              Cancelar Pedido
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeliveryScreen;

