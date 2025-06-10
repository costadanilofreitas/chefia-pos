import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Paper,
  Fab,
  Badge
} from '@mui/material';
import {
  Add,
  Remove,
  Delete,
  TableRestaurant,
  Person,
  AttachMoney,
  Kitchen,
  Print,
  Send,
  ShoppingCart,
  Timer
} from '@mui/icons-material';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  preparationTime: number; // em minutos
}

interface OrderItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  observations?: string;
  unitPrice: number;
  totalPrice: number;
}

interface TableOrder {
  id: string;
  tableId: string;
  tableNumber: number;
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: 'draft' | 'sent' | 'preparing' | 'ready' | 'served';
  waiter: string;
  customers: number;
  createdAt: string;
  sentAt?: string;
  observations?: string;
}

const WaiterScreen: React.FC = () => {
  const { terminalId, tableId } = useParams<{ terminalId: string; tableId: string }>();
  const navigate = useNavigate();
  
  const [currentOrder, setCurrentOrder] = useState<TableOrder | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [itemDialog, setItemDialog] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMenuData();
    loadTableOrder();
  }, [tableId]);

  const loadMenuData = async () => {
    try {
      // Mock data do menu
      const mockMenu: MenuItem[] = [
        {
          id: '1',
          name: 'Pizza Margherita',
          description: 'Molho de tomate, mussarela, manjericão',
          price: 35.90,
          category: 'Pizzas',
          available: true,
          preparationTime: 25
        },
        {
          id: '2',
          name: 'Pizza Calabresa',
          description: 'Molho de tomate, mussarela, calabresa, cebola',
          price: 38.90,
          category: 'Pizzas',
          available: true,
          preparationTime: 25
        },
        {
          id: '3',
          name: 'Hambúrguer Artesanal',
          description: 'Pão brioche, blend 180g, queijo, alface, tomate',
          price: 28.90,
          category: 'Hambúrgueres',
          available: true,
          preparationTime: 15
        },
        {
          id: '4',
          name: 'Batata Frita',
          description: 'Porção individual de batata frita crocante',
          price: 12.90,
          category: 'Acompanhamentos',
          available: true,
          preparationTime: 10
        },
        {
          id: '5',
          name: 'Refrigerante 350ml',
          description: 'Coca-Cola, Guaraná, Fanta',
          price: 6.50,
          category: 'Bebidas',
          available: true,
          preparationTime: 2
        },
        {
          id: '6',
          name: 'Suco Natural',
          description: 'Laranja, limão, maracujá - 500ml',
          price: 8.90,
          category: 'Bebidas',
          available: true,
          preparationTime: 5
        },
        {
          id: '7',
          name: 'Salada Caesar',
          description: 'Alface americana, croutons, parmesão, molho caesar',
          price: 24.90,
          category: 'Saladas',
          available: true,
          preparationTime: 8
        }
      ];

      setMenuItems(mockMenu);
      
      const uniqueCategories = [...new Set(mockMenu.map(item => item.category))];
      setCategories(uniqueCategories);
      setSelectedCategory(uniqueCategories[0] || '');
      
    } catch (error) {
      console.error('Erro ao carregar menu:', error);
    }
  };

  const loadTableOrder = async () => {
    setLoading(true);
    try {
      // Verificar se já existe um pedido para esta mesa
      // Por enquanto, criar um novo pedido
      const newOrder: TableOrder = {
        id: `order-${Date.now()}`,
        tableId: tableId || '',
        tableNumber: parseInt(tableId || '1'),
        items: [],
        subtotal: 0,
        total: 0,
        status: 'draft',
        waiter: 'João Silva', // Mock - deveria vir do contexto de autenticação
        customers: 1,
        createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      
      setCurrentOrder(newOrder);
    } catch (error) {
      console.error('Erro ao carregar pedido da mesa:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (menuItem: MenuItem) => {
    setSelectedItem(menuItem);
    setQuantity(1);
    setObservations('');
    setItemDialog(true);
  };

  const confirmAddItem = () => {
    if (!selectedItem || !currentOrder) return;

    const orderItem: OrderItem = {
      id: `item-${Date.now()}`,
      menuItem: selectedItem,
      quantity,
      observations: observations || undefined,
      unitPrice: selectedItem.price,
      totalPrice: selectedItem.price * quantity
    };

    const updatedOrder = {
      ...currentOrder,
      items: [...currentOrder.items, orderItem]
    };

    // Recalcular totais
    const subtotal = updatedOrder.items.reduce((sum, item) => sum + item.totalPrice, 0);
    updatedOrder.subtotal = subtotal;
    updatedOrder.total = subtotal; // Por enquanto sem taxas adicionais

    setCurrentOrder(updatedOrder);
    setItemDialog(false);
  };

  const handleRemoveItem = (itemId: string) => {
    if (!currentOrder) return;

    const updatedOrder = {
      ...currentOrder,
      items: currentOrder.items.filter(item => item.id !== itemId)
    };

    // Recalcular totais
    const subtotal = updatedOrder.items.reduce((sum, item) => sum + item.totalPrice, 0);
    updatedOrder.subtotal = subtotal;
    updatedOrder.total = subtotal;

    setCurrentOrder(updatedOrder);
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (!currentOrder || newQuantity < 1) return;

    const updatedOrder = {
      ...currentOrder,
      items: currentOrder.items.map(item => 
        item.id === itemId 
          ? { ...item, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity }
          : item
      )
    };

    // Recalcular totais
    const subtotal = updatedOrder.items.reduce((sum, item) => sum + item.totalPrice, 0);
    updatedOrder.subtotal = subtotal;
    updatedOrder.total = subtotal;

    setCurrentOrder(updatedOrder);
  };

  const handleSendOrder = () => {
    if (!currentOrder || currentOrder.items.length === 0) return;

    const updatedOrder = {
      ...currentOrder,
      status: 'sent' as const,
      sentAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setCurrentOrder(updatedOrder);
    
    // Aqui seria enviado para a cozinha/KDS
    console.log('Pedido enviado para a cozinha:', updatedOrder);
    
    // Navegar de volta para o layout das mesas
    navigate(`/pos/${terminalId}/tables`);
  };

  const filteredMenuItems = menuItems.filter(item => 
    selectedCategory ? item.category === selectedCategory : true
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Carregando pedido da mesa...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" component="h1">
          Mesa {currentOrder?.tableNumber} - Pedido
        </Typography>
        <Box>
          <Button
            variant="outlined"
            onClick={() => navigate(`/pos/${terminalId}/tables`)}
            sx={{ mr: 1 }}
          >
            Voltar às Mesas
          </Button>
          <Badge badgeContent={currentOrder?.items.length || 0} color="primary">
            <ShoppingCart />
          </Badge>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ flexGrow: 1 }}>
        {/* Menu */}
        <Grid item xs={12} md={8}>
          {/* Categorias */}
          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(category => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Itens do Menu */}
          <Grid container spacing={2}>
            {filteredMenuItems.map(item => (
              <Grid item xs={12} sm={6} md={4} key={item.id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 4 },
                    opacity: item.available ? 1 : 0.5
                  }}
                  onClick={() => item.available && handleAddItem(item)}
                >
                  <CardContent>
                    <Typography variant="h6" component="div" noWrap>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {item.description}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" color="primary">
                        R$ {item.price.toFixed(2)}
                      </Typography>
                      <Box display="flex" alignItems="center">
                        <Timer fontSize="small" sx={{ mr: 0.5 }} />
                        <Typography variant="caption">
                          {item.preparationTime}min
                        </Typography>
                      </Box>
                    </Box>
                    {!item.available && (
                      <Chip label="Indisponível" color="error" size="small" sx={{ mt: 1 }} />
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Pedido Atual */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" mb={2}>
              Pedido Atual
            </Typography>

            {currentOrder?.items.length === 0 ? (
              <Box 
                display="flex" 
                flexDirection="column" 
                alignItems="center" 
                justifyContent="center"
                flexGrow={1}
                color="text.secondary"
              >
                <ShoppingCart sx={{ fontSize: 48, mb: 2 }} />
                <Typography>Nenhum item adicionado</Typography>
              </Box>
            ) : (
              <>
                <List sx={{ flexGrow: 1, overflow: 'auto' }}>
                  {currentOrder?.items.map(item => (
                    <ListItem key={item.id} divider>
                      <ListItemText
                        primary={item.menuItem.name}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              R$ {item.unitPrice.toFixed(2)} x {item.quantity}
                            </Typography>
                            {item.observations && (
                              <Typography variant="caption" color="text.secondary">
                                Obs: {item.observations}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box display="flex" alignItems="center">
                          <IconButton 
                            size="small"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          >
                            <Remove />
                          </IconButton>
                          <Typography sx={{ mx: 1 }}>
                            {item.quantity}
                          </Typography>
                          <IconButton 
                            size="small"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            <Add />
                          </IconButton>
                          <IconButton 
                            size="small"
                            color="error"
                            onClick={() => handleRemoveItem(item.id)}
                            sx={{ ml: 1 }}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                        <Typography variant="body2" fontWeight="bold">
                          R$ {item.totalPrice.toFixed(2)}
                        </Typography>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>

                <Divider sx={{ my: 2 }} />
                
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Subtotal:</Typography>
                    <Typography>R$ {currentOrder?.subtotal.toFixed(2)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography variant="h6">Total:</Typography>
                    <Typography variant="h6">R$ {currentOrder?.total.toFixed(2)}</Typography>
                  </Box>
                  
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<Send />}
                    onClick={handleSendOrder}
                    disabled={currentOrder?.items.length === 0}
                  >
                    Enviar Pedido
                  </Button>
                </Box>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Dialog para adicionar item */}
      <Dialog open={itemDialog} onClose={() => setItemDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Adicionar {selectedItem?.name}
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {selectedItem.description}
              </Typography>
              <Typography variant="h6" color="primary" mb={3}>
                R$ {selectedItem.price.toFixed(2)}
              </Typography>
              
              <Box display="flex" alignItems="center" mb={3}>
                <Typography sx={{ mr: 2 }}>Quantidade:</Typography>
                <IconButton onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                  <Remove />
                </IconButton>
                <Typography sx={{ mx: 2, minWidth: 30, textAlign: 'center' }}>
                  {quantity}
                </Typography>
                <IconButton onClick={() => setQuantity(quantity + 1)}>
                  <Add />
                </IconButton>
              </Box>

              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Ex: sem cebola, ponto da carne, etc."
              />

              <Box mt={2}>
                <Typography variant="h6">
                  Total: R$ {(selectedItem.price * quantity).toFixed(2)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemDialog(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmAddItem} variant="contained">
            Adicionar ao Pedido
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WaiterScreen;

