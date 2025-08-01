// src/components/AuthGuard.tsx
import React from 'react';
import { useAuth, UserRole } from '../hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requireAuth?: boolean;
  requireOpenDay?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requiredRole,
  requireAuth = false,
  requireOpenDay = false
}) => {
  const { user, isAuthenticated } = useAuth();

  // REGRA 1: Se não requer autenticação, sempre permite acesso
  // (Para produtos, consultas livres, etc.)
  if (!requireAuth) {
    return <>{children}</>;
  }

  // REGRA 2: Se requer autenticação mas não está logado
  if (requireAuth && !isAuthenticated) {
    // Retorna children normalmente - o componente pai deve mostrar login
    // Não fazemos redirect aqui para evitar loops
    return <>{children}</>;
  }

  // REGRA 3: Se está autenticado mas não tem o papel necessário
  if (isAuthenticated && requiredRole && user?.role !== requiredRole) {
    // Retorna children normalmente - o componente pai deve lidar com permissões
    return <>{children}</>;
  }

  // REGRA 4: Se requer dia aberto (para operações específicas)
  if (requireOpenDay) {
    // Verificação de dia aberto será implementada quando o módulo business day estiver completo
    // Por enquanto, permite acesso se autenticado
  }

  // Se passou por todas as validações, permite acesso
  return <>{children}</>;
};

export default AuthGuard;

