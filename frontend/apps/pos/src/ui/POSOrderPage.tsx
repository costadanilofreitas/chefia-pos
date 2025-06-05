import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Delete as DeleteIcon,
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  Payment as PaymentIcon,
  ArrowBack as ArrowBackIcon,
  LocalOffer as OfferIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/mocks/useAuth';
import { useCashier } from '../hooks/mocks/useCashier';
import { useOrder } from '@common/contexts/order/hooks/useOrder';
import { useProduct } from '@common/contexts/product/hooks/useProduct';
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

const ProductCard = styled(Card)(({ }) => ({
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

const POSOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { cashierStatus } = useCashier();
  const {
    createOrder,
    updateOrder,
    currentOrder,
    setCurrentOrder,
    removeItemFromOrder,
    loading,
  } = useOrder();
  const { products, categories, getProductsByCategory, isLoading: productLoading } = useProduct();

  const params = new URLSearchParams(location.search);
  const posId = params.get('pos') || '1';

  const [selectedCategory] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredProducts, setFilteredProducts] = useState(products || []);
  const [alertInfo, setAlertInfo] = useState<{
    open: boolean;
    message: string;
    severity: 'error' | 'info' | 'success' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  useEffect(() => {
    if (!currentOrder) {
      setCurrentOrder({
        id: `temp-${Date.now()}`,
        items: [],
        total: 0,
        status: 'pending',
        created_at: new Date().toISOString(),
        cashier_id: cashierStatus?.id || '',
        terminal_id: `POS-${posId}`,
        operator_id: user?.id || '',
      });
    }
  }, [currentOrder, setCurrentOrder, cashierStatus, posId, user]);

  useEffect(() => {
    const loadProducts = async () => {
      if (categories && categories.length > 0) {
        const categoryId = categories[selectedCategory]?.id;
        if (categoryId) {
          await getProductsByCategory(categoryId);
        }
      }
    };

    loadProducts();
  }, [selectedCategory, categories, getProductsByCategory]);

  useEffect(() => {
    if (products) {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        setFilteredProducts(
          products.filter((product) =>
            product.name.toLowerCase().includes(query) ||
            product.description?.toLowerCase().includes(query)
          )
        );
      } else {
        setFilteredProducts(products);
      }
    }
  }, [searchQuery, products]);

  const handleProceedToPayment = async () => {
    if (!currentOrder || currentOrder.items.length === 0) {
      setAlertInfo({
        open: true,
        message: 'Adicione pelo menos um item ao pedido',
        severity: 'error',
      });
      return;
    }

    try {
      let orderId: string;
      if (currentOrder.id.startsWith('temp-')) {
        const result = await createOrder({
          ...currentOrder,
          status: 'pending',
        });
        orderId = result.id;
      } else {
        await updateOrder(currentOrder.id, {
          ...currentOrder,
          status: 'pending',
        });
        orderId = currentOrder.id;
      }
      navigate(`/pos/payment/${orderId}?pos=${posId}`);
    } catch (error: any) {
      setAlertInfo({
        open: true,
        message: `Erro ao salvar pedido: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handleCancel = () => {
    if (currentOrder && currentOrder.items.length > 0) {
      if (
        window.confirm(
          'Deseja realmente cancelar este pedido? Todos os itens serão perdidos.'
        )
      ) {
        setCurrentOrder(null);
        navigate(`/pos?pos=${posId}`);
      }
    } else {
      navigate(`/pos?pos=${posId}`);
    }
  };

  const handleCloseAlert = () => {
    setAlertInfo({ ...alertInfo, open: false });
  };

  if (loading || productLoading) {
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
            Terminal POS #{posId} | Operador: {user?.name || 'Não identificado'}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Coluna de produtos */}
        <Grid item xs={12} md={8}>
          <StyledPaper>
            {/* Barra de pesquisa */}
            <Box sx={{ mb: 3 }}>
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
            </Box>

            {/* Grid de produtos */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
              <Grid container spacing={2}>
                {filteredProducts?.map((product) => (
                  <Grid item xs={12} sm={6} md={4} key={product.id}>
                    <ProductCard>
                      {product.image_url && (
                        <CardMedia
                          component="img"
                          height="140"
                          image={product.image_url}
                          alt={product.name}
                        />
                      )}
                      <CardContent>
                        <Typography variant="h6" component="div" noWrap>
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, height: '40px', overflow: 'hidden' }}>
                          {product.description || 'Sem descrição'}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                {filteredProducts?.length === 0 && (
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

            <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 350px)' }}>
              {currentOrder?.items.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <CartIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Nenhum item adicionado ao pedido
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Selecione produtos para adicionar
                  </Typography>
                </Box>
              ) : (
                <List>
                  {currentOrder?.items.map((item) => (
                    <React.Fragment key={item.id}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body1" fontWeight="medium">
                                {item.quantity}x {item.product_name}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <>
                              {item.notes && (
                                <Typography variant="caption" display="block" color="text.secondary">
                                  Obs: {item.notes}
                                </Typography>
                              )}
                              <Typography variant="body2" color="primary.main" fontWeight="medium">
                                {formatCurrency(item.total_price)}
                              </Typography>
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end" onClick={() => removeItemFromOrder(item.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>

            <Box sx={{ mt: 'auto', pt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">Subtotal:</Typography>
                <Typography variant="body1" fontWeight="medium">
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
                sx={{ mt: 2 }}
              >
                Finalizar Pedido
              </Button>

              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={handleCancel}
                sx={{ mt: 1 }}
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseAlert} severity={alertInfo.severity} sx={{ width: '100%' }}>
          {alertInfo.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default POSOrderPage;
