import React from 'react';
import { Paper, Typography, Grid, Box, CircularProgress } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

/**
 * Componente de estatísticas para o KDS
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.stats - Dados estatísticos
 * @returns {JSX.Element} Componente de estatísticas do KDS
 */
const KDSStats = ({ stats = {} }) => {
  // Valores padrão caso as estatísticas não estejam disponíveis
  const {
    avg_preparation_time = 0,
    orders_completed_today = 0,
    orders_in_progress = 0,
    orders_pending = 0,
    efficiency_rate = 0,
    trend = 'stable'
  } = stats;

  // Formatar tempo médio de preparação
  const formatTime = (minutes) => {
    if (minutes < 1) return 'Menos de 1 min';
    if (minutes === 1) return '1 min';
    return `${minutes} mins`;
  };

  // Determinar ícone de tendência
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon color="success" />;
      case 'down':
        return <TrendingDownIcon color="error" />;
      default:
        return null;
    }
  };

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Estatísticas
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <AccessTimeIcon sx={{ mr: 1 }} color="primary" />
            <Typography variant="body2">
              Tempo médio de preparo: {formatTime(avg_preparation_time)}
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={6}>
          <Typography variant="body2" color="text.secondary">
            Pedidos Hoje
          </Typography>
          <Typography variant="h6">
            {orders_completed_today}
          </Typography>
        </Grid>
        
        <Grid item xs={6}>
          <Typography variant="body2" color="text.secondary">
            Em Andamento
          </Typography>
          <Typography variant="h6">
            {orders_in_progress}
          </Typography>
        </Grid>
        
        <Grid item xs={6}>
          <Typography variant="body2" color="text.secondary">
            Pendentes
          </Typography>
          <Typography variant="h6">
            {orders_pending}
          </Typography>
        </Grid>
        
        <Grid item xs={6}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              Eficiência
            </Typography>
            {getTrendIcon()}
          </Box>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress 
              variant="determinate" 
              value={efficiency_rate} 
              color={efficiency_rate > 70 ? "success" : efficiency_rate > 40 ? "warning" : "error"}
            />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="caption" component="div" color="text.secondary">
                {`${Math.round(efficiency_rate)}%`}
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default KDSStats;
