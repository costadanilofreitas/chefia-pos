import React, { memo, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box,
  LinearProgress,
  Chip
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  Remove,
  AttachMoney,
  People,
  ShoppingCart,
  Schedule
} from '@mui/icons-material';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
    period: string;
  };
  progress?: {
    current: number;
    target: number;
    label: string;
  };
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
}

// Memoized KPI card component for dashboard performance
const OptimizedKPICard = memo<KPICardProps>(({ 
  title, 
  value, 
  subtitle, 
  trend, 
  progress, 
  icon, 
  color = 'primary',
  loading = false
}) => {
  const trendIcon = useMemo(() => {
    if (!trend) return null;
    
    switch (trend.direction) {
      case 'up':
        return <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'down':
        return <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />;
      default:
        return <Remove sx={{ fontSize: 16, color: 'text.secondary' }} />;
    }
  }, [trend]);

  const trendColor = useMemo(() => {
    if (!trend) return 'text.secondary';
    
    switch (trend.direction) {
      case 'up':
        return 'success.main';
      case 'down':
        return 'error.main';
      default:
        return 'text.secondary';
    }
  }, [trend]);

  const progressPercentage = useMemo(() => {
    if (!progress) return 0;
    return Math.min((progress.current / progress.target) * 100, 100);
  }, [progress]);

  const formattedValue = useMemo(() => {
    if (loading) return '...';
    
    if (typeof value === 'number') {
      // Format large numbers
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toLocaleString('pt-BR');
    }
    
    return value;
  }, [value, loading]);

  return (
    <Card 
      sx={{ 
        height: '100%',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)'
        }
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
          {icon && (
            <Box sx={{ color: `${color}.main`, opacity: 0.7 }}>
              {icon}
            </Box>
          )}
        </Box>

        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 'bold', 
            mb: 1,
            color: loading ? 'text.secondary' : 'text.primary'
          }}
        >
          {formattedValue}
        </Typography>

        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {subtitle}
          </Typography>
        )}

        {trend && (
          <Box display="flex" alignItems="center" gap={0.5} mb={1}>
            {trendIcon}
            <Typography 
              variant="body2" 
              sx={{ 
                color: trendColor,
                fontWeight: 500
              }}
            >
              {trend.percentage > 0 ? '+' : ''}{trend.percentage}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {trend.period}
            </Typography>
          </Box>
        )}

        {progress && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="caption" color="text.secondary">
                {progress.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {progress.current}/{progress.target}
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progressPercentage}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  backgroundColor: `${color}.main`
                }
              }}
            />
          </Box>
        )}

        {loading && (
          <LinearProgress 
            sx={{ 
              mt: 1,
              height: 2,
              borderRadius: 1
            }} 
          />
        )}
      </CardContent>
    </Card>
  );
});

OptimizedKPICard.displayName = 'OptimizedKPICard';

// Pre-configured KPI cards for common use cases
export const SalesKPICard = memo<Omit<KPICardProps, 'icon' | 'color'>>(props => (
  <OptimizedKPICard 
    {...props} 
    icon={<AttachMoney />} 
    color="success" 
  />
));

export const CustomersKPICard = memo<Omit<KPICardProps, 'icon' | 'color'>>(props => (
  <OptimizedKPICard 
    {...props} 
    icon={<People />} 
    color="primary" 
  />
));

export const OrdersKPICard = memo<Omit<KPICardProps, 'icon' | 'color'>>(props => (
  <OptimizedKPICard 
    {...props} 
    icon={<ShoppingCart />} 
    color="info" 
  />
));

export const TimeKPICard = memo<Omit<KPICardProps, 'icon' | 'color'>>(props => (
  <OptimizedKPICard 
    {...props} 
    icon={<Schedule />} 
    color="warning" 
  />
));

SalesKPICard.displayName = 'SalesKPICard';
CustomersKPICard.displayName = 'CustomersKPICard';
OrdersKPICard.displayName = 'OrdersKPICard';
TimeKPICard.displayName = 'TimeKPICard';

export default OptimizedKPICard;

