import React, { useEffect, useState } from 'react';
import { FaExclamationTriangle, FaBell, FaCheckCircle } from 'react-icons/fa';

interface VisualAlertProps {
  type: 'urgent' | 'new' | 'ready' | 'warning';
  message: string;
  duration?: number;
  onClose?: () => void;
  pulse?: boolean;
  position?: 'top' | 'bottom' | 'center';
}

export const VisualAlert: React.FC<VisualAlertProps> = ({
  type,
  message,
  duration = 5000,
  onClose,
  pulse = true,
  position = 'top'
}) => {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (duration && duration > 0) {
      const fadeTimer = setTimeout(() => {
        setFadeOut(true);
      }, duration - 500);

      const hideTimer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, duration);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
    return undefined;
  }, [duration, onClose]);

  if (!visible) return null;

  const getAlertStyles = () => {
    const baseStyles = 'fixed z-50 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px] max-w-[600px] transition-all duration-500';
    
    const positionStyles = {
      top: 'top-4',
      bottom: 'bottom-4',
      center: 'top-1/2 -translate-y-1/2'
    };

    const typeStyles = {
      urgent: 'bg-danger-600 text-white',
      new: 'bg-primary-600 text-white',
      ready: 'bg-success-600 text-white',
      warning: 'bg-warning-600 text-white'
    };

    const animationStyles = fadeOut 
      ? 'opacity-0 scale-95' 
      : 'opacity-100 scale-100';

    const pulseStyles = pulse && !fadeOut
      ? type === 'urgent' 
        ? 'animate-pulse-danger'
        : 'animate-pulse-subtle'
      : '';

    return `${baseStyles} ${positionStyles[position]} ${typeStyles[type]} ${animationStyles} ${pulseStyles}`;
  };

  const getIcon = () => {
    switch (type) {
      case 'urgent':
        return <FaExclamationTriangle className="text-2xl animate-bounce" />;
      case 'new':
        return <FaBell className="text-2xl animate-pulse" />;
      case 'ready':
        return <FaCheckCircle className="text-2xl" />;
      case 'warning':
        return <FaExclamationTriangle className="text-2xl" />;
    }
  };

  return (
    <div className={getAlertStyles()} role="alert" aria-live="assertive">
      {getIcon()}
      <div className="flex-1">
        <p className="font-semibold text-lg">{message}</p>
      </div>
      {!duration && (
        <button
          onClick={() => {
            setFadeOut(true);
            setTimeout(() => {
              setVisible(false);
              onClose?.();
            }, 500);
          }}
          className="ml-4 text-white hover:text-gray-200 transition-colors"
          aria-label="Fechar alerta"
        >
          ✕
        </button>
      )}
    </div>
  );
};

interface AlertSystemProps {
  alerts: Array<{
    id: string;
    type: 'urgent' | 'new' | 'ready' | 'warning';
    message: string;
    duration?: number;
  }>;
  onAlertClose?: (id: string) => void;
}

export const AlertSystem: React.FC<AlertSystemProps> = ({
  alerts,
  onAlertClose
}) => {
  return (
    <>
      {alerts.map((alert, index) => (
        <div
          key={alert.id}
          style={{
            transform: `translateY(${index * 80}px)`
          }}
        >
          <VisualAlert
            type={alert.type}
            message={alert.message}
            duration={alert.duration || 5000}
            onClose={() => onAlertClose?.(alert.id)}
          />
        </div>
      ))}
    </>
  );
};