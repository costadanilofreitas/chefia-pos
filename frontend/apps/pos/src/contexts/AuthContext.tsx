import React, { createContext, ReactNode, useState, useEffect, useContext } from 'react';
import { authService, AuthUser } from '../services/AuthService';

interface AuthContextType {
  user: AuthUser | null;
  login: (__operator_id: string, __password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (__permission: string) => boolean;
  hasRole: (__role: string) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se há usuário logado ao inicializar
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const login = async (operator_id: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      const loggedUser = await authService.login({ operator_id, password });
      setUser(loggedUser);
    } finally {
      setLoading(false);
    }
  };

  const logout = (): void => {
    authService.logout();
    setUser(null);
  };

  const isAuthenticated = (): boolean => {
    return authService.isAuthenticated();
  };

  const hasPermission = (permission: string): boolean => {
    return authService.hasPermission(permission);
  };

  const hasRole = (role: string): boolean => {
    return authService.hasRole(role);
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: isAuthenticated(),
    hasPermission,
    hasRole,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

