/**
 * Centralized Logging Utility for Noteece
 *
 * Provides structured logging with different severity levels,
 * context tracking, and performance monitoring.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  stack?: string;
}

class Logger {
  private minLevel: LogLevel = LogLevel.INFO;
  private context: LogContext = {};
  private listeners: Array<(entry: LogEntry) => void> = [];

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Set global context that will be included in all logs
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear global context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Add a listener for log entries
   */
  addListener(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : undefined;
    const errorContext = error instanceof Error ? {} : { error };

    this.log(LogLevel.ERROR, message, { ...context, ...errorContext }, errorObj);
  }

  /**
   * Log a fatal error message
   */
  fatal(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : undefined;
    const errorContext = error instanceof Error ? {} : { error };

    this.log(LogLevel.FATAL, message, { ...context, ...errorContext }, errorObj);
  }

  /**
   * Time a function execution
   */
  async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.debug(`${label} completed`, { duration: `${duration.toFixed(2)}ms` });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`${label} failed`, error, { duration: `${duration.toFixed(2)}ms` });
      throw error;
    }
  }

  /**
   * Time a synchronous function execution
   */
  timeSync<T>(label: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.debug(`${label} completed`, { duration: `${duration.toFixed(2)}ms` });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`${label} failed`, error, { duration: `${duration.toFixed(2)}ms` });
      throw error;
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.minLevel = this.minLevel;
    childLogger.context = { ...this.context, ...context };
    childLogger.listeners = [...this.listeners];
    return childLogger;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
      error,
      stack: error?.stack,
    };

    // Console output
    this.logToConsole(entry);

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (err) {
        console.error('Error in log listener:', err);
      }
    }
  }

  private logToConsole(entry: LogEntry): void {
    const levelStr = LogLevel[entry.level];
    const contextStr = entry.context && Object.keys(entry.context).length > 0
      ? JSON.stringify(entry.context)
      : '';

    const parts = [
      `[${entry.timestamp}]`,
      `[${levelStr}]`,
      entry.message,
      contextStr,
    ].filter(Boolean);

    const message = parts.join(' ');

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.error || '');
        break;
      case LogLevel.INFO:
        console.info(message, entry.error || '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.error || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message, entry.error || '');
        if (entry.stack) {
          console.error(entry.stack);
        }
        break;
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports
export const setLogLevel = (level: LogLevel) => logger.setLevel(level);
export const setLogContext = (context: LogContext) => logger.setContext(context);
export const clearLogContext = () => logger.clearContext();
export const addLogListener = (listener: (entry: LogEntry) => void) =>
  logger.addListener(listener);

// Export commonly used log functions
export const debug = (message: string, context?: LogContext) =>
  logger.debug(message, context);
export const info = (message: string, context?: LogContext) =>
  logger.info(message, context);
export const warn = (message: string, context?: LogContext) =>
  logger.warn(message, context);
export const error = (message: string, err?: Error | unknown, context?: LogContext) =>
  logger.error(message, err, context);
export const fatal = (message: string, err?: Error | unknown, context?: LogContext) =>
  logger.fatal(message, err, context);
export const time = <T>(label: string, fn: () => Promise<T>) =>
  logger.time(label, fn);
export const timeSync = <T>(label: string, fn: () => T) =>
  logger.timeSync(label, fn);

export default logger;
