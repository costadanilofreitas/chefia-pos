import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
  dot = false
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full select-none';
  
  const variants = {
    default: 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100',
    primary: 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
    success: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100',
    warning: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
    danger: 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100',
    info: 'bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-100'
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };
  
  const dotColors = {
    default: 'bg-gray-500',
    primary: 'bg-primary-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500'
  };
  
  return (
    <span
      className={twMerge(
        clsx(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )
      )}
    >
      {dot && (
        <span className={clsx('w-2 h-2 rounded-full mr-1.5', dotColors[variant])} />
      )}
      {children}
    </span>
  );
};