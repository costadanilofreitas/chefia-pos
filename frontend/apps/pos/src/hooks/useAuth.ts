import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiInterceptor, TokenData } from "../services/ApiInterceptor";
import TerminalService from "../services/TerminalService";
import { API_CONFIG, buildApiUrl } from "../config/api";

export enum UserRole {
  ADMIN = "admin",
  MANAGER = "manager",
  CASHIER = "cashier",
  WAITER = "waiter",
  COOK = "cook",
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
  ADMIN_ACCESS = "admin:access",
}

export interface User {
  id: string;
  operator_id?: string; // Adicionar operator_id opcional
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
  const { terminalId } = useParams<{ terminalId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentTerminal = terminalId || "1";

  // Convert JWT token data to User format
  const tokenToUser = useCallback((tokenData: TokenData): User => {
    return {
      id: tokenData.operator_id,
      username: tokenData.operator_id,
      name: tokenData.operator_name,
      role: tokenData.roles[0] as UserRole,
      permissions: tokenData.permissions as Permission[],
      requirePasswordChange: tokenData.require_password_change,
    };
  }, []);

  // Initialize auth state from terminal session
  useEffect(() => {
    const initializeAuth = async () => {
      // Check if terminal is configured
      const isConfigured =
        TerminalService.isTerminalConfigured(currentTerminal);
      if (!isConfigured) {
        setError(`Terminal ${currentTerminal} não está configurado`);
        setLoading(false);
        return;
      }

      // Get session for this terminal
      const session = TerminalService.getSession(currentTerminal);

      if (session?.token) {
        // Try to restore session
        const tokenData = apiInterceptor.getToken();

        if (tokenData && apiInterceptor.isTokenValid()) {
          const userData: User = {
            id: tokenData.operator_id,
            operator_id: tokenData.operator_id,
            username: tokenData.operator_id,
            name: tokenData.operator_name,
            role: tokenData.roles?.[0] as UserRole,
            permissions: tokenData.permissions as Permission[],
            requirePasswordChange: tokenData.require_password_change,
          };

          setUser(userData);
          setIsAuthenticated(true);
        } else {
          // Session expired, clear it
          TerminalService.clearSession(currentTerminal);
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }

      setLoading(false);
    };

    initializeAuth();
  }, [currentTerminal]); // Re-run when terminal changes

  // Listen for auth events
  useEffect(() => {
    const handleLogin = (event: CustomEvent) => {
      const tokenData = event.detail as TokenData;
      const userData = tokenToUser(tokenData);
      setUser(userData);
      setIsAuthenticated(true);
      setError(null);
    };

    const handleLogout = () => {
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    };

    const handleTokenExpired = () => {
      setUser(null);
      setIsAuthenticated(false);
      setError("Sessão expirada. Faça login novamente.");
    };

    window.addEventListener("auth:login", handleLogin as EventListener);
    window.addEventListener("auth:logout", handleLogout);
    window.addEventListener("auth:token-expired", handleTokenExpired);

    return () => {
      window.removeEventListener("auth:login", handleLogin as EventListener);
      window.removeEventListener("auth:logout", handleLogout);
      window.removeEventListener("auth:token-expired", handleTokenExpired);
    };
  }, [tokenToUser]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<User> => {
      setLoading(true);
      setError(null);

      try {
        // Prepare form data for the token endpoint
        const formData = new FormData();
        formData.append("username", credentials.operator_id);
        formData.append("password", credentials.password);

        const response = await fetch(
          buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.TOKEN),
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || "Credenciais inválidas");
        }

        const loginResponse = await response.json();

        // Get user info from /me endpoint
        const userResponse = await fetch(
          buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME),
          {
            headers: {
              Authorization: `Bearer ${loginResponse.access_token}`,
            },
          }
        );

        if (!userResponse.ok) {
          throw new Error("Erro ao obter informações do usuário");
        }

        const userData = await userResponse.json();

        // Create token data structure
        const tokenData: TokenData = {
          access_token: loginResponse.access_token,
          token_type: loginResponse.token_type,
          expires_in: loginResponse.expires_in,
          operator_id: userData.username,
          operator_name: userData.full_name,
          roles: [userData.role],
          permissions: userData.permissions,
          require_password_change: false,
        };

        // Set token in interceptor
        apiInterceptor.setToken(tokenData);

        // Convert to user format - use userData directly instead of tokenToUser
        const userFormatted: User = {
          id: userData.username, // Usar username como id para compatibilidade
          operator_id: userData.username, // Adicionar operator_id explicitamente
          username: userData.username,
          name: userData.full_name,
          role: userData.role as UserRole,
          permissions: userData.permissions as Permission[],
          requirePasswordChange: false,
        };

        // Save session for this terminal
        TerminalService.saveSession(currentTerminal, {
          operatorId: userData.username,
          operatorName: userData.full_name,
          token: loginResponse.access_token,
          loginTime: new Date(),
        });

        setUser(userFormatted);
        setIsAuthenticated(true);

        return userFormatted;
      } catch (error) {
        const errorMessage =
          error.message || "Falha no login. Verifique suas credenciais.";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [currentTerminal]
  );

  const logout = useCallback(
    async (terminalId?: string): Promise<void> => {
      setLoading(true);
      const terminal = terminalId || currentTerminal;

      try {
        // Clear session for this terminal
        TerminalService.clearSession(terminal);

        // Verificar se é um POS de mesa (pode deslogar sem fechar caixa)
        const isTablePOS =
          terminal?.includes("mesa") || terminal?.includes("table");

        if (!isTablePOS) {
          // Para POS normais, verificar se há caixa aberto
          try {
            const response = await apiInterceptor.get(
              buildApiUrl(API_CONFIG.ENDPOINTS.CASHIER.STATUS(terminalId))
            );
            const cashierStatus = response.data as {
              has_open_cashier: boolean;
            };

            if (cashierStatus.has_open_cashier) {
              throw new Error(
                "Não é possível fazer logout com caixa aberto. Feche o caixa primeiro."
              );
            }
          } catch (error) {
            // Se não conseguir verificar o status do caixa, permitir logout
            if (error.message.includes("caixa aberto")) {
              throw error; // Re-throw se for erro de caixa aberto
            }
          }
        }

        // Clear token from interceptor
        apiInterceptor.clearToken();

        // Update state
        setUser(null);
        setIsAuthenticated(false);
        setError(null);
      } catch (error) {
        setError(error.message || "Erro ao fazer logout");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [currentTerminal]
  );

  const hasPermission = useCallback(
    (permission: Permission | string): boolean => {
      if (!user || !isAuthenticated) return false;
      return user.permissions.includes(permission as Permission);
    },
    [user, isAuthenticated]
  );

  const hasRole = useCallback(
    (role: UserRole | string): boolean => {
      if (!user || !isAuthenticated) return false;
      return user.role === role;
    },
    [user, isAuthenticated]
  );

  const hasAnyRole = useCallback(
    (roles: (UserRole | string)[]): boolean => {
      if (!user || !isAuthenticated) return false;
      return roles.some((role) => user.role === role);
    },
    [user, isAuthenticated]
  );

  const getTokenExpirationTime = useCallback((): number => {
    return apiInterceptor.getTokenExpirationTime();
  }, []);

  const isTokenExpiringSoon = useCallback(
    (minutesThreshold: number = 5): boolean => {
      const expirationTime = getTokenExpirationTime();
      if (!expirationTime) return false;

      const now = Date.now();
      const thresholdMs = minutesThreshold * 60 * 1000;

      return expirationTime - now <= thresholdMs;
    },
    [getTokenExpirationTime]
  );

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
    clearError: () => setError(null),
  };
};

export default useAuth;
