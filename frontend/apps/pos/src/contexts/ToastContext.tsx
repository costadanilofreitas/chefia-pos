import React, { createContext, useContext } from 'react';
import Toast from '../components/Toast';
import { useToastHelpers } from '../utils/toastHelpers';

interface ToastContextType {
  success: (__message: string, _duration?: number) => void;
  error: (__message: string, _duration?: number) => void;
  warning: (__message: string, _duration?: number) => void;
  info: (__message: string, _duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toasts, removeToast, success, error, warning, info } = useToastHelpers();

  const value = {
    success,
    error,
    warning,
    info,
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