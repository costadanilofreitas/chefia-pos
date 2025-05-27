import React, { useState, useEffect } from 'react';
import TableLayoutEditor from '@common/components/layout/TableLayoutEditor';
import { Container, Grid, Typography, Box, Tabs, Tab, Paper, Button, Badge } from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import ReceiptIcon from '@mui/icons-material/Receipt';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import { useAuth } from '@common/contexts/auth/hooks/useAuth';
import { useOrder } from '@common/contexts/order/hooks/useOrder';

/**
 * Página principal do aplicativo de Garçom
 * @returns {JSX.Element} Componente da página principal do Garçom
 */
const WaiterMainPage = () => {
  // Estados
  const [activeTab, setActiveTab] = useState(0);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hooks
  const { user } = useAuth();
  const { createOrder, getOrdersByTable } = useOrder();

  // Efeito para carregar mesas e pedidos
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Em um ambiente real, faríamos chamadas à API
        // Por enquanto, simulamos dados
        
        // Simular mesas
        const tablesData = [
          { id: 1, number: 1, status: 'available', seats: 4, shape: 'square', x: 100, y: 100 },
          { id: 2, number: 2, status: 'occupied', seats: 2, shape: 'round', x: 250, y: 100 },
          { id: 3, number: 3, status: 'reserved', seats: 6, shape: 'rectangle', x: 400, y: 100 },
          { id: 4, number: 4, status: 'available', seats: 4, shape: 'square', x: 100, y: 250 },
          { id: 5, number: 5, status: 'occupied', seats: 2, shape: 'round', x: 250, y: 250 },
          { id: 6, number: 6, status: 'available', seats: 6, shape: 'rectangle', x: 400, y: 250 }
        ];
        
        // Simular pedidos
        const ordersData = [
          {
            id: 1,
            table_id: 2,
            status: 'in_progress',
            items: [
              { id: 1, name: 'Hambúrguer', quantity: 2, price: 25.90, status: 'preparing' },
              { id: 2, name: 'Refrigerante', quantity: 2, price: 6.50, status: 'ready' }
            ],
            created_at: new Date(Date.now() - 30 * 60000).toISOString()
          },
          {
            id: 2,
            table_id: 5,
            status: 'ready',
            items: [
              { id: 3, name: 'Pizza', quantity: 1, price: 45.90, status: 'ready' },
              { id: 4, name: 'Água', quantity: 3, price: 4.50, status: 'ready' }
            ],
            created_at: new Date(Date.now() - 15 * 60000).toISOString()
          }
        ];
        
        setTables(tablesData);
        setOrders(ordersData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Manipular mudança de tab
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Manipular seleção de mesa
  const handleTableSelect = (tableId) => {
    const table = tables.find(t => t.id === tableId);
    setSelectedTable(table);
    
    // Em um ambiente real, buscaríamos os pedidos da mesa selecionada
    // Por enquanto, filtramos os pedidos simulados
    const tableOrders = orders.filter(order => order.table_id === tableId);
    console.log('Pedidos da mesa:', tableOrders);
  };

  // Manipular criação de novo pedido
  const handleNewOrder = () => {
    if (!selectedTable) return;
    
    // Em um ambiente real, criaríamos um novo pedido via API
    // Por enquanto, simulamos a criação
    const newOrder = {
      id: orders.length + 1,
      table_id: selectedTable.id,
      status: 'new',
      items: [],
      created_at: new Date().toISOString()
    };
    
    setOrders([...orders, newOrder]);
    console.log('Novo pedido criado:', newOrder);
  };

  // Renderizar conteúdo baseado na tab ativa
  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Mesas
        return (
          <Box sx={{ mt: 2 }}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Layout do Restaurante
              </Typography>
              <Box sx={{ height: 500, border: '1px solid #ccc', borderRadius: 1 }}>
                <TableLayoutEditor 
                  tables={tables}
                  onTableSelect={handleTableSelect}
                  readOnly={true}
                />
              </Box>
            </Paper>
            
            {selectedTable && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Mesa {selectedTable.number}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography>
                      Status: {selectedTable.status === 'available' ? 'Disponível' : 
                              selectedTable.status === 'occupied' ? 'Ocupada' : 'Reservada'}
                    </Typography>
                    <Typography>
                      Lugares: {selectedTable.seats}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button 
                      variant="contained" 
                      color="primary"
                      disabled={selectedTable.status !== 'occupied'}
                      onClick={handleNewOrder}
                    >
                      Novo Pedido
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            )}
          </Box>
        );
      
      case 1: // Pedidos
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Pedidos Ativos
            </Typography>
            {orders.length > 0 ? (
              orders.map(order => (
                <Paper key={order.id} sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle1">
                        Pedido #{order.id} - Mesa {order.table_id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button 
                        variant="outlined" 
                        color={order.status === 'ready' ? 'success' : 'primary'}
                      >
                        {order.status === 'ready' ? 'Entregar' : 'Ver Detalhes'}
                      </Button>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">
                        Itens:
                      </Typography>
                      {order.items.map(item => (
                        <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">
                            {item.quantity}x {item.name}
                          </Typography>
                          <Typography variant="body2" color={item.status === 'ready' ? 'success.main' : 'text.secondary'}>
                            {item.status === 'ready' ? 'Pronto' : 'Em preparo'}
                          </Typography>
                        </Box>
                      ))}
                    </Grid>
                  </Grid>
                </Paper>
              ))
            ) : (
              <Typography>Nenhum pedido ativo</Typography>
            )}
          </Box>
        );
      
      case 2: // Cardápio
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Cardápio
            </Typography>
            <Typography>
              Visualização do cardápio para consulta rápida
            </Typography>
          </Box>
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Cabeçalho */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Garçom
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ mr: 2 }}>
            {user?.name || 'Usuário'}
          </Typography>
        </Box>
      </Box>
      
      {/* Tabs de navegação */}
      <Paper sx={{ width: '100%' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab icon={<TableRestaurantIcon />} label="Mesas" />
          <Tab 
            icon={
              <Badge badgeContent={orders.length} color="error">
                <ReceiptIcon />
              </Badge>
            } 
            label="Pedidos" 
          />
          <Tab icon={<RestaurantIcon />} label="Cardápio" />
        </Tabs>
      </Paper>
      
      {/* Conteúdo da tab ativa */}
      {renderTabContent()}
    </Container>
  );
};

export default WaiterMainPage;
