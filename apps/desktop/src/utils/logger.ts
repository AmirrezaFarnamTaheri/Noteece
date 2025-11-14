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
  private listeners: LogListener[] = [];

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setContext(ctx: Record<string, unknown>): void {
    this.context = { ...this.context, ...ctx };
  }

  addListener(listener: LogListener): void {
    this.listeners.push(listener);
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

    // Console output
    const levelStr = LogLevel[level];
    console.log(`[${levelStr}] ${message}`, error || '');

    // Notify listeners
    this.listeners.forEach((listener) => {
      void listener(entry);
    });
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
  if (entry.level >= LogLevel.ERROR) {
    try {
      // Store critical logs for debugging
      const logs = JSON.parse(localStorage.getItem('noteece_error_logs') || '[]');
      logs.push({
        ...entry,
        error: entry.error
          ? {
              message: entry.error.message,
              stack: entry.error.stack,
            }
          : undefined,
      });

      // Keep only last 100 error logs
      if (logs.length > 100) {
        logs.shift();
      }

      localStorage.setItem('noteece_error_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to persist error log:', error);
    }
  }
});

export default logger;
