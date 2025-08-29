/**
 * Mock useAuth hook for Waiter app
 * This is a simplified version for testing purposes
 */

import { useState, useCallback } from 'react';

export interface User {
  id: string;
  name: string;
  role?: string;
  permissions?: string[];
}

export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      // Mock login logic
      setUser({
        id: 'user-123',
        name: username,
        role: 'waiter',
        permissions: ['order.create', 'order.update', 'table.view']
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const hasPermission = useCallback((permission: string) => {
    return user?.permissions?.includes(permission) || false;
  }, [user]);

  return {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    hasPermission
  };
}