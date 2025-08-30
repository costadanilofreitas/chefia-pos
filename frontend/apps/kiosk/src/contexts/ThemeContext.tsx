import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { kioskConfig } from '../config/kiosk.config';

// Types
interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

interface ThemeProviderProps {
  children: ReactNode;
}

// Create context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Provider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Dark mode is controlled by admin configuration, not user preference
  const [isDarkMode, setIsDarkMode] = useState<boolean>(kioskConfig.ui.darkMode);

  // Apply theme class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Don't persist - controlled by config only
  }, [isDarkMode]);

  // Listen for configuration changes
  useEffect(() => {
    // Update dark mode if configuration changes
    const checkConfig = () => {
      const currentConfig = kioskConfig.ui.darkMode;
      if (currentConfig !== isDarkMode) {
        setIsDarkMode(currentConfig);
      }
    };
    
    // Check periodically for config updates
    const interval = setInterval(checkConfig, 5000);
    
    return () => clearInterval(interval);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    // Dark mode is controlled by admin configuration
    // This function is kept for compatibility but does nothing
    // Users cannot change dark mode in kiosk
  };

  const value: ThemeContextType = {
    isDarkMode,
    toggleDarkMode
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Export context for testing purposes
export { ThemeContext };