/**
 * Desktop Application Logger
 *
 * Simple logger for desktop app
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
  error?: Error;
}

type LogListener = (entry: LogEntry) => void | Promise<void>;

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private context: Record<string, unknown> = {};
  private listeners: Set<LogListener> = new Set();

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setContext(ctx: Record<string, unknown>): void {
    this.context = { ...this.context, ...ctx };
  }

  addListener(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private log(level: LogLevel, message: string, error?: Error): void {
    if (level < this.level) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context: this.context,
      error,
    };

    // Console output by severity
    const levelStr = LogLevel[level];
    const args: unknown[] = [`[${levelStr}] ${message}`];
    if (error) args.push(error);
    switch (level) {
      case LogLevel.ERROR: {
        console.error(...args);
        break;
      }
      case LogLevel.WARN: {
        console.warn(...args);
        break;
      }
      case LogLevel.INFO: {
        console.info(...args);
        break;
      }
      default: {
        console.debug(...args);
        break;
      }
    }

    // Notify listeners (ignore individual listener failures)
    for (const listener of this.listeners) {
      try {
        void listener(entry);
      } catch {
        // swallow listener errors
      }
    }
  }

  debug(message: string): void {
    this.log(LogLevel.DEBUG, message);
  }

  info(message: string): void {
    this.log(LogLevel.INFO, message);
  }

  warn(message: string): void {
    this.log(LogLevel.WARN, message);
  }

  error(message: string, error?: Error): void {
    this.log(LogLevel.ERROR, message, error);
  }
}

export const logger = new Logger();

// Configure logger for desktop app
if (import.meta.env.DEV) {
  logger.setLevel(LogLevel.DEBUG);
} else {
  logger.setLevel(LogLevel.INFO);
}

// Add desktop-specific context
logger.setContext({
  platform: 'desktop',
  env: import.meta.env.MODE,
});

// Persist critical logs to storage
logger.addListener((entry: LogEntry) => {
  if (entry.level < LogLevel.ERROR) return;

  const safeStringify = (obj: unknown): string => {
    const seen = new WeakSet();
    try {
      return JSON.stringify(obj, function (_key, value) {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value as object)) return '[Circular]';
          seen.add(value as object);
        }
        if (typeof value === 'string' && value.length > 1000) {
          return value.slice(0, 1000) + '…';
        }
        return value;
      });
    } catch {
      return '[Unserializable]';
    }
  };

  try {
    const raw = localStorage.getItem('noteece_error_logs');
    const logs: any[] = raw ? JSON.parse(raw) : [];

    const sanitized = {
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp,
      context: entry.context ? safeStringify(entry.context) : undefined,
      error: entry.error
        ? entry.error instanceof Error
          ? {
              message: entry.error.message,
              stack: entry.error.stack?.slice(0, 5000),
              name: entry.error.name,
            }
          : safeStringify(entry.error)
        : undefined,
    };

    logs.push(sanitized);
    while (logs.length > 100) logs.shift();

    localStorage.setItem('noteece_error_logs', JSON.stringify(logs));
  } catch (error) {
    console.error('Failed to persist error log:', error);
  }
});

export default logger;
