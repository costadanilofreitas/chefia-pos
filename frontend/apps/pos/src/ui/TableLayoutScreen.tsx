// src/ui/TableLayoutScreen.tsx - Versão atualizada com sistema configurável
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Tooltip,
  Fab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  AppBar,
  Toolbar,
  Snackbar
} from '@mui/material';
import {
  TableRestaurant,
  Person,
  Refresh,
  Kitchen,
  DeliveryDining,
  Chair,
  Restaurant,
  Add as AddIcon,
  Edit as EditIcon,
  ShoppingCart as OrderIcon,
  Payment as PaymentIcon,
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  Receipt as ReceiptIcon,
  Settings as SettingsIcon,
  ArrowBack as ArrowBackIcon,
  Visibility as ViewIcon,
  Build as ConfigIcon
} from '@mui/icons-material';
import { formatCurrency } from '../utils/formatters';
import { 
  TableLayoutConfigService, 
  RestaurantLayoutConfig, 
  TableConfig as ConfigTableConfig,
  AreaConfig 
} from '../services/TableLayoutConfig';
import TableLayoutEditor from '../components/TableLayoutEditor';

// Interface para mesa operacional (com dados de operação)
interface OperationalTable extends ConfigTableConfig {
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  waiter?: string;
  customers?: number;
  orderValue?: number;
  startTime?: string;
  orders?: Order[];
}

interface Order {
  id: string;
  tableId: string;
  seatNumber: number;
  customerName?: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  createdAt: string;
}

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  notes?: string;
}

const TableLayoutScreen: React.FC = () => {
  const { terminalId } = useParams<{ terminalId: string }>();
  const navigate = useNavigate();
  
  // Estados principais
  const [layoutConfig, setLayoutConfig] = useState<RestaurantLayoutConfig | null>(null);
  const [operationalTables, setOperationalTables] = useState<OperationalTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<OperationalTable | null>(null);
  const [loading, setLoading] = useState(true);
  const [editorMode, setEditorMode] = useState(false);

  // Estados de diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  // Estados de formulários
  const [newOrder, setNewOrder] = useState({
    seatNumber: 1,
    customerName: '',
    items: [] as OrderItem[]
  });

  // Estados de feedback
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });

  // Dimensões do canvas
  const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 700 });

  // Carregar configuração e dados operacionais
  useEffect(() => {
    loadLayoutAndOperationalData();
  }, [terminalId]);

  const loadLayoutAndOperationalData = useCallback(async () => {
    if (!terminalId) return;

    setLoading(true);
    try {
      // Carregar configuração de layout
      let config = TableLayoutConfigService.getLayoutConfig(terminalId);
      
      // Se não existe configuração, criar uma padrão
      if (!config) {
        config = TableLayoutConfigService.generateDefaultConfig(terminalId);
        TableLayoutConfigService.saveLayoutConfig(terminalId, config);
      }

      setLayoutConfig(config);
      setCanvasSize(config.dimensions);

      // Converter mesas de configuração para mesas operacionais com dados mock
      const operational = await generateOperationalData(config.tables);
      setOperationalTables(operational);

    } catch (error) {
      console.error('Erro ao carregar layout:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar configuração de layout',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [terminalId]);

  // Gerar dados operacionais mock baseados na configuração
  const generateOperationalData = async (configTables: ConfigTableConfig[]): Promise<OperationalTable[]> => {
    // Simular dados operacionais realistas
    const statuses: Array<'available' | 'occupied' | 'reserved' | 'cleaning'> = 
      ['available', 'occupied', 'reserved', 'cleaning'];
    
    const waiters = ['João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Oliveira'];
    
    return configTables.map((table, index) => {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const isOccupied = status === 'occupied';
      
      const operationalTable: OperationalTable = {
        ...table,
        status,
        waiter: isOccupied ? waiters[Math.floor(Math.random() * waiters.length)] : undefined,
        customers: isOccupied ? Math.floor(Math.random() * table.seats) + 1 : undefined,
        orderValue: isOccupied ? Math.random() * 200 + 50 : undefined,
        startTime: isOccupied ? `${Math.floor(Math.random() * 3) + 18}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}` : undefined,
        orders: isOccupied ? generateMockOrders(table.id, table.seats) : []
      };

      return operationalTable;
    });
  };

  // Gerar pedidos mock para uma mesa
  const generateMockOrders = (tableId: string, seats: number): Order[] => {
    const orders: Order[] = [];
    const customerNames = ['Ana', 'Carlos', 'Maria', 'João', 'Pedro', 'Lucia'];
    const products = [
      { name: 'Hambúrguer Clássico', price: 25.90 },
      { name: 'Pizza Margherita', price: 35.00 },
      { name: 'Salada Caesar', price: 18.50 },
      { name: 'Refrigerante', price: 5.50 },
      { name: 'Suco Natural', price: 8.00 },
      { name: 'Água', price: 3.00 }
    ];

    // Gerar pedidos para algumas cadeiras aleatoriamente
    for (let seat = 1; seat <= Math.min(seats, 3); seat++) {
      if (Math.random() > 0.3) { // 70% chance de ter pedido
        const numItems = Math.floor(Math.random() * 3) + 1;
        const items: OrderItem[] = [];
        
        for (let i = 0; i < numItems; i++) {
          const product = products[Math.floor(Math.random() * products.length)];
          items.push({
            id: `item-${seat}-${i}`,
            productName: product.name,
            quantity: 1,
            price: product.price
          });
        }

        orders.push({
          id: `order-${tableId}-${seat}`,
          tableId,
          seatNumber: seat,
          customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
          items,
          total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          status: ['pending', 'preparing', 'ready', 'served'][Math.floor(Math.random() * 4)] as any,
          createdAt: `${Math.floor(Math.random() * 60) + 10} min atrás`
        });
      }
    }

    return orders;
  };

  // Funções de mesa
  const handleTableClick = useCallback((table: OperationalTable) => {
    setSelectedTable(table);
    setDialogOpen(true);
  }, []);

  const handleTableStatusChange = useCallback((tableId: string, newStatus: OperationalTable['status']) => {
    setOperationalTables(prev => prev.map(table =>
      table.id === tableId ? { ...table, status: newStatus } : table
    ));
    setSnackbar({
      open: true,
      message: `Status da mesa ${operationalTables.find(t => t.id === tableId)?.number} alterado para ${newStatus}`,
      severity: 'success'
    });
  }, [operationalTables]);

  const handleAddOrder = useCallback(() => {
    if (!selectedTable) return;

    const newOrderData: Order = {
      id: `order-${selectedTable.id}-${Date.now()}`,
      tableId: selectedTable.id,
      seatNumber: newOrder.seatNumber,
      customerName: newOrder.customerName,
      items: newOrder.items,
      total: newOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      status: 'pending',
      createdAt: 'Agora'
    };

    setOperationalTables(prev => prev.map(table =>
      table.id === selectedTable.id
        ? { 
            ...table, 
            orders: [...(table.orders || []), newOrderData],
            status: 'occupied',
            customers: Math.max(table.customers || 0, newOrder.seatNumber)
          }
        : table
    ));

    setOrderDialogOpen(false);
    setNewOrder({ seatNumber: 1, customerName: '', items: [] });
    setSnackbar({
      open: true,
      message: 'Pedido adicionado com sucesso!',
      severity: 'success'
    });
  }, [selectedTable, newOrder]);

  // Função para abrir editor de layout
  const openLayoutEditor = useCallback(() => {
    setEditorMode(true);
  }, []);

  // Função para salvar layout do editor
  const handleLayoutSave = useCallback((newConfig: RestaurantLayoutConfig) => {
    setLayoutConfig(newConfig);
    setCanvasSize(newConfig.dimensions);
    setEditorMode(false);
    
    // Recarregar dados operacionais com nova configuração
    generateOperationalData(newConfig.tables).then(setOperationalTables);
    
    setSnackbar({
      open: true,
      message: 'Layout salvo com sucesso!',
      severity: 'success'
    });
  }, []);

  // Renderização de mesa
  const renderTable = useCallback((table: OperationalTable) => {
    const getStatusColor = (status: OperationalTable['status']) => {
      switch (status) {
        case 'available': return '#4caf50';
        case 'occupied': return '#ff9800';
        case 'reserved': return '#2196f3';
        case 'cleaning': return '#f44336';
        default: return '#9e9e9e';
      }
    };

    const getStatusText = (status: OperationalTable['status']) => {
      switch (status) {
        case 'available': return 'Livre';
        case 'occupied': return 'Ocupada';
        case 'reserved': return 'Reservada';
        case 'cleaning': return 'Limpeza';
        default: return 'Indefinido';
      }
    };

    const style: React.CSSProperties = {
      position: 'absolute',
      left: table.position.x,
      top: table.position.y,
      width: table.size.width,
      height: table.size.height,
      backgroundColor: getStatusColor(table.status),
      border: '2px solid #fff',
      borderRadius: table.shape === 'round' ? '50%' : table.shape === 'square' ? '4px' : '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      transition: 'all 0.2s ease',
      userSelect: 'none'
    };

    return (
      <div
        key={table.id}
        style={style}
        onClick={() => handleTableClick(table)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.zIndex = '10';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.zIndex = '1';
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div>{table.number}</div>
          <div style={{ fontSize: '10px' }}>{table.seats}p</div>
          {table.customers && (
            <div style={{ fontSize: '8px' }}>{table.customers} ocupados</div>
          )}
        </div>
      </div>
    );
  }, [handleTableClick]);

  // Renderização de área
  const renderArea = useCallback((area: AreaConfig) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      left: area.bounds.x,
      top: area.bounds.y,
      width: area.bounds.width,
      height: area.bounds.height,
      backgroundColor: area.color,
      border: '2px dashed #999',
      borderRadius: '8px',
      opacity: 0.3,
      zIndex: 0,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      padding: '8px',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#333',
      userSelect: 'none',
      pointerEvents: 'none'
    };

    return (
      <div key={area.id} style={style}>
        {area.name}
      </div>
    );
  }, []);

  // Estatísticas do layout
  const getLayoutStats = useCallback(() => {
    if (!layoutConfig) return null;

    const totalTables = operationalTables.length;
    const occupiedTables = operationalTables.filter(t => t.status === 'occupied').length;
    const availableTables = operationalTables.filter(t => t.status === 'available').length;
    const totalRevenue = operationalTables
      .filter(t => t.status === 'occupied')
      .reduce((sum, t) => sum + (t.orderValue || 0), 0);

    return {
      totalTables,
      occupiedTables,
      availableTables,
      occupancyRate: Math.round((occupiedTables / totalTables) * 100),
      totalRevenue
    };
  }, [layoutConfig, operationalTables]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Carregando layout...</Typography>
      </Box>
    );
  }

  if (editorMode) {
    return (
      <TableLayoutEditor
        terminalId={terminalId!}
        initialConfig={layoutConfig || undefined}
        onSave={handleLayoutSave}
        onCancel={() => setEditorMode(false)}
      />
    );
  }

  if (!layoutConfig) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Nenhuma configuração de layout encontrada para este terminal.
        </Alert>
        <Button
          variant="contained"
          startIcon={<ConfigIcon />}
          onClick={openLayoutEditor}
        >
          Configurar Layout
        </Button>
      </Box>
    );
  }

  const stats = getLayoutStats();

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => navigate(`/pos/${terminalId}`)}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Layout de Mesas - {layoutConfig.name}
          </Typography>

          {stats && (
            <Box sx={{ display: 'flex', gap: 2, mr: 2 }}>
              <Chip 
                label={`${stats.occupiedTables}/${stats.totalTables} ocupadas`} 
                color="primary" 
                variant="outlined" 
              />
              <Chip 
                label={`${stats.occupancyRate}% ocupação`} 
                color={stats.occupancyRate > 70 ? 'error' : 'success'} 
                variant="outlined" 
              />
              <Chip 
                label={formatCurrency(stats.totalRevenue)} 
                color="secondary" 
                variant="outlined" 
              />
            </Box>
          )}

          <Tooltip title="Configurar Layout">
            <IconButton onClick={openLayoutEditor}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Atualizar">
            <IconButton onClick={loadLayoutAndOperationalData}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Área principal */}
      <Box sx={{ flex: 1, display: 'flex', gap: 2, p: 2 }}>
        {/* Canvas das mesas */}
        <Paper sx={{ flex: 1, position: 'relative', overflow: 'auto' }}>
          <div
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
              position: 'relative',
              backgroundColor: '#f5f5f5',
              border: '2px solid #ccc',
              margin: '20px'
            }}
          >
            {/* Áreas */}
            {layoutConfig.areas.map(renderArea)}
            
            {/* Mesas */}
            {operationalTables.map(renderTable)}
          </div>
        </Paper>

        {/* Painel lateral */}
        <Paper sx={{ width: 350, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Controle de Mesas
          </Typography>

          {/* Estatísticas */}
          {stats && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 1 }}>
                    <Typography variant="h4" color="primary">
                      {stats.totalTables}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total de Mesas
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 1 }}>
                    <Typography variant="h4" color="success.main">
                      {stats.availableTables}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Disponíveis
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 1 }}>
                    <Typography variant="h4" color="warning.main">
                      {stats.occupiedTables}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Ocupadas
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 1 }}>
                    <Typography variant="h4" color="secondary.main">
                      {stats.occupancyRate}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Ocupação
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Lista de mesas */}
          <Typography variant="subtitle1" gutterBottom>
            Mesas por Status
          </Typography>
          
          <List dense>
            {operationalTables
              .sort((a, b) => a.number - b.number)
              .map(table => (
                <ListItem
                  key={table.id}
                  button
                  onClick={() => handleTableClick(table)}
                  sx={{
                    border: '1px solid #eee',
                    borderRadius: 1,
                    mb: 1,
                    '&:hover': { backgroundColor: '#f5f5f5' }
                  }}
                >
                  <ListItemText
                    primary={`Mesa ${table.number}`}
                    secondary={
                      <Box>
                        <Chip
                          size="small"
                          label={
                            table.status === 'available' ? 'Livre' :
                            table.status === 'occupied' ? 'Ocupada' :
                            table.status === 'reserved' ? 'Reservada' : 'Limpeza'
                          }
                          color={
                            table.status === 'available' ? 'success' :
                            table.status === 'occupied' ? 'warning' :
                            table.status === 'reserved' ? 'primary' : 'error'
                          }
                          variant="outlined"
                        />
                        {table.status === 'occupied' && (
                          <Typography variant="caption" display="block">
                            {table.customers} pessoas • {formatCurrency(table.orderValue || 0)}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTableClick(table);
                      }}
                    >
                      <ViewIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
          </List>

          {/* Ações rápidas */}
          <Box sx={{ mt: 3 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Kitchen />}
              onClick={() => navigate(`/pos/${terminalId}/kitchen`)}
              sx={{ mb: 1 }}
            >
              Ver Cozinha
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<DeliveryDining />}
              onClick={() => navigate(`/pos/${terminalId}/delivery`)}
            >
              Ver Delivery
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* Dialog de detalhes da mesa */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Mesa {selectedTable?.number} - {selectedTable?.seats} lugares
          <IconButton
            onClick={() => setDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedTable && (
            <Box>
              {/* Status da mesa */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={selectedTable.status}
                      onChange={(e) => handleTableStatusChange(selectedTable.id, e.target.value as any)}
                    >
                      <MenuItem value="available">Livre</MenuItem>
                      <MenuItem value="occupied">Ocupada</MenuItem>
                      <MenuItem value="reserved">Reservada</MenuItem>
                      <MenuItem value="cleaning">Limpeza</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Garçom"
                    value={selectedTable.waiter || ''}
                    onChange={(e) => {
                      setOperationalTables(prev => prev.map(table =>
                        table.id === selectedTable.id ? { ...table, waiter: e.target.value } : table
                      ));
                    }}
                  />
                </Grid>
              </Grid>

              {/* Pedidos por cadeira */}
              <Typography variant="h6" gutterBottom>
                Pedidos por Cadeira
              </Typography>
              
              {selectedTable.orders && selectedTable.orders.length > 0 ? (
                <List>
                  {selectedTable.orders.map(order => (
                    <ListItem key={order.id} divider>
                      <ListItemText
                        primary={`Cadeira ${order.seatNumber} - ${order.customerName || 'Cliente'}`}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              {order.items.map(item => `${item.quantity}x ${item.productName}`).join(', ')}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                              <Chip
                                size="small"
                                label={
                                  order.status === 'pending' ? 'Pendente' :
                                  order.status === 'preparing' ? 'Preparando' :
                                  order.status === 'ready' ? 'Pronto' : 'Servido'
                                }
                                color={
                                  order.status === 'pending' ? 'warning' :
                                  order.status === 'preparing' ? 'info' :
                                  order.status === 'ready' ? 'success' : 'default'
                                }
                                variant="outlined"
                              />
                              <Typography variant="body2" fontWeight="bold">
                                {formatCurrency(order.total)}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="info">
                  Nenhum pedido registrado para esta mesa.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<OrderIcon />}
            onClick={() => setOrderDialogOpen(true)}
          >
            Novo Pedido
          </Button>
          <Button
            startIcon={<PaymentIcon />}
            variant="contained"
            disabled={!selectedTable?.orders?.length}
          >
            Fechar Conta
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de novo pedido */}
      <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Pedido - Mesa {selectedTable?.number}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Cadeira</InputLabel>
                <Select
                  value={newOrder.seatNumber}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, seatNumber: e.target.value as number }))}
                >
                  {Array.from({ length: selectedTable?.seats || 4 }, (_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>Cadeira {i + 1}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Nome do Cliente"
                value={newOrder.customerName}
                onChange={(e) => setNewOrder(prev => ({ ...prev, customerName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                Esta é uma versão simplificada. Na versão completa, você poderia selecionar produtos do cardápio.
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleAddOrder} variant="contained">Adicionar Pedido</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TableLayoutScreen;

