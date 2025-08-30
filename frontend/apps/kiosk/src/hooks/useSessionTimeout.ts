import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useOrder } from '../contexts/OrderContext';
import { offlineStorage } from '../services/offlineStorage';

interface UseSessionTimeoutOptions {
  timeoutDuration?: number; // in milliseconds
  warningDuration?: number; // warning before timeout in milliseconds
  onTimeout?: () => void;
  onWarning?: () => void;
  enabled?: boolean;
}

interface UseSessionTimeoutReturn {
  isWarning: boolean;
  timeRemaining: number;
  resetTimer: () => void;
  extendSession: () => void;
  endSession: () => void;
}

/**
 * Custom hook for managing session timeout in kiosk mode
 * Automatically logs out user and clears data after inactivity
 */
export function useSessionTimeout(options: UseSessionTimeoutOptions = {}): UseSessionTimeoutReturn {
  const {
    timeoutDuration = 5 * 60 * 1000, // 5 minutes default
    warningDuration = 60 * 1000, // 1 minute warning
    onTimeout,
    onWarning,
    enabled = true
  } = options;

  const { user, logout } = useAuth();
  const { clearCart } = useCart();
  const { clearCurrentOrder } = useOrder();

  const [isWarning, setIsWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeoutDuration);
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  // Handle timeout
  const handleTimeout = useCallback(() => {
    offlineStorage.log('Session timeout - clearing data');
    
    // Clear all data
    logout();
    clearCart();
    clearCurrentOrder();
    
    // Reset state
    setIsWarning(false);
    setTimeRemaining(timeoutDuration);
    
    // Call custom handler
    onTimeout?.();
    
    // Track timeout
    offlineStorage.trackAction('session_timeout', {
      duration: timeoutDuration,
      hadUser: !!user
    });
  }, [logout, clearCart, clearCurrentOrder, onTimeout, timeoutDuration, user]);

  // Handle warning
  const handleWarning = useCallback(() => {
    setIsWarning(true);
    offlineStorage.log('Session timeout warning');
    onWarning?.();
    
    // Track warning
    offlineStorage.trackAction('session_timeout_warning', {
      timeRemaining: warningDuration
    });
  }, [onWarning, warningDuration]);

  // Reset timer
  const resetTimer = useCallback(() => {
    if (!enabled) return;
    
    lastActivityRef.current = Date.now();
    setIsWarning(false);
    setTimeRemaining(timeoutDuration);
    
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    // Set warning timer
    if (warningDuration > 0) {
      warningRef.current = setTimeout(() => {
        handleWarning();
      }, timeoutDuration - warningDuration);
    }
    
    // Set timeout timer
    timeoutRef.current = setTimeout(() => {
      handleTimeout();
    }, timeoutDuration);
    
    // Update time remaining every second when warning
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, timeoutDuration - elapsed);
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 1000);
  }, [enabled, timeoutDuration, warningDuration, handleTimeout, handleWarning]);

  // Extend session
  const extendSession = useCallback(() => {
    offlineStorage.log('Session extended by user');
    resetTimer();
    
    // Track extension
    offlineStorage.trackAction('session_extended', {
      wasWarning: isWarning
    });
  }, [resetTimer, isWarning]);

  // End session manually
  const endSession = useCallback(() => {
    offlineStorage.log('Session ended manually');
    
    // Clear timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    // Trigger timeout behavior
    handleTimeout();
    
    // Track manual end
    offlineStorage.trackAction('session_ended_manually');
  }, [handleTimeout]);

  // Set up activity listeners
  useEffect(() => {
    if (!enabled) return;

    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    const handleActivity = () => {
      // Only reset if not in warning state or if significant time passed
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (!isWarning || timeSinceLastActivity > 5000) {
        resetTimer();
      }
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Initial timer setup
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, isWarning, resetTimer]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    isWarning,
    timeRemaining,
    resetTimer,
    extendSession,
    endSession
  };
}