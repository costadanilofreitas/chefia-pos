import React from 'react';
import { RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

interface PullToRefreshProps {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
  pullProgress: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  isPulling,
  pullDistance,
  isRefreshing,
  pullProgress
}) => {
  if (!isPulling && !isRefreshing && pullDistance === 0) {
    return null;
  }

  const rotation = pullProgress * 3.6; // Convert percentage to degrees
  const scale = 0.5 + (pullProgress / 200); // Scale from 0.5 to 1
  const opacity = Math.min(pullProgress / 50, 1); // Fade in quickly

  return (
    <div
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none transition-all duration-300',
        isRefreshing && 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm'
      )}
      style={{
        transform: `translateY(${isRefreshing ? 60 : pullDistance}px)`,
        opacity: opacity
      }}
    >
      <div
        className={clsx(
          'mt-4 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center',
          isRefreshing && 'animate-pulse'
        )}
        style={{
          transform: `scale(${scale})`,
        }}
      >
        <RefreshCw
          className={clsx(
            'h-6 w-6 text-primary-600 dark:text-primary-400',
            isRefreshing && 'animate-spin'
          )}
          style={{
            transform: !isRefreshing ? `rotate(${rotation}deg)` : undefined,
            transition: 'transform 0.2s'
          }}
        />
      </div>
      {isRefreshing && (
        <div className="absolute top-20 text-sm text-gray-600 dark:text-gray-400">
          Atualizando...
        </div>
      )}
    </div>
  );
};

export default PullToRefresh;