import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';

// Theme color constants
const THEME_COLORS = {
  dark: '#0a0e1a',
  light: '#f5f5f5'
} as const;

const THEME_STORAGE_KEY = 'kds-theme-mode';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Type guard for ThemeMode
function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'dark' || value === 'light';
}

const getStoredTheme = (): ThemeMode => {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (isThemeMode(stored)) {
    return stored;
  }
  
  // Check system preference
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(getStoredTheme());

  useEffect(() => {
    // Store theme preference
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    
    // Apply Tailwind dark mode class to document element
    const documentElement = document.documentElement;
    if (mode === 'dark') {
      documentElement.classList.add('dark');
    } else {
      documentElement.classList.remove('dark');
    }
    
    // Update or create meta theme-color for mobile browsers
    updateMetaThemeColor(mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setThemeMode = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  const contextValue = React.useMemo(
    () => ({ mode, toggleTheme, setThemeMode }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Helper function to update or create meta theme-color tag
function updateMetaThemeColor(mode: ThemeMode): void {
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  
  if (!metaThemeColor) {
    // Create meta tag if it doesn't exist
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }
  
  metaThemeColor.setAttribute('content', THEME_COLORS[mode]);
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};