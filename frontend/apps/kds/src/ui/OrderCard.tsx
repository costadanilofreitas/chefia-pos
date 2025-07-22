import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Grid,
  Divider
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TimerIcon from '@mui/icons-material/Timer';

type OrderItem = {
  id: string | number;
  name: string;
  quantity: number;
  notes?: string;
  status: string;
};

type Order = {
  id: string | number;
  created_at: string | Date;
  priority: 'urgent' | 'high' | 'normal' | 'low' | string;
  type: 'delivery' | 'table' | string;
  table_number?: string | number;
  delivery_id?: string | number;
  items: OrderItem[];
  customer_name?: string;
};

type OrderCardProps = {
  order: Order;
  onStatusChange: (orderId: string | number, newStatus: string) => void;
  onItemStatusChange: (
    orderId: string | number,
    itemId: string | number,
    newStatus: string
  ) => void;
  nextStatus: string;
};

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onStatusChange,
  onItemStatusChange,
  nextStatus
}) => {
  const getElapsedTime = (timestamp: string | Date): string => {
    const now = new Date();
    const orderTime = new Date(timestamp);
    const diffMs = now.getTime() - orderTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Agora';
    if (diffMins === 1) return '1 min';
    return `${diffMins} mins`;
  };

  const getPriorityColor = (
    priority: string
  ): 'error' | 'warning' | 'info' | 'success' | 'default' => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'normal':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getButtonText = (status: string): string => {
    switch (status) {
      case 'preparing':
        return 'Iniciar Preparo';
      case 'ready':
        return 'Marcar como Pronto';
      case 'delivered':
        return 'Entregar';
      default:
        return 'Avançar';
    }
  };

  return (
    <Card
      sx={{
        mb: 2,
        border: '1px solid',
        borderColor:
          getPriorityColor(order.priority) === 'default'
            ? 'grey.300'
            : `${getPriorityColor(order.priority)}.main`,
        boxShadow: 2
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1
          }}
        >
          <Typography variant="h6">Pedido #{order.id}</Typography>
          <Chip
            label={order.priority.toUpperCase()}
            color={getPriorityColor(order.priority)}
            size="small"
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TimerIcon fontSize="small" sx={{ mr: 0.5 }} />
            <Typography variant="body2">
              {getElapsedTime(order.created_at)}
            </Typography>
          </Box>
          <Typography variant="body2">
            {order.type === 'delivery' ? 'Delivery' : 'Mesa'}{' '}
            {order.table_number || order.delivery_id}
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Itens:
        </Typography>

        {order.items &&
          order.items.map((item) => (
            <Grid container key={item.id} sx={{ mb: 1 }}>
              <Grid item xs={1}>
                <Typography variant="body2">{item.quantity}x</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">
                  <strong>{item.name}</strong>
                  {item.notes && (
                    <Box
                      component="span"
                      sx={{
                        display: 'block',
                        fontSize: '0.8rem',
                        color: 'text.secondary'
                      }}
                    >
                      {item.notes}
                    </Box>
                  )}
                </Typography>
              </Grid>
              <Grid item xs={3} sx={{ textAlign: 'right' }}>
                <Button
                  size="small"
                  variant={item.status === nextStatus ? 'contained' : 'outlined'}
                  color={item.status === nextStatus ? 'success' : 'primary'}
                  startIcon={
                    item.status === nextStatus ? <CheckCircleIcon /> : null
                  }
                  onClick={() =>
                    onItemStatusChange(order.id, item.id, nextStatus)
                  }
                >
                  {item.status === nextStatus ? 'Pronto' : 'Marcar'}
                </Button>
              </Grid>
            </Grid>
          ))}

        <Divider sx={{ my: 2 }} />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Typography variant="body2">
            Cliente: {order.customer_name || 'Não identificado'}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => onStatusChange(order.id, nextStatus)}
          >
            {getButtonText(nextStatus)}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default OrderCard;
