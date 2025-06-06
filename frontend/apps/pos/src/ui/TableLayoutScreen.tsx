import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Tooltip,
  Fab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert
} from '@mui/material';
import {
  TableRestaurant,
  Person,
  Refresh,
  Kitchen,
  DeliveryDining,
  Chair,
  Restaurant,
  Add as AddIcon,
  Edit as EditIcon,
  ShoppingCart as OrderIcon,
  Payment as PaymentIcon,
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { formatCurrency } from '../utils/formatters';

interface Table {
  id: string;
  number: number;
  seats: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  waiter?: string;
  customers?: number;
  orderValue?: number;
  startTime?: string;
  position: {
    x: number;
    y: number;
  };
  shape: 'round' | 'square' | 'rectangle';
  area: 'main' | 'terrace' | 'vip' | 'bar';
  orders?: Order[];
}

interface Order {
  id: string;
  tableId: string;
  seatNumber: number;
  customerName?: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  createdAt: string;
}

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  notes?: string;
}

const TableLayoutScreen: React.FC = () => {
  const { terminalId } = useParams<{ terminalId: string }>();
  const navigate = useNavigate();
  
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newOrder, setNewOrder] = useState({
    seatNumber: 1,
    customerName: '',
    items: [] as OrderItem[]
  });

  // Dimensões do salão (em pixels)
  const SALON_WIDTH = 800;
  const SALON_HEIGHT = 600;

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = useCallback(async () => {
    setLoading(true);
    try {
      // Layout realista de um restaurante com pedidos por cadeira
      const mockTables: Table[] = [
        // Área Principal - Centro
        {
          id: '1',
          number: 1,
          seats: 4,
          status: 'occupied',
          waiter: 'João Silva',
          customers: 3,
          orderValue: 125.50,
          startTime: '19:30',
          position: { x: 150, y: 150 },
          shape: 'round',
          area: 'main',
          orders: [
            {
              id: 'order-1-1',
              tableId: '1',
              seatNumber: 1,
              customerName: 'Ana',
              items: [
                { id: '1', productName: 'Hambúrguer Clássico', quantity: 1, price: 25.90 },
                { id: '2', productName: 'Refrigerante', quantity: 1, price: 5.50 }
              ],
              total: 31.40,
              status: 'served',
              createdAt: '19:35'
            },
            {
              id: 'order-1-2',
              tableId: '1',
              seatNumber: 2,
              customerName: 'Carlos',
              items: [
                { id: '3', productName: 'Pizza Margherita', quantity: 1, price: 35.00 },
                { id: '4', productName: 'Suco Natural', quantity: 1, price: 8.00 }
              ],
              total: 43.00,
              status: 'preparing',
              createdAt: '19:40'
            },
            {
              id: 'order-1-3',
              tableId: '1',
              seatNumber: 3,
              customerName: 'Maria',
              items: [
                { id: '5', productName: 'Salada Caesar', quantity: 1, price: 18.50 },
                { id: '6', productName: 'Água', quantity: 1, price: 3.00 }
              ],
              total: 21.50,
              status: 'ready',
              createdAt: '19:45'
            }
          ]
        },
        {
          id: '2',
          number: 2,
          seats: 2,
          status: 'available',
          position: { x: 300, y: 150 },
          shape: 'square',
          area: 'main',
          orders: []
        },
        {
          id: '3',
          number: 3,
          seats: 6,
          status: 'reserved',
          waiter: 'Maria Santos',
          startTime: '20:00',
          position: { x: 450, y: 150 },
          shape: 'rectangle',
          area: 'main',
          orders: []
        },
        {
          id: '4',
          number: 4,
          seats: 4,
          status: 'cleaning',
          position: { x: 600, y: 150 },
          shape: 'round',
          area: 'main',
          orders: []
        },
        
        // Área Principal - Meio
        {
          id: '5',
          number: 5,
          seats: 8,
          status: 'occupied',
          waiter: 'Pedro Costa',
          customers: 6,
          orderValue: 340.80,
          startTime: '18:45',
          position: { x: 150, y: 300 },
          shape: 'rectangle',
          area: 'main',
          orders: [
            {
              id: 'order-5-1',
              tableId: '5',
              seatNumber: 1,
              customerName: 'Roberto',
              items: [
                { id: '7', productName: 'Picanha Grelhada', quantity: 1, price: 45.00 },
                { id: '8', productName: 'Cerveja', quantity: 2, price: 8.00 }
              ],
              total: 61.00,
              status: 'served',
              createdAt: '19:00'
            },
            {
              id: 'order-5-2',
              tableId: '5',
              seatNumber: 2,
              customerName: 'Fernanda',
              items: [
                { id: '9', productName: 'Salmão Grelhado', quantity: 1, price: 38.00 },
                { id: '10', productName: 'Vinho Branco', quantity: 1, price: 25.00 }
              ],
              total: 63.00,
              status: 'preparing',
              createdAt: '19:10'
            }
          ]
        },
        {
          id: '6',
          number: 6,
          seats: 2,
          status: 'available',
          position: { x: 350, y: 300 },
          shape: 'square',
          area: 'main',
          orders: []
        },
        {
          id: '7',
          number: 7,
          seats: 4,
          status: 'available',
          position: { x: 500, y: 300 },
          shape: 'round',
          area: 'main',
          orders: []
        },
        {
          id: '8',
          number: 8,
          seats: 6,
          status: 'occupied',
          waiter: 'Ana Costa',
          customers: 4,
          orderValue: 180.30,
          startTime: '19:15',
          position: { x: 650, y: 300 },
          shape: 'rectangle',
          area: 'main',
          orders: []
        },

        // Área do Bar
        {
          id: '9',
          number: 9,
          seats: 2,
          status: 'available',
          position: { x: 100, y: 450 },
          shape: 'square',
          area: 'bar',
          orders: []
        },
        {
          id: '10',
          number: 10,
          seats: 2,
          status: 'occupied',
          waiter: 'Carlos Bar',
          customers: 2,
          orderValue: 85.60,
          startTime: '20:30',
          position: { x: 200, y: 450 },
          shape: 'square',
          area: 'bar',
          orders: []
        },

        // Área VIP - Canto
        {
          id: '11',
          number: 11,
          seats: 8,
          status: 'reserved',
          waiter: 'Lucia VIP',
          startTime: '21:00',
          position: { x: 550, y: 450 },
          shape: 'rectangle',
          area: 'vip',
          orders: []
        },
        {
          id: '12',
          number: 12,
          seats: 6,
          status: 'available',
          position: { x: 700, y: 450 },
          shape: 'round',
          area: 'vip',
          orders: []
        },

        // Terraço
        {
          id: '13',
          number: 13,
          seats: 4,
          status: 'available',
          position: { x: 150, y: 50 },
          shape: 'round',
          area: 'terrace',
          orders: []
        },
        {
          id: '14',
          number: 14,
          seats: 4,
          status: 'occupied',
          waiter: 'Roberto Terraço',
          customers: 3,
          orderValue: 95.40,
          startTime: '19:45',
          position: { x: 350, y: 50 },
          shape: 'round',
          area: 'terrace',
          orders: []
        },
        {
          id: '15',
          number: 15,
          seats: 6,
          status: 'available',
          position: { x: 550, y: 50 },
          shape: 'rectangle',
          area: 'terrace',
          orders: []
        }
      ];
      
      setTables(mockTables);
    } catch (error) {
      console.error('Erro ao carregar mesas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getStatusColor = (status: Table['status']) => {
    switch (status) {
      case 'available': return '#4CAF50'; // Verde
      case 'occupied': return '#F44336'; // Vermelho
      case 'reserved': return '#FF9800'; // Laranja
      case 'cleaning': return '#2196F3'; // Azul
      default: return '#9E9E9E';
    }
  };

  const getOrderStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'preparing': return 'info';
      case 'ready': return 'success';
      case 'served': return 'default';
      default: return 'default';
    }
  };

  const getAreaLabel = (area: Table['area']) => {
    switch (area) {
      case 'main': return 'Salão Principal';
      case 'terrace': return 'Terraço';
      case 'vip': return 'Área VIP';
      case 'bar': return 'Bar';
      default: return area;
    }
  };

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
    setDialogOpen(true);
  };

  const handleTableAction = (action: string) => {
    if (!selectedTable) return;

    switch (action) {
      case 'occupy':
        updateTableStatus(selectedTable.id, 'occupied');
        break;
      case 'free':
        updateTableStatus(selectedTable.id, 'available');
        break;
      case 'reserve':
        updateTableStatus(selectedTable.id, 'reserved');
        break;
      case 'clean':
        updateTableStatus(selectedTable.id, 'cleaning');
        break;
      case 'order':
        setOrderDialogOpen(true);
        break;
      case 'payment':
        navigate(`/pos/${terminalId}/payment`, {
          state: { 
            tableId: selectedTable.id,
            orders: selectedTable.orders || []
          }
        });
        break;
      case 'close':
        handleCloseTable();
        break;
    }
    if (action !== 'order') {
      setDialogOpen(false);
    }
  };

  const updateTableStatus = (tableId: string, status: Table['status']) => {
    setTables(prev => prev.map(table => 
      table.id === tableId 
        ? { 
            ...table, 
            status, 
            ...(status === 'available' ? { 
              waiter: undefined, 
              customers: undefined, 
              orderValue: undefined, 
              startTime: undefined,
              orders: []
            } : {}) 
          }
        : table
    ));
  };

  const handleAddOrder = () => {
    if (!selectedTable || !newOrder.customerName) return;

    const order: Order = {
      id: `order-${selectedTable.id}-${Date.now()}`,
      tableId: selectedTable.id,
      seatNumber: newOrder.seatNumber,
      customerName: newOrder.customerName,
      items: [],
      total: 0,
      status: 'pending',
      createdAt: new Date().toLocaleTimeString()
    };

    setTables(prev => prev.map(table => 
      table.id === selectedTable.id
        ? {
            ...table,
            orders: [...(table.orders || []), order],
            status: 'occupied'
          }
        : table
    ));

    // Navegar para tela de pedido
    navigate(`/pos/${terminalId}/waiter/table/${selectedTable.id}/seat/${newOrder.seatNumber}`, {
      state: { order }
    });

    setOrderDialogOpen(false);
    setDialogOpen(false);
    setNewOrder({ seatNumber: 1, customerName: '', items: [] });
  };

  const handleCloseTable = () => {
    if (!selectedTable) return;

    const totalValue = (selectedTable.orders || []).reduce((sum, order) => sum + order.total, 0);
    
    // Simular fechamento da conta
    updateTableStatus(selectedTable.id, 'cleaning');
    setDialogOpen(false);
    
    // Mostrar resumo
    alert(`Mesa ${selectedTable.number} fechada!\nTotal: ${formatCurrency(totalValue)}`);
  };

  const renderTable = (table: Table) => {
    const tableSize = table.seats <= 2 ? 60 : table.seats <= 4 ? 80 : table.seats <= 6 ? 100 : 120;
    const hasOrders = table.orders && table.orders.length > 0;
    
    return (
      <Box
        key={table.id}
        sx={{
          position: 'absolute',
          left: table.position.x,
          top: table.position.y,
          width: table.shape === 'rectangle' ? tableSize * 1.5 : tableSize,
          height: table.shape === 'rectangle' ? tableSize * 0.8 : tableSize,
          borderRadius: table.shape === 'round' ? '50%' : table.shape === 'square' ? '8px' : '12px',
          backgroundColor: getStatusColor(table.status),
          border: hasOrders ? '4px solid #FFD700' : '3px solid #333',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '14px',
          boxShadow: hasOrders ? '0 0 15px rgba(255, 215, 0, 0.7)' : '0 4px 8px rgba(0,0,0,0.3)',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'scale(1.1)',
            boxShadow: hasOrders ? '0 0 20px rgba(255, 215, 0, 0.9)' : '0 6px 12px rgba(0,0,0,0.4)',
            zIndex: 10
          }
        }}
        onClick={() => handleTableClick(table)}
      >
        <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '12px' }}>
          {table.number}
        </Typography>
        <Box display="flex" alignItems="center" mt={0.5}>
          <Chair sx={{ fontSize: '12px', mr: 0.5 }} />
          <Typography variant="caption" sx={{ fontSize: '10px' }}>
            {table.seats}
          </Typography>
        </Box>
        
        {hasOrders && (
          <Typography variant="caption" sx={{ fontSize: '8px', mt: 0.5 }}>
            {table.orders!.length} pedido{table.orders!.length > 1 ? 's' : ''}
          </Typography>
        )}
        
        {/* Indicadores visuais das cadeiras ocupadas */}
        {table.shape === 'round' && (
          <Box sx={{ position: 'absolute', width: '100%', height: '100%' }}>
            {Array.from({ length: table.seats }).map((_, index) => {
              const angle = (360 / table.seats) * index;
              const radius = tableSize / 2 + 15;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;
              const seatNumber = index + 1;
              const hasOrderForSeat = table.orders?.some(order => order.seatNumber === seatNumber);
              
              return (
                <Box
                  key={index}
                  sx={{
                    position: 'absolute',
                    left: `calc(50% + ${x}px - 6px)`,
                    top: `calc(50% + ${y}px - 6px)`,
                    width: 12,
                    height: 12,
                    backgroundColor: hasOrderForSeat ? '#FFD700' : '#8D6E63',
                    borderRadius: '2px',
                    border: `1px solid ${hasOrderForSeat ? '#FFA000' : '#5D4037'}`
                  }}
                />
              );
            })}
          </Box>
        )}
        
        {table.shape === 'rectangle' && (
          <Box sx={{ position: 'absolute', width: '100%', height: '100%' }}>
            {Array.from({ length: table.seats }).map((_, index) => {
              const isTop = index < table.seats / 2;
              const sideIndex = index % (table.seats / 2);
              const spacing = (tableSize * 1.5) / (table.seats / 2 + 1);
              const seatNumber = index + 1;
              const hasOrderForSeat = table.orders?.some(order => order.seatNumber === seatNumber);
              
              return (
                <Box
                  key={index}
                  sx={{
                    position: 'absolute',
                    left: `${spacing * (sideIndex + 1) - 6}px`,
                    top: isTop ? '-18px' : `${tableSize * 0.8 + 6}px`,
                    width: 12,
                    height: 12,
                    backgroundColor: hasOrderForSeat ? '#FFD700' : '#8D6E63',
                    borderRadius: '2px',
                    border: `1px solid ${hasOrderForSeat ? '#FFA000' : '#5D4037'}`
                  }}
                />
              );
            })}
          </Box>
        )}
        
        {table.shape === 'square' && (
          <Box sx={{ position: 'absolute', width: '100%', height: '100%' }}>
            {Array.from({ length: table.seats }).map((_, index) => {
              const positions = [
                { left: '-18px', top: '50%', transform: 'translateY(-50%)' },
                { right: '-18px', top: '50%', transform: 'translateY(-50%)' },
                { left: '50%', top: '-18px', transform: 'translateX(-50%)' },
                { left: '50%', bottom: '-18px', transform: 'translateX(-50%)' }
              ];
              const seatNumber = index + 1;
              const hasOrderForSeat = table.orders?.some(order => order.seatNumber === seatNumber);
              
              return (
                <Box
                  key={index}
                  sx={{
                    position: 'absolute',
                    ...positions[index],
                    width: 12,
                    height: 12,
                    backgroundColor: hasOrderForSeat ? '#FFD700' : '#8D6E63',
                    borderRadius: '2px',
                    border: `1px solid ${hasOrderForSeat ? '#FFA000' : '#5D4037'}`
                  }}
                />
              );
            })}
          </Box>
        )}
      </Box>
    );
  };

  const renderAreaLabel = (area: Table['area'], tables: Table[]) => {
    const areaTables = tables.filter(t => t.area === area);
    if (areaTables.length === 0) return null;

    const avgX = areaTables.reduce((sum, t) => sum + t.position.x, 0) / areaTables.length;
    const avgY = areaTables.reduce((sum, t) => sum + t.position.y, 0) / areaTables.length;

    return (
      <Box
        key={area}
        sx={{
          position: 'absolute',
          left: avgX - 50,
          top: avgY - 100,
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          pointerEvents: 'none',
          zIndex: 5
        }}
      >
        {getAreaLabel(area)}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Carregando layout do salão...</Typography>
      </Box>
    );
  }

  const areas = ['main', 'terrace', 'vip', 'bar'] as const;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Layout do Salão - Terminal {terminalId}
        </Typography>
        <Box>
          <Tooltip title="Atualizar">
            <IconButton onClick={loadTables} sx={{ mr: 1 }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<Kitchen />}
            onClick={() => navigate(`/pos/${terminalId}/kitchen`)}
            sx={{ mr: 1 }}
          >
            Cozinha
          </Button>
          <Button
            variant="outlined"
            startIcon={<DeliveryDining />}
            onClick={() => navigate(`/pos/${terminalId}/delivery`)}
          >
            Delivery
          </Button>
        </Box>
      </Box>

      {/* Estatísticas */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Mesas Livres
              </Typography>
              <Typography variant="h5" component="div" color="green">
                {tables.filter(t => t.status === 'available').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Mesas Ocupadas
              </Typography>
              <Typography variant="h5" component="div" color="red">
                {tables.filter(t => t.status === 'occupied').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Reservadas
              </Typography>
              <Typography variant="h5" component="div" color="orange">
                {tables.filter(t => t.status === 'reserved').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Faturamento
              </Typography>
              <Typography variant="h5" component="div">
                {formatCurrency(tables.filter(t => t.orderValue).reduce((sum, t) => sum + (t.orderValue || 0), 0))}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Legenda */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <Chip label="Livre" sx={{ backgroundColor: '#4CAF50', color: 'white' }} />
        <Chip label="Ocupada" sx={{ backgroundColor: '#F44336', color: 'white' }} />
        <Chip label="Reservada" sx={{ backgroundColor: '#FF9800', color: 'white' }} />
        <Chip label="Limpeza" sx={{ backgroundColor: '#2196F3', color: 'white' }} />
        <Chip label="Com Pedidos" sx={{ backgroundColor: '#FFD700', color: 'black', border: '2px solid #FFA000' }} />
      </Box>

      {/* Layout do Salão */}
      <Paper 
        sx={{ 
          position: 'relative', 
          width: SALON_WIDTH, 
          height: SALON_HEIGHT, 
          margin: '0 auto',
          backgroundColor: '#f5f5f5',
          border: '2px solid #ccc',
          overflow: 'hidden'
        }}
      >
        {/* Renderizar labels das áreas */}
        {areas.map(area => renderAreaLabel(area, tables))}
        
        {/* Renderizar mesas */}
        {tables.map(renderTable)}
        
        {/* Elementos decorativos do salão */}
        <Box sx={{ position: 'absolute', left: 50, top: 250, width: 30, height: 30, backgroundColor: '#8BC34A', borderRadius: '50%' }} />
        <Box sx={{ position: 'absolute', right: 50, top: 250, width: 30, height: 30, backgroundColor: '#8BC34A', borderRadius: '50%' }} />
        <Typography sx={{ position: 'absolute', left: 20, bottom: 20, fontSize: '12px', color: '#666' }}>
          🚪 Entrada
        </Typography>
        <Typography sx={{ position: 'absolute', right: 20, bottom: 20, fontSize: '12px', color: '#666' }}>
          🍽️ Cozinha
        </Typography>
      </Paper>

      {/* Dialog de Detalhes da Mesa */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Mesa {selectedTable?.number} - {selectedTable?.seats} lugares
          <Chip 
            label={selectedTable?.status === 'available' ? 'Livre' : 
                   selectedTable?.status === 'occupied' ? 'Ocupada' :
                   selectedTable?.status === 'reserved' ? 'Reservada' : 'Limpeza'}
            color={selectedTable?.status === 'available' ? 'success' : 
                   selectedTable?.status === 'occupied' ? 'error' :
                   selectedTable?.status === 'reserved' ? 'warning' : 'info'}
            sx={{ ml: 2 }}
          />
        </DialogTitle>
        <DialogContent>
          {selectedTable && (
            <Box>
              {selectedTable.status === 'occupied' && (
                <Box mb={2}>
                  <Typography variant="subtitle1" gutterBottom>
                    Informações da Mesa:
                  </Typography>
                  <Typography>Garçom: {selectedTable.waiter}</Typography>
                  <Typography>Clientes: {selectedTable.customers}</Typography>
                  <Typography>Início: {selectedTable.startTime}</Typography>
                  <Typography>Valor: {formatCurrency(selectedTable.orderValue || 0)}</Typography>
                </Box>
              )}

              {selectedTable.orders && selectedTable.orders.length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle1" gutterBottom>
                    Pedidos por Cadeira:
                  </Typography>
                  <List>
                    {selectedTable.orders.map((order) => (
                      <ListItem key={order.id}>
                        <ListItemText
                          primary={`Cadeira ${order.seatNumber} - ${order.customerName}`}
                          secondary={
                            <Box>
                              <Typography variant="body2">
                                {order.items.length} itens - {formatCurrency(order.total)}
                              </Typography>
                              <Chip 
                                label={order.status} 
                                size="small" 
                                color={getOrderStatusColor(order.status) as any}
                                sx={{ mt: 0.5 }}
                              />
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton 
                            size="small"
                            onClick={() => navigate(`/pos/${terminalId}/waiter/table/${selectedTable.id}/seat/${order.seatNumber}`, {
                              state: { order }
                            })}
                          >
                            <EditIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {selectedTable.status === 'available' && (
                <Alert severity="info">
                  Mesa disponível para ocupação
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Fechar</Button>
          
          {selectedTable?.status === 'available' && (
            <Button onClick={() => handleTableAction('occupy')} variant="contained" color="primary">
              Ocupar Mesa
            </Button>
          )}
          
          {selectedTable?.status === 'occupied' && (
            <>
              <Button 
                onClick={() => handleTableAction('order')} 
                variant="outlined"
                startIcon={<AddIcon />}
              >
                Novo Pedido
              </Button>
              <Button 
                onClick={() => handleTableAction('payment')} 
                variant="outlined"
                startIcon={<PaymentIcon />}
              >
                Fechar Conta
              </Button>
              <Button 
                onClick={() => handleTableAction('close')} 
                variant="contained"
                color="error"
                startIcon={<CloseIcon />}
              >
                Liberar Mesa
              </Button>
            </>
          )}
          
          {selectedTable?.status === 'reserved' && (
            <Button onClick={() => handleTableAction('occupy')} variant="contained" color="warning">
              Confirmar Chegada
            </Button>
          )}
          
          {selectedTable?.status === 'cleaning' && (
            <Button onClick={() => handleTableAction('free')} variant="contained" color="success">
              Mesa Limpa
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog de Novo Pedido */}
      <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Pedido - Mesa {selectedTable?.number}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Cadeira</InputLabel>
              <Select
                value={newOrder.seatNumber}
                label="Cadeira"
                onChange={(e) => setNewOrder({ ...newOrder, seatNumber: e.target.value as number })}
              >
                {Array.from({ length: selectedTable?.seats || 4 }).map((_, index) => (
                  <MenuItem key={index + 1} value={index + 1}>
                    Cadeira {index + 1}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Nome do Cliente"
              value={newOrder.customerName}
              onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
              sx={{ mb: 2 }}
            />
            
            <Typography variant="body2" color="text.secondary">
              Após criar o pedido, você será direcionado para a tela de seleção de produtos.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleAddOrder} 
            variant="contained"
            disabled={!newOrder.customerName}
          >
            Criar Pedido
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TableLayoutScreen;

