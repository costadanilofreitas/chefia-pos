import { useCallback, useEffect, useRef, useState } from "react";
import { apiInterceptor } from "../services/ApiInterceptor";

export interface TokenExpirationInfo {
  isExpiringSoon: boolean;
  timeUntilExpiration: number;
  expirationDate: Date | null;
  isExpired: boolean;
}

export interface UseTokenExpirationOptions {
  warningThresholdMinutes?: number;
  autoRefreshThresholdMinutes?: number;
  checkIntervalSeconds?: number;
  onTokenExpiringSoon?: () => void;
  onTokenExpired?: () => void;
  onTokenRefreshed?: () => void;
  onRefreshFailed?: (_error: Error) => void;
}

export const useTokenExpiration = (options: UseTokenExpirationOptions = {}) => {
  const {
    warningThresholdMinutes = 10,
    autoRefreshThresholdMinutes = 5,
    checkIntervalSeconds = 30,
    onTokenExpiringSoon,
    onTokenExpired,
    onRefreshFailed,
  } = options;

  const [tokenInfo, setTokenInfo] = useState<TokenExpirationInfo>({
    isExpiringSoon: false,
    timeUntilExpiration: 0,
    expirationDate: null,
    isExpired: false,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasWarned = useRef(false);
  const hasAutoRefreshed = useRef(false);

  const calculateTokenInfo = useCallback((): TokenExpirationInfo => {
    const expirationTime = apiInterceptor.getTokenExpirationTime();

    if (!expirationTime) {
      return {
        isExpiringSoon: false,
        timeUntilExpiration: 0,
        expirationDate: null,
        isExpired: false,
      };
    }

    const now = Date.now();
    const timeUntilExpiration = expirationTime - now;
    const expirationDate = new Date(expirationTime);
    const isExpired = timeUntilExpiration <= 0;

    const warningThresholdMs = warningThresholdMinutes * 60 * 1000;
    const isExpiringSoon =
      timeUntilExpiration <= warningThresholdMs && timeUntilExpiration > 0;

    return {
      isExpiringSoon,
      timeUntilExpiration: Math.max(0, timeUntilExpiration),
      expirationDate,
      isExpired,
    };
  }, [warningThresholdMinutes]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshing) {
      return false;
    }

    setIsRefreshing(true);

    try {
      // For now, we don't have a refresh endpoint, so we'll just validate the current token
      // In a real implementation, you would call a refresh endpoint here

      // Simulate a refresh logic: if token is valid, return true, else return false
      const token = apiInterceptor.getToken();
      if (token && apiInterceptor.isTokenValid()) {
        hasAutoRefreshed.current = false;
        // Optionally call onTokenRefreshed if implemented
        if (options.onTokenRefreshed) {
          options.onTokenRefreshed();
        }
        return true;
      } else {
        hasAutoRefreshed.current = false;
        if (onRefreshFailed) {
          onRefreshFailed(
            new Error("Token refresh not implemented or token invalid")
          );
        }
        return false;
      }
    } catch (error) {
      hasAutoRefreshed.current = false;

      if (onRefreshFailed) {
        onRefreshFailed(error as Error);
      }

      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefreshFailed, options]);

  const checkTokenStatus = useCallback(() => {
    const info = calculateTokenInfo();
    setTokenInfo(info);

    // Handle expired token
    if (info.isExpired) {
      if (onTokenExpired) {
        onTokenExpired();
      }
      return;
    }

    // Handle expiring soon warning
    if (info.isExpiringSoon && !hasWarned.current) {
      hasWarned.current = true;
      if (onTokenExpiringSoon) {
        onTokenExpiringSoon();
      }
    }

    // Reset warning flag if token is no longer expiring soon
    if (!info.isExpiringSoon) {
      hasWarned.current = false;
    }

    // Handle auto-refresh
    const autoRefreshThresholdMs = autoRefreshThresholdMinutes * 60 * 1000;
    const shouldAutoRefresh =
      info.timeUntilExpiration <= autoRefreshThresholdMs &&
      info.timeUntilExpiration > 0 &&
      !hasAutoRefreshed.current;

    if (shouldAutoRefresh) {
      hasAutoRefreshed.current = true;
      refreshToken();
    }
  }, [
    calculateTokenInfo,
    autoRefreshThresholdMinutes,
    onTokenExpired,
    onTokenExpiringSoon,
    refreshToken,
  ]);

  // Start/stop monitoring
  const startMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Initial check
    checkTokenStatus();

    // Set up interval
    intervalRef.current = setInterval(
      checkTokenStatus,
      checkIntervalSeconds * 1000
    );
  }, [checkTokenStatus, checkIntervalSeconds]);

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Auto-start monitoring when token is available
  useEffect(() => {
    const token = apiInterceptor.getToken();

    if (token && apiInterceptor.isTokenValid()) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [startMonitoring, stopMonitoring]);

  // Listen for auth events
  useEffect(() => {
    const handleLogin = () => {
      hasWarned.current = false;
      hasAutoRefreshed.current = false;
      startMonitoring();
    };

    const handleLogout = () => {
      hasWarned.current = false;
      hasAutoRefreshed.current = false;
      stopMonitoring();
      setTokenInfo({
        isExpiringSoon: false,
        timeUntilExpiration: 0,
        expirationDate: null,
        isExpired: false,
      });
    };

    const handleTokenExpired = () => {
      stopMonitoring();
    };

    window.addEventListener("auth:login", handleLogin);
    window.addEventListener("auth:logout", handleLogout);
    window.addEventListener("auth:token-expired", handleTokenExpired);

    return () => {
      window.removeEventListener("auth:login", handleLogin);
      window.removeEventListener("auth:logout", handleLogout);
      window.removeEventListener("auth:token-expired", handleTokenExpired);
    };
  }, [startMonitoring, stopMonitoring]);

  // Format time until expiration
  const formatTimeUntilExpiration = useCallback((timeMs: number): string => {
    if (timeMs <= 0) return "Expirado";

    const totalMinutes = Math.floor(timeMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }, []);

  return {
    tokenInfo,
    isRefreshing,
    refreshToken,
    startMonitoring,
    stopMonitoring,
    formatTimeUntilExpiration,
  };
};

export default useTokenExpiration;
