import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  InputAdornment,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Divider,
  Chip,
  Avatar
} from '@mui/material';
import {
  Search as SearchIcon,
  Menu as MenuIcon,
  ShoppingCart as ShoppingCartIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useProduct } from '../hooks/useProduct';

// Mock data para demonstração
const mockCategories = [
  { id: '1', name: 'Hamburgers', icon: '🍔' },
  { id: '2', name: 'Batatas', icon: '🍟' },
  { id: '3', name: 'Bebidas', icon: '🥤' },
  { id: '4', name: 'Pizzas', icon: '🍕' },
  { id: '5', name: 'Sobremesas', icon: '🍰' },
  { id: '6', name: 'Saladas', icon: '🥗' }
];

const mockProducts = [
  {
    id: '1',
    name: 'Big Burger',
    description: 'Hambúrguer com carne, queijo, alface e tomate',
    price: 25.90,
    category_id: '1',
    image: '/images/hamburger.png',
    available: true
  },
  {
    id: '2',
    name: 'Batata Frita Grande',
    description: 'Porção grande de batatas fritas crocantes',
    price: 12.90,
    category_id: '2',
    image: '/images/fries.png',
    available: true
  },
  {
    id: '3',
    name: 'Refrigerante Cola',
    description: 'Refrigerante de cola gelado 500ml',
    price: 8.90,
    category_id: '3',
    image: '/images/soda.png',
    available: true
  },
  {
    id: '4',
    name: 'Pizza Pepperoni',
    description: 'Pizza individual com pepperoni e queijo',
    price: 18.90,
    category_id: '4',
    image: '/images/pizza.png',
    available: true
  }
];

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export default function POSMainPageMcDonalds() {
  const { user, isAuthenticated } = useAuth();
  const { products: backendProducts, categories: backendCategories, loading, error } = useProduct();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  // Obter terminalId da URL
  const terminalId = window.location.pathname.split('/')[2] || '1';

  // Usar produtos do backend se disponíveis, senão usar mock
  const products = backendProducts && backendProducts.length > 0 ? backendProducts : mockProducts;
  
  // Usar apenas categorias do backend, com fallback para lista vazia
  const categories = backendCategories || [];
  
  // Adicionar categoria "Todos" no início se houver categorias
  const allCategories = categories.length > 0 
    ? [{ id: 'all', name: 'Todos', icon: '🍽️' }, ...categories]
    : [{ id: 'all', name: 'Todos', icon: '🍽️' }];

  // Filtrar produtos por categoria e busca
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch && product.available;
  });

  // Adicionar produto ao carrinho
  const addToCart = (product: any) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.image
        }];
      }
    });
  };

  // Remover produto do carrinho
  const removeFromCart = (productId: string) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === productId);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(item =>
          item.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      } else {
        return prevCart.filter(item => item.id !== productId);
      }
    });
  };

  // Remover item completamente do carrinho
  const deleteFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  // Função para abrir menu
  const handleMenuOpen = () => {
    setMenuOpen(!menuOpen);
  };

  // Calcular total do carrinho
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#f5f5f5' }}>      {/* Header */}
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={handleMenuOpen}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 1 }}>
            POS Principal
          </Typography>
          
          <Chip
            label={`Terminal ${terminalId}`}
            size="small"
            variant="outlined"
            sx={{ 
              color: 'white', 
              borderColor: 'rgba(255,255,255,0.3)',
              mr: 2 
            }}
          />
          
          <Chip
            label={user?.name || 'Usuário'}
            size="small"
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              color: 'white',
              mr: 1
            }}
          />
          
          <IconButton
            color="inherit"
            onClick={() => {}}
          >
            <Badge badgeContent={cart.length} color="secondary">
              <ShoppingCartIcon />
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>     {/* Layout principal em 3 colunas */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Coluna 1: Categorias (esquerda) */}
        <Paper 
          elevation={2} 
          sx={{ 
            width: 250, 
            bgcolor: 'white',
            borderRadius: 0,
            borderRight: '1px solid #e0e0e0'
          }}
        >
          <Box sx={{ p: 2, bgcolor: '#fafafa', borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333' }}>
              Categorias
            </Typography>
          </Box>
          
          <List sx={{ p: 0 }}>
            <ListItem disablePadding>
              <ListItemButton
                selected={selectedCategory === 'all'}
                onClick={() => setSelectedCategory('all')}
                sx={{
                  py: 2,
                  '&.Mui-selected': {
                    bgcolor: '#fff3e0',
                    borderRight: '3px solid #ff9800'
                  }
                }}
              >
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography sx={{ fontSize: '1.2rem', mr: 1 }}>🍽️</Typography>
                      <Typography sx={{ fontWeight: 'medium' }}>Todos</Typography>
                    </Box>
                  }
                />
              </ListItemButton>
            </ListItem>
            
            {allCategories.map((category) => (
              <ListItem key={category.id} disablePadding>
                <ListItemButton
                  selected={selectedCategory === category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  sx={{
                    py: 2,
                    '&.Mui-selected': {
                      bgcolor: '#fff3e0',
                      borderRight: '3px solid #ff9800'
                    }
                  }}
                >
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography sx={{ fontSize: '1.2rem', mr: 1 }}>
                          {category.icon || '📦'}
                        </Typography>
                        <Typography sx={{ fontWeight: 'medium' }}>
                          {category.name}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* Coluna 2: Produtos (centro) */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Barra de pesquisa */}
          <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid #e0e0e0' }}>
            <TextField
              fullWidth
              placeholder="Pesquisar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  bgcolor: '#f8f9fa'
                }
              }}
            />
          </Box>

          {/* Grid de produtos */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                <Typography>Carregando produtos...</Typography>
              </Box>
            ) : filteredProducts.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  🍔 Nenhum produto encontrado
                </Typography>
                <Typography color="text.secondary">
                  {searchTerm ? 'Tente uma busca diferente' : 'Não há produtos nesta categoria'}
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {filteredProducts.map((product) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 4
                        }
                      }}
                      onClick={() => addToCart(product)}
                    >
                      <CardMedia
                        component="img"
                        height="160"
                        image={product.image}
                        alt={product.name}
                        sx={{ 
                          objectFit: 'cover',
                          bgcolor: '#f8f9fa'
                        }}
                      />
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                          {product.description}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                            R$ {product.price.toFixed(2)}
                          </Typography>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            sx={{
                              bgcolor: '#1976d2',
                              '&:hover': { bgcolor: '#1565c0' },
                              borderRadius: 2
                            }}
                          >
                            Adicionar
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Box>

        {/* Coluna 3: Carrinho (direita) */}
        <Paper 
          elevation={2} 
          sx={{ 
            width: 350, 
            bgcolor: 'white',
            borderRadius: 0,
            borderLeft: '1px solid #e0e0e0',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header do carrinho */}
          <Box sx={{ p: 2, bgcolor: '#fafafa', borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333' }}>
              🛒 Pedido ({cartItemCount} {cartItemCount === 1 ? 'item' : 'itens'})
            </Typography>
          </Box>

          {/* Lista de itens do carrinho */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {cart.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>
                  🛒 Carrinho vazio
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Adicione produtos para começar seu pedido
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 1 }}>
                {cart.map((item) => (
                  <ListItem key={item.id} sx={{ px: 1, py: 1 }}>
                    <Paper sx={{ width: '100%', p: 2, bgcolor: '#f8f9fa' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar
                          src={item.image}
                          alt={item.name}
                          sx={{ width: 40, height: 40, mr: 2 }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            {item.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            R$ {item.price.toFixed(2)} cada
                          </Typography>
                        </Box>
                        <IconButton 
                          size="small" 
                          onClick={() => deleteFromCart(item.id)}
                          sx={{ color: '#d32f2f' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <IconButton 
                            size="small" 
                            onClick={() => removeFromCart(item.id)}
                            sx={{ bgcolor: 'white', mr: 1 }}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography sx={{ mx: 1, fontWeight: 'bold' }}>
                            {item.quantity}
                          </Typography>
                          <IconButton 
                            size="small" 
                            onClick={() => addToCart({ ...item, category_id: '1', description: '', available: true })}
                            sx={{ bgcolor: 'white', ml: 1 }}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </Typography>
                      </Box>
                    </Paper>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          {/* Footer do carrinho com total e botão de finalizar */}
          {cart.length > 0 && (
            <Box sx={{ p: 2, bgcolor: '#fafafa', borderTop: '1px solid #e0e0e0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Total:
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                  R$ {cartTotal.toFixed(2)}
                </Typography>
              </Box>
              
              <Button
                fullWidth
                variant="contained"
                size="large"
                sx={{
                  bgcolor: '#1976d2',
                  '&:hover': { bgcolor: '#1565c0' },
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  borderRadius: 2
                }}
              >
                Finalizar Pedido
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

