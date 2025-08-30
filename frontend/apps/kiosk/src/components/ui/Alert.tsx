import { memo } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface AlertProps {
  severity?: 'error' | 'warning' | 'info' | 'success';
  type?: 'error' | 'warning' | 'info' | 'success'; // Alias for severity
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const AlertComponent: React.FC<AlertProps> = ({ 
  severity,
  type,
  children,
  onClose,
  className = ''
}) => {
  const alertType = type || severity || 'info';
  const severityStyles = {
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: AlertCircle
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-200',
      icon: AlertTriangle
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: Info
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-800 dark:text-green-200',
      icon: CheckCircle
    }
  };

  const styles = severityStyles[alertType];
  const IconComponent = styles.icon;

  return (
    <div 
      className={`
        flex items-start gap-3 p-4 rounded-lg border
        ${styles.bg} ${styles.border} ${styles.text}
        ${className}
      `}
      role="alert"
    >
      <IconComponent className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className={`
            ml-auto -mr-1 -mt-1 p-1 rounded-lg
            hover:bg-black/10 dark:hover:bg-white/10
            transition-colors
          `}
          aria-label="Fechar alerta"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export const Alert = memo(AlertComponent);
export default Alert;