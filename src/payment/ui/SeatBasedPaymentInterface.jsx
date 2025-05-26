import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  IconButton,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Table as TableIcon,
  Chair as ChairIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  Group as GroupIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  FastfoodOutlined as FoodIcon
} from '@mui/icons-material';

// Componente para representar um assento visualmente
const SeatComponent = ({ seat, selected, onClick, onEdit, onDelete, onAssignItem, items = [] }) => {
  const hasItems = items.length > 0;
  
  return (
    <Box
      sx={{
        position: 'relative',
        width: 80,
        height: 80,
        m: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid',
        borderColor: selected ? 'primary.main' : (seat.status === 'occupied' ? 'error.main' : 'grey.400'),
        borderRadius: '8px',
        bgcolor: selected ? 'primary.light' : (seat.status === 'occupied' ? 'error.light' : 'background.paper'),
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'scale(1.05)',
          boxShadow: 2
        }
      }}
      onClick={() => onClick(seat)}
    >
      <ChairIcon color={selected ? 'primary' : (seat.status === 'occupied' ? 'error' : 'action')} />
      <Typography variant="caption" align="center" sx={{ mt: 0.5 }}>
        {seat.name || `Assento ${seat.number}`}
      </Typography>
      
      {hasItems && (
        <Chip
          size="small"
          icon={<FoodIcon />}
          label={items.length}
          color="secondary"
          sx={{ position: 'absolute', top: -8, right: -8, height: 20 }}
        />
      )}
      
      <Box sx={{ position: 'absolute', bottom: -10, right: -10, display: 'flex' }}>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(seat); }}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(seat); }}>
          <DeleteIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onAssignItem(seat); }}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

// Componente principal para gerenciamento de assentos e pagamentos
const SeatBasedPaymentInterface = ({ tableId, orderId, orderItems = [], orderTotal, onComplete }) => {
  // Estado para assentos
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [seatItems, setSeatItems] = useState({});
  
  // Estado para diálogos
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignItemDialogOpen, setAssignItemDialogOpen] = useState(false);
  const [createSeatDialogOpen, setCreateSeatDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  
  // Estado para formulários
  const [editSeatName, setEditSeatName] = useState('');
  const [editSeatStatus, setEditSeatStatus] = useState('available');
  const [newSeatNumber, setNewSeatNumber] = useState('');
  const [newSeatName, setNewSeatName] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedItemQuantity, setSelectedItemQuantity] = useState(1);
  
  // Estado para pagamento
  const [paymentSession, setPaymentSession] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [customerName, setCustomerName] = useState('');
  
  // Estado para notificações
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Estado para carregamento
  const [loading, setLoading] = useState(false);
  
  // Carregar assentos ao montar
  useEffect(() => {
    if (tableId) {
      loadSeats();
    }
  }, [tableId]);
  
  // Carregar ou criar sessão de pagamento
  useEffect(() => {
    if (orderId && orderTotal) {
      initializePaymentSession();
    }
  }, [orderId, orderTotal]);
  
  // Funções auxiliares
  const showNotification = (message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };
  
  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };
  
  // Funções para carregar dados
  const loadSeats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/payment/seats/table/${tableId}`);
      const data = await response.json();
      
      setSeats(data.seats || []);
      
      // Carregar itens para cada assento
      const itemsMap = {};
      for (const seat of data.seats || []) {
        await loadSeatItems(seat.id, itemsMap);
      }
      
      setSeatItems(itemsMap);
    } catch (error) {
      console.error('Erro ao carregar assentos:', error);
      showNotification('Erro ao carregar assentos', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const loadSeatItems = async (seatId, itemsMap = {}) => {
    try {
      const response = await fetch(`/api/payment/seats/${seatId}/items`);
      const data = await response.json();
      
      itemsMap[seatId] = data.items || [];
      return data.items || [];
    } catch (error) {
      console.error(`Erro ao carregar itens do assento ${seatId}:`, error);
      return [];
    }
  };
  
  const initializePaymentSession = async () => {
    setLoading(true);
    try {
      // Verificar se já existe uma sessão para este pedido
      const response = await fetch(`/api/payment/partial/sessions/order/${orderId}`);
      const data = await response.json();
      
      if (data.sessions && data.sessions.length > 0) {
        // Usar a sessão existente
        setPaymentSession(data.sessions[0]);
      } else {
        // Criar nova sessão
        const createResponse = await fetch('/api/payment/partial/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order_id: orderId,
            total_amount: orderTotal
          }),
        });
        
        const createData = await createResponse.json();
        setPaymentSession(createData.session);
      }
    } catch (error) {
      console.error('Erro ao inicializar sessão:', error);
      showNotification('Erro ao inicializar sessão de pagamento', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Funções para gerenciar assentos
  const handleSeatClick = (seat) => {
    setSelectedSeat(seat);
  };
  
  const handleEditSeat = (seat) => {
    setSelectedSeat(seat);
    setEditSeatName(seat.name || '');
    setEditSeatStatus(seat.status);
    setEditDialogOpen(true);
  };
  
  const handleDeleteSeat = (seat) => {
    setSelectedSeat(seat);
    setDeleteDialogOpen(true);
  };
  
  const handleAssignItem = (seat) => {
    setSelectedSeat(seat);
    setSelectedItems([]);
    setSelectedItemQuantity(1);
    setAssignItemDialogOpen(true);
  };
  
  const handleCreateSeat = () => {
    setNewSeatNumber('');
    setNewSeatName('');
    setCreateSeatDialogOpen(true);
  };
  
  const handlePaySeat = (seat) => {
    setSelectedSeat(seat);
    setPaymentMethod('pix');
    setCustomerName('');
    setPaymentDialogOpen(true);
  };
  
  // Funções para salvar alterações
  const saveSeatEdit = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/payment/seats/${selectedSeat.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editSeatName,
          status: editSeatStatus
        }),
      });
      
      const data = await response.json();
      
      // Atualizar lista de assentos
      setSeats(seats.map(s => s.id === selectedSeat.id ? data.seat : s));
      
      showNotification('Assento atualizado com sucesso', 'success');
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar assento:', error);
      showNotification('Erro ao atualizar assento', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const confirmDeleteSeat = async () => {
    setLoading(true);
    try {
      await fetch(`/api/payment/seats/${selectedSeat.id}`, {
        method: 'DELETE'
      });
      
      // Atualizar lista de assentos
      setSeats(seats.filter(s => s.id !== selectedSeat.id));
      
      // Remover itens do assento
      const newSeatItems = { ...seatItems };
      delete newSeatItems[selectedSeat.id];
      setSeatItems(newSeatItems);
      
      showNotification('Assento removido com sucesso', 'success');
      setDeleteDialogOpen(false);
      
      if (selectedSeat.id === selectedSeat?.id) {
        setSelectedSeat(null);
      }
    } catch (error) {
      console.error('Erro ao remover assento:', error);
      showNotification('Erro ao remover assento', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const createNewSeat = async () => {
    if (!newSeatNumber) {
      showNotification('Informe o número do assento', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/payment/seats/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table_id: tableId,
          number: parseInt(newSeatNumber),
          name: newSeatName || `Assento ${newSeatNumber}`,
          status: 'available'
        }),
      });
      
      const data = await response.json();
      
      // Atualizar lista de assentos
      setSeats([...seats, data.seat]);
      
      // Inicializar lista de itens vazia para o novo assento
      setSeatItems({
        ...seatItems,
        [data.seat.id]: []
      });
      
      showNotification('Assento criado com sucesso', 'success');
      setCreateSeatDialogOpen(false);
    } catch (error) {
      console.error('Erro ao criar assento:', error);
      showNotification('Erro ao criar assento', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const assignItemToSeat = async () => {
    if (!selectedItems.length) {
      showNotification('Selecione pelo menos um item', 'error');
      return;
    }
    
    setLoading(true);
    try {
      // Associar cada item selecionado ao assento
      for (const itemId of selectedItems) {
        await fetch('/api/payment/seats/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order_item_id: itemId,
            seat_id: selectedSeat.id,
            quantity: selectedItemQuantity
          }),
        });
      }
      
      // Recarregar itens do assento
      const items = await loadSeatItems(selectedSeat.id);
      
      // Atualizar estado
      setSeatItems({
        ...seatItems,
        [selectedSeat.id]: items
      });
      
      showNotification('Itens associados com sucesso', 'success');
      setAssignItemDialogOpen(false);
    } catch (error) {
      console.error('Erro ao associar itens:', error);
      showNotification('Erro ao associar itens', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const paySeat = async () => {
    if (!paymentSession) {
      showNotification('Sessão de pagamento não inicializada', 'error');
      return;
    }
    
    setLoading(true);
    try {
      // Calcular valor total dos itens do assento
      const seatTotal = calculateSeatTotal(selectedSeat.id);
      
      if (seatTotal <= 0) {
        showNotification('Não há itens para pagar neste assento', 'error');
        setLoading(false);
        return;
      }
      
      // Criar divisão por assento
      const splitResponse = await fetch('/api/payment/seats/split', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: paymentSession.id,
          seat_ids: [selectedSeat.id],
          include_shared_items: true
        }),
      });
      
      const splitData = await splitResponse.json();
      
      // Pagar a parte correspondente ao assento
      const partId = splitData.parts[0].id;
      
      const paymentResponse = await fetch(`/api/payment/partial/splits/parts/${partId}/pay?method=${paymentMethod}&customer_name=${encodeURIComponent(customerName || selectedSeat.name || '')}`, {
        method: 'POST'
      });
      
      const paymentData = await paymentResponse.json();
      
      // Atualizar sessão de pagamento
      setPaymentSession(paymentData.session);
      
      showNotification('Pagamento registrado com sucesso!', 'success');
      
      // Se o pagamento completou o valor total, notificar
      if (paymentData.session.remaining_amount <= 0) {
        showNotification('Pagamento concluído! Conta fechada.', 'success');
        if (onComplete) {
          onComplete();
        }
      }
      
      setPaymentDialogOpen(false);
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      showNotification('Erro ao processar pagamento', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Função para calcular o valor total dos itens de um assento
  const calculateSeatTotal = (seatId) => {
    const items = seatItems[seatId] || [];
    
    // Esta é uma implementação simplificada
    // Em um cenário real, seria necessário buscar os preços dos itens
    // e calcular com base na quantidade
    
    // Por enquanto, vamos assumir um valor fixo por item
    return items.length * 10.0;
  };
  
  // Função para criar pagamento em grupo
  const createGroupPayment = async () => {
    if (!selectedSeat || !paymentSession) {
      showNotification('Selecione um assento e verifique a sessão de pagamento', 'error');
      return;
    }
    
    setLoading(true);
    try {
      // Criar grupo com todos os assentos
      const groupResponse = await fetch('/api/payment/seats/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Grupo de Pagamento',
          seat_ids: seats.map(s => s.id)
        }),
      });
      
      const groupData = await groupResponse.json();
      
      // Criar divisão igualitária
      const splitResponse = await fetch('/api/payment/partial/splits/equal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: paymentSession.id,
          number_of_parts: seats.length,
          names: seats.map(s => s.name || `Assento ${s.number}`)
        }),
      });
      
      const splitData = await splitResponse.json();
      
      showNotification('Divisão de pagamento criada com sucesso!', 'success');
      
      // Redirecionar para interface de pagamento parcial
      // Esta parte depende da integração com o componente PartialPaymentInterface
      
    } catch (error) {
      console.error('Erro ao criar pagamento em grupo:', error);
      showNotification('Erro ao criar pagamento em grupo', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Renderização principal
  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ mb: 2, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Typography variant="h6">
              Gerenciamento de Assentos e Pagamentos
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleCreateSeat}
              sx={{ mr: 1 }}
            >
              Novo Assento
            </Button>
            <Button
              variant="outlined"
              startIcon={<GroupIcon />}
              onClick={createGroupPayment}
              disabled={!seats.length || !paymentSession}
            >
              Pagamento em Grupo
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Assentos da Mesa
            </Typography>
            
            {loading && !seats.length ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : seats.length === 0 ? (
              <Typography variant="body1" sx={{ textAlign: 'center', my: 3, color: 'text.secondary' }}>
                Nenhum assento cadastrado para esta mesa
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
                {seats.map((seat) => (
                  <SeatComponent
                    key={seat.id}
                    seat={seat}
                    selected={selectedSeat?.id === seat.id}
                    onClick={handleSeatClick}
                    onEdit={handleEditSeat}
                    onDelete={handleDeleteSeat}
                    onAssignItem={handleAssignItem}
                    items={seatItems[seat.id] || []}
                  />
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            {selectedSeat ? (
              <>
                <Typography variant="h6" gutterBottom>
                  {selectedSeat.name || `Assento ${selectedSeat.number}`}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={selectedSeat.status === 'available' ? 'Disponível' : 
                           selectedSeat.status === 'occupied' ? 'Ocupado' : 'Reservado'}
                    color={selectedSeat.status === 'available' ? 'success' : 
                           selectedSeat.status === 'occupied' ? 'error' : 'warning'}
                    variant="outlined"
                    sx={{ mr: 1 }}
                  />
                </Box>
                
                <Typography variant="subtitle1" gutterBottom>
                  Itens do Assento
                </Typography>
                
                {(seatItems[selectedSeat.id] || []).length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    Nenhum item associado a este assento
                  </Typography>
                ) : (
                  <List dense>
                    {(seatItems[selectedSeat.id] || []).map((item) => (
                      <ListItem key={item.id}>
                        <ListItemText
                          primary={`Item ${item.order_item_id}`}
                          secondary={`Quantidade: ${item.quantity}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end" aria-label="delete" onClick={() => {
                            // Implementar remoção de item
                          }}>
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1">
                    Total do Assento: R$ {calculateSeatTotal(selectedSeat.id).toFixed(2)}
                  </Typography>
                  
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PaymentIcon />}
                    onClick={() => handlePaySeat(selectedSeat)}
                    disabled={!paymentSession || (seatItems[selectedSeat.id] || []).length === 0}
                  >
                    Pagar
                  </Button>
                </Box>
              </>
            ) : (
              <Typography variant="body1" sx={{ textAlign: 'center', my: 3, color: 'text.secondary' }}>
                Selecione um assento para ver detalhes
              </Typography>
            )}
          </Paper>
          
          {paymentSession && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Resumo do Pagamento
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Valor Total:</strong> R$ {paymentSession.total_amount.toFixed(2)}
                </Typography>
                
                <Typography variant="body1" gutterBottom>
                  <strong>Valor Pago:</strong> R$ {paymentSession.paid_amount.toFixed(2)}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="body1" color={paymentSession.remaining_amount > 0 ? 'error' : 'success'}>
                  <strong>Valor Restante:</strong> R$ {paymentSession.remaining_amount.toFixed(2)}
                </Typography>
                
                {paymentSession.remaining_amount <= 0 && (
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <Chip
                      icon={<CheckIcon />}
                      label="Pagamento Concluído"
                      color="success"
                      variant="outlined"
                    />
                  </Box>
                )}
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>
      
      {/* Diálogo de edição de assento */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Editar Assento</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nome do Assento"
            type="text"
            fullWidth
            value={editSeatName}
            onChange={(e) => setEditSeatName(e.target.value)}
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel id="seat-status-label">Status</InputLabel>
            <Select
              labelId="seat-status-label"
              value={editSeatStatus}
              onChange={(e) => setEditSeatStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="available">Disponível</MenuItem>
              <MenuItem value="occupied">Ocupado</MenuItem>
              <MenuItem value="reserved">Reservado</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
          <Button onClick={saveSeatEdit} variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o assento {selectedSeat?.name || `#${selectedSeat?.number}`}?
          </Typography>
          {(seatItems[selectedSeat?.id] || []).length > 0 && (
            <Typography color="error" sx={{ mt: 2 }}>
              Atenção: Este assento possui itens associados que serão removidos.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={confirmDeleteSeat} variant="contained" color="error" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de criação de assento */}
      <Dialog open={createSeatDialogOpen} onClose={() => setCreateSeatDialogOpen(false)}>
        <DialogTitle>Novo Assento</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Número do Assento"
            type="number"
            fullWidth
            value={newSeatNumber}
            onChange={(e) => setNewSeatNumber(e.target.value)}
            InputProps={{ inputProps: { min: 1 } }}
          />
          
          <TextField
            margin="dense"
            label="Nome do Assento (opcional)"
            type="text"
            fullWidth
            value={newSeatName}
            onChange={(e) => setNewSeatName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateSeatDialogOpen(false)}>Cancelar</Button>
          <Button onClick={createNewSeat} variant="contained" color="primary" disabled={loading || !newSeatNumber}>
            {loading ? <CircularProgress size={24} /> : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de associação de itens */}
      <Dialog open={assignItemDialogOpen} onClose={() => setAssignItemDialogOpen(false)}>
        <DialogTitle>Associar Itens ao Assento</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            Assento: {selectedSeat?.name || `#${selectedSeat?.number}`}
          </Typography>
          
          <FormControl fullWidth margin="normal">
            <InputLabel id="items-label">Itens do Pedido</InputLabel>
            <Select
              labelId="items-label"
              multiple
              value={selectedItems}
              onChange={(e) => setSelectedItems(e.target.value)}
              label="Itens do Pedido"
            >
              {orderItems.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name || `Item #${item.id}`} - R$ {item.price?.toFixed(2) || '0.00'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            margin="dense"
            label="Quantidade"
            type="number"
            fullWidth
            value={selectedItemQuantity}
            onChange={(e) => setSelectedItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            InputProps={{ inputProps: { min: 1 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignItemDialogOpen(false)}>Cancelar</Button>
          <Button onClick={assignItemToSeat} variant="contained" color="primary" disabled={loading || selectedItems.length === 0}>
            {loading ? <CircularProgress size={24} /> : 'Associar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de pagamento */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)}>
        <DialogTitle>Pagamento do Assento</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            Assento: {selectedSeat?.name || `#${selectedSeat?.number}`}
          </Typography>
          
          <Typography variant="body1" gutterBottom>
            <strong>Valor a Pagar:</strong> R$ {selectedSeat ? calculateSeatTotal(selectedSeat.id).toFixed(2) : '0.00'}
          </Typography>
          
          <FormControl fullWidth margin="normal">
            <InputLabel id="payment-method-label">Método de Pagamento</InputLabel>
            <Select
              labelId="payment-method-label"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              label="Método de Pagamento"
            >
              <MenuItem value="pix">PIX</MenuItem>
              <MenuItem value="credit_card">Cartão de Crédito</MenuItem>
              <MenuItem value="debit_card">Cartão de Débito</MenuItem>
              <MenuItem value="cash">Dinheiro</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            margin="dense"
            label="Nome do Cliente (opcional)"
            type="text"
            fullWidth
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancelar</Button>
          <Button onClick={paySeat} variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Confirmar Pagamento'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notificações */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SeatBasedPaymentInterface;
