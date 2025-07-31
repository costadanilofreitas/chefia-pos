import { useState, useCallback, useEffect } from 'react';
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
          role: (tokenData.roles?.[0] || tokenData.role) as UserRole,
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
    console.log('🚀 LOGIN DEBUG: Starting login process...');
    console.log('📋 LOGIN DEBUG: Credentials:', { operator_id: credentials.operator_id, password: '***' });
    
    setLoading(true);
    setError(null);
    
    try {
      // Import API config
      const { buildApiUrl, API_CONFIG } = await import('../config/api');
      
      // Prepare form data for the token endpoint
      const formData = new FormData();
      formData.append('username', credentials.operator_id);
      formData.append('password', credentials.password);
      
      console.log('📋 LOGIN DEBUG: FormData prepared');
      console.log('🌐 LOGIN DEBUG: Making request to', buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.TOKEN));
      
      // Use apiInterceptor for consistency
      const response = await apiInterceptor.post(
        buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.TOKEN),
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      console.log('📡 LOGIN DEBUG: Response status:', response.status);
      console.log('📡 LOGIN DEBUG: Response data:', response.data);
      
      const loginResponse = response.data;
      console.log('✅ LOGIN DEBUG: Token received from backend:', loginResponse);
      
      // Decode JWT token to extract user info
      console.log('🔧 LOGIN DEBUG: Decoding JWT token...');
      const tokenPayload = JSON.parse(atob(loginResponse.access_token.split('.')[1]));
      console.log('🔧 LOGIN DEBUG: Token payload:', tokenPayload);
      
      // Create token data structure from JWT payload
      const tokenData: TokenData = {
        access_token: loginResponse.access_token,
        token_type: loginResponse.token_type,
        expires_in: loginResponse.expires_in,
        operator_id: tokenPayload.sub || credentials.operator_id,
        operator_name: `Operador ${tokenPayload.sub || credentials.operator_id}`,
        roles: [tokenPayload.role || 'manager'],
        permissions: tokenPayload.permissions || [],
        require_password_change: false
      };
      
      console.log('🔧 LOGIN DEBUG: TokenData created:', tokenData);
      
      // Set token in interceptor
      console.log('💾 LOGIN DEBUG: Saving token to ApiInterceptor...');
      apiInterceptor.setToken(tokenData);
      console.log('✅ LOGIN DEBUG: Token saved to ApiInterceptor');
      
      // Convert to user format - use tokenData instead of undefined userData
      const userFormatted: User = {
        id: tokenData.operator_id,
        username: tokenData.operator_id,
        name: tokenData.operator_name,
        role: tokenData.roles[0] as UserRole,
        permissions: tokenData.permissions as Permission[],
        requirePasswordChange: false
      };
      console.log('👤 LOGIN DEBUG: User formatted:', userFormatted);
      
      setUser(userFormatted);
      setIsAuthenticated(true);
      
      console.log('🎉 LOGIN DEBUG: Login successful, state updated');
      console.log('🎉 LOGIN DEBUG: Final user:', userFormatted.name);
      return userFormatted;
    } catch (error: any) {
      console.log('❌ LOGIN DEBUG: Error caught in login method');
      console.log('❌ LOGIN DEBUG: Error details:', error);
      console.log('❌ LOGIN DEBUG: Error message:', error.message);
      console.log('❌ LOGIN DEBUG: Error stack:', error.stack);
      
      const errorMessage = error.message || 'Falha no login. Verifique suas credenciais.';
      setError(errorMessage);
      console.error('❌ LOGIN DEBUG: Final error message:', errorMessage);
      throw new Error(errorMessage);
    } finally {
      console.log('🏁 LOGIN DEBUG: Login process completed, setting loading to false');
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

