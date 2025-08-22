import React from 'react';
import { cn } from '../../utils/cn';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse';
  color?: 'primary' | 'secondary' | 'white';
  fullScreen?: boolean;
  text?: string;
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  variant = 'spinner',
  color = 'primary',
  fullScreen = false,
  text,
  className
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colors = {
    primary: 'text-blue-600 dark:text-blue-400',
    secondary: 'text-gray-600 dark:text-gray-400',
    white: 'text-white'
  };

  const Spinner = () => (
    <svg 
      className={cn('animate-spin', sizes[size], colors[color])}
      fill="none" 
      viewBox="0 0 24 24"
      aria-hidden="true"
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
  );

  const Dots = () => (
    <div className={cn('flex gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full animate-pulse',
            size === 'sm' ? 'w-1.5 h-1.5' : 
            size === 'md' ? 'w-2 h-2' : 
            size === 'lg' ? 'w-3 h-3' : 
            'w-4 h-4',
            colors[color],
            'bg-current'
          )}
          style={{
            animationDelay: `${i * 150}ms`
          }}
        />
      ))}
    </div>
  );

  const Pulse = () => (
    <div 
      className={cn(
        'animate-pulse rounded-full bg-current',
        sizes[size],
        colors[color],
        'opacity-75'
      )}
    />
  );

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return <Dots />;
      case 'pulse':
        return <Pulse />;
      default:
        return <Spinner />;
    }
  };

  const content = (
    <div 
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {renderLoader()}
      {text && (
        <span className={cn('text-sm font-medium', colors[color])}>
          {text}
        </span>
      )}
      <span className="sr-only">Carregando...</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};

export default Loading;