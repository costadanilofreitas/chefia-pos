import { useState, useCallback, useEffect, useRef } from 'react';
import { audioService } from '../services/audioService';

interface Alert {
  id: string;
  type: 'new' | 'urgent' | 'ready' | 'warning';
  message: string;
  timestamp: Date;
  orderId?: string;
}

interface UseKDSAlertsOptions {
  maxAlerts?: number;
  autoRemoveDelay?: number;
  soundEnabled?: boolean;
}

export function useKDSAlerts(options: UseKDSAlertsOptions = {}) {
  const {
    maxAlerts = 10,
    autoRemoveDelay = 5000,
    soundEnabled = true
  } = options;

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [mutedTypes, setMutedTypes] = useState<Set<Alert['type']>>(new Set());
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Remove alert
  const removeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    
    // Clear timer if exists
    const timer = timersRef.current.get(alertId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(alertId);
    }
  }, []);

  // Add new alert
  const addAlert = useCallback((
    type: Alert['type'],
    message: string,
    orderId?: string
  ) => {
    const alert: Alert = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      timestamp: new Date(),
      ...(orderId && { orderId })
    };

    setAlerts(prev => {
      // Keep only the most recent alerts
      const updated = [alert, ...prev].slice(0, maxAlerts);
      return updated;
    });

    // Play sound if enabled and not muted
    if (soundEnabled && !mutedTypes.has(type)) {
      audioService.playSound(type === 'new' ? 'newOrder' : type === 'urgent' ? 'urgentOrder' : type === 'ready' ? 'success' : 'warning');
    }

    // Auto-remove after delay
    if (autoRemoveDelay > 0) {
      const alertId = alert.id;
      const timer = setTimeout(() => {
        removeAlert(alertId);
      }, autoRemoveDelay);
      
      timersRef.current.set(alertId, timer);
    }

    return alert.id;
  }, [maxAlerts, autoRemoveDelay, soundEnabled, mutedTypes, removeAlert]);

  // Clear all alerts
  const clearAlerts = useCallback(() => {
    // Clear all timers
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current.clear();
    
    setAlerts([]);
  }, []);

  // Toggle mute for specific alert type
  const toggleMute = useCallback((type: Alert['type']) => {
    setMutedTypes(prev => {
      const updated = new Set(prev);
      if (updated.has(type)) {
        updated.delete(type);
      } else {
        updated.add(type);
      }
      return updated;
    });
  }, []);

  // Check if type is muted
  const isMuted = useCallback((type: Alert['type']) => {
    return mutedTypes.has(type);
  }, [mutedTypes]);

  // Alert statistics
  const getAlertStats = useCallback(() => {
    const stats = {
      total: alerts.length,
      byType: {} as Record<Alert['type'], number>
    };

    alerts.forEach(alert => {
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
    });

    return stats;
  }, [alerts]);

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(timer => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  // Create alert helpers for common scenarios
  const alertHelpers = {
    newOrder: (orderId: string) => 
      addAlert('new', `Novo pedido #${orderId}`, orderId),
    
    urgentOrder: (orderId: string) => 
      addAlert('urgent', `Pedido #${orderId} urgente!`, orderId),
    
    orderReady: (orderId: string) => 
      addAlert('ready', `Pedido #${orderId} pronto`, orderId),
    
    orderDelayed: (orderId: string, minutes: number) => 
      addAlert('warning', `Pedido #${orderId} atrasado ${minutes} min`, orderId)
  };

  return {
    alerts,
    addAlert,
    removeAlert,
    clearAlerts,
    toggleMute,
    isMuted,
    mutedTypes,
    stats: getAlertStats(),
    ...alertHelpers
  };
}