import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}) => {
  const baseStyles = 'bg-gray-200 dark:bg-gray-700';
  
  const variants = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg'
  };
  
  const animations = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  };
  
  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1em' : '100%')
  };
  
  return (
    <div
      className={twMerge(
        clsx(
          baseStyles,
          variants[variant],
          animations[animation],
          className
        )
      )}
      style={style}
      aria-hidden="true"
    />
  );
};

// Table Skeleton component
export const TableSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
    <Skeleton variant="rectangular" height={80} className="mb-2" />
    <Skeleton variant="text" width="60%" className="mb-1" />
    <Skeleton variant="text" width="40%" />
  </div>
);

// Order Skeleton component  
export const OrderSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
    <div className="flex justify-between items-start mb-3">
      <div className="flex-1">
        <Skeleton variant="text" width="50%" height={24} className="mb-2" />
        <Skeleton variant="text" width="70%" height={16} />
      </div>
      <Skeleton variant="rounded" width={80} height={28} />
    </div>
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex justify-between items-center">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="20%" />
        </div>
      ))}
    </div>
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <Skeleton variant="rectangular" height={48} />
    </div>
  </div>
);

// Add shimmer animation to tailwind (needs to be added to tailwind.config.js)
// @keyframes shimmer {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(100%); }
// }
// .animate-shimmer {
//   position: relative;
//   overflow: hidden;
// }
// .animate-shimmer::after {
//   content: '';
//   position: absolute;
//   top: 0;
//   right: 0;
//   bottom: 0;
//   left: 0;
//   transform: translateX(-100%);
//   background: linear-gradient(
//     90deg,
//     transparent,
//     rgba(255, 255, 255, 0.2),
//     transparent
//   );
//   animation: shimmer 2s infinite;
// }

export default Skeleton;