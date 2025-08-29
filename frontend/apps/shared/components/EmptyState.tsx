/**
 * Empty State Component
 * Shows a placeholder when no data is available
 */

import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      {icon && (
        <div className="mb-4 text-gray-400 dark:text-gray-600">
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4 max-w-sm">
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

// Loading skeleton variant
export const EmptySkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded" />
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6" />
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-4/6" />
          </div>
        </div>
      </div>
    ))}
  </div>
);