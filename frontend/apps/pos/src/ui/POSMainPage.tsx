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
  Fab
} from '@mui/material';
import {
  Add as AddIcon,
  ShoppingCart as CartIcon,
  Restaurant as RestaurantIcon,
  AttachMoney as MoneyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useProduct } from '../hooks/mocks/useProduct';
import { useOrder } from '../hooks/mocks/useOrder';
import { formatCurrency } from '../utils/formatters';

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
  const { currentOrder, addItemToOrder, removeItemFromOrder } = useOrder();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderTotal, setOrderTotal] = useState<number>(0);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  // Mock products data
  const mockProducts: Product[] = [
    {
      id: '1',
      name: 'Hambúrguer Clássico',
      price: 25.90,
      category: 'Hambúrgueres',
      description: 'Hambúrguer com carne, alface, tomate e molho especial',
      available: true
    },
    {
      id: '2',
      name: 'Pizza Margherita',
      price: 35.00,
      category: 'Pizzas',
      description: 'Pizza com molho de tomate, mussarela e manjericão',
      available: true
    },
    {
      id: '3',
      name: 'Refrigerante Lata',
      price: 5.50,
      category: 'Bebidas',
      description: 'Refrigerante gelado 350ml',
      available: true
    },
    {
      id: '4',
      name: 'Batata Frita',
      price: 12.00,
      category: 'Acompanhamentos',
      description: 'Porção de batata frita crocante',
      available: true
    },
    {
      id: '5',
      name: 'Salada Caesar',
      price: 18.50,
      category: 'Saladas',
      description: 'Salada com alface, croutons, parmesão e molho caesar',
      available: true
    }
  ];

  const categories = ['all', ...Array.from(new Set(mockProducts.map(p => p.category)))];

  useEffect(() => {
    // Redirecionar se não estiver autenticado
    if (!isAuthenticated) {
      navigate(`/pos/${terminalId}/cashier`);
      return;
    }

    // Calcular total do pedido
    const total = orderItems.reduce((sum, item) => sum + item.total, 0);
    setOrderTotal(total);
  }, [isAuthenticated, navigate, terminalId, orderItems]);

  const filteredProducts = mockProducts.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch && product.available;
  });

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setProductDialogOpen(true);
  };

  const handleAddToOrder = () => {
    if (!selectedProduct) return;

    const existingItem = orderItems.find(item => item.productId === selectedProduct.id);
    
    if (existingItem) {
      // Atualizar quantidade do item existente
      const updatedItems = orderItems.map(item =>
        item.productId === selectedProduct.id
          ? { ...item, quantity: item.quantity + quantity, total: (item.quantity + quantity) * item.price }
          : item
      );
      setOrderItems(updatedItems);
    } else {
      // Adicionar novo item
      const newItem: OrderItem = {
        id: Date.now().toString(),
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity,
        price: selectedProduct.price,
        total: selectedProduct.price * quantity
      };
      setOrderItems([...orderItems, newItem]);
    }

    setProductDialogOpen(false);
    setSelectedProduct(null);
  };

  const handleRemoveFromOrder = (itemId: string) => {
    setOrderItems(orderItems.filter(item => item.id !== itemId));
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveFromOrder(itemId);
      return;
    }

    const updatedItems = orderItems.map(item =>
      item.id === itemId
        ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
        : item
    );
    setOrderItems(updatedItems);
  };

  const handleClearOrder = () => {
    setOrderItems([]);
  };

  const handleProceedToPayment = () => {
    if (orderItems.length === 0) return;
    
    // Navegar para a página de pagamento
    navigate(`/pos/${terminalId}/payment`, {
      state: { orderItems, orderTotal }
    });
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
                  Pedido Atual
                </Typography>
                <IconButton 
                  onClick={handleClearOrder}
                  disabled={orderItems.length === 0}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {orderItems.length} {orderItems.length === 1 ? 'item' : 'itens'}
              </Typography>
            </Box>

            {/* Itens do Carrinho */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {orderItems.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <CartIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Nenhum item no pedido
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Selecione produtos para adicionar
                  </Typography>
                </Box>
              ) : (
                <List>
                  {orderItems.map((item, index) => (
                    <React.Fragment key={item.id}>
                      <ListItem>
                        <ListItemText
                          primary={item.productName}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {formatCurrency(item.price)} x {item.quantity}
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                Total: {formatCurrency(item.total)}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Button
                              size="small"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            >
                              -
                            </Button>
                            <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                              {item.quantity}
                            </Typography>
                            <Button
                              size="small"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            >
                              +
                            </Button>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveFromOrder(item.id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < orderItems.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>

            {/* Total e Ações */}
            {orderItems.length > 0 && (
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Total:
                  </Typography>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    {formatCurrency(orderTotal)}
                  </Typography>
                </Box>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<MoneyIcon />}
                  onClick={handleProceedToPayment}
                >
                  Finalizar Pedido
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Dialog para Adicionar Produto */}
      <Dialog open={productDialogOpen} onClose={() => setProductDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Adicionar ao Pedido
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
          <Button onClick={handleAddToOrder} variant="contained">
            Adicionar ao Pedido
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default POSMainPage;

