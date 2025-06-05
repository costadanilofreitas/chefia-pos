import React, { useState, useEffect } from 'react';
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
  Fab
} from '@mui/material';
import {
  TableRestaurant,
  Person,
  Refresh,
  Kitchen,
  DeliveryDining,
  Chair,
  Restaurant
} from '@mui/icons-material';

interface Table {
  id: string;
  number: number;
  seats: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  waiter?: string;
  customers?: number;
  orderValue?: number;
  startTime?: string;
  position: {
    x: number; // posição X no salão (em pixels)
    y: number; // posição Y no salão (em pixels)
  };
  shape: 'round' | 'square' | 'rectangle';
  area: 'main' | 'terrace' | 'vip' | 'bar';
}

const TableLayoutScreen: React.FC = () => {
  const { terminalId } = useParams<{ terminalId: string }>();
  const navigate = useNavigate();
  
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dimensões do salão (em pixels)
  const SALON_WIDTH = 800;
  const SALON_HEIGHT = 600;

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    setLoading(true);
    try {
      // Layout realista de um restaurante
      const mockTables: Table[] = [
        // Área Principal - Centro
        {
          id: '1',
          number: 1,
          seats: 4,
          status: 'occupied',
          waiter: 'João Silva',
          customers: 3,
          orderValue: 125.50,
          startTime: '19:30',
          position: { x: 150, y: 150 },
          shape: 'round',
          area: 'main'
        },
        {
          id: '2',
          number: 2,
          seats: 2,
          status: 'available',
          position: { x: 300, y: 150 },
          shape: 'square',
          area: 'main'
        },
        {
          id: '3',
          number: 3,
          seats: 6,
          status: 'reserved',
          waiter: 'Maria Santos',
          startTime: '20:00',
          position: { x: 450, y: 150 },
          shape: 'rectangle',
          area: 'main'
        },
        {
          id: '4',
          number: 4,
          seats: 4,
          status: 'cleaning',
          position: { x: 600, y: 150 },
          shape: 'round',
          area: 'main'
        },
        
        // Área Principal - Meio
        {
          id: '5',
          number: 5,
          seats: 8,
          status: 'occupied',
          waiter: 'Pedro Costa',
          customers: 6,
          orderValue: 340.80,
          startTime: '18:45',
          position: { x: 150, y: 300 },
          shape: 'rectangle',
          area: 'main'
        },
        {
          id: '6',
          number: 6,
          seats: 2,
          status: 'available',
          position: { x: 350, y: 300 },
          shape: 'square',
          area: 'main'
        },
        {
          id: '7',
          number: 7,
          seats: 4,
          status: 'available',
          position: { x: 500, y: 300 },
          shape: 'round',
          area: 'main'
        },
        {
          id: '8',
          number: 8,
          seats: 6,
          status: 'occupied',
          waiter: 'Ana Costa',
          customers: 4,
          orderValue: 180.30,
          startTime: '19:15',
          position: { x: 650, y: 300 },
          shape: 'rectangle',
          area: 'main'
        },

        // Área do Bar
        {
          id: '9',
          number: 9,
          seats: 2,
          status: 'available',
          position: { x: 100, y: 450 },
          shape: 'square',
          area: 'bar'
        },
        {
          id: '10',
          number: 10,
          seats: 2,
          status: 'occupied',
          waiter: 'Carlos Bar',
          customers: 2,
          orderValue: 85.60,
          startTime: '20:30',
          position: { x: 200, y: 450 },
          shape: 'square',
          area: 'bar'
        },

        // Área VIP - Canto
        {
          id: '11',
          number: 11,
          seats: 8,
          status: 'reserved',
          waiter: 'Lucia VIP',
          startTime: '21:00',
          position: { x: 550, y: 450 },
          shape: 'rectangle',
          area: 'vip'
        },
        {
          id: '12',
          number: 12,
          seats: 6,
          status: 'available',
          position: { x: 700, y: 450 },
          shape: 'round',
          area: 'vip'
        },

        // Terraço
        {
          id: '13',
          number: 13,
          seats: 4,
          status: 'available',
          position: { x: 150, y: 50 },
          shape: 'round',
          area: 'terrace'
        },
        {
          id: '14',
          number: 14,
          seats: 4,
          status: 'occupied',
          waiter: 'Roberto Terraço',
          customers: 3,
          orderValue: 95.40,
          startTime: '19:45',
          position: { x: 350, y: 50 },
          shape: 'round',
          area: 'terrace'
        },
        {
          id: '15',
          number: 15,
          seats: 6,
          status: 'available',
          position: { x: 550, y: 50 },
          shape: 'rectangle',
          area: 'terrace'
        }
      ];
      
      setTables(mockTables);
    } catch (error) {
      console.error('Erro ao carregar mesas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Table['status']) => {
    switch (status) {
      case 'available': return '#4CAF50'; // Verde
      case 'occupied': return '#F44336'; // Vermelho
      case 'reserved': return '#FF9800'; // Laranja
      case 'cleaning': return '#2196F3'; // Azul
      default: return '#9E9E9E';
    }
  };

  const getAreaColor = (area: Table['area']) => {
    switch (area) {
      case 'main': return '#f5f5f5';
      case 'terrace': return '#e8f5e8';
      case 'vip': return '#fff3e0';
      case 'bar': return '#e3f2fd';
      default: return '#f5f5f5';
    }
  };

  const getAreaLabel = (area: Table['area']) => {
    switch (area) {
      case 'main': return 'Salão Principal';
      case 'terrace': return 'Terraço';
      case 'vip': return 'Área VIP';
      case 'bar': return 'Bar';
      default: return area;
    }
  };

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
    setDialogOpen(true);
  };

  const handleTableAction = (action: string) => {
    if (!selectedTable) return;

    switch (action) {
      case 'occupy':
        updateTableStatus(selectedTable.id, 'occupied');
        break;
      case 'free':
        updateTableStatus(selectedTable.id, 'available');
        break;
      case 'reserve':
        updateTableStatus(selectedTable.id, 'reserved');
        break;
      case 'clean':
        updateTableStatus(selectedTable.id, 'cleaning');
        break;
      case 'order':
        navigate(`/pos/${terminalId}/waiter/table/${selectedTable.id}`);
        break;
    }
    setDialogOpen(false);
  };

  const updateTableStatus = (tableId: string, status: Table['status']) => {
    setTables(prev => prev.map(table => 
      table.id === tableId 
        ? { ...table, status, ...(status === 'available' ? { waiter: undefined, customers: undefined, orderValue: undefined, startTime: undefined } : {}) }
        : table
    ));
  };

  const renderTable = (table: Table) => {
    const tableSize = table.seats <= 2 ? 60 : table.seats <= 4 ? 80 : table.seats <= 6 ? 100 : 120;
    
    return (
      <Box
        key={table.id}
        sx={{
          position: 'absolute',
          left: table.position.x,
          top: table.position.y,
          width: table.shape === 'rectangle' ? tableSize * 1.5 : tableSize,
          height: table.shape === 'rectangle' ? tableSize * 0.8 : tableSize,
          borderRadius: table.shape === 'round' ? '50%' : table.shape === 'square' ? '8px' : '12px',
          backgroundColor: getStatusColor(table.status),
          border: '3px solid #333',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '14px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'scale(1.1)',
            boxShadow: '0 6px 12px rgba(0,0,0,0.4)',
            zIndex: 10
          }
        }}
        onClick={() => handleTableClick(table)}
      >
        <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '12px' }}>
          {table.number}
        </Typography>
        <Box display="flex" alignItems="center" mt={0.5}>
          <Chair sx={{ fontSize: '12px', mr: 0.5 }} />
          <Typography variant="caption" sx={{ fontSize: '10px' }}>
            {table.seats}
          </Typography>
        </Box>
        
        {/* Indicadores visuais das cadeiras */}
        {table.shape === 'round' && (
          <Box sx={{ position: 'absolute', width: '100%', height: '100%' }}>
            {Array.from({ length: table.seats }).map((_, index) => {
              const angle = (360 / table.seats) * index;
              const radius = tableSize / 2 + 15;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;
              
              return (
                <Box
                  key={index}
                  sx={{
                    position: 'absolute',
                    left: `calc(50% + ${x}px - 6px)`,
                    top: `calc(50% + ${y}px - 6px)`,
                    width: 12,
                    height: 12,
                    backgroundColor: '#8D6E63',
                    borderRadius: '2px',
                    border: '1px solid #5D4037'
                  }}
                />
              );
            })}
          </Box>
        )}
        
        {table.shape === 'rectangle' && (
          <Box sx={{ position: 'absolute', width: '100%', height: '100%' }}>
            {Array.from({ length: table.seats }).map((_, index) => {
              const isTop = index < table.seats / 2;
              const sideIndex = index % (table.seats / 2);
              const spacing = (tableSize * 1.5) / (table.seats / 2 + 1);
              
              return (
                <Box
                  key={index}
                  sx={{
                    position: 'absolute',
                    left: `${spacing * (sideIndex + 1) - 6}px`,
                    top: isTop ? '-18px' : `${tableSize * 0.8 + 6}px`,
                    width: 12,
                    height: 12,
                    backgroundColor: '#8D6E63',
                    borderRadius: '2px',
                    border: '1px solid #5D4037'
                  }}
                />
              );
            })}
          </Box>
        )}
        
        {table.shape === 'square' && (
          <Box sx={{ position: 'absolute', width: '100%', height: '100%' }}>
            {Array.from({ length: table.seats }).map((_, index) => {
              const positions = [
                { left: '-18px', top: '50%', transform: 'translateY(-50%)' }, // Esquerda
                { right: '-18px', top: '50%', transform: 'translateY(-50%)' }, // Direita
                { left: '50%', top: '-18px', transform: 'translateX(-50%)' }, // Cima
                { left: '50%', bottom: '-18px', transform: 'translateX(-50%)' } // Baixo
              ];
              
              return (
                <Box
                  key={index}
                  sx={{
                    position: 'absolute',
                    ...positions[index],
                    width: 12,
                    height: 12,
                    backgroundColor: '#8D6E63',
                    borderRadius: '2px',
                    border: '1px solid #5D4037'
                  }}
                />
              );
            })}
          </Box>
        )}
      </Box>
    );
  };

  const renderAreaLabel = (area: Table['area'], tables: Table[]) => {
    const areaTables = tables.filter(t => t.area === area);
    if (areaTables.length === 0) return null;

    // Calcular posição média da área
    const avgX = areaTables.reduce((sum, t) => sum + t.position.x, 0) / areaTables.length;
    const avgY = areaTables.reduce((sum, t) => sum + t.position.y, 0) / areaTables.length;

    return (
      <Box
        key={area}
        sx={{
          position: 'absolute',
          left: avgX - 50,
          top: avgY - 100,
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          pointerEvents: 'none',
          zIndex: 5
        }}
      >
        {getAreaLabel(area)}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Carregando layout do salão...</Typography>
      </Box>
    );
  }

  const areas = ['main', 'terrace', 'vip', 'bar'] as const;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Layout do Salão - Terminal {terminalId}
        </Typography>
        <Box>
          <Tooltip title="Atualizar">
            <IconButton onClick={loadTables} sx={{ mr: 1 }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<Kitchen />}
            onClick={() => navigate(`/pos/${terminalId}/kitchen`)}
            sx={{ mr: 1 }}
          >
            Cozinha
          </Button>
          <Button
            variant="outlined"
            startIcon={<DeliveryDining />}
            onClick={() => navigate(`/pos/${terminalId}/delivery`)}
          >
            Delivery
          </Button>
        </Box>
      </Box>

      {/* Estatísticas */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Mesas Livres
              </Typography>
              <Typography variant="h5" component="div" color="green">
                {tables.filter(t => t.status === 'available').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Mesas Ocupadas
              </Typography>
              <Typography variant="h5" component="div" color="red">
                {tables.filter(t => t.status === 'occupied').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Reservadas
              </Typography>
              <Typography variant="h5" component="div" color="orange">
                {tables.filter(t => t.status === 'reserved').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Faturamento
              </Typography>
              <Typography variant="h5" component="div">
                R$ {tables.filter(t => t.orderValue).reduce((sum, t) => sum + (t.orderValue || 0), 0).toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Legenda */}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <Box display="flex" alignItems="center">
          <Box sx={{ width: 20, height: 20, backgroundColor: '#4CAF50', mr: 1, borderRadius: '4px' }} />
          <Typography variant="body2">Livre</Typography>
        </Box>
        <Box display="flex" alignItems="center">
          <Box sx={{ width: 20, height: 20, backgroundColor: '#F44336', mr: 1, borderRadius: '4px' }} />
          <Typography variant="body2">Ocupada</Typography>
        </Box>
        <Box display="flex" alignItems="center">
          <Box sx={{ width: 20, height: 20, backgroundColor: '#FF9800', mr: 1, borderRadius: '4px' }} />
          <Typography variant="body2">Reservada</Typography>
        </Box>
        <Box display="flex" alignItems="center">
          <Box sx={{ width: 20, height: 20, backgroundColor: '#2196F3', mr: 1, borderRadius: '4px' }} />
          <Typography variant="body2">Limpeza</Typography>
        </Box>
      </Box>

      {/* Layout Visual do Salão */}
      <Paper 
        sx={{ 
          position: 'relative',
          width: SALON_WIDTH,
          height: SALON_HEIGHT,
          margin: '0 auto',
          backgroundColor: '#f8f8f8',
          border: '2px solid #333',
          overflow: 'hidden'
        }}
      >
        {/* Áreas do salão com cores de fundo */}
        {areas.map(area => {
          const areaTables = tables.filter(t => t.area === area);
          if (areaTables.length === 0) return null;
          
          const minX = Math.min(...areaTables.map(t => t.position.x)) - 50;
          const maxX = Math.max(...areaTables.map(t => t.position.x)) + 100;
          const minY = Math.min(...areaTables.map(t => t.position.y)) - 50;
          const maxY = Math.max(...areaTables.map(t => t.position.y)) + 100;
          
          return (
            <Box
              key={area}
              sx={{
                position: 'absolute',
                left: Math.max(0, minX),
                top: Math.max(0, minY),
                width: Math.min(SALON_WIDTH - Math.max(0, minX), maxX - Math.max(0, minX)),
                height: Math.min(SALON_HEIGHT - Math.max(0, minY), maxY - Math.max(0, minY)),
                backgroundColor: getAreaColor(area),
                opacity: 0.3,
                borderRadius: '8px',
                border: `1px dashed ${getAreaColor(area)}`,
                zIndex: 1
              }}
            />
          );
        })}

        {/* Labels das áreas */}
        {areas.map(area => renderAreaLabel(area, tables))}

        {/* Elementos fixos do salão */}
        {/* Entrada */}
        <Box
          sx={{
            position: 'absolute',
            left: SALON_WIDTH / 2 - 40,
            top: 0,
            width: 80,
            height: 20,
            backgroundColor: '#8D6E63',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold'
          }}
        >
          ENTRADA
        </Box>

        {/* Cozinha */}
        <Box
          sx={{
            position: 'absolute',
            right: 0,
            top: SALON_HEIGHT / 2 - 50,
            width: 40,
            height: 100,
            backgroundColor: '#FF5722',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
            writingMode: 'vertical-rl'
          }}
        >
          COZINHA
        </Box>

        {/* Bar */}
        <Box
          sx={{
            position: 'absolute',
            left: 50,
            bottom: 50,
            width: 200,
            height: 40,
            backgroundColor: '#795548',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            borderRadius: '20px'
          }}
        >
          BAR
        </Box>

        {/* Banheiros */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: 60,
            height: 60,
            backgroundColor: '#607D8B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold'
          }}
        >
          WC
        </Box>

        {/* Mesas */}
        {tables.map(renderTable)}
      </Paper>

      {/* Dialog de Ações da Mesa */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Mesa {selectedTable?.number} - {selectedTable?.area && getAreaLabel(selectedTable.area)}
        </DialogTitle>
        <DialogContent>
          {selectedTable && (
            <Box>
              <Typography variant="body1" mb={2}>
                Lugares: {selectedTable.seats} • Formato: {selectedTable.shape === 'round' ? 'Redonda' : selectedTable.shape === 'square' ? 'Quadrada' : 'Retangular'}
              </Typography>
              
              <Chip 
                label={selectedTable.status === 'available' ? 'Livre' : 
                       selectedTable.status === 'occupied' ? 'Ocupada' :
                       selectedTable.status === 'reserved' ? 'Reservada' : 'Limpeza'}
                color={selectedTable.status === 'available' ? 'success' : 
                       selectedTable.status === 'occupied' ? 'error' :
                       selectedTable.status === 'reserved' ? 'warning' : 'info'}
                sx={{ mb: 2 }}
              />
              
              {selectedTable.status === 'occupied' && (
                <Box mb={2}>
                  <Typography variant="body2">Garçom: {selectedTable.waiter}</Typography>
                  <Typography variant="body2">Clientes: {selectedTable.customers}</Typography>
                  <Typography variant="body2">Valor: R$ {selectedTable.orderValue?.toFixed(2)}</Typography>
                  <Typography variant="body2">Início: {selectedTable.startTime}</Typography>
                </Box>
              )}

              {selectedTable.status === 'reserved' && (
                <Box mb={2}>
                  <Typography variant="body2">Garçom: {selectedTable.waiter}</Typography>
                  <Typography variant="body2">Horário: {selectedTable.startTime}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Cancelar
          </Button>
          
          {selectedTable?.status === 'available' && (
            <>
              <Button onClick={() => handleTableAction('occupy')} color="error">
                Ocupar Mesa
              </Button>
              <Button onClick={() => handleTableAction('reserve')} color="warning">
                Reservar
              </Button>
            </>
          )}
          
          {selectedTable?.status === 'occupied' && (
            <>
              <Button onClick={() => handleTableAction('order')} color="primary" variant="contained">
                Ver Pedido
              </Button>
              <Button onClick={() => handleTableAction('free')} color="success">
                Liberar Mesa
              </Button>
            </>
          )}
          
          {selectedTable?.status === 'reserved' && (
            <>
              <Button onClick={() => handleTableAction('occupy')} color="error">
                Ocupar Mesa
              </Button>
              <Button onClick={() => handleTableAction('free')} color="success">
                Cancelar Reserva
              </Button>
            </>
          )}
          
          {selectedTable?.status === 'cleaning' && (
            <Button onClick={() => handleTableAction('free')} color="success">
              Limpeza Concluída
            </Button>
          )}
          
          <Button onClick={() => handleTableAction('clean')} color="info">
            Marcar Limpeza
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TableLayoutScreen;

