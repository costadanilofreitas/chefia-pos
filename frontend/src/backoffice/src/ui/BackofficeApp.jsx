import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Paper, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  AppBar, 
  Toolbar, 
  IconButton, 
  Divider,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '@common/contexts/auth/hooks/useAuth';
import { formatCurrency, formatDateTime } from '@common/utils/formatters';

/**
 * Aplicativo de Backoffice para gerenciamento do restaurante
 * @returns {JSX.Element} Componente principal do Backoffice
 */
const BackofficeApp = () => {
  // Estados
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hooks
  const { user, logout } = useAuth();

  // Efeito para carregar dados iniciais
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Em um ambiente real, faríamos chamadas à API
        // Por enquanto, simulamos dados
        
        // Simular restaurantes
        const restaurantsData = [
          { 
            id: 1, 
            name: 'Restaurante Centro', 
            address: 'Av. Paulista, 1000, São Paulo, SP',
            status: 'active',
            sales_today: 5890.50,
            orders_today: 78
          },
          { 
            id: 2, 
            name: 'Restaurante Shopping', 
            address: 'Shopping Ibirapuera, São Paulo, SP',
            status: 'active',
            sales_today: 7230.80,
            orders_today: 94
          },
          { 
            id: 3, 
            name: 'Restaurante Zona Norte', 
            address: 'Av. Engenheiro Caetano Álvares, 2200, São Paulo, SP',
            status: 'active',
            sales_today: 4120.30,
            orders_today: 52
          }
        ];
        
        setRestaurants(restaurantsData);
        setSelectedRestaurant(restaurantsData[0]);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Alternar abertura/fechamento do drawer
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Mudar seção atual
  const handleSectionChange = (section) => {
    setCurrentSection(section);
  };

  // Mudar restaurante selecionado
  const handleRestaurantChange = (event) => {
    const restaurantId = parseInt(event.target.value);
    const restaurant = restaurants.find(r => r.id === restaurantId);
    setSelectedRestaurant(restaurant);
  };

  // Renderizar conteúdo baseado na seção atual
  const renderContent = () => {
    if (!selectedRestaurant) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <Typography>Selecione um restaurante para continuar</Typography>
        </Box>
      );
    }

    switch (currentSection) {
      case 'dashboard':
        return (
          <>
            <Typography variant="h5" gutterBottom>
              Dashboard
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6} lg={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Vendas Hoje
                    </Typography>
                    <Typography variant="h4">
                      {formatCurrency(selectedRestaurant.sales_today)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Pedidos Hoje
                    </Typography>
                    <Typography variant="h4">
                      {selectedRestaurant.orders_today}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Ticket Médio
                    </Typography>
                    <Typography variant="h4">
                      {formatCurrency(selectedRestaurant.sales_today / selectedRestaurant.orders_today)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Status
                    </Typography>
                    <Typography variant="h4" color={selectedRestaurant.status === 'active' ? 'success.main' : 'error.main'}>
                      {selectedRestaurant.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Vendas Recentes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gráfico de vendas seria exibido aqui
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </>
        );
      
      case 'menu':
        return (
          <>
            <Typography variant="h5" gutterBottom>
              Gerenciamento de Cardápio
            </Typography>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Categorias
              </Typography>
              <Button variant="contained" color="primary" sx={{ mb: 2 }}>
                Nova Categoria
              </Button>
              <Typography variant="body2" color="text.secondary">
                Lista de categorias seria exibida aqui
              </Typography>
            </Paper>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Produtos
              </Typography>
              <Button variant="contained" color="primary" sx={{ mb: 2 }}>
                Novo Produto
              </Button>
              <Typography variant="body2" color="text.secondary">
                Lista de produtos seria exibida aqui
              </Typography>
            </Paper>
          </>
        );
      
      case 'inventory':
        return (
          <>
            <Typography variant="h5" gutterBottom>
              Controle de Estoque
            </Typography>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Itens em Estoque
              </Typography>
              <Button variant="contained" color="primary" sx={{ mb: 2 }}>
                Adicionar Item
              </Button>
              <Typography variant="body2" color="text.secondary">
                Lista de itens em estoque seria exibida aqui
              </Typography>
            </Paper>
          </>
        );
      
      case 'customers':
        return (
          <>
            <Typography variant="h5" gutterBottom>
              Clientes
            </Typography>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Lista de Clientes
              </Typography>
              <Button variant="contained" color="primary" sx={{ mb: 2 }}>
                Novo Cliente
              </Button>
              <Typography variant="body2" color="text.secondary">
                Lista de clientes seria exibida aqui
              </Typography>
            </Paper>
          </>
        );
      
      case 'reports':
        return (
          <>
            <Typography variant="h5" gutterBottom>
              Relatórios
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Relatório de Vendas
                  </Typography>
                  <Button variant="contained" color="primary" sx={{ mb: 2 }}>
                    Gerar Relatório
                  </Button>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Relatório de Estoque
                  </Typography>
                  <Button variant="contained" color="primary" sx={{ mb: 2 }}>
                    Gerar Relatório
                  </Button>
                </Paper>
              </Grid>
            </Grid>
          </>
        );
      
      case 'settings':
        return (
          <>
            <Typography variant="h5" gutterBottom>
              Configurações
            </Typography>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Configurações do Restaurante
              </Typography>
              <Box component="form" sx={{ mt: 2 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Nome do Restaurante"
                      defaultValue={selectedRestaurant.name}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Endereço"
                      defaultValue={selectedRestaurant.address}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button variant="contained" color="primary">
                      Salvar Alterações
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Typography>Carregando...</Typography>
    </Box>;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={toggleDrawer}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            POS Modern - Backoffice
          </Typography>
          
          {/* Seletor de Restaurante */}
          <FormControl variant="outlined" size="small" sx={{ minWidth: 200, mr: 2, backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <InputLabel id="restaurant-select-label" sx={{ color: 'white' }}>Restaurante</InputLabel>
            <Select
              labelId="restaurant-select-label"
              id="restaurant-select"
              value={selectedRestaurant?.id || ''}
              onChange={handleRestaurantChange}
              label="Restaurante"
              sx={{ color: 'white' }}
            >
              {restaurants.map((restaurant) => (
                <MenuItem key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Avatar do Usuário */}
          <Avatar sx={{ bgcolor: 'secondary.main' }}>
            {user?.name?.charAt(0) || 'U'}
          </Avatar>
        </Toolbar>
      </AppBar>
      
      {/* Drawer */}
      <Drawer
        variant="permanent"
        open={drawerOpen}
        sx={{
          width: drawerOpen ? 240 : 64,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerOpen ? 240 : 64,
            boxSizing: 'border-box',
            transition: (theme) => theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            <ListItem 
              button 
              selected={currentSection === 'dashboard'} 
              onClick={() => handleSectionChange('dashboard')}
            >
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItem>
            <ListItem 
              button 
              selected={currentSection === 'menu'} 
              onClick={() => handleSectionChange('menu')}
            >
              <ListItemIcon>
                <RestaurantIcon />
              </ListItemIcon>
              <ListItemText primary="Cardápio" />
            </ListItem>
            <ListItem 
              button 
              selected={currentSection === 'inventory'} 
              onClick={() => handleSectionChange('inventory')}
            >
              <ListItemIcon>
                <InventoryIcon />
              </ListItemIcon>
              <ListItemText primary="Estoque" />
            </ListItem>
            <ListItem 
              button 
              selected={currentSection === 'customers'} 
              onClick={() => handleSectionChange('customers')}
            >
              <ListItemIcon>
                <PeopleIcon />
              </ListItemIcon>
              <ListItemText primary="Clientes" />
            </ListItem>
            <ListItem 
              button 
              selected={currentSection === 'reports'} 
              onClick={() => handleSectionChange('reports')}
            >
              <ListItemIcon>
                <ReceiptIcon />
              </ListItemIcon>
              <ListItemText primary="Relatórios" />
            </ListItem>
          </List>
          <Divider />
          <List>
            <ListItem 
              button 
              selected={currentSection === 'settings'} 
              onClick={() => handleSectionChange('settings')}
            >
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Configurações" />
            </ListItem>
            <ListItem button onClick={logout}>
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Sair" />
            </ListItem>
          </List>
        </Box>
      </Drawer>
      
      {/* Conteúdo Principal */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {renderContent()}
      </Box>
    </Box>
  );
};

export default BackofficeApp;
