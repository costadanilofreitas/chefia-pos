import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Grid, LinearProgress } from '@mui/material';
import { TrendingUp, TrendingDown, Warning } from '@mui/icons-material';

const RecommendationCard = ({ recommendation }) => {
  // Determinar ícone e cor com base no tipo de recomendação
  const getRecommendationIcon = () => {
    if (recommendation.action === 'increase') {
      return <TrendingUp color="success" />;
    } else if (recommendation.action === 'decrease') {
      return <TrendingDown color="error" />;
    } else {
      return <Warning color="warning" />;
    }
  };

  // Calcular porcentagem para barra de progresso
  const calculatePercentage = () => {
    const current = recommendation.current_stock || 0;
    const recommended = recommendation.recommended_stock || 0;
    
    if (current === 0 && recommended === 0) return 0;
    if (recommended === 0) return 100;
    
    return Math.min(100, Math.max(0, (current / recommended) * 100));
  };

  // Determinar cor da barra de progresso
  const getProgressColor = () => {
    const percentage = calculatePercentage();
    
    if (percentage < 30) return 'error';
    if (percentage < 70) return 'warning';
    if (percentage <= 100) return 'success';
    return 'info';
  };

  return (
    <Card sx={{ mb: 2, boxShadow: 2 }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={1}>
            {getRecommendationIcon()}
          </Grid>
          <Grid item xs={11}>
            <Typography variant="h6" gutterBottom>
              {recommendation.product_name || `Produto ${recommendation.product_id}`}
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Estoque atual: {recommendation.current_stock || 0} unidades
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Recomendado: {recommendation.recommended_stock || 0} unidades
              </Typography>
            </Box>
            
            <Box sx={{ width: '100%', mb: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={calculatePercentage()} 
                color={getProgressColor()}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              {recommendation.action && (
                <Chip 
                  label={
                    recommendation.action === 'increase' ? 'Aumentar Estoque' : 
                    recommendation.action === 'decrease' ? 'Reduzir Estoque' : 
                    'Manter Estoque'
                  } 
                  size="small" 
                  color={
                    recommendation.action === 'increase' ? 'success' : 
                    recommendation.action === 'decrease' ? 'error' : 
                    'info'
                  } 
                />
              )}
              
              {recommendation.urgency && (
                <Chip 
                  label={
                    recommendation.urgency === 'high' ? 'Urgente' : 
                    recommendation.urgency === 'medium' ? 'Moderado' : 
                    'Baixa Urgência'
                  } 
                  size="small" 
                  color={
                    recommendation.urgency === 'high' ? 'error' : 
                    recommendation.urgency === 'medium' ? 'warning' : 
                    'success'
                  } 
                />
              )}
              
              {recommendation.confidence && (
                <Chip 
                  label={`Confiança: ${Math.round(recommendation.confidence * 100)}%`} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              )}
            </Box>
            
            {recommendation.reason && (
              <Typography variant="body2" color="text.secondary">
                <strong>Motivo:</strong> {recommendation.reason}
              </Typography>
            )}
            
            {recommendation.expected_demand && (
              <Typography variant="body2" color="text.secondary">
                <strong>Demanda esperada:</strong> {recommendation.expected_demand} unidades
              </Typography>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default RecommendationCard;
