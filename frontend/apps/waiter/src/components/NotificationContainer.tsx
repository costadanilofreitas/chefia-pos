import React, { memo } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const NotificationItem = memo(({ 
  notification 
}: { 
  notification: { 
    id: string; 
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
  } 
}) => {
  const { removeNotification } = useNotifications();

  const variants = {
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-800 dark:text-green-200',
      icon: <CheckCircle className="h-5 w-5" />
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: <AlertCircle className="h-5 w-5" />
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-200',
      icon: <AlertTriangle className="h-5 w-5" />
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: <Info className="h-5 w-5" />
    }
  };

  const variantStyles = variants[notification.type];

  return (
    <div
      className={twMerge(
        clsx(
          'pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 transition-all transform',
          'animate-in slide-in-from-right duration-300',
          variantStyles.bg,
          variantStyles.border,
          variantStyles.text
        )
      )}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {variantStyles.icon}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium">
              {notification.title}
            </p>
            {notification.message && (
              <p className="mt-1 text-sm opacity-90">
                {notification.message}
              </p>
            )}
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <button
              className="inline-flex rounded-md hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2"
              onClick={() => removeNotification(notification.id)}
            >
              <span className="sr-only">Fechar</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

NotificationItem.displayName = 'NotificationItem';

export const NotificationContainer: React.FC = memo(() => {
  const { notifications } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-50 flex items-end px-4 py-6 sm:items-start sm:p-6"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        {notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
          />
        ))}
      </div>
    </div>
  );
});

NotificationContainer.displayName = 'NotificationContainer';