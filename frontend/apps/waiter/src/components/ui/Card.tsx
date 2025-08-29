import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ 
  className, 
  children, 
  onClick,
  hoverable = false,
  padding = 'md'
}) => {
  const baseStyles = 'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700';
  
  const paddingSizes = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6'
  };
  
  const hoverStyles = hoverable ? 'hover:shadow-md transition-shadow cursor-pointer' : '';
  
  // Add select-none class when card is clickable to prevent text selection
  const interactiveStyles = onClick ? 'select-none' : '';
  
  return (
    <div 
      className={twMerge(
        clsx(
          baseStyles,
          paddingSizes[padding],
          hoverStyles,
          interactiveStyles,
          className
        )
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ className, children }) => {
  return (
    <div className={twMerge('px-4 py-3 border-b border-gray-200 dark:border-gray-700', className)}>
      {children}
    </div>
  );
};

export interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({ className, children }) => {
  return (
    <div className={twMerge('p-4', className)}>
      {children}
    </div>
  );
};

export interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({ className, children }) => {
  return (
    <div className={twMerge('px-4 py-3 border-t border-gray-200 dark:border-gray-700', className)}>
      {children}
    </div>
  );
};