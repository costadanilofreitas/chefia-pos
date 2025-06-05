import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'motoboys'>('orders');

  useEffect(() => {
    loadDeliveryData();
  }, []);

  const loadDeliveryData = async () => {
    setLoading(true);
    try {
      // Mock data para demonstração
      const mockOrders: DeliveryOrder[] = [
        {
          id: '1',
          customerId: 'c1',
          customerName: 'Ana Silva',
          address: {
            id: 'a1',
            customerId: 'c1',
            customerName: 'Ana Silva',
            street: 'Rua das Flores',
            number: '123',
            complement: 'Apto 45',
            neighborhood: 'Centro',
            city: 'São Paulo',
            zipCode: '01234-567',
            phone: '(11) 99999-1234',
            isDefault: true
          },
          items: [
            { id: '1', name: 'Pizza Margherita', quantity: 1, price: 35.90 },
            { id: '2', name: 'Refrigerante 2L', quantity: 1, price: 8.50 }
          ],
          total: 44.40,
          deliveryFee: 5.00,
          status: 'preparing',
          paymentMethod: 'card',
          paymentStatus: 'paid',
          estimatedTime: '45 min',
          createdAt: '19:30',
        },
        {
          id: '2',
          customerId: 'c2',
          customerName: 'João Santos',
          address: {
            id: 'a2',
            customerId: 'c2',
            customerName: 'João Santos',
            street: 'Av. Paulista',
            number: '1000',
            neighborhood: 'Bela Vista',
            city: 'São Paulo',
            zipCode: '01310-100',
            phone: '(11) 88888-5678',
            isDefault: true
          },
          items: [
            { id: '3', name: 'Hambúrguer Especial', quantity: 2, price: 28.90 },
            { id: '4', name: 'Batata Frita', quantity: 1, price: 12.90 }
          ],
          total: 70.70,
          deliveryFee: 6.00,
          status: 'ready',
          paymentMethod: 'cash',
          paymentStatus: 'pending',
          estimatedTime: '30 min',
          createdAt: '20:15',
        },
        {
          id: '3',
          customerId: 'c3',
          customerName: 'Maria Costa',
          address: {
            id: 'a3',
            customerId: 'c3',
            customerName: 'Maria Costa',
            street: 'Rua Augusta',
            number: '500',
            neighborhood: 'Consolação',
            city: 'São Paulo',
            zipCode: '01305-000',
            phone: '(11) 77777-9012',
            isDefault: true
          },
          items: [
            { id: '5', name: 'Salada Caesar', quantity: 1, price: 24.90 }
          ],
          total: 24.90,
          deliveryFee: 4.50,
          status: 'dispatched',
          paymentMethod: 'pix',
          paymentStatus: 'paid',
          estimatedTime: '20 min',
          motoboyId: 'm1',
          motoboyName: 'Carlos Moto',
          createdAt: '20:45',
          dispatchedAt: '21:10'
        }
      ];

      const mockMotoboys: Motoboy[] = [
        {
          id: 'm1',
          name: 'Carlos Moto',
          phone: '(11) 99999-0001',
          status: 'busy',
          currentDeliveries: 1,
          maxDeliveries: 3
        },
        {
          id: 'm2',
          name: 'Pedro Delivery',
          phone: '(11) 99999-0002',
          status: 'available',
          currentDeliveries: 0,
          maxDeliveries: 2
        },
        {
          id: 'm3',
          name: 'Lucas Express',
          phone: '(11) 99999-0003',
          status: 'busy',
          currentDeliveries: 2,
          maxDeliveries: 3
        }
      ];

      setOrders(mockOrders);
      setMotoboys(mockMotoboys);
    } catch (error) {
      console.error('Erro ao carregar dados de delivery:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleOrderAction = (orderId: string, action: string, motoboyId?: string) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        switch (action) {
          case 'confirm':
            return { ...order, status: 'confirmed' as const };
          case 'prepare':
            return { ...order, status: 'preparing' as const };
          case 'ready':
            return { ...order, status: 'ready' as const };
          case 'dispatch':
            const motoboy = motoboys.find(m => m.id === motoboyId);
            return { 
              ...order, 
              status: 'dispatched' as const,
              motoboyId,
              motoboyName: motoboy?.name,
              dispatchedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            };
          case 'deliver':
            return { 
              ...order, 
              status: 'delivered' as const,
              deliveredAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            };
          case 'cancel':
            return { ...order, status: 'cancelled' as const };
          default:
            return order;
        }
      }
      return order;
    }));

    // Atualizar status do motoboy se necessário
    if (action === 'dispatch' && motoboyId) {
      setMotoboys(prev => prev.map(motoboy => 
        motoboy.id === motoboyId 
          ? { 
              ...motoboy, 
              currentDeliveries: motoboy.currentDeliveries + 1,
              status: motoboy.currentDeliveries + 1 >= motoboy.maxDeliveries ? 'busy' as const : motoboy.status
            }
          : motoboy
      ));
    }

    if (action === 'deliver' && selectedOrder?.motoboyId) {
      setMotoboys(prev => prev.map(motoboy => 
        motoboy.id === selectedOrder.motoboyId 
          ? { 
              ...motoboy, 
              currentDeliveries: Math.max(0, motoboy.currentDeliveries - 1),
              status: 'available' as const
            }
          : motoboy
      ));
    }

    setDialogOpen(false);
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
                {orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length}
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
                {orders.filter(o => o.status === 'ready').length}
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
                {orders.filter(o => o.status === 'dispatched').length}
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
                {motoboys.filter(m => m.status === 'available').length}
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
              {orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).map(renderOrderCard)}
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" mb={2}>Prontos</Typography>
              {orders.filter(o => o.status === 'ready').map(renderOrderCard)}
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" mb={2}>Em Entrega/Entregues</Typography>
              {orders.filter(o => ['dispatched', 'delivered'].includes(o.status)).map(renderOrderCard)}
            </Grid>
          </>
        )}

        {activeTab === 'motoboys' && (
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {motoboys.map(motoboy => (
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
                {motoboys.filter(m => m.status === 'available' || m.currentDeliveries < m.maxDeliveries).map(motoboy => (
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

