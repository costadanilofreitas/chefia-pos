import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Grid, Divider } from '@mui/material';
import { Assessment, Speed, CheckCircle } from '@mui/icons-material';

const ForecastMetricsCard = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <Card sx={{ boxShadow: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment color="primary" />
          Métricas da Previsão
        </Typography>
        
        <Divider sx={{ my: 1 }} />
        
        <Grid container spacing={2}>
          {metrics.accuracy && (
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Precisão
              </Typography>
              <Typography variant="h6">
                {(metrics.accuracy * 100).toFixed(1)}%
              </Typography>
            </Grid>
          )}
          
          {metrics.mape !== undefined && (
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                MAPE
              </Typography>
              <Typography variant="h6">
                {(metrics.mape * 100).toFixed(1)}%
              </Typography>
            </Grid>
          )}
          
          {metrics.rmse !== undefined && (
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                RMSE
              </Typography>
              <Typography variant="h6">
                {metrics.rmse.toFixed(2)}
              </Typography>
            </Grid>
          )}
          
          {metrics.mae !== undefined && (
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                MAE
              </Typography>
              <Typography variant="h6">
                {metrics.mae.toFixed(2)}
              </Typography>
            </Grid>
          )}
        </Grid>
        
        {metrics.model_used && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Modelo Utilizado
            </Typography>
            <Chip 
              label={metrics.model_used} 
              size="small" 
              color="primary" 
              sx={{ mt: 0.5 }}
            />
          </Box>
        )}
        
        {metrics.training_time && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Speed fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Tempo de Treinamento: {metrics.training_time} segundos
            </Typography>
          </Box>
        )}
        
        {metrics.last_updated && (
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle fontSize="small" color="success" />
            <Typography variant="body2" color="text.secondary">
              Atualizado em: {new Date(metrics.last_updated).toLocaleString()}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ForecastMetricsCard;
