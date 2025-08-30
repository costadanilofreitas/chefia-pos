import { memo, useCallback } from 'react';
import { clsx } from 'clsx';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  children: React.ReactNode;
  haptic?: boolean;
  hapticPattern?: 'light' | 'medium' | 'heavy';
  loading?: boolean;
}

const TouchButtonComponent: React.FC<TouchButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  startIcon,
  endIcon,
  children,
  className,
  disabled,
  haptic = true,
  hapticPattern = 'light',
  loading = false,
  onClick,
  ...props
}) => {
  const hapticFeedback = useHapticFeedback({ pattern: hapticPattern });

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (haptic && !disabled && !loading) {
      hapticFeedback.custom(hapticPattern);
    }
    onClick?.(e);
  }, [haptic, disabled, loading, hapticPattern, onClick, hapticFeedback]);
  const variantStyles = {
    primary: `
      bg-primary-600 hover:bg-primary-700 
      text-white 
      shadow-sm hover:shadow-md
      disabled:bg-gray-400 disabled:cursor-not-allowed
    `,
    secondary: `
      bg-secondary-600 hover:bg-secondary-700 
      text-white 
      shadow-sm hover:shadow-md
      disabled:bg-gray-400 disabled:cursor-not-allowed
    `,
    outline: `
      bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800
      border-2 border-gray-300 dark:border-gray-600
      text-gray-700 dark:text-gray-300
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    ghost: `
      bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800
      text-gray-700 dark:text-gray-300
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    danger: `
      bg-red-600 hover:bg-red-700 
      text-white 
      shadow-sm hover:shadow-md
      disabled:bg-gray-400 disabled:cursor-not-allowed
    `
  };

  const sizeStyles = {
    small: 'min-h-[40px] px-4 py-2 text-sm gap-1.5',
    medium: 'min-h-[48px] px-5 py-3 text-base gap-2',
    large: 'min-h-[56px] px-6 py-4 text-lg gap-2.5'
  };

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center',
        'rounded-lg font-medium',
        'transition-all duration-200',
        'touch-manipulation select-none',
        'active:scale-[0.98]',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <svg 
            className="animate-spin h-5 w-5" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Carregando...</span>
        </div>
      ) : (
        <>
          {startIcon && <span className="flex-shrink-0">{startIcon}</span>}
          <span>{children}</span>
          {endIcon && <span className="flex-shrink-0">{endIcon}</span>}
        </>
      )}
    </button>
  );
};

export const TouchButton = memo(TouchButtonComponent);
export default TouchButton;