import React from 'react';
import { useTokenExpiration } from '../hooks/useTokenExpiration';
import { useAuth } from '../hooks/useAuth';

interface TokenExpirationWarningProps {
  className?: string;
}

export const TokenExpirationWarning: React.FC<TokenExpirationWarningProps> = ({ 
  className = '' 
}) => {
  const { logout } = useAuth();
  
  const { tokenInfo, isRefreshing, refreshToken, formatTimeUntilExpiration } = useTokenExpiration({
    warningThresholdMinutes: 10,
    autoRefreshThresholdMinutes: 5,
    checkIntervalSeconds: 30,
    onTokenExpiringSoon: () => {
      console.log('Token expiring soon - showing warning');
    },
    onTokenExpired: () => {
      console.log('Token expired - logging out');
      logout();
    },
    onRefreshFailed: (error) => {
      console.error('Token refresh failed:', error);
    }
  });

  // Don't show anything if token is not expiring soon
  if (!tokenInfo.isExpiringSoon && !tokenInfo.isExpired) {
    return null;
  }

  // Handle expired token
  if (tokenInfo.isExpired) {
    return (
      <div className={`bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Sessão Expirada</span>
          </div>
          <button
            onClick={logout}
            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
          >
            Fazer Login
          </button>
        </div>
        <p className="text-sm mt-1">
          Sua sessão expirou. Faça login novamente para continuar.
        </p>
      </div>
    );
  }

  // Handle expiring soon
  return (
    <div className={`bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">Sessão Expirando</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm">
            {formatTimeUntilExpiration(tokenInfo.timeUntilExpiration)} restantes
          </span>
          <button
            onClick={refreshToken}
            disabled={isRefreshing}
            className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRefreshing ? 'Renovando...' : 'Renovar'}
          </button>
        </div>
      </div>
      <p className="text-sm mt-1">
        Sua sessão expirará em breve. Clique em "Renovar" para estender sua sessão.
      </p>
      {tokenInfo.expirationDate && (
        <p className="text-xs mt-1 opacity-75">
          Expira em: {tokenInfo.expirationDate.toLocaleString('pt-BR')}
        </p>
      )}
    </div>
  );
};

export default TokenExpirationWarning;

