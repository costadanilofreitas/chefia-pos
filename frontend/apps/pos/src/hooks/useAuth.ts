import { useState, useEffect, useCallback } from 'react';
import { apiInterceptor, TokenData } from '../services/ApiInterceptor';

export enum UserRole {
  ADMIN = "admin",
  MANAGER = "manager", 
  CASHIER = "cashier",
  WAITER = "waiter",
  COOK = "cook"
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
      console.log('🔄 Initializing auth...');
      const tokenData = apiInterceptor.getToken();
      
      if (tokenData && apiInterceptor.isTokenValid()) {
        // Convert token data inline to avoid dependency issues
        const userData: User = {
          id: tokenData.operator_id,
          username: tokenData.operator_id,
          name: tokenData.operator_name,
          role: tokenData.role as UserRole,
          permissions: tokenData.permissions as Permission[],
          requirePasswordChange: tokenData.require_password_change
        };
        
        setUser(userData);
        setIsAuthenticated(true);
        console.log('✅ Auth initialized from stored token:', userData.name);
      } else {
        console.log('❌ No valid token found, user not authenticated');
        setUser(null);
        setIsAuthenticated(false);
      }
      
      setLoading(false);
    };
    
    // Execute immediately without timeout to avoid delays
    initializeAuth();
  }, []); // Empty dependencies to run only once

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
      // Prepare form data for the token endpoint
      const formData = new FormData();
      formData.append('username', credentials.operator_id);
      formData.append('password', credentials.password);
      
      const response = await apiInterceptor.post('http://localhost:8001/api/v1/auth/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      const loginResponse = response.data;
      
      // Get user info from /me endpoint
      const userResponse = await apiInterceptor.get('http://localhost:8001/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${loginResponse.access_token}`
        }
      });
      
      const userData = userResponse.data;
      
      // Create token data structure
      const tokenData: TokenData = {
        access_token: loginResponse.access_token,
        token_type: loginResponse.token_type,
        expires_in: loginResponse.expires_in,
        operator_id: userData.username,
        operator_name: userData.full_name,
        roles: [userData.role],
        permissions: userData.permissions,
        require_password_change: false
      };
      
      // Set token in interceptor
      apiInterceptor.setToken(tokenData);
      
      // Convert to user format
      const userFormatted = tokenToUser(tokenData);
      setUser(userFormatted);
      setIsAuthenticated(true);
      
      console.log('Login successful:', userFormatted.name);
      return userFormatted;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Falha no login. Verifique suas credenciais.';
      setError(errorMessage);
      console.error('Login error:', error);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [tokenToUser]);

  const logout = useCallback(async (terminalId?: string): Promise<void> => {
    setLoading(true);
    
    try {
      // Verificar se é um POS de mesa (pode deslogar sem fechar caixa)
      const isTablePOS = terminalId?.includes('mesa') || terminalId?.includes('table');
      
      if (!isTablePOS) {
        // Para POS normais, verificar se há caixa aberto
        try {
          const response = await apiInterceptor.get(`http://localhost:8001/api/v1/cashier/terminal/${terminalId}/status`);
          const cashierStatus = response.data;
          
          if (cashierStatus.has_open_cashier) {
            throw new Error('Não é possível fazer logout com caixa aberto. Feche o caixa primeiro.');
          }
        } catch (error: any) {
          // Se não conseguir verificar o status do caixa, permitir logout
          if (error.message.includes('caixa aberto')) {
            throw error; // Re-throw se for erro de caixa aberto
          }
          console.warn('Não foi possível verificar status do caixa, permitindo logout:', error);
        }
      }
      
      // Clear token from interceptor
      apiInterceptor.clearToken();
      
      // Update state
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      
      console.log('Logout successful');
    } catch (error: any) {
      console.error('Logout error:', error);
      setError(error.message || 'Erro ao fazer logout');
      throw error;
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

