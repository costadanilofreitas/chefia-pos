import React from 'react';
import { Users, Receipt, BookOpen } from 'lucide-react';
import { clsx } from 'clsx';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  badges?: {
    tables?: number;
    orders?: number;
  };
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  badges
}) => {
  const tabs = [
    {
      id: 'tables',
      label: 'Mesas',
      icon: Users,
      badge: badges?.tables
    },
    {
      id: 'orders',
      label: 'Pedidos',
      icon: Receipt,
      badge: badges?.orders
    },
    {
      id: 'menu',
      label: 'Cardápio',
      icon: BookOpen
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 md:hidden z-40 select-none">
      <div className="grid grid-cols-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={clsx(
                'relative flex flex-col items-center justify-center h-20 py-2 transition-all duration-150',
                'active:scale-95 active:bg-gray-100 dark:active:bg-gray-700',
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active indicator moved to bottom */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400" />
              )}
              
              <div className="flex flex-col items-center justify-center gap-1">
                <div className="relative">
                  <Icon className={clsx(
                    'h-6 w-6 transition-transform duration-150',
                    isActive && 'scale-110'
                  )} />
                  {tab.badge && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </div>
                <span className={clsx(
                  'text-xs font-medium',
                  isActive && 'font-semibold'
                )}>
                  {tab.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {/* Safe area for iPhone */}
      <div className="h-safe-area-inset-bottom bg-white dark:bg-gray-800" />
    </nav>
  );
};

export default BottomNavigation;