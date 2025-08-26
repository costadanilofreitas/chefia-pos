import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/Toast';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextType {
  success: (__message: string, _duration?: number) => void;
  error: (__message: string, _duration?: number) => void;
  warning: (__message: string, _duration?: number) => void;
  info: (__message: string, _duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info', duration?: number) => {
    const id = Date.now().toString() + Math.random().toString(36);
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value = {
    success: useCallback((message: string, duration?: number) => showToast(message, 'success', duration), [showToast]),
    error: useCallback((message: string, duration?: number) => showToast(message, 'error', duration), [showToast]),
    warning: useCallback((message: string, duration?: number) => showToast(message, 'warning', duration), [showToast]),
    info: useCallback((message: string, duration?: number) => showToast(message, 'info', duration), [showToast]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast messages={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Return a safe fallback that does nothing instead of throwing
    return {
      success: (__message: string, _duration?: number) => {},
      error: (__message: string, _duration?: number) => {},
      warning: (__message: string, _duration?: number) => {},
      info: (__message: string, _duration?: number) => {},
    };
  }
  return context;
};