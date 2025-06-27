import { useState, useEffect, useCallback } from 'react';
import { apiInterceptor, TokenData } from '../services/ApiInterceptor';

export enum UserRole {
  ADMIN = "admin",
  MANAGER = "manager", 
  CASHIER = "cashier"
}

export enum Permission {
  SALE_CREATE = "sale:create",
  PRODUCT_READ = "product:read",
  PRODUCT_WRITE = "product:write",
  CASHIER_OPEN = "cashier:open",
  CASHIER_CLOSE = "cashier:close",
  CASHIER_WITHDRAW = "cashier:withdraw",
  MANAGER_ACCESS = "manager:access",
  REPORTS_VIEW = "reports:view",
  EMPLOYEES_MANAGE = "employees:manage",
  BUSINESS_DAY_OPEN = "business_day:open",
  BUSINESS_DAY_CLOSE = "business_day:close",
  ADMIN_ACCESS = "admin:access"
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  requirePasswordChange: boolean;
}

export interface LoginCredentials {
  operator_id: string;
  password: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert JWT token data to User format
  const tokenToUser = useCallback((tokenData: TokenData): User => {
    return {
      id: tokenData.operator_id,
      username: tokenData.operator_id,
      name: tokenData.operator_name,
      role: tokenData.roles[0] as UserRole,
      permissions: tokenData.permissions as Permission[],
      requirePasswordChange: tokenData.require_password_change
    };
  }, []);

  // Initialize auth state from stored token
  useEffect(() => {
    const initializeAuth = () => {
      const tokenData = apiInterceptor.getToken();
      
      if (tokenData && apiInterceptor.isTokenValid()) {
        const userData = tokenToUser(tokenData);
        setUser(userData);
        setIsAuthenticated(true);
        console.log('Auth initialized from stored token:', userData.name);
      } else {
        console.log('No valid token found, user not authenticated');
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, [tokenToUser]);

  // Listen for auth events
  useEffect(() => {
    const handleLogin = (event: CustomEvent) => {
      const tokenData = event.detail as TokenData;
      const userData = tokenToUser(tokenData);
      setUser(userData);
      setIsAuthenticated(true);
      setError(null);
      console.log('User logged in:', userData.name);
    };

    const handleLogout = () => {
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      console.log('User logged out');
    };

    const handleTokenExpired = () => {
      setUser(null);
      setIsAuthenticated(false);
      setError('Sessão expirada. Faça login novamente.');
      console.log('Token expired, user logged out');
    };

    window.addEventListener('auth:login', handleLogin as EventListener);
    window.addEventListener('auth:logout', handleLogout);
    window.addEventListener('auth:token-expired', handleTokenExpired);

    return () => {
      window.removeEventListener('auth:login', handleLogin as EventListener);
      window.removeEventListener('auth:logout', handleLogout);
      window.removeEventListener('auth:token-expired', handleTokenExpired);
    };
  }, [tokenToUser]);

  const login = useCallback(async (credentials: LoginCredentials): Promise<User> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiInterceptor.post('http://localhost:8001/api/v1/auth/auth/login', credentials);
      const tokenData = response.data as TokenData;
      
      // Set token in interceptor
      apiInterceptor.setToken(tokenData);
      
      // Convert to user format
      const userData = tokenToUser(tokenData);
      setUser(userData);
      setIsAuthenticated(true);
      
      console.log('Login successful:', userData.name);
      return userData;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Falha no login. Verifique suas credenciais.';
      setError(errorMessage);
      console.error('Login error:', error);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [tokenToUser]);

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);
    
    try {
      // Clear token from interceptor
      apiInterceptor.clearToken();
      
      // Update state
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const hasPermission = useCallback((permission: Permission | string): boolean => {
    if (!user || !isAuthenticated) return false;
    return user.permissions.includes(permission as Permission);
  }, [user, isAuthenticated]);

  const hasRole = useCallback((role: UserRole | string): boolean => {
    if (!user || !isAuthenticated) return false;
    return user.role === role;
  }, [user, isAuthenticated]);

  const hasAnyRole = useCallback((roles: (UserRole | string)[]): boolean => {
    if (!user || !isAuthenticated) return false;
    return roles.some(role => user.role === role);
  }, [user, isAuthenticated]);

  const getTokenExpirationTime = useCallback((): number => {
    return apiInterceptor.getTokenExpirationTime();
  }, []);

  const isTokenExpiringSoon = useCallback((minutesThreshold: number = 5): boolean => {
    const expirationTime = getTokenExpirationTime();
    if (!expirationTime) return false;
    
    const now = Date.now();
    const thresholdMs = minutesThreshold * 60 * 1000;
    
    return (expirationTime - now) <= thresholdMs;
  }, [getTokenExpirationTime]);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    hasPermission,
    hasRole,
    hasAnyRole,
    getTokenExpirationTime,
    isTokenExpiringSoon,
    clearError: () => setError(null)
  };
};

export default useAuth;

