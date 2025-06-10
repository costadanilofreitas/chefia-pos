import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart, Scatter
} from 'recharts';
import { 
  Box, Card, CardContent, Typography, Grid, Paper, Divider, 
  FormControl, InputLabel, Select, MenuItem, TextField, Button,
  Chip, Alert, CircularProgress, Switch, FormControlLabel
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format, addDays, isAfter, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Componentes customizados
import AlertCard from './components/AlertCard';
import RecommendationCard from './components/RecommendationCard';
import ForecastMetricsCard from './components/ForecastMetricsCard';
import DataSourcesCard from './components/DataSourcesCard';

// Serviço de API
import { fetchForecast, createForecast, fetchAlerts, fetchRecommendations } from '../services/forecastApi';

const DemandForecastDashboard = ({ restaurantId }) => {
  // Estados
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  
  // Estados do formulário
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(addDays(new Date(), 14));
  const [granularity, setGranularity] = useState('daily');
  const [dimensions, setDimensions] = useState(['restaurant']);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [includeWeather, setIncludeWeather] = useState(true);
  const [includeEvents, setIncludeEvents] = useState(true);
  const [includeHolidays, setIncludeHolidays] = useState(true);
  const [includePromotions, setIncludePromotions] = useState(true);
  const [modelType, setModelType] = useState('auto');
  
  // Dados de produtos e categorias (em produção, carregar do backend)
  const [products, setProducts] = useState([
    { id: 'product-1', name: 'Hambúrguer Clássico' },
    { id: 'product-2', name: 'Batata Frita' },
    { id: 'product-3', name: 'Refrigerante' },
    { id: 'product-4', name: 'Milk Shake' },
    { id: 'product-5', name: 'Combo Família' }
  ]);
  
  const [categories, setCategories] = useState([
    { id: 'category-1', name: 'Lanches' },
    { id: 'category-2', name: 'Acompanhamentos' },
    { id: 'category-3', name: 'Bebidas' },
    { id: 'category-4', name: 'Sobremesas' },
    { id: 'category-5', name: 'Combos' }
  ]);
  
  // Carregar dados iniciais
  useEffect(() => {
    if (restaurantId) {
      loadInitialData();
    }
  }, [restaurantId]);
  
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Carregar alertas e recomendações
      const alertsData = await fetchAlerts(restaurantId);
      const recommendationsData = await fetchRecommendations(restaurantId);
      
      setAlerts(alertsData);
      setRecommendations(recommendationsData);
      
      // Tentar carregar previsão mais recente
      try {
        // Em produção, implementar endpoint para obter previsão mais recente
        // Por enquanto, criar uma nova previsão rápida
        await handleQuickForecast();
      } catch (e) {
        console.log('No recent forecast available, please create a new one');
      }
      
    } catch (err) {
      setError('Erro ao carregar dados iniciais: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Criar previsão rápida
  const handleQuickForecast = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      // Chamar API para criar previsão rápida
      const response = await fetch(`/api/ai/forecast/quick-forecast/${restaurantId}?days=${days}&granularity=${granularity}&include_weather=${includeWeather}&include_events=${includeEvents}&include_holidays=${includeHolidays}&include_promotions=${includePromotions}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao criar previsão: ${response.status}`);
      }
      
      const data = await response.json();
      setForecast(data);
      
      // Atualizar alertas e recomendações
      await loadInitialData();
      
    } catch (err) {
      setError('Erro ao criar previsão rápida: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Criar previsão personalizada
  const handleCreateForecast = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validar datas
      if (isAfter(startDate, endDate)) {
        throw new Error('A data de início deve ser anterior à data de fim');
      }
      
      // Validar dimensões e seleções
      if (dimensions.includes('product') && selectedProducts.length === 0) {
        throw new Error('Selecione pelo menos um produto quando a dimensão Produto estiver ativa');
      }
      
      if (dimensions.includes('category') && selectedCategories.length === 0) {
        throw new Error('Selecione pelo menos uma categoria quando a dimensão Categoria estiver ativa');
      }
      
      // Preparar payload
      const payload = {
        restaurant_id: restaurantId,
        dimensions: dimensions,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        granularity: granularity,
        model_type: modelType,
        include_weather: includeWeather,
        include_events: includeEvents,
        include_holidays: includeHolidays,
        include_promotions: includePromotions,
        confidence_level: 0.95
      };
      
      // Adicionar produtos e categorias se necessário
      if (dimensions.includes('product')) {
        payload.product_ids = selectedProducts;
      }
      
      if (dimensions.includes('category')) {
        payload.category_ids = selectedCategories;
      }
      
      // Chamar API para criar previsão
      const response = await fetch('/api/ai/forecast/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao criar previsão: ${response.status}`);
      }
      
      const data = await response.json();
      setForecast(data);
      
      // Atualizar alertas e recomendações
      await loadInitialData();
      
    } catch (err) {
      setError('Erro ao criar previsão: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Renderizar gráfico de previsão
  const renderForecastChart = () => {
    if (!forecast || !forecast.points || forecast.points.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Nenhuma previsão disponível. Crie uma nova previsão para visualizar os resultados.
          </Typography>
        </Box>
      );
    }
    
    // Preparar dados para o gráfico
    const chartData = [];
    const dimensionValues = {};
    
    // Agrupar pontos por dimensão
    forecast.points.forEach(point => {
      const timestamp = format(new Date(point.timestamp), 'dd/MM/yyyy');
      
      // Criar chave única para cada combinação de dimensões
      const dimKey = Object.entries(point.dimension_values)
        .filter(([key, _]) => key !== 'restaurant')
        .map(([key, value]) => `${key}:${value}`)
        .join('|');
      
      // Armazenar valores de dimensão para legenda
      if (!dimensionValues[dimKey]) {
        dimensionValues[dimKey] = point.dimension_values;
      }
      
      // Encontrar ou criar entrada para este timestamp
      let entry = chartData.find(d => d.timestamp === timestamp);
      if (!entry) {
        entry = { timestamp };
        chartData.push(entry);
      }
      
      // Adicionar valor previsto
      entry[`forecast_${dimKey}`] = point.value;
      
      // Adicionar intervalos de confiança
      if (point.lower_bound) {
        entry[`lower_${dimKey}`] = point.lower_bound;
      }
      
      if (point.upper_bound) {
        entry[`upper_${dimKey}`] = point.upper_bound;
      }
    });
    
    // Ordenar por timestamp
    chartData.sort((a, b) => {
      const dateA = parseISO(a.timestamp.split('/').reverse().join('-'));
      const dateB = parseISO(b.timestamp.split('/').reverse().join('-'));
      return dateA - dateB;
    });
    
    // Gerar cores para cada dimensão
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe',
      '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'
    ];
    
    const dimensionKeys = Object.keys(dimensionValues);
    
    return (
      <Box sx={{ width: '100%', height: 400, mt: 2 }}>
        <ResponsiveContainer>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Legend />
            
            {dimensionKeys.map((dimKey, index) => {
              const color = colors[index % colors.length];
              const dim = dimensionValues[dimKey];
              
              // Criar label para legenda
              let label = '';
              if (dim.product) {
                const product = products.find(p => p.id === dim.product);
                label += product ? product.name : dim.product;
              }
              
              if (dim.category) {
                const category = categories.find(c => c.id === dim.category);
                label += label ? ` (${category ? category.name : dim.category})` : (category ? category.name : dim.category);
              }
              
              if (!label) {
                label = 'Restaurante';
              }
              
              return (
                <React.Fragment key={dimKey}>
                  {/* Área para intervalo de confiança */}
                  {chartData[0][`lower_${dimKey}`] && (
                    <Area
                      type="monotone"
                      dataKey={`lower_${dimKey}`}
                      stroke="none"
                      fill={color}
                      fillOpacity={0.1}
                      activeDot={false}
                      legendType="none"
                    />
                  )}
                  
                  {chartData[0][`upper_${dimKey}`] && (
                    <Area
                      type="monotone"
                      dataKey={`upper_${dimKey}`}
                      stroke="none"
                      fill={color}
                      fillOpacity={0.1}
                      activeDot={false}
                      legendType="none"
                    />
                  )}
                  
                  {/* Linha para valor previsto */}
                  <Line
                    type="monotone"
                    dataKey={`forecast_${dimKey}`}
                    name={label}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </React.Fragment>
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    );
  };
  
  // Renderizar alertas
  const renderAlerts = () => {
    if (!alerts || alerts.length === 0) {
      return (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Nenhum alerta disponível.
          </Typography>
        </Box>
      );
    }
    
    return (
      <Box sx={{ mt: 2 }}>
        {alerts.map(alert => (
          <AlertCard key={alert.alert_id} alert={alert} products={products} categories={categories} />
        ))}
      </Box>
    );
  };
  
  // Renderizar recomendações
  const renderRecommendations = () => {
    if (!recommendations || recommendations.length === 0) {
      return (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Nenhuma recomendação disponível.
          </Typography>
        </Box>
      );
    }
    
    return (
      <Box sx={{ mt: 2 }}>
        {recommendations.map(recommendation => (
          <RecommendationCard key={recommendation.product_id} recommendation={recommendation} />
        ))}
      </Box>
    );
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Previsão de Demanda Inteligente
        </Typography>
        
        <Typography variant="body1" paragraph>
          Utilize inteligência artificial para prever a demanda futura, otimizar seu estoque e melhorar a eficiência operacional.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Grid container spacing={3}>
          {/* Formulário de previsão */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configurar Previsão
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <DatePicker
                    label="Data de Início"
                    value={startDate}
                    onChange={setStartDate}
                    renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
                  />
                  
                  <DatePicker
                    label="Data de Fim"
                    value={endDate}
                    onChange={setEndDate}
                    renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
                    minDate={startDate}
                  />
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Granularidade</InputLabel>
                    <Select
                      value={granularity}
                      onChange={(e) => setGranularity(e.target.value)}
                      label="Granularidade"
                    >
                      <MenuItem value="hourly">Por Hora</MenuItem>
                      <MenuItem value="daily">Diária</MenuItem>
                      <MenuItem value="weekly">Semanal</MenuItem>
                      <MenuItem value="monthly">Mensal</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Dimensões</InputLabel>
                    <Select
                      multiple
                      value={dimensions}
                      onChange={(e) => setDimensions(e.target.value)}
                      label="Dimensões"
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={
                              value === 'restaurant' ? 'Restaurante' :
                              value === 'product' ? 'Produto' :
                              value === 'category' ? 'Categoria' : value
                            } />
                          ))}
                        </Box>
                      )}
                    >
                      <MenuItem value="restaurant">Restaurante</MenuItem>
                      <MenuItem value="product">Produto</MenuItem>
                      <MenuItem value="category">Categoria</MenuItem>
                    </Select>
                  </FormControl>
                  
                  {dimensions.includes('product') && (
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Produtos</InputLabel>
                      <Select
                        multiple
                        value={selectedProducts}
                        onChange={(e) => setSelectedProducts(e.target.value)}
                        label="Produtos"
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => {
                              const product = products.find(p => p.id === value);
                              return (
                                <Chip key={value} label={product ? product.name : value} />
                              );
                            })}
                          </Box>
                        )}
                      >
                        {products.map((product) => (
                          <MenuItem key={product.id} value={product.id}>
                            {product.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  
                  {dimensions.includes('category') && (
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Categorias</InputLabel>
                      <Select
                        multiple
                        value={selectedCategories}
                        onChange={(e) => setSelectedCategories(e.target.value)}
                        label="Categorias"
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => {
                              const category = categories.find(c => c.id === value);
                              return (
                                <Chip key={value} label={category ? category.name : value} />
                              );
                            })}
                          </Box>
                        )}
                      >
                        {categories.map((category) => (
                          <MenuItem key={category.id} value={category.id}>
                            {category.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Modelo</InputLabel>
                    <Select
                      value={modelType}
                      onChange={(e) => setModelType(e.target.value)}
                      label="Modelo"
                    >
                      <MenuItem value="auto">Automático (recomendado)</MenuItem>
                      <MenuItem value="prophet">Prophet</MenuItem>
                      <MenuItem value="arima">ARIMA</MenuItem>
                      <MenuItem value="ets">ETS</MenuItem>
                      <MenuItem value="deepar">DeepAR+</MenuItem>
                      <MenuItem value="nbeats">N-BEATS</MenuItem>
                      <MenuItem value="ensemble">Ensemble</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Fontes de Dados
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={includeWeather}
                        onChange={(e) => setIncludeWeather(e.target.checked)}
                      />
                    }
                    label="Clima"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={includeEvents}
                        onChange={(e) => setIncludeEvents(e.target.checked)}
                      />
                    }
                    label="Eventos"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={includeHolidays}
                        onChange={(e) => setIncludeHolidays(e.target.checked)}
                      />
                    }
                    label="Feriados"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={includePromotions}
                        onChange={(e) => setIncludePromotions(e.target.checked)}
                      />
                    }
                    label="Promoções"
                  />
                  
                  <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleCreateForecast}
                      disabled={loading}
                      fullWidth
                    >
                      {loading ? <CircularProgress size={24} /> : 'Criar Previsão'}
                    </Button>
                    
                    <Button
                      variant="outlined"
                      onClick={handleQuickForecast}
                      disabled={loading}
                      fullWidth
                    >
                      Previsão Rápida
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
            
            {/* Métricas da previsão */}
            {forecast && forecast.metrics && (
              <Box sx={{ mt: 3 }}>
                <ForecastMetricsCard metrics={forecast.metrics} />
              </Box>
            )}
            
            {/* Fontes de dados */}
            {forecast && forecast.data_sources_used && (
              <Box sx={{ mt: 3 }}>
                <DataSourcesCard dataSources={forecast.data_sources_used} />
              </Box>
            )}
          </Grid>
          
          {/* Gráfico de previsão */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Previsão de Demanda
                </Typography>
                
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  renderForecastChart()
                )}
              </CardContent>
            </Card>
            
            {/* Alertas e Recomendações */}
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Alertas de Demanda
                    </Typography>
                    
                    {loading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      renderAlerts()
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Recomendações de Estoque
                    </Typography>
                    
                    {loading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      renderRecommendations()
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default DemandForecastDashboard;
