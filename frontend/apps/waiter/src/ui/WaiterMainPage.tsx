import React, { useState, useEffect } from 'react';
import TableLayoutEditor from '@common/components/layout/TableLayoutEditor';
import {
  Container,
  Grid,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper,
  Button,
  Badge,
  CircularProgress,
  Alert,
} from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ReceiptIcon from '@mui/icons-material/Receipt';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import { useAuth } from '@common/contexts/auth/hooks/useAuth';
import { useOrder } from '@common/contexts/order/hooks/useOrder';
import { waiterService, Table, Order } from '../services/waiterService';

const WaiterMainPage: React.FC = () => {
  // Estados
  const [activeTab, setActiveTab] = useState<number>(0);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Hooks
  const { user } = useAuth();
  const {  } = useOrder();

  // Efeito para carregar mesas e pedidos
  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const tablesData = await waiterService.getTables();
        setTables(tablesData);

        const ordersData = await waiterService.getOrders();
        setOrders(ordersData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError('Falha ao carregar dados. Tente novamente.');

        // Dados fallback em caso de erro
        const fallbackTables: Table[] = [
          { id: 1, number: 1, status: 'available', seats: 4, shape: 'square', x: 100, y: 100 },
          { id: 2, number: 2, status: 'occupied', seats: 2, shape: 'round', x: 250, y: 100 },
          { id: 3, number: 3, status: 'reserved', seats: 6, shape: 'rectangle', x: 400, y: 100 },
        ];

        const fallbackOrders: Order[] = [
          {
            id: 1,
            table_id: 2,
            status: 'in_progress',
            items: [
              { id: 1, name: 'Hambúrguer', quantity: 2, price: 25.9, status: 'preparing' },
              { id: 2, name: 'Refrigerante', quantity: 2, price: 6.5, status: 'ready' },
            ],
            created_at: new Date(Date.now() - 30 * 60000).toISOString(),
          },
        ];

        setTables(fallbackTables);
        setOrders(fallbackOrders);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Manipular mudança de tab
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number): void => {
    setActiveTab(newValue);
  };

  // Manipular seleção de mesa
  const handleTableSelect = async (tableId: number): Promise<void> => {
    const table = tables.find((t) => t.id === tableId);
    if (table) {
      setSelectedTable(table);

      try {
        const tableOrders = await waiterService.getOrdersByTable(tableId);
        console.log('Pedidos da mesa:', tableOrders);
      } catch (error) {
        console.error(`Erro ao buscar pedidos da mesa ${tableId}:`, error);
        setError(`Falha ao carregar pedidos da mesa ${tableId}. Tente novamente.`);
      }
    }
  };

  // Manipular criação de novo pedido
  const handleNewOrder = async (): Promise<void> => {
    if (!selectedTable) return;

    try {
      const newOrder = await waiterService.createOrder(selectedTable.id, []);
      setOrders((prevOrders) => [...prevOrders, newOrder]);
      console.log('Novo pedido criado:', newOrder);
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      setError('Falha ao criar novo pedido. Tente novamente.');
    }
  };

  // Manipular atualização de status da mesa
  const handleUpdateTableStatus = async (tableId: number, status: Table['status']): Promise<void> => {
    try {
      const success = await waiterService.updateTableStatus(tableId, status);
      if (success) {
        setTables((prevTables) =>
          prevTables.map((table) => (table.id === tableId ? { ...table, status } : table))
        );
        console.log(`Status da mesa ${tableId} atualizado para ${status}`);
      } else {
        setError('Falha ao atualizar status da mesa. Tente novamente.');
      }
    } catch (error) {
      console.error(`Erro ao atualizar status da mesa ${tableId}:`, error);
      setError('Falha ao atualizar status da mesa. Tente novamente.');
    }
  };

  // Manipular entrega de itens do pedido
  const handleDeliverItems = async (orderId: number, itemIds: number[]): Promise<void> => {
    try {
      const success = await waiterService.deliverOrderItems(orderId, itemIds);
      if (success) {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  items: order.items.map((item) =>
                    itemIds.includes(item.id) ? { ...item, status: 'delivered' } : item
                  ),
                }
              : order
          )
        );
        console.log(`Itens ${itemIds.join(', ')} do pedido ${orderId} entregues`);
      } else {
        setError('Falha ao marcar itens como entregues. Tente novamente.');
      }
    } catch (error) {
      console.error(`Erro ao marcar itens como entregues para o pedido ${orderId}:`, error);
      setError('Falha ao marcar itens como entregues. Tente novamente.');
    }
  };

  // Renderizar conteúdo baseado na tab ativa
  const renderTabContent = (): React.ReactNode => {
    switch (activeTab) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Layout do Restaurante
              </Typography>
              <Box sx={{ height: 500, border: '1px solid #ccc', borderRadius: 1 }}>
                <TableLayoutEditor tables={tables} onTableSelect={handleTableSelect} readOnly />
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
                      Status:{' '}
                      {selectedTable.status === 'available'
                        ? 'Disponível'
                        : selectedTable.status === 'occupied'
                        ? 'Ocupada'
                        : 'Reservada'}
                    </Typography>
                    <Typography>Lugares: {selectedTable.seats}</Typography>
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

      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Pedidos Ativos
            </Typography>
            {orders.length > 0 ? (
              orders.map((order) => (
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
                        onClick={() => {
                          if (order.status === 'ready') {
                            const readyItemIds = order.items
                              .filter((item) => item.status === 'ready')
                              .map((item) => item.id);

                            if (readyItemIds.length > 0) {
                              handleDeliverItems(order.id, readyItemIds);
                            }
                          }
                        }}
                      >
                        {order.status === 'ready' ? 'Entregar' : 'Ver Detalhes'}
                      </Button>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Itens:</Typography>
                      {order.items.map((item) => (
                        <Box
                          key={item.id}
                          sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
                        >
                          <Typography variant="body2">
                            {item.quantity}x {item.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            color={
                              item.status === 'ready'
                                ? 'success.main'
                                : item.status === 'delivered'
                                ? 'text.disabled'
                                : 'text.secondary'
                            }
                          >
                            {item.status === 'ready'
                              ? 'Pronto'
                              : item.status === 'delivered'
                              ? 'Entregue'
                              : 'Em preparo'}
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

      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Cardápio
            </Typography>
            <Typography>Visualização do cardápio para consulta rápida</Typography>
          </Box>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Carregando dados...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

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

      {renderTabContent()}
    </Container>
  );
};

export default WaiterMainPage;
