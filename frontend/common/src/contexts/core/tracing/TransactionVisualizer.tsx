import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Paper, Grid, 
  Tabs, Tab, TextField, Button, MenuItem, 
  Select, FormControl, InputLabel, Chip,
  CircularProgress, Divider, IconButton,
  Card, CardContent, CardHeader, CardActions,
  Collapse, List, ListItem, ListItemText,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tooltip
} from '@mui/material';
import { 
  Timeline, TimelineItem, TimelineSeparator, 
  TimelineConnector, TimelineContent, TimelineDot, 
  TimelineOppositeContent 
} from '@mui/lab';
import { 
  Search, Refresh, ExpandMore, ExpandLess,
  CheckCircle, Cancel, Warning, Info,
  ArrowForward, ArrowBack
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';

// Componente para visualização de fluxo de transações
const TransactionVisualizer = () => {
  // Estados
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionEvents, setTransactionEvents] = useState([]);
  const [searchParams, setSearchParams] = useState({
    type: '',
    origin: '',
    status: '',
    startDate: '',
    endDate: '',
    module: '',
    limit: 50,
    skip: 0
  });
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [transactionOrigins, setTransactionOrigins] = useState([]);
  const [transactionStatuses, setTransactionStatuses] = useState([]);
  const [stats, setStats] = useState([]);
  const [groupBy, setGroupBy] = useState('type');

  // Carregar dados iniciais
  useEffect(() => {
    fetchMetadata();
    searchTransactions();
    fetchStats();
  }, []);

  // Buscar metadados (tipos, origens, status)
  const fetchMetadata = async () => {
    try {
      const [typesRes, originsRes, statusesRes] = await Promise.all([
        axios.get('/api/tracing/types'),
        axios.get('/api/tracing/origins'),
        axios.get('/api/tracing/statuses')
      ]);
      
      setTransactionTypes(typesRes.data.types);
      setTransactionOrigins(originsRes.data.origins);
      setTransactionStatuses(statusesRes.data.statuses);
    } catch (err) {
      setError('Erro ao carregar metadados: ' + err.message);
    }
  };

  // Buscar transações
  const searchTransactions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        type: searchParams.type || undefined,
        origin: searchParams.origin || undefined,
        status: searchParams.status || undefined,
        start_date: searchParams.startDate || undefined,
        end_date: searchParams.endDate || undefined,
        module: searchParams.module || undefined,
        limit: searchParams.limit,
        skip: searchParams.skip
      };
      
      const response = await axios.get('/api/tracing/transactions', { params });
      
      setTransactions(response.data.transactions);
      setTotalTransactions(response.data.total);
      setLoading(false);
    } catch (err) {
      setError('Erro ao buscar transações: ' + err.message);
      setLoading(false);
    }
  };

  // Buscar eventos de uma transação
  const fetchTransactionEvents = async (transactionId) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/tracing/events/${transactionId}`);
      setTransactionEvents(response.data);
      setLoading(false);
    } catch (err) {
      setError('Erro ao buscar eventos da transação: ' + err.message);
      setLoading(false);
    }
  };

  // Buscar estatísticas
  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        start_date: searchParams.startDate || undefined,
        end_date: searchParams.endDate || undefined,
        group_by: groupBy
      };
      
      const response = await axios.get('/api/tracing/stats', { params });
      setStats(response.data.stats);
      setLoading(false);
    } catch (err) {
      setError('Erro ao buscar estatísticas: ' + err.message);
      setLoading(false);
    }
  };

  // Manipuladores de eventos
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSearchParamChange = (param) => (event) => {
    setSearchParams({
      ...searchParams,
      [param]: event.target.value
    });
  };

  const handleSearch = () => {
    setSearchParams({
      ...searchParams,
      skip: 0
    });
    searchTransactions();
  };

  const handleReset = () => {
    setSearchParams({
      type: '',
      origin: '',
      status: '',
      startDate: '',
      endDate: '',
      module: '',
      limit: 50,
      skip: 0
    });
  };

  const handleNextPage = () => {
    const newSkip = searchParams.skip + searchParams.limit;
    setSearchParams({
      ...searchParams,
      skip: newSkip
    });
    searchTransactions();
  };

  const handlePrevPage = () => {
    const newSkip = Math.max(0, searchParams.skip - searchParams.limit);
    setSearchParams({
      ...searchParams,
      skip: newSkip
    });
    searchTransactions();
  };

  const handleSelectTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    fetchTransactionEvents(transaction.transaction_id);
  };

  const handleGroupByChange = (event) => {
    setGroupBy(event.target.value);
    fetchStats();
  };

  // Renderizar ícone de status
  const renderStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'failed':
        return <Cancel color="error" />;
      case 'pending':
        return <Info color="info" />;
      case 'processing':
        return <CircularProgress size={20} />;
      case 'canceled':
        return <Warning color="warning" />;
      default:
        return null;
    }
  };

  // Renderizar cor do evento
  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'created':
        return 'primary.main';
      case 'updated':
        return 'info.main';
      case 'processed':
        return 'secondary.main';
      case 'completed':
        return 'success.main';
      case 'failed':
        return 'error.main';
      case 'canceled':
        return 'warning.main';
      case 'error':
        return 'error.dark';
      case 'warning':
        return 'warning.dark';
      case 'info':
        return 'info.dark';
      default:
        return 'grey.500';
    }
  };

  // Formatar data
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm:ss');
    } catch (e) {
      return dateString;
    }
  };

  // Renderizar duração
  const formatDuration = (ms) => {
    if (!ms) return '-';
    
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  };

  // Renderizar painel de pesquisa
  const renderSearchPanel = () => (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Pesquisar Transações
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Tipo</InputLabel>
            <Select
              value={searchParams.type}
              onChange={handleSearchParamChange('type')}
              label="Tipo"
            >
              <MenuItem value="">Todos</MenuItem>
              {transactionTypes.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Origem</InputLabel>
            <Select
              value={searchParams.origin}
              onChange={handleSearchParamChange('origin')}
              label="Origem"
            >
              <MenuItem value="">Todas</MenuItem>
              {transactionOrigins.map(origin => (
                <MenuItem key={origin} value={origin}>{origin}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select
              value={searchParams.status}
              onChange={handleSearchParamChange('status')}
              label="Status"
            >
              <MenuItem value="">Todos</MenuItem>
              {transactionStatuses.map(status => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            margin="normal"
            label="Módulo"
            value={searchParams.module}
            onChange={handleSearchParamChange('module')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            margin="normal"
            label="Data Inicial"
            type="datetime-local"
            value={searchParams.startDate}
            onChange={handleSearchParamChange('startDate')}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            margin="normal"
            label="Data Final"
            type="datetime-local"
            value={searchParams.endDate}
            onChange={handleSearchParamChange('endDate')}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            margin="normal"
            label="Limite"
            type="number"
            value={searchParams.limit}
            onChange={handleSearchParamChange('limit')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined" 
              onClick={handleReset}
              sx={{ mr: 1 }}
            >
              Limpar
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSearch}
              startIcon={<Search />}
            >
              Pesquisar
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );

  // Renderizar lista de transações
  const renderTransactionsList = () => (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Transações ({totalTransactions})
        </Typography>
        <Box>
          <Button 
            disabled={searchParams.skip === 0}
            onClick={handlePrevPage}
            startIcon={<ArrowBack />}
            sx={{ mr: 1 }}
          >
            Anterior
          </Button>
          <Button 
            disabled={searchParams.skip + searchParams.limit >= totalTransactions}
            onClick={handleNextPage}
            endIcon={<ArrowForward />}
          >
            Próxima
          </Button>
        </Box>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ p: 2, color: 'error.main' }}>
          {error}
        </Box>
      ) : transactions.length === 0 ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          Nenhuma transação encontrada
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Origem</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Início</TableCell>
                <TableCell>Duração</TableCell>
                <TableCell>Eventos</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map(transaction => (
                <TableRow 
                  key={transaction.transaction_id}
                  hover
                  selected={selectedTransaction?.transaction_id === transaction.transaction_id}
                >
                  <TableCell>{transaction.transaction_id}</TableCell>
                  <TableCell>{transaction.type}</TableCell>
                  <TableCell>{transaction.origin}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {renderStatusIcon(transaction.status)}
                      <Box sx={{ ml: 1 }}>{transaction.status}</Box>
                    </Box>
                  </TableCell>
                  <TableCell>{formatDate(transaction.start_time)}</TableCell>
                  <TableCell>{formatDuration(transaction.duration_ms)}</TableCell>
                  <TableCell>{transaction.event_count}</TableCell>
                  <TableCell>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => handleSelectTransaction(transaction)}
                    >
                      Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );

  // Renderizar detalhes da transação
  const renderTransactionDetails = () => {
    if (!selectedTransaction) {
      return (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            Selecione uma transação para ver os detalhes
          </Typography>
        </Paper>
      );
    }
    
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Detalhes da Transação
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Informações Gerais" />
              <CardContent>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="ID da Transação" 
                      secondary={selectedTransaction.transaction_id} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Tipo" 
                      secondary={selectedTransaction.type} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Origem" 
                      secondary={selectedTransaction.origin} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Status" 
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {renderStatusIcon(selectedTransaction.status)}
                          <Box sx={{ ml: 1 }}>{selectedTransaction.status}</Box>
                        </Box>
                      } 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Tempo e Processamento" />
              <CardContent>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Início" 
                      secondary={formatDate(selectedTransaction.start_time)} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Última Atualização" 
                      secondary={formatDate(selectedTransaction.last_update)} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Fim" 
                      secondary={selectedTransaction.end_time ? formatDate(selectedTransaction.end_time) : '-'} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Duração" 
                      secondary={formatDuration(selectedTransaction.duration_ms)} 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12}>
            <Card>
              <CardHeader 
                title="Fluxo de Eventos" 
                subheader={`Total: ${transactionEvents.length} eventos`}
              />
              <CardContent>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : error ? (
                  <Box sx={{ p: 2, color: 'error.main' }}>
                    {error}
                  </Box>
                ) : transactionEvents.length === 0 ? (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    Nenhum evento encontrado para esta transação
                  </Box>
                ) : (
                  <Timeline position="alternate">
                    {transactionEvents.map((event, index) => (
                      <TimelineItem key={event.id}>
                        <TimelineOppositeContent color="text.secondary">
                          {formatDate(event.timestamp)}
                        </TimelineOppositeContent>
                        
                        <TimelineSeparator>
                          <TimelineDot sx={{ bgcolor: getEventColor(event.event_type) }} />
                          {index < transactionEvents.length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        
                        <TimelineContent>
                          <Paper elevation={3} sx={{ p: 2 }}>
                            <Typography variant="h6" component="span">
                              {event.event_type}
                            </Typography>
                            <Typography>Módulo: {event.module}</Typography>
                            <Typography>Status: {event.status}</Typography>
                            
                            {Object.keys(event.data).length > 0 && (
                              <Collapse in={true}>
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="subtitle2">Dados:</Typography>
                                  <pre style={{ 
                                    backgroundColor: '#f5f5f5', 
                                    padding: '8px', 
                                    borderRadius: '4px',
                                    overflow: 'auto',
                                    maxHeight: '100px'
                                  }}>
                                    {JSON.stringify(event.data, null, 2)}
                                  </pre>
                                </Box>
                              </Collapse>
                            )}
                          </Paper>
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                  </Timeline>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  // Renderizar estatísticas
  const renderStats = () => (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Estatísticas de Transações
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 120, mr: 2 }}>
            <InputLabel>Agrupar por</InputLabel>
            <Select
              value={groupBy}
              onChange={handleGroupByChange}
              label="Agrupar por"
              size="small"
            >
              <MenuItem value="type">Tipo</MenuItem>
              <MenuItem value="origin">Origem</MenuItem>
              <MenuItem value="status">Status</MenuItem>
              <MenuItem value="first_module">Módulo Inicial</MenuItem>
              <MenuItem value="last_module">Módulo Final</MenuItem>
            </Select>
          </FormControl>
          
          <Button 
            startIcon={<Refresh />}
            onClick={fetchStats}
            variant="outlined"
            size="small"
          >
            Atualizar
          </Button>
        </Box>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ p: 2, color: 'error.main' }}>
          {error}
        </Box>
      ) : stats.length === 0 ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          Nenhuma estatística disponível
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{groupBy === 'type' ? 'Tipo' : 
                           groupBy === 'origin' ? 'Origem' : 
                           groupBy === 'status' ? 'Status' : 
                           groupBy === 'first_module' ? 'Módulo Inicial' : 'Módulo Final'}</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Concluídas</TableCell>
                <TableCell>Falhas</TableCell>
                <TableCell>Taxa de Sucesso</TableCell>
                <TableCell>Duração Média</TableCell>
                <TableCell>Duração Máxima</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats.map(stat => (
                <TableRow key={stat.category}>
                  <TableCell>{stat.category}</TableCell>
                  <TableCell>{stat.count}</TableCell>
                  <TableCell>{stat.completed}</TableCell>
                  <TableCell>{stat.failed}</TableCell>
                  <TableCell>{stat.success_rate.toFixed(2)}%</TableCell>
                  <TableCell>{formatDuration(stat.avg_duration_ms)}</TableCell>
                  <TableCell>{formatDuration(stat.max_duration_ms)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Rastreamento de Transações
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Pesquisa" />
          <Tab label="Detalhes" />
          <Tab label="Estatísticas" />
        </Tabs>
      </Box>
      
      {tabValue === 0 && (
        <>
          {renderSearchPanel()}
          {renderTransactionsList()}
        </>
      )}
      
      {tabValue === 1 && renderTransactionDetails()}
      
      {tabValue === 2 && renderStats()}
    </Container>
  );
};

export default TransactionVisualizer;
