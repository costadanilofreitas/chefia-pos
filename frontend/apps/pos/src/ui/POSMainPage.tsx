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
  Snackbar
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
  const navigate = useNavigate();
  const { terminalId } = useParams<{ terminalId: string }>();
  const { user, isAuthenticated } = useAuth();
  const { products, loading: productsLoading } = useProduct();
  
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

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [customerName, setCustomerName] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [orderType, setOrderType] = useState<OrderType>(OrderType.DINE_IN);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('info');

  // Carregar produtos e categorias do backend
  const {
    products: backendProducts,
    categories: backendCategories,
    loading: productsLoading,
    error: productsError,
    loadProducts,
    loadCategories
  } = useProduct();
  // Converter produtos do backend para formato da interface
  const products: Product[] = backendProducts?.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    category: backendCategories?.find(c => c.id === p.category_id)?.name || 'Sem categoria',
    description: `Produto ${p.name}`,
    available: true,
    image: '/placeholder-product.jpg'
  })) || [];
  
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  // Carregar dados na inicialização
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  useEffect(() => {
    // Redirecionar se não estiver autenticado
    if (!isAuthenticated) {
      navigate(`/pos/${terminalId}/cashier`);
      return;
    }
  }, [isAuthenticated, navigate, terminalId]);

  // Mostrar mensagens de erro
  useEffect(() => {
    if (orderError) {
      setSnackbarMessage(orderError);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }, [orderError]);

  // Mostrar erro de produtos
  useEffect(() => {
    if (productsError) {
      setSnackbarMessage(`Erro ao carregar produtos: ${productsError}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }, [productsError]);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch && product.available;
  });

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setProductDialogOpen(true);
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    const cartItem: OrderItemCreate = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity,
      unit_price: selectedProduct.price,
      notes: '',
      customizations: []
    };

    addToCart(cartItem);
    setProductDialogOpen(false);
    setSelectedProduct(null);
    showSnackbar(`${selectedProduct.name} adicionado ao carrinho`, 'success');
  };

  const handleRemoveFromCart = (index: number) => {
    const item = cart[index];
    removeFromCart(index);
    showSnackbar(`${item?.product_name} removido do carrinho`, 'info');
  };

  const handleUpdateCartQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(index);
      return;
    }

    updateCartItem(index, { quantity: newQuantity });
  };

  const handleClearCart = () => {
    clearCart();
    showSnackbar('Carrinho limpo', 'info');
  };

  const handleCreateOrder = async () => {
    if (cart.length === 0) {
      showSnackbar('Adicione itens ao carrinho antes de criar o pedido', 'error');
      return;
    }

    const orderData: OrderCreate = {
      customer_name: customerName || 'Cliente',
      items: cart,
      table_number: tableNumber,
      waiter_id: user?.id || '',
      order_type: orderType,
      source: 'pos',
      notes: ''
    };

    console.log('🔥 POSMainPage: Criando pedido', orderData);

    const createdOrder = await createOrder(orderData);
    
    if (createdOrder) {
      showSnackbar(`Pedido #${createdOrder.id.slice(-6)} criado com sucesso!`, 'success');
      clearCart();
      setCustomerName('');
      setTableNumber(null);
      
      // Navegar para a página de pagamento ou detalhes do pedido
      navigate(`/pos/${terminalId}/order/${createdOrder.id}`);
    }
  };

  const handleProceedToPayment = () => {
    if (cart.length === 0) {
      showSnackbar('Adicione itens ao carrinho antes de finalizar', 'error');
      return;
    }
    
    // Criar o pedido primeiro
    handleCreateOrder();
  };

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
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="h1">
            POS Principal - Terminal {terminalId}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Operador: {user?.name}
          </Typography>
        </Box>
      </Paper>

      <Grid container spacing={2} sx={{ flex: 1, overflow: 'hidden' }}>
        {/* Produtos */}
        <Grid item xs={12} md={8} sx={{ height: '100%', overflow: 'hidden' }}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Filtros */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Buscar produtos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Categoria</InputLabel>
                    <Select
                      value={selectedCategory}
                      label="Categoria"
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <MenuItem value="all">Todas</MenuItem>
                      {categories.filter(cat => cat !== 'all').map(category => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            {/* Lista de Produtos */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {productsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : filteredProducts.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
                  <RestaurantIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    {products.length === 0 ? 'Nenhum produto encontrado' : 'Nenhum produto corresponde aos filtros'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {products.length === 0 
                      ? 'Verifique se há produtos cadastrados no sistema'
                      : 'Tente alterar a categoria ou termo de busca'
                    }
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {filteredProducts.map((product) => (
                    <Grid item xs={12} sm={6} md={4} key={product.id}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: 4
                          }
                        }}
                        onClick={() => handleProductClick(product)}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <RestaurantIcon color="primary" sx={{ mr: 1 }} />
                            <Typography variant="h6" component="h3" noWrap>
                              {product.name}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {product.description}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Chip 
                              label={product.category} 
                              size="small" 
                              color="secondary"
                              icon={<CategoryIcon />}
                            />
                            <Typography variant="h6" color="primary" fontWeight="bold">
                              {formatCurrency(product.price)}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Carrinho */}
        <Grid item xs={12} md={4} sx={{ height: '100%', overflow: 'hidden' }}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header do Carrinho */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Carrinho
                </Typography>
                <IconButton 
                  onClick={handleClearCart}
                  disabled={cart.length === 0}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {cart.length} {cart.length === 1 ? 'item' : 'itens'}
              </Typography>
            </Box>

            {/* Itens do Carrinho */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {cart.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <CartIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Carrinho vazio
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Selecione produtos para adicionar
                  </Typography>
                </Box>
              ) : (
                <List>
                  {cart.map((item, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemText
                          primary={item.product_name}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {formatCurrency(item.unit_price)} x {item.quantity}
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                Total: {formatCurrency(item.unit_price * item.quantity)}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Button
                              size="small"
                              onClick={() => handleUpdateCartQuantity(index, item.quantity - 1)}
                            >
                              -
                            </Button>
                            <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                              {item.quantity}
                            </Typography>
                            <Button
                              size="small"
                              onClick={() => handleUpdateCartQuantity(index, item.quantity + 1)}
                            >
                              +
                            </Button>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveFromCart(index)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < cart.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>

            {/* Informações do Pedido */}
            {cart.length > 0 && (
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Nome do Cliente"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Digite o nome do cliente"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Mesa"
                      value={tableNumber || ''}
                      onChange={(e) => setTableNumber(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Nº da mesa"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Tipo</InputLabel>
                      <Select
                        value={orderType}
                        label="Tipo"
                        onChange={(e) => setOrderType(e.target.value as OrderType)}
                      >
                        <MenuItem value={OrderType.DINE_IN}>Balcão</MenuItem>
                        <MenuItem value={OrderType.TAKEAWAY}>Viagem</MenuItem>
                        <MenuItem value={OrderType.DELIVERY}>Delivery</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Total:
                  </Typography>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    {formatCurrency(cartTotal)}
                  </Typography>
                </Box>

                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<SaveIcon />}
                      onClick={handleCreateOrder}
                      disabled={orderCreating}
                    >
                      {orderCreating ? <CircularProgress size={20} /> : 'Salvar'}
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<ReceiptIcon />}
                      onClick={handleProceedToPayment}
                      disabled={orderCreating}
                    >
                      {orderCreating ? <CircularProgress size={20} /> : 'Finalizar'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Dialog para Adicionar Produto */}
      <Dialog open={productDialogOpen} onClose={() => setProductDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Adicionar ao Carrinho
        </DialogTitle>
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3 }}>
                <Typography variant="body1">
                  Quantidade:
                </Typography>
                <Button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <Typography variant="h6" sx={{ minWidth: 40, textAlign: 'center' }}>
                  {quantity}
                </Typography>
                <Button
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </Button>
              </Box>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body1">
                  <strong>Subtotal: {formatCurrency(selectedProduct.price * quantity)}</strong>
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAddToCart} variant="contained">
            Adicionar ao Carrinho
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para mensagens */}
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

export default POSMainPage;

