import { UserRole, Permission, User, LoginCredentials } from '../useAuth';

export const useAuth = () => ({
  user: {
    id: 'test-user-1',
    operator_id: 'test-operator',
    username: 'test-operator',
    name: 'Test User',
    role: UserRole.CASHIER,
    permissions: [Permission.SALE_CREATE, Permission.PRODUCT_READ],
    requirePasswordChange: false,
  } as User,
  isAuthenticated: true,
  loading: false,
  error: null,
  login: async (credentials: LoginCredentials): Promise<User> => {
    return {
      id: 'test-user-1',
      operator_id: credentials.operator_id,
      username: credentials.operator_id,
      name: 'Test User',
      role: UserRole.CASHIER,
      permissions: [Permission.SALE_CREATE, Permission.PRODUCT_READ],
      requirePasswordChange: false,
    };
  },
  logout: async (_terminalId?: string): Promise<void> => {
    return Promise.resolve();
  },
  hasPermission: (_permission: Permission | string): boolean => {
    return true;
  },
  hasRole: (role: UserRole | string): boolean => {
    return role === UserRole.CASHIER;
  },
  hasAnyRole: (roles: (UserRole | string)[]): boolean => {
    return roles.includes(UserRole.CASHIER);
  },
  getTokenExpirationTime: (): number => {
    return Date.now() + 3600000; // 1 hour from now
  },
  isTokenExpiringSoon: (_minutesThreshold: number = 5): boolean => {
    return false;
  },
  clearError: (): void => {
    // Mock implementation
  },
});

export default useAuth;