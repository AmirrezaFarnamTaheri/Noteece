/**
 * Desktop Application Logger
 *
 * Wraps the core logger with desktop-specific functionality
 */

import { logger as coreLogger, LogLevel, LogEntry } from '@noteece/core-rs/src/logger';

// Configure logger for desktop app
if (import.meta.env.DEV) {
  coreLogger.setLevel(LogLevel.DEBUG);
} else {
  coreLogger.setLevel(LogLevel.INFO);
}

// Add desktop-specific context
coreLogger.setContext({
  platform: 'desktop',
  env: import.meta.env.MODE,
});

// Persist critical logs to storage
coreLogger.addListener(async (entry: LogEntry) => {
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

export * from '@noteece/core-rs/src/logger';

export { logger, logger as default } from '@noteece/core-rs/src/logger';
