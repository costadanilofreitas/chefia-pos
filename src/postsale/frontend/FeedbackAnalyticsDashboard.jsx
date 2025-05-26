import React, { useState, useEffect } from 'react';
import { 
  Container, Box, Typography, Grid, Paper, Card, CardContent,
  Button, FormControl, InputLabel, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, Divider, CircularProgress, Alert, Chip
} from '@mui/material';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, TrendingDown, TrendingFlat, Star, StarBorder,
  ThumbUp, ThumbDown, Comment, Photo, LocalOffer
} from '@mui/icons-material';

// Componente para exibir a pontuação NPS com código de cores
const NPSScore = ({ score }) => {
  let color = '#f44336'; // Vermelho para detratores
  let label = 'Crítico';
  
  if (score >= 50) {
    color = '#4caf50'; // Verde para promotores
    label = 'Excelente';
  } else if (score >= 0) {
    color = '#ff9800'; // Laranja para neutros
    label = 'Neutro';
  }
  
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h3" sx={{ color }}>
        {Math.round(score)}
      </Typography>
      <Typography variant="body2" sx={{ color }}>
        {label}
      </Typography>
    </Box>
  );
};

// Componente para exibir tendência
const TrendIndicator = ({ value }) => {
  if (value > 0.2) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
        <TrendingUp />
        <Typography variant="body2" sx={{ ml: 0.5 }}>
          +{value.toFixed(1)}
        </Typography>
      </Box>
    );
  } else if (value < -0.2) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
        <TrendingDown />
        <Typography variant="body2" sx={{ ml: 0.5 }}>
          {value.toFixed(1)}
        </Typography>
      </Box>
    );
  } else {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
        <TrendingFlat />
        <Typography variant="body2" sx={{ ml: 0.5 }}>
          Estável
        </Typography>
      </Box>
    );
  }
};

// Componente para exibir avaliação com estrelas
const RatingDisplay = ({ value }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Box key={star} sx={{ color: star <= value ? 'warning.main' : 'text.disabled' }}>
          {star <= value ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
        </Box>
      ))}
      <Typography variant="body2" sx={{ ml: 1 }}>
        {value.toFixed(1)}
      </Typography>
    </Box>
  );
};

// Dashboard principal de análise de feedback
const FeedbackAnalyticsDashboard = ({ restaurantId }) => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('month');
  const [tabValue, setTabValue] = useState(0);
  const [recentFeedbacks, setRecentFeedbacks] = useState([]);
  
  // Efeito para carregar dados de análise
  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Calcular datas com base no intervalo selecionado
        const endDate = new Date();
        let startDate = new Date();
        
        switch (dateRange) {
          case 'week':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(startDate.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
          default:
            startDate.setMonth(startDate.getMonth() - 1);
        }
        
        // Em produção, substituir por chamada real à API
        const response = await fetch(
          `/api/postsale/analytics/restaurant/${restaurantId}?` +
          `start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`
        );
        
        if (!response.ok) {
          throw new Error('Erro ao carregar dados de análise');
        }
        
        const data = await response.json();
        setAnalytics(data.analytics);
        
        // Carregar feedbacks recentes
        const feedbacksResponse = await fetch(
          `/api/postsale/feedback/restaurant/${restaurantId}?` +
          `start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&` +
          `limit=10`
        );
        
        if (!feedbacksResponse.ok) {
          throw new Error('Erro ao carregar feedbacks recentes');
        }
        
        const feedbacksData = await feedbacksResponse.json();
        setRecentFeedbacks(feedbacksData.feedbacks);
      } catch (error) {
        setError(error.message || 'Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [restaurantId, dateRange]);
  
  // Manipulador de alteração de intervalo de datas
  const handleDateRangeChange = (event) => {
    setDateRange(event.target.value);
  };
  
  // Manipulador de alteração de tab
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Preparar dados para gráficos
  const prepareRatingDistributionData = () => {
    if (!analytics || !analytics.rating_distribution) return [];
    
    return Object.entries(analytics.rating_distribution).map(([rating, count]) => ({
      rating: Number(rating),
      count
    }));
  };
  
  const prepareCategoryAveragesData = () => {
    if (!analytics || !analytics.category_averages) return [];
    
    const categoryLabels = {
      food_quality: 'Qualidade da Comida',
      service: 'Atendimento',
      ambience: 'Ambiente',
      price: 'Preço',
      cleanliness: 'Limpeza',
      general: 'Geral'
    };
    
    return Object.entries(analytics.category_averages).map(([category, average]) => ({
      category: categoryLabels[category] || category,
      average
    }));
  };
  
  // Renderizar conteúdo com base no estado de carregamento
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }
  
  if (!analytics) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Nenhum dado de análise disponível para o período selecionado.
      </Alert>
    );
  }
  
  // Dados para gráficos
  const ratingDistributionData = prepareRatingDistributionData();
  const categoryAveragesData = prepareCategoryAveragesData();
  
  // Cores para gráficos
  const COLORS = ['#f44336', '#ff9800', '#ffeb3b', '#8bc34a', '#4caf50'];
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard de Feedback
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" color="text.secondary">
            {analytics.period_start && analytics.period_end ? (
              `Período: ${new Date(analytics.period_start).toLocaleDateString()} a ${new Date(analytics.period_end).toLocaleDateString()}`
            ) : 'Todos os períodos'}
          </Typography>
          
          <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Período</InputLabel>
            <Select
              value={dateRange}
              onChange={handleDateRangeChange}
              label="Período"
            >
              <MenuItem value="week">Última Semana</MenuItem>
              <MenuItem value="month">Último Mês</MenuItem>
              <MenuItem value="quarter">Último Trimestre</MenuItem>
              <MenuItem value="year">Último Ano</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
      
      {/* Cards de métricas principais */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total de Avaliações
            </Typography>
            <Typography variant="h4">
              {analytics.total_count}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Avaliação Média
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h4" sx={{ mr: 1 }}>
                {analytics.average_rating.toFixed(1)}
              </Typography>
              <RatingDisplay value={analytics.average_rating} />
            </Box>
            <TrendIndicator value={analytics.recent_trend} />
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              NPS Score
            </Typography>
            <NPSScore score={analytics.nps_score} />
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Tendência
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%' }}>
              <TrendIndicator value={analytics.recent_trend} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Tabs para diferentes visualizações */}
      <Paper elevation={2} sx={{ mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Visão Geral" />
          <Tab label="Avaliações por Categoria" />
          <Tab label="Feedbacks Recentes" />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {/* Tab de Visão Geral */}
          {tabValue === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Distribuição de Avaliações
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ratingDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rating" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Quantidade" fill="#8884d8">
                      {ratingDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.rating - 1]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Distribuição Percentual
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={ratingDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="rating"
                      label={({ rating, percent }) => `${rating}★: ${(percent * 100).toFixed(0)}%`}
                    >
                      {ratingDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.rating - 1]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} avaliações`, `${name} estrelas`]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          )}
          
          {/* Tab de Avaliações por Categoria */}
          {tabValue === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Avaliação Média por Categoria
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={categoryAveragesData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 5]} />
                    <YAxis dataKey="category" type="category" />
                    <Tooltip formatter={(value) => [`${value.toFixed(1)} estrelas`]} />
                    <Legend />
                    <Bar dataKey="average" name="Avaliação Média" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          )}
          
          {/* Tab de Feedbacks Recentes */}
          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Feedbacks Recentes
              </Typography>
              
              {recentFeedbacks.length === 0 ? (
                <Alert severity="info">
                  Nenhum feedback recente encontrado.
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Data</TableCell>
                        <TableCell>Cliente</TableCell>
                        <TableCell>Avaliação</TableCell>
                        <TableCell>Comentário</TableCell>
                        <TableCell>Detalhes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentFeedbacks.map((feedback) => (
                        <TableRow key={feedback.id}>
                          <TableCell>
                            {new Date(feedback.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {feedback.customer_name || 'Anônimo'}
                          </TableCell>
                          <TableCell>
                            <RatingDisplay value={feedback.overall_rating} />
                          </TableCell>
                          <TableCell>
                            {feedback.comment ? (
                              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                {feedback.comment}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                Sem comentário
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              {feedback.photos && feedback.photos.length > 0 && (
                                <Chip
                                  icon={<Photo fontSize="small" />}
                                  label={feedback.photos.length}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              )}
                              {feedback.benefit_id && (
                                <Chip
                                  icon={<LocalOffer fontSize="small" />}
                                  label="Benefício"
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                />
                              )}
                              <Button size="small" variant="outlined">
                                Ver
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default FeedbackAnalyticsDashboard;
