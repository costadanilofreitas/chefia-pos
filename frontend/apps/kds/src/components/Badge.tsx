import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  icon,
}) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    success: 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200',
    warning: 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200',
    danger: 'bg-danger-100 text-danger-800 dark:bg-danger-900 dark:text-danger-200',
    info: 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  };
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };
  
  return (
    <span 
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
};