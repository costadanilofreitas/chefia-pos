import React, { useEffect, useState } from 'react';
import { FaClock } from 'react-icons/fa';

interface TimerProps {
  startTime: Date | string;
  warningMinutes?: number;
  dangerMinutes?: number;
  className?: string;
}

export const Timer: React.FC<TimerProps> = ({
  startTime,
  warningMinutes = 10,
  dangerMinutes = 15,
  className = '',
}) => {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    const calculateElapsed = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      return Math.floor((now - start) / 1000);
    };
    
    setElapsed(calculateElapsed());
    
    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime]);
  
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  const getColorClass = () => {
    if (minutes >= dangerMinutes) {
      return 'text-danger-600 dark:text-danger-400 animate-pulse';
    }
    if (minutes >= warningMinutes) {
      return 'text-warning-600 dark:text-warning-400';
    }
    return 'text-gray-700 dark:text-gray-300';
  };
  
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <FaClock className={`text-lg ${getColorClass()}`} />
      <span className={`font-mono text-2xl font-bold ${getColorClass()}`}>
        {formattedTime}
      </span>
    </div>
  );
};