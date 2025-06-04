import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Tipagem do usuário
type User = {
  id: string;
  name: string;
  role: string;
  permissions: string[];
};

// Tipagem para credenciais de login
type Credentials = {
  username: string;
  password: string;
};

// Tipagem do valor do contexto
type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: Credentials) => Promise<User>;
  logout: () => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
};

// Criando o contexto de autenticação
const AuthContext = createContext<AuthContextType | null>(null);

// Tipagem para as props do Provider
type AuthProviderProps = {
  children: ReactNode;
};

// Provider para o contexto de autenticação
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Função para carregar o usuário da sessão
  const loadUserFromSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/session');
      if (!response.ok) throw new Error('Erro ao verificar sessão');

      const sessionUser: User | null = await response.json();
      if (sessionUser) {
        setUser(sessionUser);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao carregar usuário da sessão:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserFromSession();
  }, [loadUserFromSession]);

  // Função para login
  const login = useCallback(async (credentials: Credentials): Promise<User> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Credenciais inválidas');
      }

      const userData: User = await response.json();
      setUser(userData);
      return userData;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao fazer login:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para logout
  const logout = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Erro ao fazer logout');

      setUser(null);
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao fazer logout:', err);

      // Limpar estado local mesmo que a API falhe
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificar se o usuário tem uma permissão específica
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user || !user.permissions) return false;
      return user.permissions.includes(permission);
    },
    [user]
  );

  // Valor do contexto
  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook personalizado para usar o contexto de autenticação
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export default useAuth;
