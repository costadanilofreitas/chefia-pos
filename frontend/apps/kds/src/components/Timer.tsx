import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { FaClock } from 'react-icons/fa';

interface TimerProps {
  startTime: Date | string;
  warningMinutes?: number;
  dangerMinutes?: number;
  className?: string;
  updateInterval?: number; // Allow customization of update frequency
}

// Update intervals based on elapsed time for performance
const UPDATE_INTERVAL_FAST = 1000; // 1 second for first 5 minutes
const UPDATE_INTERVAL_MEDIUM = 5000; // 5 seconds for 5-15 minutes
const UPDATE_INTERVAL_SLOW = 10000; // 10 seconds after 15 minutes

export const Timer: React.FC<TimerProps> = ({
  startTime,
  warningMinutes = 10,
  dangerMinutes = 15,
  className = '',
  updateInterval,
}) => {
  const [elapsed, setElapsed] = useState(0);
  
  // Memoize start time to avoid recalculation
  const startTimeMs = useMemo(() => new Date(startTime).getTime(), [startTime]);
  
  // Calculate elapsed time
  const calculateElapsed = useCallback(() => {
    const now = Date.now();
    return Math.floor((now - startTimeMs) / 1000);
  }, [startTimeMs]);
  
  useEffect(() => {
    // Initial calculation
    const initialElapsed = calculateElapsed();
    setElapsed(initialElapsed);
    
    // Determine update frequency based on elapsed time
    const getUpdateInterval = (elapsedSeconds: number) => {
      if (updateInterval) return updateInterval;
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);
      if (elapsedMinutes < 5) return UPDATE_INTERVAL_FAST;
      if (elapsedMinutes < 15) return UPDATE_INTERVAL_MEDIUM;
      return UPDATE_INTERVAL_SLOW;
    };
    
    let currentInterval = getUpdateInterval(initialElapsed);
    
    const updateTimer = () => {
      const newElapsed = calculateElapsed();
      setElapsed(newElapsed);
      
      // Adjust interval if needed
      const newInterval = getUpdateInterval(newElapsed);
      if (newInterval !== currentInterval) {
        currentInterval = newInterval;
        clearInterval(intervalId);
        intervalId = setInterval(updateTimer, currentInterval);
      }
    };
    
    let intervalId = setInterval(updateTimer, currentInterval);
    
    return () => clearInterval(intervalId);
  }, [startTimeMs, calculateElapsed, updateInterval]);
  
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  // Memoize color class to avoid recalculation on every render
  const colorClass = useMemo(() => {
    if (minutes >= dangerMinutes) {
      return 'text-danger-600 dark:text-danger-400 animate-pulse';
    }
    if (minutes >= warningMinutes) {
      return 'text-warning-600 dark:text-warning-400';
    }
    return 'text-gray-700 dark:text-gray-300';
  }, [minutes, warningMinutes, dangerMinutes]);
  
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <FaClock className={`text-lg ${colorClass}`} />
      <span className={`font-mono text-2xl font-bold ${colorClass}`}>
        {formattedTime}
      </span>
    </div>
  );
};