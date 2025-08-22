import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { SimpleTooltip } from './Tooltip';

interface ThemeToggleProps {
  showTooltip?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  showTooltip = true, 
  size = 'medium' 
}) => {
  const { mode, toggleTheme } = useTheme();

  const sizeClasses = {
    small: 'p-1.5 text-lg',
    medium: 'p-2 text-xl',
    large: 'p-3 text-2xl'
  };

  const button = (
    <button
      onClick={toggleTheme}
      className={`
        ${sizeClasses[size]}
        rounded-lg
        transition-all duration-300
        hover:scale-105
        active:scale-95
        bg-gray-100 dark:bg-gray-800
        hover:bg-gray-200 dark:hover:bg-gray-700
        relative
        group
        overflow-hidden
      `}
      aria-label={mode === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
    >
      <div className="relative w-6 h-6 flex items-center justify-center">
        {/* Moon icon for light mode (click to go dark) */}
        <div
          className={`
            absolute inset-0 flex items-center justify-center
            transition-all duration-500 ease-in-out
            ${mode === 'dark' ? 'opacity-0 -rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}
          `}
        >
          <svg
            className="w-5 h-5 text-indigo-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
            />
          </svg>
        </div>

        {/* Sun icon for dark mode (click to go light) */}
        <div
          className={`
            absolute inset-0 flex items-center justify-center
            transition-all duration-500 ease-in-out
            ${mode === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'}
          `}
        >
          <svg
            className="w-5 h-5 text-amber-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    </button>
  );

  if (showTooltip) {
    return (
      <SimpleTooltip 
        title={mode === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'} 
        position="bottom"
      >
        {button}
      </SimpleTooltip>
    );
  }

  return button;
};

export default ThemeToggle;