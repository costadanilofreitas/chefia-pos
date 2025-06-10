import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Box, 
  TextField, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Divider, 
  IconButton, 
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  Send as SendIcon, 
  Refresh as RefreshIcon, 
  Delete as DeleteIcon, 
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Save as SaveIcon,
  ContentCopy as CopyIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { JsonEditor as Editor } from 'jsoneditor-react';
import 'jsoneditor-react/es/editor.min.css';
import ReactJson from 'react-json-view';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useApi } from '../../hooks/useApi';

// Interface para abas
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface EventType {
  name: string;
  description: string;
}

interface EventMessage {
  id: string;
  type: string;
  timestamp: string;
  data: any;
  metadata: any;
}

interface SequenceEvent {
  event_type: string;
  data: any;
  metadata: any;
}

interface Sequence {
  id: string;
  name: string;
  events: SequenceEvent[];
  interval_ms: number;
  status: 'pending' | 'running' | 'completed' | 'error' | 'cancelled';
  progress?: number;
  current_event?: number;
  total_events?: number;
}

interface NotificationState {
  open: boolean;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
}

// Componente principal
const MessageQueueTestInterface: React.FC = () => {
  // Estado para controle de abas
  const [tabValue, setTabValue] = useState<number>(0);

  // Estado para o compositor de mensagens
  const [eventType, setEventType] = useState<string>('');
  const [eventData, setEventData] = useState<any>({});
  const [eventMetadata, setEventMetadata] = useState<any>({});
  const [availableEventTypes, setAvailableEventTypes] = useState<EventType[]>([]);
  const [isValidJson, setIsValidJson] = useState<boolean>(true);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [messageResponse, setMessageResponse] = useState<any>(null);

  // Estado para o monitor de eventos
  const [monitorActive, setMonitorActive] = useState<boolean>(false);
  const [monitorFilter, setMonitorFilter] = useState<string>('');
  const [capturedEvents, setCapturedEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [expandedEvents, setExpandedEvents] = useState<{[key: string]: boolean}>({});

  // Estado para sequências
  const [sequenceName, setSequenceName] = useState<string>('');
  const [sequenceInterval, setSequenceInterval] = useState<number>(1000);
  const [sequenceEvents, setSequenceEvents] = useState<SequenceEvent[]>([]);
  const [activeSequences, setActiveSequences] = useState<Sequence[]>([]);
  const [runningSequence, setRunningSequence] = useState<Sequence | null>(null);

  // Estado para notificações
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Hooks para API e WebSocket
  const api = useApi();
  const { lastMessage, sendMessage, isConnected } = useWebSocket('/api/test/ws/events');

  // Carregar tipos de eventos disponíveis
  useEffect(() => {
    const fetchEventTypes = async () => {
      try {
        const response = await api.get('/api/test/event-types');
        // Ensure response.data is an array of EventType
        const eventTypes: EventType[] = Array.isArray(response.data) 
          ? response.data 
          : [];
        
        setAvailableEventTypes(eventTypes);
        if (eventTypes.length > 0) {
          setEventType(eventTypes[0].name);
        }
      } catch (error) {
        console.error('Erro ao carregar tipos de eventos:', error);
        showNotification('Erro ao carregar tipos de eventos', 'error');
      }
    };

    fetchEventTypes();
  }, []);

  // Iniciar monitor ao montar componente
  useEffect(() => {
    const startMonitor = async () => {
      try {
        await api.post('/api/test/monitor/start');
        setMonitorActive(true);
      } catch (error) {
        console.error('Erro ao iniciar monitor:', error);
        showNotification('Erro ao iniciar monitor de eventos', 'error');
      }
    };

    startMonitor();

    // Limpar monitor ao desmontar
    return () => {
      const stopMonitor = async () => {
        try {
          await api.post('/api/test/monitor/stop');
        } catch (error) {
          console.error('Erro ao parar monitor:', error);
        }
      };

      stopMonitor();
    };
  }, []);

  // Processar mensagens do WebSocket
  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const eventData = JSON.parse(lastMessage.data);
        setCapturedEvents(prev => [eventData, ...prev].slice(0, 100)); // Limitar a 100 eventos
      } catch (error) {
        console.error('Erro ao processar mensagem do WebSocket:', error);
      }
    }
  }, [lastMessage]);

  // Iniciar WebSocket com filtro
  useEffect(() => {
    if (isConnected) {
      sendMessage(JSON.stringify({ event_type: monitorFilter || null }));
    }
  }, [isConnected, monitorFilter, sendMessage]);

  // Funções auxiliares
  const showNotification = (message: string, severity: 'info' | 'success' | 'warning' | 'error') => {
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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const toggleEventExpand = (eventId: string) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  // Funções para o compositor de mensagens
  const handleSendMessage = async () => {
    if (!isValidJson) {
      showNotification('Dados do evento inválidos. Verifique o formato JSON.', 'error');
      return;
    }

    setSendingMessage(true);
    try {
      const response = await api.post('/api/test/events', {
        event_type: eventType,
        data: eventData,
        metadata: eventMetadata
      });
      
      setMessageResponse(response.data);
      showNotification('Mensagem enviada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      showNotification('Erro ao enviar mensagem', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleClearMessage = () => {
    setEventData({});
    setEventMetadata({});
    setMessageResponse(null);
  };

  // Funções para o monitor de eventos
  const handleClearMonitor = async () => {
    try {
      await api.post('/api/test/monitor/clear');
      setCapturedEvents([]);
      setSelectedEvent(null);
      showNotification('Monitor limpo com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao limpar monitor:', error);
      showNotification('Erro ao limpar monitor', 'error');
    }
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
  };

  // Funções para sequências
  const handleAddToSequence = () => {
    if (!isValidJson) {
      showNotification('Dados do evento inválidos. Verifique o formato JSON.', 'error');
      return;
    }

    const newEvent: SequenceEvent = {
      event_type: eventType,
      data: eventData,
      metadata: eventMetadata
    };

    setSequenceEvents([...sequenceEvents, newEvent]);
    showNotification('Evento adicionado à sequência', 'success');
  };

  const handleRemoveFromSequence = (index: number) => {
    const newEvents = [...sequenceEvents];
    newEvents.splice(index, 1);
    setSequenceEvents(newEvents);
  };

  const handleRunSequence = async () => {
    if (sequenceEvents.length === 0) {
      showNotification('Adicione eventos à sequência antes de executar', 'warning');
      return;
    }

    try {
      const response = await api.post('/api/test/sequences', {
        name: sequenceName || `Sequência ${new Date().toISOString()}`,
        events: sequenceEvents,
        interval_ms: sequenceInterval
      });

      // Ensure response.data is a valid Sequence object
      const sequenceData: Sequence = {
        id: response.data?.id || `seq-${Date.now()}`,
        name: response.data?.name || sequenceName || `Sequência ${new Date().toISOString()}`,
        events: sequenceEvents,
        interval_ms: sequenceInterval,
        status: 'running',
        progress: 0,
        current_event: 0,
        total_events: sequenceEvents.length
      };

      setRunningSequence(sequenceData);
      setActiveSequences([...activeSequences, sequenceData]);
      showNotification('Sequência iniciada com sucesso!', 'success');

      // Monitorar progresso
      const checkProgress = setInterval(async () => {
        try {
          const statusResponse = await api.get(`/api/test/sequences/${sequenceData.id}`);
          
          // Ensure statusResponse.data is a valid Sequence object
          const sequenceStatus: Sequence = {
            ...sequenceData,
            ...statusResponse.data,
            status: 'running'
          };
          
          setRunningSequence(sequenceStatus);
          
          if (sequenceStatus.status === 'completed' || sequenceStatus.status === 'error' || sequenceStatus.status === 'cancelled') {
            clearInterval(checkProgress);
            setRunningSequence(null);
            
            // Atualizar lista de sequências ativas
            setActiveSequences(prev => 
              prev.map(seq => 
                seq.id === sequenceData.id ? sequenceStatus : seq
              )
            );
          }
        } catch (error) {
          console.error('Erro ao verificar progresso da sequência:', error);
          clearInterval(checkProgress);
        }
      }, 1000);
    } catch (error) {
      console.error('Erro ao executar sequência:', error);
      showNotification('Erro ao executar sequência', 'error');
    }
  };

  const handleClearSequence = () => {
    setSequenceEvents([]);
    setSequenceName('');
    showNotification('Sequência limpa', 'info');
  };

  const handleCancelSequence = async (sequenceId: string) => {
    try {
      await api.delete(`/api/test/sequences/${sequenceId}`);
      
      // Atualizar lista de sequências ativas
      setActiveSequences(prev => 
        prev.map(seq => 
          seq.id === sequenceId ? { ...seq, status: 'cancelled' } : seq
        )
      );
      
      if (runningSequence && runningSequence.id === sequenceId) {
        setRunningSequence(null);
      }
      
      showNotification('Sequência cancelada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao cancelar sequência:', error);
      showNotification('Erro ao cancelar sequência', 'error');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Interface de Teste via Mensagens na Fila
      </Typography>
      
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Compositor de Mensagens" />
          <Tab label="Monitor de Eventos" />
          <Tab label="Sequências de Teste" />
        </Tabs>
        
        {/* Aba de Compositor de Mensagens */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Configuração do Evento
                </Typography>
                
                <FormControl fullWidth margin="normal">
                  <InputLabel id="event-type-label">Tipo de Evento</InputLabel>
                  <Select
                    labelId="event-type-label"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    label="Tipo de Evento"
                  >
                    {availableEventTypes.map((type) => (
                      <MenuItem key={type.name} value={type.name}>
                        {type.name} {type.description && `- ${type.description}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Dados do Evento (JSON)
                </Typography>
                <Box sx={{ border: '1px solid #ccc', mb: 2 }}>
                  <Editor
                    value={eventData}
                    onChange={(value: any) => {
                      setEventData(value);
                      setIsValidJson(true);
                    }}
                    onError={() => setIsValidJson(false)}
                    mode="tree"
                    navigationBar={false}
                  />
                </Box>
                
                <Typography variant="subtitle1" gutterBottom>
                  Metadados (opcional)
                </Typography>
                <Box sx={{ border: '1px solid #ccc', mb: 2 }}>
                  <Editor
                    value={eventMetadata}
                    onChange={(value: any) => {
                      setEventMetadata(value);
                      setIsValidJson(true);
                    }}
                    onError={() => setIsValidJson(false)}
                    mode="tree"
                    navigationBar={false}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<DeleteIcon />}
                    onClick={handleClearMessage}
                  >
                    Limpar
                  </Button>
                  
                  <Box>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleAddToSequence}
                      sx={{ mr: 1 }}
                    >
                      Adicionar à Sequência
                    </Button>
                    
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={sendingMessage ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !eventType}
                    >
                      Enviar
                    </Button>
                  </Box>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Resposta
                </Typography>
                
                {messageResponse ? (
                  <Box sx={{ mt: 2 }}>
                    <ReactJson
                      src={messageResponse}
                      name={null}
                      theme="rjv-default"
                      displayDataTypes={false}
                      displayObjectSize={false}
                      enableClipboard={true}
                      collapsed={false}
                    />
                    
                    <Box sx={{ mt: 2 }}>
                      <Chip 
                        label={`ID: ${messageResponse.id}`} 
                        color="primary" 
                        variant="outlined" 
                        sx={{ mr: 1, mb: 1 }} 
                      />
                      <Chip 
                        label={`Tipo: ${messageResponse.event_type}`} 
                        color="secondary" 
                        variant="outlined" 
                        sx={{ mr: 1, mb: 1 }} 
                      />
                      <Chip 
                        label={`Status: ${messageResponse.status}`} 
                        color="success" 
                        variant="outlined" 
                        sx={{ mr: 1, mb: 1 }} 
                      />
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    height: '80%',
                    color: 'text.secondary'
                  }}>
                    <Typography variant="body1">
                      Envie uma mensagem para ver a resposta aqui
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Aba de Monitor de Eventos */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <FormControl sx={{ width: '300px' }}>
                  <InputLabel id="monitor-filter-label">Filtrar por Tipo</InputLabel>
                  <Select
                    labelId="monitor-filter-label"
                    value={monitorFilter}
                    onChange={(e) => setMonitorFilter(e.target.value as string)}
                    label="Filtrar por Tipo"
                  >
                    <MenuItem value="">Todos os Eventos</MenuItem>
                    {availableEventTypes.map((type) => (
                      <MenuItem key={type.name} value={type.name}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                      // Reconectar WebSocket
                      if (isConnected) {
                        sendMessage(JSON.stringify({ event_type: monitorFilter || null }));
                      }
                    }}
                    sx={{ mr: 1 }}
                  >
                    Atualizar
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleClearMonitor}
                  >
                    Limpar
                  </Button>
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, maxHeight: '600px', overflow: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  Eventos Capturados
                </Typography>
                
                {capturedEvents.length === 0 ? (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    height: '200px',
                    color: 'text.secondary'
                  }}>
                    <Typography variant="body1">
                      Nenhum evento capturado ainda
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {capturedEvents.map((event) => (
                      <React.Fragment key={event.id}>
                        <ListItem 
                          button 
                          onClick={() => handleSelectEvent(event)}
                          selected={selectedEvent && selectedEvent.id === event.id}
                        >
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body1" component="span">
                                  {event.metadata.event_type}
                                </Typography>
                                <Chip 
                                  label={new Date(event.timestamp).toLocaleTimeString()} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{ ml: 1, fontSize: '0.7rem' }}
                                />
                              </Box>
                            }
                            secondary={`ID: ${event.id.substring(0, 8)}...`}
                          />
                          <ListItemSecondaryAction>
                            <IconButton 
                              edge="end" 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleEventExpand(event.id);
                              }}
                            >
                              {expandedEvents[event.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        
                        {expandedEvents[event.id] && (
                          <Box sx={{ pl: 2, pr: 2, pb: 2 }}>
                            <ReactJson
                              src={event}
                              name={null}
                              theme="rjv-default"
                              displayDataTypes={false}
                              displayObjectSize={false}
                              collapsed={2}
                              enableClipboard={true}
                            />
                          </Box>
                        )}
                        
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, height: '600px', overflow: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  Detalhes do Evento
                </Typography>
                
                {selectedEvent ? (
                  <Box>
                    <Box sx={{ mb: 2 }}>
                      <Chip 
                        label={`ID: ${selectedEvent.id}`} 
                        color="primary" 
                        variant="outlined" 
                        sx={{ mr: 1, mb: 1 }} 
                      />
                      <Chip 
                        label={`Tipo: ${selectedEvent.metadata.event_type}`} 
                        color="secondary" 
                        variant="outlined" 
                        sx={{ mr: 1, mb: 1 }} 
                      />
                      <Chip 
                        label={`Timestamp: ${new Date(selectedEvent.timestamp).toLocaleString()}`} 
                        variant="outlined" 
                        sx={{ mr: 1, mb: 1 }} 
                      />
                    </Box>
                    
                    <Typography variant="subtitle1" gutterBottom>
                      Dados
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <ReactJson
                        src={selectedEvent.data}
                        name={null}
                        theme="rjv-default"
                        displayDataTypes={false}
                        displayObjectSize={false}
                        collapsed={1}
                        enableClipboard={true}
                      />
                    </Box>
                    
                    <Typography variant="subtitle1" gutterBottom>
                      Metadados
                    </Typography>
                    <ReactJson
                      src={selectedEvent.metadata}
                      name={null}
                      theme="rjv-default"
                      displayDataTypes={false}
                      displayObjectSize={false}
                      collapsed={1}
                      enableClipboard={true}
                    />
                  </Box>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    height: '80%',
                    color: 'text.secondary'
                  }}>
                    <Typography variant="body1">
                      Selecione um evento para ver os detalhes
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Aba de Sequências de Teste */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Configuração da Sequência
                </Typography>
                
                <TextField
                  label="Nome da Sequência"
                  value={sequenceName}
                  onChange={(e) => setSequenceName(e.target.value)}
                  fullWidth
                  margin="normal"
                />
                
                <TextField
                  label="Intervalo entre Eventos (ms)"
                  type="number"
                  value={sequenceInterval}
                  onChange={(e) => setSequenceInterval(parseInt(e.target.value))}
                  fullWidth
                  margin="normal"
                  InputProps={{ inputProps: { min: 100 } }}
                />
                
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Eventos na Sequência ({sequenceEvents.length})
                </Typography>
                
                {sequenceEvents.length === 0 ? (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    height: '100px',
                    color: 'text.secondary',
                    border: '1px dashed #ccc',
                    borderRadius: '4px',
                    mb: 2
                  }}>
                    <Typography variant="body1">
                      Adicione eventos à sequência usando o compositor de mensagens
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #eee', mb: 2 }}>
                    {sequenceEvents.map((event, index) => (
                      <ListItem key={index}>
                        <ListItemText 
                          primary={event.event_type}
                          secondary={`Dados: ${JSON.stringify(event.data).substring(0, 30)}...`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton 
                            edge="end" 
                            onClick={() => handleRemoveFromSequence(index)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<DeleteIcon />}
                    onClick={handleClearSequence}
                    disabled={sequenceEvents.length === 0}
                  >
                    Limpar Sequência
                  </Button>
                  
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PlayIcon />}
                    onClick={handleRunSequence}
                    disabled={sequenceEvents.length === 0 || !!runningSequence}
                  >
                    Executar Sequência
                  </Button>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Sequências Ativas
                </Typography>
                
                {activeSequences.length === 0 ? (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    height: '100px',
                    color: 'text.secondary',
                    border: '1px dashed #ccc',
                    borderRadius: '4px'
                  }}>
                    <Typography variant="body1">
                      Nenhuma sequência ativa
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ maxHeight: '400px', overflow: 'auto' }}>
                    {activeSequences.map((sequence) => (
                      <Card key={sequence.id} sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {sequence.name}
                          </Typography>
                          
                          <Box sx={{ mb: 1 }}>
                            <Chip 
                              label={`Status: ${sequence.status}`} 
                              color={
                                sequence.status === 'completed' ? 'success' :
                                sequence.status === 'running' ? 'primary' :
                                sequence.status === 'error' ? 'error' :
                                sequence.status === 'cancelled' ? 'warning' :
                                'default'
                              }
                              variant="outlined" 
                              sx={{ mr: 1, mb: 1 }} 
                            />
                            <Chip 
                              label={`Eventos: ${sequence.total_events || sequence.events.length}`} 
                              variant="outlined" 
                              sx={{ mr: 1, mb: 1 }} 
                            />
                            <Chip 
                              label={`Intervalo: ${sequence.interval_ms}ms`} 
                              variant="outlined" 
                              sx={{ mr: 1, mb: 1 }} 
                            />
                          </Box>
                          
                          {sequence.status === 'running' && sequence.progress !== undefined && (
                            <Box sx={{ width: '100%', mb: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box sx={{ width: '100%', mr: 1 }}>
                                  <LinearProgress variant="determinate" value={sequence.progress * 100} />
                                </Box>
                                <Box sx={{ minWidth: 35 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    {Math.round(sequence.progress * 100)}%
                                  </Typography>
                                </Box>
                              </Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Evento atual: {sequence.current_event} / {sequence.total_events}
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                        
                        <CardActions>
                          {sequence.status === 'running' && (
                            <Button
                              size="small"
                              color="error"
                              startIcon={<StopIcon />}
                              onClick={() => handleCancelSequence(sequence.id)}
                            >
                              Cancelar
                            </Button>
                          )}
                        </CardActions>
                      </Card>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
      
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
    </Container>
  );
};

// Componente LinearProgress que faltou na importação
const LinearProgress: React.FC<{ variant: string, value: number }> = ({ variant, value }) => {
  return (
    <Box sx={{ 
      width: '100%', 
      height: '4px', 
      backgroundColor: '#e0e0e0', 
      borderRadius: '2px',
      overflow: 'hidden'
    }}>
      <Box sx={{ 
        width: `${value}%`, 
        height: '100%', 
        backgroundColor: '#1976d2',
        transition: 'width 0.3s ease'
      }} />
    </Box>
  );
};

export default MessageQueueTestInterface;
