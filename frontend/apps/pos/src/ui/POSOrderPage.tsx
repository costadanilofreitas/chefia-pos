import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  ListItemAvatar,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Delete as DeleteIcon,
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  Payment as PaymentIcon,
  ArrowBack as ArrowBackIcon,
  LocalOffer as OfferIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  LocalShipping as DeliveryIcon,
  Phone as PhoneIcon,
  WhatsApp as WhatsAppIcon,
  Computer as OnlineIcon,
  CheckCircle as AcceptIcon,
  Cancel as RejectIcon,
  Schedule as PendingIcon,
  Restaurant as RestaurantIcon,
  TwoWheeler as MotorcycleIcon,
  Home as HomeIcon,
  Store as StoreIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useCashier } from '../hooks/useCashier';
import { formatCurrency } from '../utils/formatters';

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

const ProductCard = styled(Card)(({ theme }) => ({
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },
}));

const RemoteOrderCard = styled(Card)(({ theme }) => ({
  borderRadius: '12px',
  marginBottom: theme.spacing(2),
  border: '2px solid',
  transition: 'all 0.3s ease',
  '&.pending': {
    borderColor: theme.palette.warning.main,
    backgroundColor: theme.palette.warning.light + '10',
  },
  '&.accepted': {
    borderColor: theme.palette.success.main,
    backgroundColor: theme.palette.success.light + '10',
  },
  '&.rejected': {
    borderColor: theme.palette.error.main,
    backgroundColor: theme.palette.error.light + '10',
  },
}));

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  category: string;
  image_url?: string;
  is_combo?: boolean;
  available: boolean;
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: string;
  created_at: string;
  cashier_id: string;
  terminal_id: string;
}

interface RemoteOrder {
  id: string;
  customer: {
    name: string;
    phone: string;
    address?: string;
  };
  items: OrderItem[];
  total: number;
  status: 'pending' | 'accepted' | 'rejected' | 'preparing' | 'ready' | 'delivered';
  source: 'whatsapp' | 'website' | 'ifood' | 'uber_eats' | 'rappi' | 'phone';
  created_at: string;
  estimated_time?: number;
  delivery_fee?: number;
  payment_method: string;
  notes?: string;
}

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
      id={`order-tabpanel-${index}`}
      aria-labelledby={`order-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

const POSOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { terminalId } = useParams<{ terminalId: string }>();
  const { user } = useAuth();
  const { currentCashier } = useCashier();

  // Estados principais
  const [currentTab, setCurrentTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Estados para pedidos remotos
  const [remoteOrders, setRemoteOrders] = useState<RemoteOrder[]>([
    {
      id: 'remote-001',
      customer: {
        name: 'João Silva',
        phone: '(11) 99999-1234',
        address: 'Rua das Flores, 123 - Vila Madalena'
      },
      items: [
        {
          id: '1',
          product_id: '1',
          product_name: 'Hambúrguer Clássico',
          quantity: 2,
          unit_price: 25.90,
          total_price: 51.80
        },
        {
          id: '2',
          product_id: '3',
          product_name: 'Batata Frita',
          quantity: 1,
          unit_price: 12.90,
          total_price: 12.90
        }
      ],
      total: 64.70,
      status: 'pending',
      source: 'whatsapp',
      created_at: '2024-01-15T14:30:00Z',
      estimated_time: 30,
      delivery_fee: 5.00,
      payment_method: 'PIX',
      notes: 'Sem cebola no hambúrguer'
    },
    {
      id: 'remote-002',
      customer: {
        name: 'Maria Santos',
        phone: '(11) 88888-5678'
      },
      items: [
        {
          id: '3',
          product_id: '2',
          product_name: 'Pizza Margherita',
          quantity: 1,
          unit_price: 35.00,
          total_price: 35.00
        }
      ],
      total: 35.00,
      status: 'accepted',
      source: 'ifood',
      created_at: '2024-01-15T14:15:00Z',
      estimated_time: 25,
      payment_method: 'Cartão de Crédito'
    },
    {
      id: 'remote-003',
      customer: {
        name: 'Carlos Oliveira',
        phone: '(11) 77777-9999',
        address: 'Av. Paulista, 1000 - Bela Vista'
      },
      items: [
        {
          id: '4',
          product_id: '4',
          product_name: 'Refrigerante',
          quantity: 3,
          unit_price: 5.50,
          total_price: 16.50
        }
      ],
      total: 16.50,
      status: 'preparing',
      source: 'uber_eats',
      created_at: '2024-01-15T13:45:00Z',
      estimated_time: 15,
      delivery_fee: 3.50,
      payment_method: 'Dinheiro'
    }
  ]);
  const [selectedRemoteOrder, setSelectedRemoteOrder] = useState<RemoteOrder | null>(null);
  const [remoteOrderDialogOpen, setRemoteOrderDialogOpen] = useState(false);
  const [autoAcceptEnabled, setAutoAcceptEnabled] = useState(false);

  // Produtos mock
  const products = useMemo<Product[]>(() => [
    {
      id: '1',
      name: 'Hambúrguer Clássico',
      price: 25.90,
      description: 'Hambúrguer artesanal com carne bovina, alface, tomate e molho especial',
      category: 'Hambúrgueres',
      image_url: '/images/hamburger.jpg',
      available: true
    },
    {
      id: '2',
      name: 'Pizza Margherita',
      price: 35.00,
      description: 'Pizza tradicional com molho de tomate, mussarela e manjericão',
      category: 'Pizzas',
      image_url: '/images/pizza.jpg',
      available: true
    },
    {
      id: '3',
      name: 'Batata Frita',
      price: 12.90,
      description: 'Batatas fritas crocantes temperadas com sal',
      category: 'Acompanhamentos',
      image_url: '/images/fries.jpg',
      available: true
    },
    {
      id: '4',
      name: 'Refrigerante',
      price: 5.50,
      description: 'Refrigerante gelado 350ml',
      category: 'Bebidas',
      image_url: '/images/soda.jpg',
      available: true
    },
    {
      id: '5',
      name: 'Salada Caesar',
      price: 18.90,
      description: 'Salada com alface, croutons, parmesão e molho caesar',
      category: 'Saladas',
      image_url: '/images/salad.jpg',
      available: true
    }
  ], []);

  const categories = useMemo(() => {
    const cats = ['all', ...new Set(products.map(p => p.category))];
    return cats;
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory && product.available;
    });
  }, [products, searchTerm, selectedCategory]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total_price, 0);
  }, [cart]);

  const pendingRemoteOrders = useMemo(() => {
    return remoteOrders.filter(order => order.status === 'pending').length;
  }, [remoteOrders]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const addToCart = useCallback((product: Product) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    
    if (existingItem) {
      setCart(prev => prev.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * item.unit_price }
          : item
      ));
    } else {
      const newItem: OrderItem = {
        id: Date.now().toString(),
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
        total_price: product.price
      };
      setCart(prev => [...prev, newItem]);
    }
    
    showSnackbar(`${product.name} adicionado ao carrinho`, 'success');
  }, [cart, showSnackbar]);

  const updateCartItemQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(prev => prev.filter(item => item.id !== itemId));
    } else {
      setCart(prev => prev.map(item =>
        item.id === itemId
          ? { ...item, quantity: newQuantity, total_price: newQuantity * item.unit_price }
          : item
      ));
    }
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
    showSnackbar('Item removido do carrinho', 'info');
  }, [showSnackbar]);

  const clearCart = useCallback(() => {
    setCart([]);
    showSnackbar('Carrinho limpo', 'info');
  }, [showSnackbar]);

  const handleCheckout = useCallback(() => {
    if (cart.length === 0) {
      showSnackbar('Carrinho vazio', 'warning');
      return;
    }

    navigate(`/pos/${terminalId}/payment`, {
      state: {
        order: {
          items: cart,
          total: cartTotal,
          created_at: new Date().toISOString()
        }
      }
    });
  }, [cart, cartTotal, navigate, terminalId, showSnackbar]);

  // Funções para pedidos remotos
  const handleRemoteOrderAction = useCallback(async (orderId: string, action: 'accept' | 'reject') => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular API call
      
      setRemoteOrders(prev => prev.map(order =>
        order.id === orderId
          ? { ...order, status: action === 'accept' ? 'accepted' : 'rejected' }
          : order
      ));
      
      showSnackbar(
        `Pedido ${action === 'accept' ? 'aceito' : 'rejeitado'} com sucesso!`,
        action === 'accept' ? 'success' : 'info'
      );
    } catch (error) {
      showSnackbar('Erro ao processar pedido', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  const handleRemoteOrderDetails = useCallback((order: RemoteOrder) => {
    setSelectedRemoteOrder(order);
    setRemoteOrderDialogOpen(true);
  }, []);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'whatsapp': return <WhatsAppIcon sx={{ color: '#25D366' }} />;
      case 'ifood': return <DeliveryIcon sx={{ color: '#EA1D2C' }} />;
      case 'uber_eats': return <MotorcycleIcon sx={{ color: '#000000' }} />;
      case 'rappi': return <HomeIcon sx={{ color: '#FF441F' }} />;
      case 'website': return <OnlineIcon sx={{ color: '#1976d2' }} />;
      case 'phone': return <PhoneIcon sx={{ color: '#666666' }} />;
      default: return <RestaurantIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      case 'preparing': return 'info';
      case 'ready': return 'primary';
      case 'delivered': return 'success';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'accepted': return 'Aceito';
      case 'rejected': return 'Rejeitado';
      case 'preparing': return 'Preparando';
      case 'ready': return 'Pronto';
      case 'delivered': return 'Entregue';
      default: return status;
    }
  };

  // Renderizar lista de produtos
  const renderProducts = () => (
    <Box>
      {/* Filtros */}
      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={selectedCategory}
                label="Categoria"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="all">Todas</MenuItem>
                {categories.filter(cat => cat !== 'all').map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="textSecondary">
              {filteredProducts.length} produtos
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Grid de produtos */}
      <Grid container spacing={2}>
        {filteredProducts.map((product) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
            <ProductCard onClick={() => addToCart(product)}>
              <CardMedia
                component="div"
                sx={{
                  height: 140,
                  backgroundColor: 'grey.200',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <RestaurantIcon sx={{ fontSize: 60, color: 'grey.400' }} />
              </CardMedia>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h6" component="div" noWrap>
                  {product.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, height: 40, overflow: 'hidden' }}>
                  {product.description}
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" color="primary">
                    {formatCurrency(product.price)}
                  </Typography>
                  <Chip label={product.category} size="small" />
                </Box>
              </CardContent>
            </ProductCard>
          </Grid>
        ))}
      </Grid>

      {filteredProducts.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="textSecondary">
            Nenhum produto encontrado
          </Typography>
        </Box>
      )}
    </Box>
  );

  // Renderizar pedidos remotos
  const renderRemoteOrders = () => (
    <Box>
      {/* Configurações */}
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">
          Pedidos Remotos ({remoteOrders.length})
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={autoAcceptEnabled}
              onChange={(e) => setAutoAcceptEnabled(e.target.checked)}
            />
          }
          label="Auto-aceitar pedidos"
        />
      </Box>

      {/* Lista de pedidos */}
      <Box>
        {remoteOrders.map((order) => (
          <RemoteOrderCard 
            key={order.id} 
            className={order.status}
            onClick={() => handleRemoteOrderDetails(order)}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  {getSourceIcon(order.source)}
                  <Typography variant="h6">
                    Pedido #{order.id.slice(-3)}
                  </Typography>
                  <Chip 
                    label={getStatusText(order.status)}
                    color={getStatusColor(order.status) as any}
                    size="small"
                  />
                </Box>
                <Typography variant="h6" color="primary">
                  {formatCurrency(order.total + (order.delivery_fee || 0))}
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Cliente
                  </Typography>
                  <Typography variant="body2">
                    {order.customer.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {order.customer.phone}
                  </Typography>
                  {order.customer.address && (
                    <Typography variant="body2" color="textSecondary">
                      {order.customer.address}
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Itens ({order.items.length})
                  </Typography>
                  {order.items.slice(0, 2).map((item) => (
                    <Typography key={item.id} variant="body2">
                      {item.quantity}x {item.product_name}
                    </Typography>
                  ))}
                  {order.items.length > 2 && (
                    <Typography variant="body2" color="textSecondary">
                      +{order.items.length - 2} itens...
                    </Typography>
                  )}
                </Grid>
              </Grid>

              <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    {new Date(order.created_at).toLocaleTimeString()} • {order.payment_method}
                  </Typography>
                  {order.estimated_time && (
                    <Typography variant="caption" color="textSecondary" display="block">
                      Tempo estimado: {order.estimated_time} min
                    </Typography>
                  )}
                </Box>

                {order.status === 'pending' && (
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<RejectIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoteOrderAction(order.id, 'reject');
                      }}
                      disabled={loading}
                    >
                      Rejeitar
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<AcceptIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoteOrderAction(order.id, 'accept');
                      }}
                      disabled={loading}
                    >
                      Aceitar
                    </Button>
                  </Box>
                )}
              </Box>
            </CardContent>
          </RemoteOrderCard>
        ))}

        {remoteOrders.length === 0 && (
          <Box textAlign="center" py={4}>
            <DeliveryIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              Nenhum pedido remoto
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Os pedidos do WhatsApp, iFood e outras plataformas aparecerão aqui
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );

  if (!currentCashier || currentCashier.status !== 'OPEN') {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">
          O caixa precisa estar aberto para fazer pedidos.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate(`/pos/${terminalId}/main`)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Pedidos - Terminal {terminalId}
          </Typography>
        </Box>
        <Typography variant="h6" color="textSecondary">
          {user?.name} • Caixa #{currentCashier.id}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Área principal */}
        <Grid item xs={12} lg={8}>
          <StyledPaper>
            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={currentTab} onChange={handleTabChange}>
                <Tab 
                  icon={<RestaurantIcon />} 
                  label="Cardápio" 
                  iconPosition="start"
                />
                <Tab 
                  icon={
                    <Badge badgeContent={pendingRemoteOrders} color="error">
                      <DeliveryIcon />
                    </Badge>
                  } 
                  label="Pedidos Remotos" 
                  iconPosition="start"
                />
              </Tabs>
            </Box>

            {/* Conteúdo das tabs */}
            <TabPanel value={currentTab} index={0}>
              {renderProducts()}
            </TabPanel>
            <TabPanel value={currentTab} index={1}>
              {renderRemoteOrders()}
            </TabPanel>
          </StyledPaper>
        </Grid>

        {/* Carrinho */}
        <Grid item xs={12} lg={4}>
          <StyledPaper>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                <CartIcon />
                Carrinho ({cart.length})
              </Typography>
              {cart.length > 0 && (
                <Button size="small" onClick={clearCart}>
                  Limpar
                </Button>
              )}
            </Box>

            <Divider sx={{ mb: 2 }} />

            {cart.length === 0 ? (
              <Box textAlign="center" py={4}>
                <CartIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                <Typography variant="body1" color="textSecondary">
                  Carrinho vazio
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Adicione produtos para começar
                </Typography>
              </Box>
            ) : (
              <>
                <List sx={{ flexGrow: 1, maxHeight: 400, overflow: 'auto' }}>
                  {cart.map((item) => (
                    <ListItem key={item.id} divider>
                      <ListItemText
                        primary={item.product_name}
                        secondary={`${formatCurrency(item.unit_price)} cada`}
                      />
                      <ListItemSecondaryAction>
                        <Box display="flex" alignItems="center" gap={1}>
                          <IconButton
                            size="small"
                            onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                          >
                            <RemoveIcon />
                          </IconButton>
                          <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                            {item.quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                          >
                            <AddIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>

                <Divider sx={{ my: 2 }} />

                <Box>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography variant="h6">Total:</Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(cartTotal)}
                    </Typography>
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<PaymentIcon />}
                    onClick={handleCheckout}
                    disabled={cart.length === 0}
                  >
                    Finalizar Pedido
                  </Button>
                </Box>
              </>
            )}
          </StyledPaper>
        </Grid>
      </Grid>

      {/* Dialog de detalhes do pedido remoto */}
      <Dialog 
        open={remoteOrderDialogOpen} 
        onClose={() => setRemoteOrderDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedRemoteOrder && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={1}>
                {getSourceIcon(selectedRemoteOrder.source)}
                Pedido #{selectedRemoteOrder.id.slice(-3)}
                <Chip 
                  label={getStatusText(selectedRemoteOrder.status)}
                  color={getStatusColor(selectedRemoteOrder.status) as any}
                  size="small"
                />
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Informações do Cliente
                  </Typography>
                  <Typography variant="body1">
                    <strong>Nome:</strong> {selectedRemoteOrder.customer.name}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Telefone:</strong> {selectedRemoteOrder.customer.phone}
                  </Typography>
                  {selectedRemoteOrder.customer.address && (
                    <Typography variant="body1">
                      <strong>Endereço:</strong> {selectedRemoteOrder.customer.address}
                    </Typography>
                  )}
                  <Typography variant="body1">
                    <strong>Pagamento:</strong> {selectedRemoteOrder.payment_method}
                  </Typography>
                  {selectedRemoteOrder.estimated_time && (
                    <Typography variant="body1">
                      <strong>Tempo estimado:</strong> {selectedRemoteOrder.estimated_time} min
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Itens do Pedido
                  </Typography>
                  <List>
                    {selectedRemoteOrder.items.map((item) => (
                      <ListItem key={item.id} divider>
                        <ListItemText
                          primary={`${item.quantity}x ${item.product_name}`}
                          secondary={formatCurrency(item.unit_price)}
                        />
                        <Typography variant="body2">
                          {formatCurrency(item.total_price)}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                  
                  <Box mt={2}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Subtotal:</Typography>
                      <Typography>{formatCurrency(selectedRemoteOrder.total)}</Typography>
                    </Box>
                    {selectedRemoteOrder.delivery_fee && (
                      <Box display="flex" justifyContent="space-between">
                        <Typography>Taxa de entrega:</Typography>
                        <Typography>{formatCurrency(selectedRemoteOrder.delivery_fee)}</Typography>
                      </Box>
                    )}
                    <Divider sx={{ my: 1 }} />
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="h6">Total:</Typography>
                      <Typography variant="h6" color="primary">
                        {formatCurrency(selectedRemoteOrder.total + (selectedRemoteOrder.delivery_fee || 0))}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {selectedRemoteOrder.notes && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Observações
                    </Typography>
                    <Typography variant="body1">
                      {selectedRemoteOrder.notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRemoteOrderDialogOpen(false)}>
                Fechar
              </Button>
              {selectedRemoteOrder.status === 'pending' && (
                <>
                  <Button
                    color="error"
                    startIcon={<RejectIcon />}
                    onClick={() => {
                      handleRemoteOrderAction(selectedRemoteOrder.id, 'reject');
                      setRemoteOrderDialogOpen(false);
                    }}
                    disabled={loading}
                  >
                    Rejeitar
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<AcceptIcon />}
                    onClick={() => {
                      handleRemoteOrderAction(selectedRemoteOrder.id, 'accept');
                      setRemoteOrderDialogOpen(false);
                    }}
                    disabled={loading}
                  >
                    Aceitar
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar para notificações */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default POSOrderPage;

