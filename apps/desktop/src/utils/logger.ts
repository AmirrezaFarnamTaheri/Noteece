/**
 * Sentry integration is recommended for remote error reporting.
 * To enable: install @sentry/react and set the SENTRY_DSN environment variable.
 * The initialization below checks for the presence of SENTRY_DSN and conditionally loads Sentry.
 */

let sentryInitialized = false;

function initSentry(): void {
  if (sentryInitialized) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.info('[Logger] Sentry DSN not configured (VITE_SENTRY_DSN). Remote error reporting disabled.');
    return;
  }

  try {
    // Dynamic import to avoid hard dependency on @sentry/react
    import('@sentry/react')
      .then((Sentry) => {
        Sentry.init({
          dsn,
          environment: import.meta.env.MODE || 'development',
          tracesSampleRate: 0.1,
          beforeSend(event) {
            // Scrub sensitive data before sending
            if (event.exception?.values) {
              for (const ex of event.exception.values) {
                if (ex.value) {
                  ex.value = ex.value.replaceAll(/bearer\s+\S+/gi, 'Bearer [REDACTED]');
                }
              }
            }
            return event;
          },
        });
        sentryInitialized = true;
        console.info('[Logger] Sentry initialized for remote error reporting.');
      })
      .catch(() => {
        console.info('[Logger] @sentry/react not installed. Remote error reporting disabled.');
      });
  } catch {
    console.info('[Logger] Sentry initialization skipped.');
  }
}

// Attempt Sentry init on module load
initSentry();

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

export class Logger {
  private static instance: Logger;
  private minLevel: LogLevel = LogLevel.INFO;
  private listeners: ((entry: LogEntry) => void)[] = [];
  private maxStoredLogs = 100;

  private constructor() {
    // Safe check for import.meta to avoid crashing in Jest/Node environments
    if (import.meta.env && import.meta.env.DEV) {
      this.minLevel = LogLevel.DEBUG;
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLevel(level: LogLevel) {
    this.minLevel = level;
  }

  addListener(listener: (entry: LogEntry) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.log(LogLevel.ERROR, message, { ...context, error: errorObj });
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.sanitizeContext(context),
    };

    // Console output
    const style = this.getConsoleStyle(level);
    const consoleArgs = [`%c[${LogLevel[level]}] ${message}`, style, entry.context || ''];

    switch (level) {
      case LogLevel.DEBUG: {
        console.debug(...consoleArgs);
        break;
      }
      case LogLevel.INFO: {
        console.info(...consoleArgs);
        break;
      }
      case LogLevel.WARN: {
        console.warn(...consoleArgs);
        break;
      }
      case LogLevel.ERROR: {
        console.error(...consoleArgs);
        this.persistErrorLog(entry);
        break;
      }
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (error) {
        // Prevent listener errors from crashing the app
        console.error('Error in log listener:', error);
      }
    }
  }

  private persistErrorLog(entry: LogEntry) {
    try {
      if (typeof localStorage === 'undefined') return;

      const storedLogs = localStorage.getItem('noteece_error_logs');
      let logs: LogEntry[] = storedLogs ? JSON.parse(storedLogs) : [];

      logs.unshift(entry);
      if (logs.length > this.maxStoredLogs) {
        logs = logs.slice(0, this.maxStoredLogs);
      }

      localStorage.setItem('noteece_error_logs', JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to persist error log:', error);
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: {
        return 'color: #888';
      }
      case LogLevel.INFO: {
        return 'color: #4CAF50';
      }
      case LogLevel.WARN: {
        return 'color: #FFC107';
      }
      case LogLevel.ERROR: {
        return 'color: #F44336; font-weight: bold';
      }
      default: {
        return '';
      }
    }
  }

  private sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) return undefined;

    // Use custom stringify to handle circular refs
    try {
      const safeString = this.safeStringify(context);
      const sanitized = JSON.parse(safeString);
      this.redactSensitiveData(sanitized);
      return sanitized;
    } catch {
      return { error: 'Failed to sanitize context' };
    }
  }

  private safeStringify(obj: unknown): string {
    const cache = new Set();
    return JSON.stringify(obj, (_key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return '[Circular]';
        }
        cache.add(value);
      }

      if (value instanceof Error) {
        return {
          // capture other enumerable properties
          ...value,
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
      }

      return value;
    });
  }

  private redactSensitiveData(obj: unknown) {
    if (!obj || typeof obj !== 'object') return;

    // Use type assertion since we checked it's an object
    const record = obj as Record<string, unknown>;

    for (const key of Object.keys(record)) {
      // Check if key is sensitive
      if (['password', 'token', 'key', 'secret', 'authorization'].some((k) => key.toLowerCase().includes(k))) {
        record[key] = '[REDACTED]';
      } else {
        const value = record[key];
        if (typeof value === 'object' && value !== null) {
          this.redactSensitiveData(value);
        } else if (typeof value === 'string' && /bearer\s+\S+/i.test(value)) {
          // Check if value contains sensitive patterns (like Bearer token)
          record[key] = value.replace(/bearer\s+\S+/i, 'Bearer [REDACTED]');
        }
      }
    }
  }
}

export const logger = Logger.getInstance();

/**
 * Sentry Integration (Recommended for Production)
 *
 * For production deployments, replace localStorage error persistence with
 * Sentry for centralized error tracking, alerting, and diagnostics.
 *
 * Setup steps:
 * 1. Install: pnpm add @sentry/electron
 * 2. Set SENTRY_DSN environment variable
 * 3. Initialize Sentry in the app entry point before any other code
 * 4. The reportToRemote() method below will forward errors to Sentry
 *
 * @example
 * import * as Sentry from '@sentry/electron';
 * Sentry.init({ dsn: process.env.SENTRY_DSN });
 */
export function reportToRemote(entry: LogEntry): void {
  const sentryDsn = import.meta.env?.SENTRY_DSN || (typeof process !== 'undefined' && process.env?.SENTRY_DSN);
  if (!sentryDsn) return;

  if (entry.level >= LogLevel.ERROR && entry.error) {
    // Sentry integration point: forward error to remote tracking service
    // When @sentry/electron is installed, replace with:
    //   Sentry.captureException(entry.error, { extra: entry.context });
    console.info('[Logger] Would report to Sentry:', entry.message);
  }
}
