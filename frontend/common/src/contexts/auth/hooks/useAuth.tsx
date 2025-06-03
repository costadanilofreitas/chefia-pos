import { createContext, useContext, useState, useEffect } from 'react';

// Criando o contexto de autenticação
const AuthContext = createContext(null);

// Provider para o contexto de autenticação
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Efeito para carregar o usuário da sessão ao iniciar
  useEffect(() => {
    const loadUserFromSession = async () => {
      try {
        setLoading(true);
        // Em um cenário real, isso faria uma chamada à API para verificar a sessão
        const storedUser = localStorage.getItem('user');
        
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        setError(err.message);
        console.error('Erro ao carregar usuário da sessão:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserFromSession();
  }, []);

  // Função para login
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      // Em um cenário real, isso faria uma chamada à API de autenticação
      // Simulando uma chamada de API com timeout
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulação de resposta de API
          if (credentials.username && credentials.password) {
            const userData = {
              id: '1',
              name: credentials.username,
              role: 'cashier',
              permissions: ['pos.access', 'cashier.open', 'cashier.close']
            };
            
            // Armazenar usuário na sessão
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            resolve(userData);
          } else {
            const error = new Error('Credenciais inválidas');
            setError(error.message);
            reject(error);
          }
          setLoading(false);
        }, 500);
      });
    } catch (err) {
      setError(err.message);
      console.error('Erro ao fazer login:', err);
      setLoading(false);
      throw err;
    }
  };

  // Função para logout
  const logout = async () => {
    try {
      setLoading(true);
      
      // Em um cenário real, isso faria uma chamada à API para encerrar a sessão
      // Simulando uma chamada de API com timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          // Remover usuário da sessão
          localStorage.removeItem('user');
          setUser(null);
          setLoading(false);
          resolve(true);
        }, 300);
      });
    } catch (err) {
      setError(err.message);
      console.error('Erro ao fazer logout:', err);
      setLoading(false);
      throw err;
    }
  };

  // Verificar se o usuário tem uma permissão específica
  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  // Valor do contexto
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    hasPermission
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook personalizado para usar o contexto de autenticação
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export default useAuth;
