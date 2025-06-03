import React, { useState, useEffect } from 'react';
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
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Badge,
  InputAdornment
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  Payment as PaymentIcon,
  Print as PrintIcon,
  ArrowBack as ArrowBackIcon,
  Info as InfoIcon,
  LocalOffer as OfferIcon
} from '@mui/icons-material';
import { useAuth } from '@common/contexts/auth/hooks/useAuth';
import { useCashier } from '@common/contexts/cashier/hooks/useCashier';
import { useOrder } from '@common/contexts/order/hooks/useOrder';
import { useProduct } from '../hooks/useProduct';
import { formatCurrency } from '@common/utils/formatters';

// Estilos personalizados inspirados no sistema de exemplo, mas com identidade própria
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

const CategoryTab = styled(Tab)(({ theme }) => ({
  minWidth: 'auto',
  padding: theme.spacing(1, 2),
  borderRadius: '8px',
  margin: theme.spacing(0, 0.5),
  textTransform: 'none',
  fontWeight: 'medium',
  '&.Mui-selected': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    fontWeight: 'bold',
  },
}));

const ActionButton = styled(Button)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderRadius: '8px',
  fontWeight: 'bold',
  textTransform: 'none',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
}));

const POSOrderPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { cashierStatus } = useCashier();
  const { 
    createOrder, 
    updateOrder,
    currentOrder,
    setCurrentOrder,
    addItemToOrder,
    removeItemFromOrder,
    updateItemInOrder,
    isLoading: orderLoading 
  } = useOrder();
  const { 
    products, 
    categories, 
    getProductsByCategory,
    isLoading: productLoading 
  } = useProduct();
  
  // Extrair o ID do POS dos parâmetros da URL
  const params = new URLSearchParams(location.search);
  const posId = params.get('pos') || '1';
  
  // Estados locais
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [customizations, setCustomizations] = useState([]);
  const [alertInfo, setAlertInfo] = useState({ open: false, message: '', severity: 'info' });
  
  // Inicializar ou recuperar um pedido
  useEffect(() => {
    if (!currentOrder) {
      // Criar um novo pedido vazio
      setCurrentOrder({
        id: `temp-${Date.now()}`,
        items: [],
        total: 0,
        status: 'draft',
        created_at: new Date().toISOString(),
        cashier_id: cashierStatus?.id,
        terminal_id: `POS-${posId}`,
        operator_id: user?.id
      });
    }
  }, [currentOrder, setCurrentOrder, cashierStatus, posId, user]);
  
  // Carregar produtos quando a categoria muda
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
  
  // Filtrar produtos com base na pesquisa
  useEffect(() => {
    if (products) {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        setFilteredProducts(
          products.filter(product => 
            product.name.toLowerCase().includes(query) || 
            product.description?.toLowerCase().includes(query)
          )
        );
      } else {
        setFilteredProducts(products);
      }
    }
  }, [searchQuery, products]);
  
  const handleCategoryChange = (event, newValue) => {
    setSelectedCategory(newValue);
    setSearchQuery('');
  };
  
  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setNotes('');
    
    // Inicializar customizações com base no produto
    if (product.ingredients && product.ingredients.length > 0) {
      setCustomizations(
        product.ingredients.map(ingredient => ({
          id: ingredient.id,
          name: ingredient.name,
          type: 'ingredient',
          action: 'keep', // 'keep', 'remove', 'extra'
          price: ingredient.extra_price || 0
        }))
      );
    } else {
      setCustomizations([]);
    }
    
    setProductDialogOpen(true);
  };
  
  const handleQuantityChange = (delta) => {
    const newQuantity = Math.max(1, quantity + delta);
    setQuantity(newQuantity);
  };
  
  const handleCustomizationChange = (customizationId, action) => {
    setCustomizations(
      customizations.map(item => 
        item.id === customizationId ? { ...item, action } : item
      )
    );
  };
  
  const calculateItemPrice = () => {
    if (!selectedProduct) return 0;
    
    let basePrice = selectedProduct.price;
    
    // Adicionar preço de extras
    const extraPrice = customizations
      .filter(item => item.action === 'extra')
      .reduce((sum, item) => sum + item.price, 0);
    
    return (basePrice + extraPrice) * quantity;
  };
  
  const handleAddToOrder = () => {
    if (!selectedProduct) return;
    
    const itemCustomizations = customizations
      .filter(item => item.action !== 'keep')
      .map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        action: item.action,
        price: item.action === 'extra' ? item.price : 0
      }));
    
    const newItem = {
      id: `item-${Date.now()}`,
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity: quantity,
      unit_price: selectedProduct.price,
      total_price: calculateItemPrice(),
      notes: notes,
      customizations: itemCustomizations
    };
    
    addItemToOrder(newItem);
    setProductDialogOpen(false);
    
    setAlertInfo({
      open: true,
      message: `${selectedProduct.name} adicionado ao pedido`,
      severity: 'success'
    });
  };
  
  const handleRemoveItem = (itemId) => {
    removeItemFromOrder(itemId);
    
    setAlertInfo({
      open: true,
      message: 'Item removido do pedido',
      severity: 'info'
    });
  };
  
  const handleEditItem = (item) => {
    // Buscar o produto completo
    const product = products.find(p => p.id === item.product_id);
    if (product) {
      setSelectedProduct(product);
      setQuantity(item.quantity);
      setNotes(item.notes || '');
      
      // Reconstruir customizações
      if (product.ingredients && product.ingredients.length > 0) {
        const itemCustomizationsMap = new Map(
          item.customizations?.map(c => [c.id, c]) || []
        );
        
        setCustomizations(
          product.ingredients.map(ingredient => {
            const customization = itemCustomizationsMap.get(ingredient.id);
            return {
              id: ingredient.id,
              name: ingredient.name,
              type: 'ingredient',
              action: customization ? customization.action : 'keep',
              price: ingredient.extra_price || 0
            };
          })
        );
      } else {
        setCustomizations([]);
      }
      
      setProductDialogOpen(true);
    }
  };
  
  const handleProceedToPayment = () => {
    if (!currentOrder || currentOrder.items.length === 0) {
      setAlertInfo({
        open: true,
        message: 'Adicione pelo menos um item ao pedido',
        severity: 'error'
      });
      return;
    }
    
    // Salvar o pedido atual no banco de dados
    const saveOrder = async () => {
      try {
        let orderId;
        
        if (currentOrder.id.startsWith('temp-')) {
          // Criar novo pedido
          const result = await createOrder({
            ...currentOrder,
            status: 'pending'
          });
          orderId = result.id;
        } else {
          // Atualizar pedido existente
          await updateOrder({
            ...currentOrder,
            status: 'pending'
          });
          orderId = currentOrder.id;
        }
        
        // Navegar para a página de pagamento
        navigate(`/pos/payment/${orderId}?pos=${posId}`);
        
      } catch (error) {
        setAlertInfo({
          open: true,
          message: `Erro ao salvar pedido: ${error.message}`,
          severity: 'error'
        });
      }
    };
    
    saveOrder();
  };
  
  const handleCancel = () => {
    // Confirmar cancelamento se houver itens no pedido
    if (currentOrder && currentOrder.items.length > 0) {
      if (window.confirm('Deseja realmente cancelar este pedido? Todos os itens serão perdidos.')) {
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
  
  if (orderLoading || productLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }
  
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            color="inherit" 
            onClick={handleCancel}
            sx={{ mr: 1 }}
          >
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
            
            {/* Tabs de categorias */}
            <Box sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={selectedCategory}
                onChange={handleCategoryChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 1 }}
              >
                {categories?.map((category, index) => (
                  <CategoryTab 
                    key={category.id} 
                    label={category.name} 
                    value={index} 
                  />
                ))}
              </Tabs>
            </Box>
            
            {/* Grid de produtos */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
              <Grid container spacing={2}>
                {filteredProducts?.map((product) => (
                  <Grid item xs={12} sm={6} md={4} key={product.id}>
                    <ProductCard onClick={() => handleProductClick(product)}>
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
                            <Chip 
                              size="small" 
                              icon={<OfferIcon />} 
                              label="Combo" 
                              color="secondary"
                            />
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
                              {item.customizations && item.customizations.length > 0 && (
                                <IconButton size="small" sx={{ ml: 1 }} color="primary">
                                  <InfoIcon fontSize="small" />
                                </IconButton>
                              )}
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
                          <IconButton edge="end" onClick={() => handleEditItem(item)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton edge="end" onClick={() => handleRemoveItem(item.id)}>
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
              
              <ActionButton
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
              </ActionButton>
              
              <ActionButton
                variant="outlined"
                color="error"
                fullWidth
                onClick={handleCancel}
                sx={{ mt: 1 }}
              >
                Cancelar
              </ActionButton>
            </Box>
          </StyledPaper>
        </Grid>
      </Grid>
      
      {/* Diálogo de produto */}
      <Dialog
        open={productDialogOpen}
        onClose={() => setProductDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedProduct && (
          <>
            <DialogTitle>
              <Typography variant="h5">{selectedProduct.name}</Typography>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  {selectedProduct.image_url && (
                    <Box sx={{ mb: 2 }}>
                      <img 
                        src={selectedProduct.image_url} 
                        alt={selectedProduct.name} 
                        style={{ width: '100%', borderRadius: '8px' }}
                      />
                    </Box>
                  )}
                  
                  <Typography variant="body1" paragraph>
                    {selectedProduct.description || 'Sem descrição disponível.'}
                  </Typography>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Preço: {formatCurrency(selectedProduct.price)}
                    </Typography>
                    {selectedProduct.calories && (
                      <Typography variant="body2" color="text.secondary">
                        {selectedProduct.calories} calorias
                      </Typography>
                    )}
                  </Box>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Observações:
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      variant="outlined"
                      placeholder="Ex: Sem cebola, molho à parte..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Quantidade:
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <IconButton 
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= 1}
                      >
                        <RemoveIcon />
                      </IconButton>
                      <Typography variant="h5" sx={{ mx: 2, minWidth: '40px', textAlign: 'center' }}>
                        {quantity}
                      </Typography>
                      <IconButton onClick={() => handleQuantityChange(1)}>
                        <AddIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  {customizations.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Personalizar:
                      </Typography>
                      <List>
                        {customizations.map((item) => (
                          <ListItem key={item.id} disablePadding sx={{ mb: 1 }}>
                            <ListItemText
                              primary={item.name}
                              secondary={item.action === 'extra' && `+${formatCurrency(item.price)}`}
                            />
                            <Box>
                              <Button
                                size="small"
                                variant={item.action === 'remove' ? 'contained' : 'outlined'}
                                color="error"
                                onClick={() => handleCustomizationChange(item.id, 'remove')}
                                sx={{ minWidth: '30px', mr: 1 }}
                              >
                                -
                              </Button>
                              <Button
                                size="small"
                                variant={item.action === 'keep' ? 'contained' : 'outlined'}
                                color="primary"
                                onClick={() => handleCustomizationChange(item.id, 'keep')}
                                sx={{ minWidth: '30px', mr: 1 }}
                              >
                                Normal
                              </Button>
                              <Button
                                size="small"
                                variant={item.action === 'extra' ? 'contained' : 'outlined'}
                                color="success"
                                onClick={() => handleCustomizationChange(item.id, 'extra')}
                                sx={{ minWidth: '30px' }}
                                disabled={!item.price}
                              >
                                +
                              </Button>
                            </Box>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                  
                  <Box sx={{ mt: 'auto' }}>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="subtitle1">Total:</Typography>
                      <Typography variant="h6" color="primary.main" fontWeight="bold">
                        {formatCurrency(calculateItemPrice())}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setProductDialogOpen(false)} color="inherit">
                Cancelar
              </Button>
              <Button 
                onClick={handleAddToOrder} 
                variant="contained" 
                color="primary"
                startIcon={<AddIcon />}
              >
                Adicionar ao Pedido
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
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
