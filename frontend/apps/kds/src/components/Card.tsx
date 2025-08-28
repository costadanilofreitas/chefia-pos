import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  priority?: 'normal' | 'high' | 'urgent';
  onClick?: () => void;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  priority = 'normal',
  onClick,
  interactive = false,
}) => {
  const priorityClasses = {
    normal: 'border-transparent hover:border-gray-300 dark:hover:border-gray-600',
    high: 'border-orange-500 hover:border-orange-600',
    urgent: 'border-red-500 hover:border-red-600 animate-pulse-slow',
  };
  
  const interactiveClasses = interactive || onClick 
    ? 'cursor-pointer hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]' 
    : '';
  
  return (
    <div
      onClick={onClick}
      className={`
        bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4
        border-2 transition-all duration-300
        ${priorityClasses[priority]}
        ${interactiveClasses}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => (
  <div className={`pb-3 mb-3 border-b border-gray-200 dark:border-gray-700 ${className}`}>
    {children}
  </div>
);

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {children}
  </div>
);

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => (
  <div className={`pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 ${className}`}>
    {children}
  </div>
);