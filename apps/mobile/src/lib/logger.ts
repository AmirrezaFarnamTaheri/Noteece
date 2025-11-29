/**
 * Mobile Application Logger
 *
 * Simple logger for mobile app using AsyncStorage for persistence
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

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

interface StoredLogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: string;
  error?:
    | {
        message: string;
        stack?: string;
        name: string;
      }
    | string;
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
    let removed = false;
    return () => {
      if (!removed) {
        this.listeners.delete(listener);
        removed = true;
      }
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

  debug(message: string, context?: Record<string, unknown>): void {
    if (context) this.setContext(context);
    this.log(LogLevel.DEBUG, message);
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (context) this.setContext(context);
    this.log(LogLevel.INFO, message);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (context) this.setContext(context);
    this.log(LogLevel.WARN, message);
  }

  error(message: string, error?: Error | Record<string, unknown>): void {
    if (error instanceof Error) {
      this.log(LogLevel.ERROR, message, error);
    } else if (error) {
      this.setContext(error);
      this.log(LogLevel.ERROR, message);
    } else {
      this.log(LogLevel.ERROR, message);
    }
  }
}

export const logger = new Logger();

// Configure logger for mobile app
if (__DEV__) {
  logger.setLevel(LogLevel.DEBUG);
} else {
  logger.setLevel(LogLevel.INFO);
}

// Add mobile-specific context
logger.setContext({
  platform: 'mobile',
  env: __DEV__ ? 'development' : 'production',
});

// Persist critical logs to storage
logger.addListener(async (entry: LogEntry) => {
  if (entry.level < LogLevel.ERROR) return;

  const safeStringify = (obj: unknown): string => {
    const seen = new WeakSet();
    try {
      return JSON.stringify(obj, function (_key, value: unknown) {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
        }
        if (typeof value === 'string' && value.length > 1000) {
          return value.slice(0, 1000) + '…';
        }
        return value as string | number | boolean | null | object;
      });
    } catch {
      return '[Unserializable]';
    }
  };

  try {
    const raw = await AsyncStorage.getItem('noteece_error_logs');
    const logs: StoredLogEntry[] = raw ? (JSON.parse(raw) as StoredLogEntry[]) : [];

    const sanitized: StoredLogEntry = {
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

    await AsyncStorage.setItem('noteece_error_logs', JSON.stringify(logs));
  } catch (error) {
    // Silently ignore storage errors
  }
});

export default logger;
