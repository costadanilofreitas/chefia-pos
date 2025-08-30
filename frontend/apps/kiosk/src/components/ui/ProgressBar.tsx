import { memo } from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

/**
 * Progress bar component for showing completion status
 */
export const ProgressBar = memo<ProgressBarProps>(({ 
  current,
  total,
  className = ''
}) => {
  const percentage = Math.min(100, Math.max(0, (current / total) * 100));

  return (
    <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 ${className}`}>
      <div 
        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        role="progressbar"
      />
    </div>
  );
});