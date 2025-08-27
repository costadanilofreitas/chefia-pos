import { useCallback, useState } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface ToastHelpers {
  toasts: ToastMessage[];
  showToast: (message: string, type: ToastMessage['type'], duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

export const useToastHelpers = (): ToastHelpers => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info', duration?: number) => {
    const id = Date.now().toString() + Math.random().toString(36);
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return {
    toasts,
    showToast,
    removeToast,
    success: useCallback((message: string, duration?: number) => showToast(message, 'success', duration), [showToast]),
    error: useCallback((message: string, duration?: number) => showToast(message, 'error', duration), [showToast]),
    warning: useCallback((message: string, duration?: number) => showToast(message, 'warning', duration), [showToast]),
    info: useCallback((message: string, duration?: number) => showToast(message, 'info', duration), [showToast]),
  };
};