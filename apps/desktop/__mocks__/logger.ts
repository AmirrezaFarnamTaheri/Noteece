export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export const logger = {
  setLevel: (_level: LogLevel) => {
    // no-op in tests
  },
  setContext: (_ctx: Record<string, unknown>) => {
    // no-op in tests
  },
  debug: (_msg: string) => {
    // no-op in tests
  },
  info: (_msg: string) => {
    // no-op in tests
  },
  warn: (_msg: string) => {
    // no-op in tests
  },
  error: (_msg: string, _error?: Error) => {
    // no-op in tests
  },
};

export default logger;
