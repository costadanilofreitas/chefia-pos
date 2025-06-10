// src/hooks/mocks/useAuth.ts
import { useState } from 'react';

export enum UserRole {
  MANAGER = "gerente",
  CASHIER = "caixa", 
  WAITER = "garcom",
  COOK = "cozinheiro"
}

export enum Permission {
  SALE_CREATE = "venda:criar",
  PRODUCT_READ = "produto:ler",
  CASHIER_OPEN = "caixa:abrir",
  CASHIER_CLOSE = "caixa:fechar",
  CASHIER_WITHDRAW = "caixa:sangria",
  MANAGER_ACCESS = "gerente:acesso",
  REPORTS_VIEW = "relatorios:visualizar",
  EMPLOYEES_MANAGE = "funcionarios:gerenciar",
  BUSINESS_DAY_OPEN = "dia:abrir",
  BUSINESS_DAY_CLOSE = "dia:fechar"
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>({
    id: '1',
    username: 'manager',
    name: 'Gerente Teste',
    role: UserRole.MANAGER,
    permissions: [
      Permission.SALE_CREATE,
      Permission.PRODUCT_READ,
      Permission.CASHIER_OPEN,
      Permission.CASHIER_CLOSE,
      Permission.CASHIER_WITHDRAW,
      Permission.MANAGER_ACCESS,
      Permission.REPORTS_VIEW,
      Permission.EMPLOYEES_MANAGE,
      Permission.BUSINESS_DAY_OPEN,
      Permission.BUSINESS_DAY_CLOSE
    ]
  });
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [loading, setLoading] = useState(false);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock user based on username
      const mockUser: User = {
        id: '1',
        username,
        name: username === 'manager' ? 'Gerente Teste' : 'Usuário Teste',
        role: username === 'manager' ? UserRole.MANAGER : UserRole.CASHIER,
        permissions: username === 'manager' ? [
          Permission.SALE_CREATE,
          Permission.PRODUCT_READ,
          Permission.CASHIER_OPEN,
          Permission.CASHIER_CLOSE,
          Permission.CASHIER_WITHDRAW,
          Permission.MANAGER_ACCESS,
          Permission.REPORTS_VIEW,
          Permission.EMPLOYEES_MANAGE,
          Permission.BUSINESS_DAY_OPEN,
          Permission.BUSINESS_DAY_CLOSE
        ] : [
          Permission.SALE_CREATE,
          Permission.PRODUCT_READ,
          Permission.CASHIER_OPEN
        ]
      };
      
      setUser(mockUser);
      setIsAuthenticated(true);
      return mockUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  const hasPermission = (permission: Permission | string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission as Permission);
  };

  const hasRole = (role: UserRole | string): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  return {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    hasPermission,
    hasRole
  };
};

