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
  CardMedia,
  CardActions
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
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useProduct } from '../hooks/useProduct';
import { useOrder } from '../hooks/useOrder';
import { formatCurrency } from '../utils/formatters';
import { 
  OrderCreate, 
  OrderItemCreate, 
  PaymentMethod, 
  OrderType,
  OrderStatus 
} from '../types/order';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  available: boolean;
  image?: string;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

const POSMainPage: React.FC = () => {
  console.log('🚀 POSMainPage: Componente iniciado');
  
  const navigate = useNavigate();
  const { terminalId } = useParams<{ terminalId: string }>();
  const { user, isAuthenticated } = useAuth();
  
  console.log('🔐 POSMainPage: Auth status:', { user: user?.name, isAuthenticated });
  
  // Usando o hook useOrder real
  const {
    cart,
    cartTotal,
    loading: orderLoading,
    creating: orderCreating,
    error: orderError,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    createOrder,
    clearError
  } = useOrder();

  // Usando o hook useProduct real para carregar dados do backend
  const {
    products: backendProducts,
    categories: backendCategories,
    loading: productsLoading,
    error: productsError,
    loadProducts,
    loadCategories
  } = useProduct();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [customerName, setCustomerName] = useState<string>('');
  const [orderType, setOrderType] = useState<OrderType>(OrderType.DINE_IN);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [tableNumber, setTableNumber] = useState<number | null>(null);

  // Usar dados reais do backend ou array vazio se não houver
  const products = backendProducts || [];
  const categories = backendCategories || [];

  // Carregar produtos na inicialização
  useEffect(() => {
    console.log('🔄 POSMainPage: Carregando produtos do backend...');
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  console.log('📊 POSMainPage: Estado atual:', {
    productsCount: products.length,
    categoriesCount: categories.length,
    loading: productsLoading,
    error: productsError
  });

  // Filtrar produtos
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch && product.available;
  });

  const handleAddToCart = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setProductDialogOpen(true);
  };

  const confirmAddToCart = () => {
    if (selectedProduct) {
      const orderItem: OrderItemCreate = {
        product_id: selectedProduct.id,
        quantity: quantity,
        unit_price: selectedProduct.price,
        notes: ''
      };
      
      addToCart(orderItem);
      setProductDialogOpen(false);
      setSnackbarMessage(`${selectedProduct.name} adicionado ao carrinho`);
      setSnackbarOpen(true);
    }
  };

  const handleRemoveFromCart = (itemId: string) => {
    removeFromCart(itemId);
    setSnackbarMessage('Item removido do carrinho');
    setSnackbarOpen(true);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      setSnackbarMessage('Carrinho vazio');
      setSnackbarOpen(true);
      return;
    }
    setPaymentDialogOpen(true);
  };

  const handleCreateOrder = async () => {
    if (cart.length === 0) return;

    const orderData: OrderCreate = {
      customer_name: customerName || 'Cliente',
      order_type: orderType,
      table_number: tableNumber,
      items: cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        notes: item.notes || ''
      })),
      payment_method: PaymentMethod.CASH,
      notes: ''
    };

    try {
      await createOrder(orderData);
      setPaymentDialogOpen(false);
      clearCart();
      setCustomerName('');
      setTableNumber(null);
      setSnackbarMessage('Pedido criado com sucesso!');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      setSnackbarMessage('Erro ao criar pedido');
      setSnackbarOpen(true);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Painel de Produtos */}
      <Box sx={{ flex: 1, p: 2 }}>
        {/* Header */}
        <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <RestaurantIcon color="primary" sx={{ fontSize: 32 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight="bold">
              POS Principal - Terminal {terminalId}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.name} • Sistema integrado com backend
            </Typography>
          </Box>
          <Chip 
            label={`${cart.length} itens`} 
            color="primary" 
            icon={<CartIcon />}
          />
        </Paper>

        {/* Barra de Pesquisa e Filtros */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Pesquisar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="Categoria"
              >
                <MenuItem value="all">Todas</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {/* Status de carregamento */}
        {productsLoading && (
          <Paper sx={{ p: 3, textAlign: 'center', mb: 2 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6">Carregando produtos...</Typography>
          </Paper>
        )}

        {/* Erro de carregamento */}
        {productsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6">Erro ao carregar produtos</Typography>
            <Typography variant="body2">{productsError}</Typography>
          </Alert>
        )}

        {/* Lista de Produtos */}
        {!productsLoading && (
          <Box sx={{ height: 'calc(100vh - 280px)', overflow: 'auto' }}>
            {filteredProducts.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <CartIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Nenhum produto encontrado
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {products.length === 0 
                    ? 'Não há produtos cadastrados no sistema.'
                    : searchTerm 
                      ? `Nenhum produto encontrado para "${searchTerm}"`
                      : `Nenhum produto na categoria "${selectedCategory}"`
                  }
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {filteredProducts.map((product) => (
                  <Grid item xs={12} sm={6} md={4} key={product.id}>
                    <Card 
                      sx={{ 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        cursor: 'pointer',
                        '&:hover': { boxShadow: 4 }
                      }}
                      onClick={() => handleAddToCart(product)}
                    >
                      <CardMedia
                        component="div"
                        sx={{
                          height: 120,
                          backgroundColor: 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <RestaurantIcon sx={{ fontSize: 40, color: 'white' }} />
                      </CardMedia>
                      <CardContent sx={{ flex: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {product.description}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="h6" color="primary">
                            {formatCurrency(product.price)}
                          </Typography>
                          <Chip 
                            label={product.category}
                            size="small"
                            color="secondary"
                          />
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Button 
                          fullWidth 
                          variant="contained" 
                          startIcon={<AddIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(product);
                          }}
                        >
                          Adicionar
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Box>

      {/* Painel do Carrinho */}
      <Paper sx={{ width: 400, p: 2, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>
          <CartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Carrinho ({cart.length})
        </Typography>
        
        <Divider sx={{ mb: 2 }} />
        
        {cart.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, flex: 1 }}>
            <CartIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Carrinho vazio
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Adicione produtos para começar
            </Typography>
          </Box>
        ) : (
          <>
            <List sx={{ flex: 1, overflow: 'auto' }}>
              {cart.map((item) => (
                <ListItem key={item.id} divider>
                  <ListItemText
                    primary={`${item.quantity}x ${item.product_name || 'Produto'}`}
                    secondary={`${formatCurrency(item.unit_price)} cada`}
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </Typography>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleRemoveFromCart(item.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total:</span>
                <span>{formatCurrency(cartTotal)}</span>
              </Typography>
            </Box>
            
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<ReceiptIcon />}
              onClick={handleCheckout}
              disabled={orderCreating}
            >
              {orderCreating ? 'Processando...' : 'Finalizar Pedido'}
            </Button>
          </>
        )}
      </Paper>

      {/* Dialog de Adicionar Produto */}
      <Dialog open={productDialogOpen} onClose={() => setProductDialogOpen(false)}>
        <DialogTitle>Adicionar ao Carrinho</DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedProduct.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {selectedProduct.description}
              </Typography>
              <Typography variant="h6" color="primary" gutterBottom>
                {formatCurrency(selectedProduct.price)}
              </Typography>
              <TextField
                fullWidth
                label="Quantidade"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                inputProps={{ min: 1 }}
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmAddToCart} variant="contained">
            Adicionar ({formatCurrency((selectedProduct?.price || 0) * quantity)})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Pagamento */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Finalizar Pedido</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Nome do Cliente"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            
            <FormControl fullWidth>
              <InputLabel>Tipo de Pedido</InputLabel>
              <Select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as OrderType)}
                label="Tipo de Pedido"
              >
                <MenuItem value={OrderType.DINE_IN}>Comer no Local</MenuItem>
                <MenuItem value={OrderType.TAKEAWAY}>Para Viagem</MenuItem>
                <MenuItem value={OrderType.DELIVERY}>Delivery</MenuItem>
              </Select>
            </FormControl>
            
            {orderType === OrderType.DINE_IN && (
              <TextField
                fullWidth
                label="Número da Mesa"
                type="number"
                value={tableNumber || ''}
                onChange={(e) => setTableNumber(parseInt(e.target.value) || null)}
              />
            )}
            
            <Box sx={{ p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="h6" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total:</span>
                <span>{formatCurrency(cartTotal)}</span>
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreateOrder} variant="contained" disabled={orderCreating}>
            {orderCreating ? 'Processando...' : 'Confirmar Pedido'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default POSMainPage;

