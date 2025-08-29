import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  fullWidth?: boolean;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className,
  fullWidth = false
}) => {
  return (
    <div className={twMerge('border-b border-gray-200 dark:border-gray-700', className)}>
      <nav className={clsx('-mb-px flex', fullWidth ? 'w-full' : '')} aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            className={clsx(
              fullWidth ? 'flex-1' : '',
              'group inline-flex items-center justify-center px-4 py-2 border-b-2 font-medium text-sm transition-colors select-none',
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300',
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {tab.icon && (
              <span className="mr-2">{tab.icon}</span>
            )}
            {tab.label}
            {tab.badge && (
              <span className="ml-2">{tab.badge}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export interface TabPanelProps {
  children: React.ReactNode;
  value: string;
  activeValue: string;
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  children,
  value,
  activeValue,
  className
}) => {
  if (value !== activeValue) return null;
  
  return (
    <div className={twMerge('py-4', className)}>
      {children}
    </div>
  );
};