/**
 * Reusable Status Badge Component
 * Displays status with appropriate styling
 */

import React from 'react';
import { Badge } from '../ui/Badge';

interface StatusConfig {
  variant: 'success' | 'warning' | 'info' | 'danger' | 'default';
  label: string;
  icon?: React.ReactNode;
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  // Table statuses
  available: { variant: 'success', label: 'Disponível' },
  occupied: { variant: 'warning', label: 'Ocupada' },
  reserved: { variant: 'info', label: 'Reservada' },
  
  // Order statuses
  new: { variant: 'info', label: 'Novo' },
  pending: { variant: 'warning', label: 'Pendente' },
  preparing: { variant: 'info', label: 'Preparando' },
  ready: { variant: 'success', label: 'Pronto' },
  delivered: { variant: 'default', label: 'Entregue' },
  paid: { variant: 'success', label: 'Pago' },
  cancelled: { variant: 'danger', label: 'Cancelado' },
  
  // Item statuses
  waiting: { variant: 'warning', label: 'Aguardando' },
  in_progress: { variant: 'info', label: 'Em preparo' },
  completed: { variant: 'success', label: 'Concluído' },
  
  // Connection statuses
  online: { variant: 'success', label: 'Online' },
  offline: { variant: 'danger', label: 'Offline' },
  connecting: { variant: 'warning', label: 'Conectando' },
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  icon?: React.ReactNode;
  dot?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  icon,
  dot = false,
  size = 'md',
  className = ''
}) => {
  const config = STATUS_CONFIGS[status.toLowerCase()] || {
    variant: 'default' as const,
    label: status
  };
  
  return (
    <Badge
      variant={config.variant}
      dot={dot}
      size={size}
      className={className}
    >
      {icon || config.icon}
      {label || config.label}
    </Badge>
  );
};

// Export helper to get status config
export const getStatusConfig = (status: string): StatusConfig => {
  return STATUS_CONFIGS[status.toLowerCase()] || {
    variant: 'default',
    label: status
  };
};