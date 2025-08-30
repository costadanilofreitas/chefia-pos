import { memo, useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Tab {
  id: string | number;
  label: string;
  disabled?: boolean;
}

interface TabGroupProps {
  tabs: Tab[];
  value: string | number;
  onChange: (value: string | number) => void;
  variant?: 'default' | 'pills';
  scrollable?: boolean;
  className?: string;
}

const TabGroupComponent: React.FC<TabGroupProps> = ({
  tabs,
  value,
  onChange,
  variant = 'default',
  scrollable = false,
  className
}) => {
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const checkScroll = () => {
    if (scrollContainerRef.current && scrollable) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [tabs, scrollable]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 300);
    }
  };

  const containerClasses = clsx(
    'relative',
    variant === 'default' && 'border-b border-gray-200 dark:border-gray-700',
    className
  );

  const tabClasses = (isActive: boolean, isDisabled?: boolean) => clsx(
    'min-h-[44px] px-4 py-2.5 font-medium text-sm transition-all duration-200',
    'whitespace-nowrap touch-manipulation select-none',
    variant === 'default' && [
      'border-b-2 -mb-px',
      isActive 
        ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
    ],
    variant === 'pills' && [
      'rounded-lg mx-1',
      isActive
        ? 'bg-primary-500 text-white'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
    ],
    isDisabled && 'opacity-50 cursor-not-allowed'
  );

  return (
    <div className={containerClasses}>
      {scrollable && showLeftScroll && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 h-full px-2 bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      )}

      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className={clsx(
          'flex',
          scrollable && 'overflow-x-auto scrollbar-hide',
          scrollable && showLeftScroll && 'pl-8',
          scrollable && showRightScroll && 'pr-8'
        )}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onChange(tab.id)}
            disabled={tab.disabled}
            className={tabClasses(value === tab.id, tab.disabled)}
            role="tab"
            aria-selected={value === tab.id}
            aria-disabled={tab.disabled}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {scrollable && showRightScroll && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 h-full px-2 bg-gradient-to-l from-white dark:from-gray-900 to-transparent z-10"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      )}
    </div>
  );
};

export const TabGroup = memo(TabGroupComponent);
export default TabGroup;