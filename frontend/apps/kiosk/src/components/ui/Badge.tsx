import { memo } from 'react';

interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
  className?: string;
}

/**
 * Badge component for displaying small labels and counts
 */
export const Badge = memo<BadgeProps>(({ 
  variant = 'primary',
  children,
  className = ''
}) => {
  const variantClasses = {
    primary: 'bg-primary-500 text-white',
    secondary: 'bg-gray-500 text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-white',
    danger: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white'
  };

  return (
    <span className={`
      inline-flex items-center justify-center
      px-2 py-1 text-xs font-medium rounded-full
      ${variantClasses[variant]}
      ${className}
    `}>
      {children}
    </span>
  );
});