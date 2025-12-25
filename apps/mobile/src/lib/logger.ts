import { captureException, captureMessage, addBreadcrumb } from './sentry';

/**
 * Unified logger for the mobile application.
 * Wraps console logging in development and Sentry reporting in production.
 */
class LoggerService {
  /**
   * Log an info message
   */
  info(message: string, data?: any) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[INFO] ${message}`, data || '');
    }

    addBreadcrumb({
      category: 'info',
      message,
      data,
      level: 'info',
    });
  }

  /**
   * Log a debug message (development only)
   */
  debug(message: string, data?: any) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[DEBUG] ${message}`, data || '');
    }

    // We don't send debug logs to Sentry breadcrumbs by default to reduce noise
    // unless strictly needed
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: any) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`[WARN] ${message}`, data || '');
    }

    addBreadcrumb({
      category: 'warning',
      message,
      data,
      level: 'warning',
    });

    // Optionally capture specific warnings as messages in Sentry
    if (!__DEV__) {
      captureMessage(message, 'warning');
    }
  }

  /**
   * Log an error message
   */
  error(message: string, error?: any) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error(`[ERROR] ${message}`, error || '');
    }

    addBreadcrumb({
      category: 'error',
      message,
      data: { error },
      level: 'error',
    });

    if (error instanceof Error) {
      captureException(error, { message });
    } else {
      captureMessage(`${message}: ${JSON.stringify(error)}`, 'error');
    }
  }
}

export const Logger = new LoggerService();
