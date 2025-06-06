import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from '@mui/icons-material';
import { useAuth } from '../hooks/mocks/useAuth';
import { useCashier } from '../hooks/mocks/useCashier';
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
  operator_id: string;
}

const POSOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { terminalId } = useParams<{ terminalId: string }>();
  const { user } = useAuth();
  const { cashierStatus } = useCashier();

  // Estados estáveis para evitar re-renders
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{
    open: boolean;
    message: string;
    severity: 'error' | 'info' | 'success' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Mock products data - estável
  const mockProducts: Product[] = useMemo(() => [
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
    },
    {
      id: '6',
      name: 'Suco Natural',
      price: 8.00,
      category: 'Bebidas',
      description: 'Suco natural de frutas da estação',
      available: true
    }
  ], []);

  const categories = useMemo(() => ['all', ...Array.from(new Set(mockProducts.map(p => p.category)))], [mockProducts]);

  // Inicializar pedido apenas uma vez
  useEffect(() => {
    if (!currentOrder) {
      setCurrentOrder({
        id: `temp-${Date.now()}`,
        items: [],
        total: 0,
        status: 'pending',
        created_at: new Date().toISOString(),
        cashier_id: cashierStatus?.id || '',
        terminal_id: `POS-${terminalId}`,
        operator_id: user?.id || '',
      });
    }
  }, [currentOrder, cashierStatus?.id, terminalId, user?.id]);

  // Filtrar produtos de forma estável
  const filteredProducts = useMemo(() => {
    return mockProducts.filter(product => {
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch && product.available;
    });
  }, [mockProducts, selectedCategory, searchQuery]);

  // Funções estáveis com useCallback
  const handleAddToOrder = useCallback((product: Product) => {
    if (!currentOrder) return;

    const existingItem = currentOrder.items.find(item => item.product_id === product.id);
    
    let updatedItems: OrderItem[];
    
    if (existingItem) {
      // Atualizar quantidade do item existente
      updatedItems = currentOrder.items.map(item =>
        item.product_id === product.id
          ? { 
              ...item, 
              quantity: item.quantity + 1, 
              total_price: (item.quantity + 1) * item.unit_price 
            }
          : item
      );
    } else {
      // Adicionar novo item
      const newItem: OrderItem = {
        id: Date.now().toString(),
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
        total_price: product.price,
      };
      updatedItems = [...currentOrder.items, newItem];
    }

    const newTotal = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
    
    setCurrentOrder({
      ...currentOrder,
      items: updatedItems,
      total: newTotal
    });
  }, [currentOrder]);

  const handleRemoveFromOrder = useCallback((itemId: string) => {
    if (!currentOrder) return;

    const updatedItems = currentOrder.items.filter(item => item.id !== itemId);
    const newTotal = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
    
    setCurrentOrder({
      ...currentOrder,
      items: updatedItems,
      total: newTotal
    });
  }, [currentOrder]);

  const handleUpdateQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (!currentOrder) return;

    if (newQuantity <= 0) {
      handleRemoveFromOrder(itemId);
      return;
    }

    const updatedItems = currentOrder.items.map(item =>
      item.id === itemId
        ? { 
            ...item, 
            quantity: newQuantity, 
            total_price: newQuantity * item.unit_price 
          }
        : item
    );

    const newTotal = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
    
    setCurrentOrder({
      ...currentOrder,
      items: updatedItems,
      total: newTotal
    });
  }, [currentOrder, handleRemoveFromOrder]);

  const handleProceedToPayment = useCallback(async () => {
    if (!currentOrder || currentOrder.items.length === 0) {
      setAlertInfo({
        open: true,
        message: 'Adicione pelo menos um item ao pedido',
        severity: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      // Simular salvamento do pedido
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      navigate(`/pos/${terminalId}/payment`, {
        state: { order: currentOrder }
      });
    } catch (error: any) {
      setAlertInfo({
        open: true,
        message: `Erro ao salvar pedido: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [currentOrder, navigate, terminalId]);

  const handleCancel = useCallback(() => {
    if (currentOrder && currentOrder.items.length > 0) {
      if (
        window.confirm(
          'Deseja realmente cancelar este pedido? Todos os itens serão perdidos.'
        )
      ) {
        setCurrentOrder(null);
        navigate(`/pos/${terminalId}/main`);
      }
    } else {
      navigate(`/pos/${terminalId}/main`);
    }
  }, [currentOrder, navigate, terminalId]);

  const handleCloseAlert = useCallback(() => {
    setAlertInfo(prev => ({ ...prev, open: false }));
  }, []);

  if (loading) {
    return (
      <Container
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton color="inherit" onClick={handleCancel} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#333' }}>
            Novo Pedido
          </Typography>
        </Box>
        <Box>
          <Typography variant="subtitle1" color="text.secondary">
            Terminal {terminalId} | Operador: {user?.name || 'Não identificado'}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Coluna de produtos */}
        <Grid item xs={12} md={8}>
          <StyledPaper>
            {/* Filtros */}
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Buscar produtos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
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

            {/* Grid de produtos */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 350px)' }}>
              <Grid container spacing={2}>
                {filteredProducts.map((product) => (
                  <Grid item xs={12} sm={6} md={4} key={product.id}>
                    <ProductCard onClick={() => handleAddToOrder(product)}>
                      {product.image_url && (
                        <CardMedia
                          component="img"
                          height="140"
                          image={product.image_url}
                          alt={product.name}
                        />
                      )}
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="div" noWrap>
                          {product.name}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ 
                            mb: 1, 
                            height: '40px', 
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}
                        >
                          {product.description || 'Sem descrição'}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                          <Typography variant="h6" color="primary.main" fontWeight="bold">
                            {formatCurrency(product.price)}
                          </Typography>
                          {product.is_combo && (
                            <Chip size="small" icon={<OfferIcon />} label="Combo" color="secondary" />
                          )}
                        </Box>
                      </CardContent>
                    </ProductCard>
                  </Grid>
                ))}
                {filteredProducts.length === 0 && (
                  <Box sx={{ p: 4, width: '100%', textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary">
                      Nenhum produto encontrado
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Box>
          </StyledPaper>
        </Grid>

        {/* Coluna do pedido */}
        <Grid item xs={12} md={4}>
          <StyledPaper>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2 }}>
              Itens do Pedido
            </Typography>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 400px)' }}>
              {!currentOrder || currentOrder.items.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <CartIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Nenhum item adicionado ao pedido
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Clique nos produtos para adicionar
                  </Typography>
                </Box>
              ) : (
                <List>
                  {currentOrder.items.map((item, index) => (
                    <React.Fragment key={item.id}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText
                          primary={
                            <Typography variant="body1" fontWeight="medium">
                              {item.product_name}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {formatCurrency(item.unit_price)} x {item.quantity}
                              </Typography>
                              <Typography variant="body2" color="primary.main" fontWeight="medium">
                                Total: {formatCurrency(item.total_price)}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            >
                              <RemoveIcon />
                            </IconButton>
                            <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                              {item.quantity}
                            </Typography>
                            <IconButton 
                              size="small" 
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            >
                              <AddIcon />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleRemoveFromOrder(item.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < currentOrder.items.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>

            <Box sx={{ mt: 'auto', pt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" color="primary.main" fontWeight="bold">
                  {formatCurrency(currentOrder?.total || 0)}
                </Typography>
              </Box>

              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                startIcon={<PaymentIcon />}
                onClick={handleProceedToPayment}
                disabled={!currentOrder || currentOrder.items.length === 0}
                sx={{ mb: 1 }}
              >
                Finalizar Pedido
              </Button>

              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={handleCancel}
              >
                Cancelar
              </Button>
            </Box>
          </StyledPaper>
        </Grid>
      </Grid>

      {/* Alerta de notificação */}
      <Snackbar
        open={alertInfo.open}
        autoHideDuration={3000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseAlert} severity={alertInfo.severity} sx={{ width: '100%' }}>
          {alertInfo.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default POSOrderPage;

