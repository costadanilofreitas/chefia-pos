import React, { memo, useMemo, useCallback, useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Box,
  IconButton,
  Collapse
} from '@mui/material';
import { 
  Person, 
  Phone, 
  Email, 
  LocationOn,
  ExpandMore,
  ExpandLess,
  Star,
  TrendingUp
} from '@mui/icons-material';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  totalSpent: number;
  visits: number;
  lastVisit: string;
  address?: {
    street: string;
    city: string;
    zipCode: string;
  };
}

interface OptimizedCustomerCardProps {
  customer: Customer;
  onCustomerSelect: (customer: Customer) => void;
  onPointsAdjust: (customerId: string) => void;
}

// Memoized customer card component
const OptimizedCustomerCard = memo<OptimizedCustomerCardProps>(({ 
  customer, 
  onCustomerSelect, 
  onPointsAdjust 
}) => {
  const [expanded, setExpanded] = useState(false);

  const tierColors = useMemo(() => ({
    bronze: '#cd7f32',
    silver: '#c0c0c0', 
    gold: '#ffd700',
    platinum: '#e5e4e2'
  }), []);

  const tierLabels = useMemo(() => ({
    bronze: 'Bronze',
    silver: 'Prata',
    gold: 'Ouro', 
    platinum: 'Platina'
  }), []);

  const handleExpand = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  const handleSelect = useCallback(() => {
    onCustomerSelect(customer);
  }, [customer, onCustomerSelect]);

  const handlePointsAdjust = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onPointsAdjust(customer.id);
  }, [customer.id, onPointsAdjust]);

  const formattedLastVisit = useMemo(() => {
    return new Date(customer.lastVisit).toLocaleDateString('pt-BR');
  }, [customer.lastVisit]);

  const formattedTotalSpent = useMemo(() => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(customer.totalSpent);
  }, [customer.totalSpent]);

  return (
    <Card 
      sx={{ 
        mb: 1, 
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)'
        }
      }}
      onClick={handleSelect}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                {customer.name}
              </Typography>
              <Chip
                label={tierLabels[customer.tier]}
                size="small"
                sx={{
                  backgroundColor: tierColors[customer.tier],
                  color: customer.tier === 'gold' ? 'black' : 'white',
                  fontWeight: 'bold',
                  fontSize: '0.7rem'
                }}
              />
            </Box>

            <Box display="flex" gap={2} mb={1}>
              <Typography variant="body2" color="text.secondary">
                <Star sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                {customer.points} pts
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <TrendingUp sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                {formattedTotalSpent}
              </Typography>
            </Box>

            <Typography variant="caption" color="text.secondary">
              {customer.visits} visitas • Última: {formattedLastVisit}
            </Typography>
          </Box>

          <Box display="flex" alignItems="center">
            <IconButton
              size="small"
              onClick={handlePointsAdjust}
              sx={{ mr: 1 }}
            >
              <Star />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleExpand}
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={expanded}>
          <List dense sx={{ pt: 1 }}>
            <ListItem sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Email sx={{ fontSize: 16 }} />
              </ListItemIcon>
              <ListItemText 
                primary={customer.email}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            
            <ListItem sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Phone sx={{ fontSize: 16 }} />
              </ListItemIcon>
              <ListItemText 
                primary={customer.phone}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>

            {customer.address && (
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <LocationOn sx={{ fontSize: 16 }} />
                </ListItemIcon>
                <ListItemText 
                  primary={`${customer.address.street}, ${customer.address.city}`}
                  secondary={customer.address.zipCode}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            )}
          </List>
        </Collapse>
      </CardContent>
    </Card>
  );
});

OptimizedCustomerCard.displayName = 'OptimizedCustomerCard';

export default OptimizedCustomerCard;

