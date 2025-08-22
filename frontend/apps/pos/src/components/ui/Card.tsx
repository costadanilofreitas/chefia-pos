import React from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className,
    variant = 'default',
    padding = 'md',
    children,
    ...props
  }, ref) => {
    const baseStyles = 'rounded-xl transition-all duration-150';
    
    const variants = {
      default: 'bg-white dark:bg-gray-800 shadow-sm',
      bordered: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
      elevated: 'bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl',
      glass: 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border border-white/20 dark:border-gray-700/20'
    };
    
    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6'
    };
    
    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          paddings[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  className, 
  children,
  ...props 
}) => (
  <div 
    className={cn('px-4 py-3 border-b border-gray-200 dark:border-gray-700', className)}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ 
  className, 
  children,
  ...props 
}) => (
  <h3 
    className={cn('text-lg font-semibold text-gray-900 dark:text-white', className)}
    {...props}
  >
    {children}
  </h3>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  className, 
  children,
  ...props 
}) => (
  <div 
    className={cn('p-4', className)}
    {...props}
  >
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  className, 
  children,
  ...props 
}) => (
  <div 
    className={cn('px-4 py-3 border-t border-gray-200 dark:border-gray-700', className)}
    {...props}
  >
    {children}
  </div>
);

export default Card;