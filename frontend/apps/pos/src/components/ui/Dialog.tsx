import React, { useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  closeOnOverlayClick?: boolean;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
  closeOnOverlayClick = true,
  ...props
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
      dialogRef.current?.focus();
    } else {
      previousFocus.current?.focus();
    }
  }, [open]);

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4'
  };

  const titleId = props['aria-labelledby'] || 'dialog-title';
  const descId = props['aria-describedby'] || 'dialog-description';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
    >
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />
      
      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          'relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl',
          'animate-scale-up max-h-[90vh] overflow-auto',
          sizes[size],
          className
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            {title && (
              <h2 
                id={titleId}
                className="text-xl font-semibold text-gray-900 dark:text-white"
              >
                {title}
              </h2>
            )}
            {description && (
              <p 
                id={descId}
                className="mt-1 text-sm text-gray-500 dark:text-gray-400"
              >
                {description}
              </p>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="px-6 py-4">
          {children}
        </div>
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close dialog"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  className, 
  children,
  ...props 
}) => (
  <div 
    className={cn('px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2', className)}
    {...props}
  >
    {children}
  </div>
);

export default Dialog;