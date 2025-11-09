import { useEffect, useCallback, useRef, useState } from 'react';
import { authService } from '../services/auth';

interface SessionWarning {
  show: boolean;
  minutesLeft: number;
}

export const useSessionRefresh = (
  onSessionExpired?: () => void,
  onWarning?: (minutesLeft: number) => void
) => {
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [sessionWarning, setSessionWarning] = useState<SessionWarning>({ show: false, minutesLeft: 0 });

  const checkSession = useCallback(async () => {
    try {
      const isValid = await authService.refreshAuth();

      if (!isValid) {
        // Session has expired
        setSessionWarning({ show: false, minutesLeft: 0 });
        clearInterval(refreshIntervalRef.current!);
        onSessionExpired?.();
      }
    } catch (error) {
      console.error('Session check failed:', error);
      // Treat error as expired session for safety
      setSessionWarning({ show: false, minutesLeft: 0 });
      clearInterval(refreshIntervalRef.current!);
      onSessionExpired?.();
    }
  }, [onSessionExpired]);

  const getSessionTimeRemaining = useCallback(() => {
    const session = authService.getSession();
    if (!session) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    const secondsLeft = session.expires_at - now;

    return Math.max(0, Math.floor(secondsLeft / 60)); // Convert to minutes
  }, []);

  useEffect(() => {
    // Check session immediately on mount
    checkSession();

    // Set up periodic session refresh (every 15 minutes)
    refreshIntervalRef.current = setInterval(() => {
      checkSession();

      // Check if we should warn about expiry (5 minutes before expiry)
      const minutesLeft = getSessionTimeRemaining();
      if (minutesLeft > 0 && minutesLeft <= 5 && !sessionWarning.show) {
        setSessionWarning({ show: true, minutesLeft });
        onWarning?.(minutesLeft);
      } else if (minutesLeft > 5 && sessionWarning.show) {
        // Clear warning if session has been refreshed
        setSessionWarning({ show: false, minutesLeft: 0 });
      }
    }, 15 * 60 * 1000); // 15 minutes

    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [checkSession, getSessionTimeRemaining, onSessionExpired, onWarning, sessionWarning.show]);

  const dismissWarning = useCallback(() => {
    setSessionWarning({ show: false, minutesLeft: 0 });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setSessionWarning({ show: false, minutesLeft: 0 });
      onSessionExpired?.();
    } catch (error) {
      console.error('Logout failed:', error);
      onSessionExpired?.();
    }
  }, [onSessionExpired]);

  return {
    sessionWarning,
    dismissWarning,
    logout,
    getSessionTimeRemaining,
    checkSession,
  };
};

export default useSessionRefresh;
