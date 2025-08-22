import React, { useState, useRef, useEffect } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: TooltipPosition;
  delay?: number;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'bottom',
  delay = 200,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current;
      const trigger = triggerRef.current;
      const tooltipRect = tooltip.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();
      
      // Check if tooltip goes out of viewport and adjust position
      let newPosition = position;
      
      if (position === 'top' && triggerRect.top - tooltipRect.height < 0) {
        newPosition = 'bottom';
      } else if (position === 'bottom' && triggerRect.bottom + tooltipRect.height > window.innerHeight) {
        newPosition = 'top';
      } else if (position === 'left' && triggerRect.left - tooltipRect.width < 0) {
        newPosition = 'right';
      } else if (position === 'right' && triggerRect.right + tooltipRect.width > window.innerWidth) {
        newPosition = 'left';
      }
      
      setActualPosition(newPosition);
    }
  }, [isVisible, position]);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-1'
  };

  const arrowDirection = {
    top: 'border-t-gray-900 dark:border-t-gray-100 border-x-transparent border-b-transparent',
    bottom: 'border-b-gray-900 dark:border-b-gray-100 border-x-transparent border-t-transparent',
    left: 'border-l-gray-900 dark:border-l-gray-100 border-y-transparent border-r-transparent',
    right: 'border-r-gray-900 dark:border-r-gray-100 border-y-transparent border-l-transparent'
  };

  return (
    <div 
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {isVisible && content && (
        <div
          ref={tooltipRef}
          className={`
            absolute ${positionClasses[actualPosition]} z-50
            pointer-events-none whitespace-nowrap
            animate-in fade-in-0 zoom-in-95 duration-200
            ${className}
          `}
        >
          {/* Tooltip content */}
          <div className="
            px-3 py-1.5 text-xs font-medium
            bg-gray-900 dark:bg-gray-100
            text-white dark:text-gray-900
            rounded-lg shadow-lg
            backdrop-blur-sm
            border border-gray-800 dark:border-gray-200
          ">
            {content}
          </div>
          
          {/* Arrow */}
          <div
            className={`
              absolute ${arrowClasses[actualPosition]}
              w-0 h-0 
              border-4 ${arrowDirection[actualPosition]}
            `}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;

// Simplified Tooltip for quick use
export const SimpleTooltip: React.FC<{
  children: React.ReactNode;
  title: string;
  position?: TooltipPosition;
}> = ({ children, title, position = 'bottom' }) => {
  if (!title) return <>{children}</>;
  
  return (
    <Tooltip content={title} position={position}>
      {children}
    </Tooltip>
  );
};