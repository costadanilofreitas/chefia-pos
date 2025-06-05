import React, { memo, useMemo, useCallback } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Box, 
  Chip,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  TableRestaurant, 
  People, 
  AttachMoney, 
  Schedule,
  Visibility,
  Edit
} from '@mui/icons-material';

interface Table {
  id: number;
  number: number;
  seats: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  customer?: string;
  guests?: number;
  total?: number;
  time?: string;
  x: number;
  y: number;
  shape: 'round' | 'square' | 'rectangle';
  area: string;
}

interface OptimizedTableProps {
  table: Table;
  onTableClick: (table: Table) => void;
  onTableEdit: (table: Table) => void;
}

// Memoized table component for better performance
const OptimizedTable = memo<OptimizedTableProps>(({ table, onTableClick, onTableEdit }) => {
  const statusColors = useMemo(() => ({
    available: '#4caf50',
    occupied: '#f44336', 
    reserved: '#ff9800',
    cleaning: '#2196f3'
  }), []);

  const statusLabels = useMemo(() => ({
    available: 'Livre',
    occupied: 'Ocupada',
    reserved: 'Reservada', 
    cleaning: 'Limpeza'
  }), []);

  const handleClick = useCallback(() => {
    onTableClick(table);
  }, [table, onTableClick]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onTableEdit(table);
  }, [table, onTableEdit]);

  const tableStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: `${table.x}%`,
    top: `${table.y}%`,
    width: table.shape === 'rectangle' ? '120px' : '80px',
    height: table.shape === 'rectangle' ? '60px' : '80px',
    borderRadius: table.shape === 'round' ? '50%' : '8px',
    backgroundColor: statusColors[table.status],
    color: 'white',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '2px solid rgba(255,255,255,0.3)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    '&:hover': {
      transform: 'scale(1.05)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    }
  }), [table.x, table.y, table.shape, statusColors, table.status]);

  return (
    <Box
      sx={tableStyle}
      onClick={handleClick}
    >
      <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
        {table.number}
      </Typography>
      <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.9 }}>
        {table.seats} lugares
      </Typography>
      
      {table.status === 'occupied' && table.guests && (
        <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.8 }}>
          {table.guests} pessoas
        </Typography>
      )}
      
      <IconButton
        size="small"
        sx={{ 
          position: 'absolute',
          top: -8,
          right: -8,
          backgroundColor: 'rgba(255,255,255,0.9)',
          color: statusColors[table.status],
          width: 20,
          height: 20,
          '&:hover': {
            backgroundColor: 'white'
          }
        }}
        onClick={handleEdit}
      >
        <Edit sx={{ fontSize: 12 }} />
      </IconButton>
    </Box>
  );
});

OptimizedTable.displayName = 'OptimizedTable';

export default OptimizedTable;

