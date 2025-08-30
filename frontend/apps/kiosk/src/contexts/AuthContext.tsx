import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { offlineStorage } from '../services/offlineStorage';
import { authService } from '../services/authService';

// Types
export interface User {
  id: string;
  name: string;
  email?: string;
  role: 'customer' | 'guest';
  preferences?: {
    language?: string;
    accessibility?: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string) => Promise<void>;
  logout: () => void;
  startGuestSession: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from session storage on mount
  useEffect(() => {
    const loadUser = () => {
      try {
        const savedUser = sessionStorage.getItem('kiosk-user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        offlineStorage.log('Failed to load user session', error);
        sessionStorage.removeItem('kiosk-user');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Save user to session storage when it changes
  useEffect(() => {
    if (user) {
      sessionStorage.setItem('kiosk-user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('kiosk-user');
    }
  }, [user]);

  const login = useCallback(async (identifier: string) => {
    setIsLoading(true);
    try {
      // Call the auth service for proper authentication
      const userData = await authService.loginCustomer(identifier);
      setUser(userData);
    } catch (error) {
      offlineStorage.log('Login failed', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('kiosk-user');
    sessionStorage.removeItem('kiosk-cart'); // Clear cart on logout
  }, []);

  const startGuestSession = useCallback(() => {
    const guestUser = authService.createGuestUser();
    setUser(guestUser);
    offlineStorage.log('Guest session started', { userId: guestUser.id });
  }, []);

  // Auto-cleanup on inactivity (5 minutes for kiosk)
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      
      // Only auto-logout if not guest
      if (user && user.role !== 'guest') {
        inactivityTimer = setTimeout(() => {
          logout();
        }, 5 * 60 * 1000); // 5 minutes
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [user, logout]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    startGuestSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export context for testing purposes
export { AuthContext };