import { useEffect, useCallback, useRef, useState } from 'react';
import { authService } from '../services/auth';

interface SessionWarning {
  show: boolean;
  minutesLeft: number;
}

export const useSessionRefresh = (onSessionExpired?: () => void, onWarning?: (minutesLeft: number) => void) => {
  const refreshIntervalReference = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutReference = useRef<NodeJS.Timeout | null>(null);
  const [sessionWarning, setSessionWarning] = useState<SessionWarning>({ show: false, minutesLeft: 0 });

  const checkSession = useCallback(async () => {
    try {
      const isValid = await authService.refreshAuth();

      if (!isValid) {
        // Session has expired - do NOT clear the interval here
        setSessionWarning({ show: false, minutesLeft: 0 });
        onSessionExpired?.();
      }
    } catch (error) {
      console.error('Session check failed:', error);
      // Treat error as expired session for safety - but don't kill the interval
      setSessionWarning({ show: false, minutesLeft: 0 });
      onSessionExpired?.();
    }
  }, [onSessionExpired]);

  const getSessionTimeRemaining = useCallback(() => {
    const session = authService.getSession();
    if (!session) {
      return 0;
    }

    // Handle various session.expires_at formats
    let expiresAtSec: number | null = null;
    const exp = (session as any).expires_at;

    if (typeof exp === 'number' && Number.isFinite(exp)) {
      // Heuristic: if value looks like milliseconds (far in the future), convert to seconds
      expiresAtSec = exp > 1e12 ? Math.floor(exp / 1000) : exp;
    } else if (typeof exp === 'string') {
      const parsed = Date.parse(exp);
      if (!Number.isNaN(parsed)) {
        expiresAtSec = Math.floor(parsed / 1000);
      }
    }

    if (expiresAtSec == null) {
      return 0;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const secondsLeft = expiresAtSec - nowSec;

    return Math.max(0, Math.floor(secondsLeft / 60)); // Convert to minutes
  }, []);

  useEffect(() => {
    // Check session immediately on mount
    checkSession();

    // Set up periodic session refresh (every 15 minutes)
    refreshIntervalReference.current = setInterval(
      () => {
        checkSession();

        // Check if we should warn about expiry (5 minutes before expiry)
        const minutesLeft = getSessionTimeRemaining();

        // Use functional update to avoid dependency on sessionWarning
        setSessionWarning((previous) => {
          if (minutesLeft > 0 && minutesLeft <= 5 && !previous.show) {
            onWarning?.(minutesLeft);
            return { show: true, minutesLeft };
          }
          if (minutesLeft > 5 && previous.show) {
            // Clear warning if session has been refreshed
            return { show: false, minutesLeft: 0 };
          }
          return previous;
        });
      },
      15 * 60 * 1000,
    ); // 15 minutes

    // Cleanup on unmount
    return () => {
      if (refreshIntervalReference.current) {
        clearInterval(refreshIntervalReference.current);
      }
      if (warningTimeoutReference.current) {
        clearTimeout(warningTimeoutReference.current);
      }
    };
  }, [checkSession, getSessionTimeRemaining, onWarning]);

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
