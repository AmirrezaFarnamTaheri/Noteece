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

  private constructor() {
    if (import.meta.env.DEV) {
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
    const consoleArgs = [
      `%c[${LogLevel[level]}] ${message}`,
      style,
      entry.context || '',
    ];

    switch (level) {
      case LogLevel.DEBUG: {
        // eslint-disable-next-line no-console
        console.debug(...consoleArgs);
        break;
      }
      case LogLevel.INFO: {
        // eslint-disable-next-line no-console
        console.info(...consoleArgs);
        break;
      }
      case LogLevel.WARN: {
        // eslint-disable-next-line no-console
        console.warn(...consoleArgs);
        break;
      }
      case LogLevel.ERROR: {
        // eslint-disable-next-line no-console
        console.error(...consoleArgs);
        break;
      }
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (error) {
        // Prevent listener errors from crashing the app
        // eslint-disable-next-line no-console
        console.error('Error in log listener:', error);
      }
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

    // Deep clone to avoid mutation
    try {
      const sanitized = JSON.parse(JSON.stringify(context));
      this.redactSensitiveData(sanitized);
      return sanitized;
    } catch {
      return { error: 'Failed to sanitize context' };
    }
  }

  private redactSensitiveData(obj: unknown) {
    if (!obj || typeof obj !== 'object') return;

    // Use type assertion since we checked it's an object
    const record = obj as Record<string, unknown>;

    for (const key of Object.keys(record)) {
        // Check if key is sensitive
        if (['password', 'token', 'key', 'secret', 'authorization'].some(k => key.toLowerCase().includes(k))) {
            record[key] = '[REDACTED]';
        } else {
            const value = record[key];
            if (typeof value === 'object' && value !== null) {
                this.redactSensitiveData(value);
            } else if (typeof value === 'string') {
                // Check if value contains sensitive patterns (like Bearer token)
                 if (/bearer\s+\S+/i.test(value)) {
                    record[key] = value.replace(/bearer\s+\S+/i, 'Bearer [REDACTED]');
                 }
            }
        }
    }
  }
}

export const logger = Logger.getInstance();
