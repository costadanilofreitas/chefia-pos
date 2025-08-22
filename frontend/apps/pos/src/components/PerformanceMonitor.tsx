/**
 * Monitor de performance em tempo real
 */

import React, { useState, useEffect } from 'react';
import { usePerformance } from '../hooks/usePerformance';
import { cn } from '../utils/cn';

interface PerformanceMonitorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  defaultExpanded?: boolean;
  className?: string;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  position = 'bottom-right',
  defaultExpanded = false,
  className
}) => {
  const { metrics, clearCache } = usePerformance();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [fps, setFps] = useState(0);
  const [renderTime, setRenderTime] = useState(0);

  // Calcula FPS
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;

    const calculateFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      rafId = requestAnimationFrame(calculateFPS);
    };

    calculateFPS();

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Mede tempo de renderização
  useEffect(() => {
    const measureRenderTime = () => {
      const start = performance.now();
      requestAnimationFrame(() => {
        setRenderTime(performance.now() - start);
      });
    };

    const interval = setInterval(measureRenderTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-500';
    if (value <= thresholds.warning) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getFPSColor = () => {
    if (fps >= 55) return 'text-green-500';
    if (fps >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getMemoryColor = () => {
    if (metrics.memoryUsage < 50) return 'text-green-500';
    if (metrics.memoryUsage < 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={cn(
          'fixed z-50 p-3 bg-gray-900 text-white rounded-lg shadow-lg hover:bg-gray-800 transition-all',
          positionClasses[position],
          className
        )}
        title="Abrir monitor de performance"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>
    );
  }

  return (
    <div
      className={cn(
        'fixed z-50 bg-gray-900 text-white rounded-lg shadow-2xl',
        'w-80 max-h-96 overflow-auto',
        positionClasses[position],
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Performance Monitor
        </h3>
        <button
          onClick={() => setExpanded(false)}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Métricas */}
      <div className="p-3 space-y-3">
        {/* FPS */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">FPS</span>
          <span className={cn('text-sm font-mono', getFPSColor())}>
            {fps}
          </span>
        </div>

        {/* Render Time */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Render Time</span>
          <span className={cn(
            'text-sm font-mono',
            getStatusColor(renderTime, { good: 16, warning: 33 })
          )}>
            {renderTime.toFixed(2)}ms
          </span>
        </div>

        {/* Cache Hit Rate */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Cache Hit Rate</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${metrics.cacheHitRate}%` }}
              />
            </div>
            <span className="text-sm font-mono">
              {metrics.cacheHitRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Average Load Time */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Avg Load Time</span>
          <span className={cn(
            'text-sm font-mono',
            getStatusColor(metrics.avgLoadTime, { good: 1000, warning: 3000 })
          )}>
            {metrics.avgLoadTime.toFixed(0)}ms
          </span>
        </div>

        {/* Memory Usage */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Memory Usage</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={cn(
                  'h-full transition-all duration-300',
                  metrics.memoryUsage < 50 ? 'bg-green-500' :
                  metrics.memoryUsage < 80 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: `${metrics.memoryUsage}%` }}
              />
            </div>
            <span className={cn('text-sm font-mono', getMemoryColor())}>
              {metrics.memoryUsage.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Lazy Loaded Components */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Lazy Components</span>
          <span className="text-sm font-mono text-gray-300">
            {metrics.lazyLoadedComponents}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 pt-2">
          <div className="text-xs text-gray-500 mb-2">Network</div>
          
          {/* Connection Type */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Connection</span>
            <span className="text-sm font-mono text-gray-300">
              {(navigator as any).connection?.effectiveType || 'Unknown'}
            </span>
          </div>

          {/* Online Status */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Status</span>
            <span className={cn(
              'text-sm font-mono',
              navigator.onLine ? 'text-green-500' : 'text-red-500'
            )}>
              {navigator.onLine ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-700 pt-2">
          <button
            onClick={clearCache}
            className="w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-xs font-medium transition-colors"
          >
            Limpar Cache
          </button>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;