import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Grid } from '@mui/material';
import { Warning as WarningIcon, Error as ErrorIcon, Info as InfoIcon } from '@mui/icons-material';

const AlertCard = ({ alert, products, categories }) => {
  // Determinar ícone e cor com base no tipo de alerta
  const getAlertIcon = (type) => {
    switch (type) {
      case 'high_demand':
      case 'stock_risk':
        return <WarningIcon color="warning" />;
      case 'anomaly':
      case 'critical':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'high_demand':
      case 'stock_risk':
        return 'warning.light';
      case 'anomaly':
      case 'critical':
        return 'error.light';
      default:
        return 'info.light';
    }
  };

  // Formatar título do alerta
  const formatAlertTitle = (alert) => {
    switch (alert.alert_type) {
      case 'high_demand':
        return 'Pico de Demanda Previsto';
      case 'stock_risk':
        return 'Risco de Falta de Estoque';
      case 'anomaly':
        return 'Anomalia Detectada';
      case 'low_demand':
        return 'Baixa Demanda Prevista';
      case 'opportunity':
        return 'Oportunidade Identificada';
      default:
        return 'Alerta';
    }
  };

  // Obter nome do produto ou categoria
  const getDimensionName = (alert) => {
    if (alert.dimension_values.product) {
      const product = products.find(p => p.id === alert.dimension_values.product);
      return product ? product.name : alert.dimension_values.product;
    }
    
    if (alert.dimension_values.category) {
      const category = categories.find(c => c.id === alert.dimension_values.category);
      return category ? category.name : alert.dimension_values.category;
    }
    
    return 'Restaurante';
  };

  return (
    <Card 
      sx={{ 
        mb: 2, 
        borderLeft: 4, 
        borderColor: getAlertColor(alert.alert_type),
        boxShadow: 2
      }}
    >
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={1}>
            {getAlertIcon(alert.alert_type)}
          </Grid>
          <Grid item xs={11}>
            <Typography variant="h6" gutterBottom>
              {formatAlertTitle(alert)}
            </Typography>
            
            <Typography variant="body1" paragraph>
              {alert.message}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Chip 
                label={getDimensionName(alert)} 
                size="small" 
                color="primary" 
                variant="outlined"
              />
              
              {alert.start_date && alert.end_date && (
                <Chip 
                  label={`${new Date(alert.start_date).toLocaleDateString()} - ${new Date(alert.end_date).toLocaleDateString()}`} 
                  size="small" 
                  color="secondary" 
                  variant="outlined"
                />
              )}
              
              {alert.severity && (
                <Chip 
                  label={alert.severity === 'high' ? 'Alta' : alert.severity === 'medium' ? 'Média' : 'Baixa'} 
                  size="small" 
                  color={alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'success'} 
                />
              )}
            </Box>
            
            {alert.recommendation && (
              <Typography variant="body2" color="text.secondary">
                <strong>Recomendação:</strong> {alert.recommendation}
              </Typography>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default AlertCard;
