import React from 'react';
import { cn } from '../../utils/cn';

interface DialogButtonProps {
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const DialogButton: React.FC<DialogButtonProps> = ({
  onClick,
  variant = 'secondary',
  children,
  className,
  disabled = false
}) => {
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-4 py-2 text-sm font-medium rounded-md',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors duration-200',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

interface DialogFooterProps {
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelText?: string;
  confirmText?: string;
  confirmVariant?: 'primary' | 'danger';
  children?: React.ReactNode;
  loading?: boolean;
}

export const DialogFooter: React.FC<DialogFooterProps> = ({
  onCancel,
  onConfirm,
  cancelText = 'Cancelar',
  confirmText = 'Confirmar',
  confirmVariant = 'primary',
  children,
  loading = false
}) => {
  if (children) return <>{children}</>;

  return (
    <div className="flex justify-end space-x-2">
      {onCancel && (
        <DialogButton onClick={onCancel} variant="secondary" disabled={loading}>
          {cancelText}
        </DialogButton>
      )}
      {onConfirm && (
        <DialogButton onClick={onConfirm} variant={confirmVariant} disabled={loading}>
          {loading ? 'Processando...' : confirmText}
        </DialogButton>
      )}
    </div>
  );
};

interface DialogHeaderProps {
  title: string;
  onClose?: () => void;
  className?: string;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ 
  title, 
  onClose,
  className 
}) => {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        {title}
      </h3>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1"
          aria-label="Fechar"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};