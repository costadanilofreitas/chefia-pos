import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Paper, Typography, Button, CircularProgress, 
  Tabs, Tab, Divider, IconButton, Tooltip, 
  List, ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Switch, FormControlLabel, Alert, Snackbar
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Map as MapIcon, MyLocation, Route, GroupWork, 
  DirectionsBike, DirectionsCar, DirectionsWalk,
  Add, Delete, Edit, Refresh, Save, Close,
  CheckCircle, Cancel, Warning, Info
} from '@mui/icons-material';

// Componente para o mapa do Google Maps
const MapContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '500px',
  marginBottom: theme.spacing(2),
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden'
}));

// Componente para o painel de controle
const ControlPanel = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2)
}));

// Componente para a lista de entregas
const DeliveryList = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  maxHeight: '400px',
  overflow: 'auto'
}));

// Componente para o item de entrega
const DeliveryItem = styled(ListItem)(({ theme, status }) => ({
  marginBottom: theme.spacing(1),
  borderLeft: `4px solid ${
    status === 'delivered' ? theme.palette.success.main :
    status === 'in_transit' ? theme.palette.info.main :
    status === 'pending' ? theme.palette.warning.main :
    status === 'cancelled' ? theme.palette.error.main :
    theme.palette.grey[500]
  }`,
  backgroundColor: theme.palette.background.paper,
  '&:hover': {
    backgroundColor: theme.palette.action.hover
  }
}));

/**
 * Componente para gerenciamento de entregas com Google Maps
 */
const DeliveryMapManager = ({ apiKey }) => {
  // Referência para o elemento do mapa
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  
  // Estados para controle do mapa
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [deliveries, setDeliveries] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRouteDialog, setShowRouteDialog] = useState(false);
  const [optimizationMode, setOptimizationMode] = useState('time');
  const [transportMode, setTransportMode] = useState('driving');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  
  // Efeito para carregar o script do Google Maps
  useEffect(() => {
    if (!apiKey) {
      setMapError('API key is required');
      return;
    }
    
    // Função para carregar o script do Google Maps
    const loadGoogleMapsScript = () => {
      // Verificar se o script já foi carregado
      if (window.google && window.google.maps) {
        initializeMap();
        return;
      }
      
      // Criar script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=initGoogleMap`;
      script.async = true;
      script.defer = true;
      
      // Definir callback global
      window.initGoogleMap = () => {
        initializeMap();
      };
      
      // Manipulador de erro
      script.onerror = () => {
        setMapError('Failed to load Google Maps');
        setMapLoaded(false);
      };
      
      // Adicionar script ao documento
      document.head.appendChild(script);
    };
    
    // Função para inicializar o mapa
    const initializeMap = () => {
      if (!mapRef.current) return;
      
      try {
        // Criar mapa
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: -23.5505, lng: -46.6333 }, // São Paulo
          zoom: 12,
          mapTypeId: 'roadmap',
          fullscreenControl: true,
          streetViewControl: true,
          mapTypeControl: true
        });
        
        // Salvar referência do mapa
        googleMapRef.current = map;
        
        // Marcar como carregado
        setMapLoaded(true);
        
        // Carregar dados iniciais
        loadInitialData();
      } catch (error) {
        console.error('Error initializing map:', error);
        setMapError('Error initializing map');
        setMapLoaded(false);
      }
    };
    
    // Carregar script
    loadGoogleMapsScript();
    
    // Cleanup
    return () => {
      // Remover callback global
      if (window.initGoogleMap) {
        delete window.initGoogleMap;
      }
    };
  }, [apiKey]);
  
  // Função para carregar dados iniciais
  const loadInitialData = async () => {
    setIsLoading(true);
    
    try {
      // Em produção, substituir por chamadas reais à API
      // Simular carregamento de dados
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dados de exemplo
      const mockDeliveries = [
        {
          id: 'd1',
          order_id: 'order-123',
          customer_name: 'João Silva',
          address: 'Av. Paulista, 1000, São Paulo',
          status: 'pending',
          estimated_delivery_time: '2025-05-25T22:30:00',
          location: { lat: -23.5629, lng: -46.6544 }
        },
        {
          id: 'd2',
          order_id: 'order-124',
          customer_name: 'Maria Souza',
          address: 'Rua Augusta, 500, São Paulo',
          status: 'in_transit',
          estimated_delivery_time: '2025-05-25T22:15:00',
          location: { lat: -23.5529, lng: -46.6426 }
        },
        {
          id: 'd3',
          order_id: 'order-125',
          customer_name: 'Pedro Santos',
          address: 'Rua Oscar Freire, 200, São Paulo',
          status: 'delivered',
          estimated_delivery_time: '2025-05-25T21:45:00',
          actual_delivery_time: '2025-05-25T21:40:00',
          location: { lat: -23.5616, lng: -46.6709 }
        }
      ];
      
      const mockCouriers = [
        {
          id: 'c1',
          name: 'Carlos Oliveira',
          vehicle_type: 'motorcycle',
          status: 'available',
          current_location: { lat: -23.5505, lng: -46.6333 }
        },
        {
          id: 'c2',
          name: 'Ana Pereira',
          vehicle_type: 'bicycle',
          status: 'busy',
          current_location: { lat: -23.5529, lng: -46.6426 }
        }
      ];
      
      const mockRoutes = [
        {
          id: 'r1',
          courier_id: 'c2',
          status: 'in_progress',
          orders: ['order-124'],
          estimated_start_time: '2025-05-25T21:45:00',
          estimated_end_time: '2025-05-25T22:15:00',
          polyline: 'fj~nCnfx{G...'
        }
      ];
      
      // Atualizar estados
      setDeliveries(mockDeliveries);
      setCouriers(mockCouriers);
      setRoutes(mockRoutes);
      
      // Adicionar marcadores ao mapa
      if (googleMapRef.current) {
        // Adicionar marcadores de entregas
        mockDeliveries.forEach(delivery => {
          const marker = new window.google.maps.Marker({
            position: delivery.location,
            map: googleMapRef.current,
            title: `${delivery.customer_name} - ${delivery.address}`,
            icon: {
              url: getMarkerIconByStatus(delivery.status),
              scaledSize: new window.google.maps.Size(30, 30)
            }
          });
          
          // Adicionar info window
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div>
                <h3>${delivery.customer_name}</h3>
                <p>${delivery.address}</p>
                <p>Status: ${delivery.status}</p>
                <p>Entrega estimada: ${formatDateTime(delivery.estimated_delivery_time)}</p>
              </div>
            `
          });
          
          // Adicionar evento de clique
          marker.addListener('click', () => {
            infoWindow.open(googleMapRef.current, marker);
            setSelectedDelivery(delivery);
          });
        });
        
        // Adicionar marcadores de entregadores
        mockCouriers.forEach(courier => {
          const marker = new window.google.maps.Marker({
            position: courier.current_location,
            map: googleMapRef.current,
            title: `${courier.name} - ${courier.vehicle_type}`,
            icon: {
              url: getCourierIconByVehicle(courier.vehicle_type),
              scaledSize: new window.google.maps.Size(30, 30)
            }
          });
          
          // Adicionar info window
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div>
                <h3>${courier.name}</h3>
                <p>Veículo: ${courier.vehicle_type}</p>
                <p>Status: ${courier.status}</p>
              </div>
            `
          });
          
          // Adicionar evento de clique
          marker.addListener('click', () => {
            infoWindow.open(googleMapRef.current, marker);
            setSelectedCourier(courier);
          });
        });
        
        // Desenhar rotas
        mockRoutes.forEach(route => {
          // Em produção, decodificar o polyline real
          // Aqui estamos usando pontos de exemplo
          const routePath = [
            { lat: -23.5505, lng: -46.6333 },
            { lat: -23.5529, lng: -46.6426 },
            { lat: -23.5616, lng: -46.6709 }
          ];
          
          const polyline = new window.google.maps.Polyline({
            path: routePath,
            geodesic: true,
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 3
          });
          
          polyline.setMap(googleMapRef.current);
        });
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      setNotification({
        open: true,
        message: 'Erro ao carregar dados iniciais',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função para obter ícone de marcador por status
  const getMarkerIconByStatus = (status) => {
    switch (status) {
      case 'delivered':
        return 'https://maps.google.com/mapfiles/ms/icons/green-dot.png';
      case 'in_transit':
        return 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png';
      case 'pending':
        return 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
      case 'cancelled':
        return 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
      default:
        return 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png';
    }
  };
  
  // Função para obter ícone de entregador por tipo de veículo
  const getCourierIconByVehicle = (vehicleType) => {
    switch (vehicleType) {
      case 'motorcycle':
        return 'https://maps.google.com/mapfiles/ms/icons/motorcycling.png';
      case 'bicycle':
        return 'https://maps.google.com/mapfiles/ms/icons/cycling.png';
      case 'car':
        return 'https://maps.google.com/mapfiles/ms/icons/cabs.png';
      default:
        return 'https://maps.google.com/mapfiles/ms/icons/man.png';
    }
  };
  
  // Função para formatar data e hora
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    
    const date = new Date(dateTimeStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Manipulador para mudança de tab
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };
  
  // Manipulador para criar nova rota
  const handleCreateRoute = () => {
    setShowRouteDialog(true);
  };
  
  // Manipulador para fechar diálogo de rota
  const handleCloseRouteDialog = () => {
    setShowRouteDialog(false);
  };
  
  // Manipulador para salvar rota
  const handleSaveRoute = () => {
    // Em produção, implementar lógica real
    setIsLoading(true);
    
    // Simular processamento
    setTimeout(() => {
      setIsLoading(false);
      setShowRouteDialog(false);
      
      setNotification({
        open: true,
        message: 'Rota criada com sucesso',
        severity: 'success'
      });
    }, 1500);
  };
  
  // Manipulador para otimizar rotas
  const handleOptimizeRoutes = () => {
    setIsLoading(true);
    
    // Simular processamento
    setTimeout(() => {
      setIsLoading(false);
      
      setNotification({
        open: true,
        message: 'Rotas otimizadas com sucesso',
        severity: 'success'
      });
    }, 2000);
  };
  
  // Manipulador para fechar notificação
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };
  
  // Renderizar conteúdo com base na tab atual
  const renderTabContent = () => {
    switch (currentTab) {
      case 0: // Entregas
        return (
          <DeliveryList>
            <Typography variant="h6" gutterBottom>
              Entregas Pendentes
            </Typography>
            
            {deliveries.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Nenhuma entrega pendente
              </Typography>
            ) : (
              <List>
                {deliveries.map(delivery => (
                  <DeliveryItem 
                    key={delivery.id} 
                    status={delivery.status}
                    selected={selectedDelivery?.id === delivery.id}
                    onClick={() => setSelectedDelivery(delivery)}
                  >
                    <ListItemIcon>
                      {delivery.status === 'delivered' ? <CheckCircle color="success" /> :
                       delivery.status === 'in_transit' ? <DirectionsBike color="info" /> :
                       delivery.status === 'pending' ? <Info color="warning" /> :
                       <Cancel color="error" />}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={`${delivery.customer_name} - ${delivery.order_id}`}
                      secondary={`${delivery.address} - ${formatDateTime(delivery.estimated_delivery_time)}`}
                    />
                    
                    <ListItemSecondaryAction>
                      <Tooltip title="Ver no mapa">
                        <IconButton 
                          edge="end" 
                          onClick={() => {
                            if (googleMapRef.current && delivery.location) {
                              googleMapRef.current.setCenter(delivery.location);
                              googleMapRef.current.setZoom(15);
                            }
                          }}
                        >
                          <MapIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </DeliveryItem>
                ))}
              </List>
            )}
          </DeliveryList>
        );
        
      case 1: // Entregadores
        return (
          <DeliveryList>
            <Typography variant="h6" gutterBottom>
              Entregadores
            </Typography>
            
            {couriers.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Nenhum entregador disponível
              </Typography>
            ) : (
              <List>
                {couriers.map(courier => (
                  <ListItem 
                    key={courier.id} 
                    button
                    selected={selectedCourier?.id === courier.id}
                    onClick={() => setSelectedCourier(courier)}
                  >
                    <ListItemIcon>
                      {courier.vehicle_type === 'motorcycle' ? <DirectionsBike /> :
                       courier.vehicle_type === 'bicycle' ? <DirectionsBike /> :
                       courier.vehicle_type === 'car' ? <DirectionsCar /> :
                       <DirectionsWalk />}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={courier.name}
                      secondary={`${courier.vehicle_type} - ${courier.status}`}
                    />
                    
                    <ListItemSecondaryAction>
                      <Tooltip title="Ver no mapa">
                        <IconButton 
                          edge="end" 
                          onClick={() => {
                            if (googleMapRef.current && courier.current_location) {
                              googleMapRef.current.setCenter(courier.current_location);
                              googleMapRef.current.setZoom(15);
                            }
                          }}
                        >
                          <MapIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </DeliveryList>
        );
        
      case 2: // Rotas
        return (
          <DeliveryList>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Rotas
              </Typography>
              
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={handleCreateRoute}
              >
                Nova Rota
              </Button>
            </Box>
            
            {routes.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Nenhuma rota definida
              </Typography>
            ) : (
              <List>
                {routes.map(route => (
                  <ListItem 
                    key={route.id} 
                    button
                    selected={selectedRoute?.id === route.id}
                    onClick={() => setSelectedRoute(route)}
                  >
                    <ListItemIcon>
                      <Route />
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={`Rota ${route.id}`}
                      secondary={`${route.orders.length} entregas - ${route.status}`}
                    />
                    
                    <ListItemSecondaryAction>
                      <Tooltip title="Ver no mapa">
                        <IconButton edge="end">
                          <MapIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </DeliveryList>
        );
        
      case 3: // Otimização
        return (
          <ControlPanel>
            <Typography variant="h6" gutterBottom>
              Otimização de Rotas
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Modo de Otimização</InputLabel>
                <Select
                  value={optimizationMode}
                  onChange={(e) => setOptimizationMode(e.target.value)}
                  label="Modo de Otimização"
                >
                  <MenuItem value="time">Tempo (mais rápido)</MenuItem>
                  <MenuItem value="distance">Distância (mais curto)</MenuItem>
                  <MenuItem value="balanced">Balanceado</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Modo de Transporte</InputLabel>
                <Select
                  value={transportMode}
                  onChange={(e) => setTransportMode(e.target.value)}
                  label="Modo de Transporte"
                >
                  <MenuItem value="driving">Carro</MenuItem>
                  <MenuItem value="bicycling">Bicicleta</MenuItem>
                  <MenuItem value="walking">A pé</MenuItem>
                </Select>
              </FormControl>
              
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Considerar tráfego em tempo real"
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadInitialData}
              >
                Atualizar Dados
              </Button>
              
              <Button
                variant="contained"
                color="primary"
                startIcon={<GroupWork />}
                onClick={handleOptimizeRoutes}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Otimizar Rotas'}
              </Button>
            </Box>
          </ControlPanel>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Gerenciamento de Entregas
      </Typography>
      
      {/* Mapa */}
      <MapContainer>
        {mapError ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              bgcolor: 'background.paper'
            }}
          >
            <Warning color="error" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h6" color="error">
              {mapError}
            </Typography>
          </Box>
        ) : !mapLoaded ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              bgcolor: 'background.paper'
            }}
          >
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="body1">
              Carregando mapa...
            </Typography>
          </Box>
        ) : (
          <Box ref={mapRef} sx={{ width: '100%', height: '100%' }} />
        )}
      </MapContainer>
      
      {/* Tabs de controle */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab icon={<Info />} label="Entregas" />
          <Tab icon={<DirectionsBike />} label="Entregadores" />
          <Tab icon={<Route />} label="Rotas" />
          <Tab icon={<GroupWork />} label="Otimização" />
        </Tabs>
      </Paper>
      
      {/* Conteúdo da tab atual */}
      {renderTabContent()}
      
      {/* Diálogo para criar rota */}
      <Dialog
        open={showRouteDialog}
        onClose={handleCloseRouteDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Criar Nova Rota
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Entregador</InputLabel>
              <Select
                label="Entregador"
                value=""
              >
                {couriers.map(courier => (
                  <MenuItem key={courier.id} value={courier.id}>
                    {courier.name} ({courier.vehicle_type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
              Entregas Disponíveis
            </Typography>
            
            <List>
              {deliveries
                .filter(d => d.status === 'pending')
                .map(delivery => (
                  <ListItem key={delivery.id}>
                    <ListItemIcon>
                      <Checkbox />
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={`${delivery.customer_name} - ${delivery.order_id}`}
                      secondary={`${delivery.address} - ${formatDateTime(delivery.estimated_delivery_time)}`}
                    />
                  </ListItem>
                ))}
            </List>
            
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Otimizar ordem das entregas"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseRouteDialog}>
            Cancelar
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveRoute}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Criar Rota'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notificações */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DeliveryMapManager;
