/**
 * Keyboard Shortcut Helper Component
 * Displays keyboard shortcuts in a modal
 */

import React from 'react';
import { X } from 'lucide-react';

export interface ShortcutItem {
  key: string;
  description: string;
  modifier?: 'ctrl' | 'alt' | 'shift';
}

interface KeyboardShortcutHelperProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutItem[];
  title?: string;
}

export const KeyboardShortcutHelper: React.FC<KeyboardShortcutHelperProps> = ({
  isOpen,
  onClose,
  shortcuts,
  title = 'Atalhos do Teclado'
}) => {
  if (!isOpen) return null;
  
  const formatKey = (shortcut: ShortcutItem): string => {
    let formatted = '';
    if (shortcut.modifier) {
      formatted = shortcut.modifier.charAt(0).toUpperCase() + 
                  shortcut.modifier.slice(1) + '+';
    }
    formatted += shortcut.key.toUpperCase();
    return formatted;
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            aria-label="Fechar"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
            >
              <kbd className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                {formatKey(shortcut)}
              </kbd>
              <span className="text-gray-700 dark:text-gray-300 text-sm ml-4">
                {shortcut.description}
              </span>
            </div>
          ))}
        </div>
        
        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};

// Footer shortcut hints
export const ShortcutHints: React.FC<{ shortcuts: ShortcutItem[] }> = ({ shortcuts }) => (
  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
    {shortcuts.slice(0, 5).map((shortcut, index) => (
      <span key={index}>
        <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
          {shortcut.key}
        </kbd>
        <span className="ml-1">{shortcut.description}</span>
      </span>
    ))}
  </div>
);