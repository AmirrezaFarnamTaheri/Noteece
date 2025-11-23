/**
 * Network Retry Utility
 *
 * Implements exponential backoff with jitter for resilient network requests.
 * Automatically retries failed requests with increasing delays.
 */

export interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number; // milliseconds
  maxDelay?: number; // milliseconds
  backoffFactor?: number;
  jitter?: boolean;
  retryableErrors?: string[]; // Error message patterns to retry
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
  jitter: true,
  retryableErrors: [
    "network",
    "timeout",
    "fetch failed",
    "connection",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "503", // Service Unavailable
    "502", // Bad Gateway
    "504", // Gateway Timeout
  ],
  onRetry: () => {},
};

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  config: Required<RetryConfig>,
): number {
  const exponentialDelay = Math.min(
    config.initialDelay * Math.pow(config.backoffFactor, attempt),
    config.maxDelay,
  );

  if (config.jitter) {
    // Add random jitter: ±25% of the delay
    const jitterRange = exponentialDelay * 0.25;
    const jitter = Math.random() * jitterRange * 2 - jitterRange;
    return Math.max(0, exponentialDelay + jitter);
  }

  return exponentialDelay;
}

/**
 * Check if an error should be retried
 */
function shouldRetry(error: Error, config: Required<RetryConfig>): boolean {
  const errorMessage = error.message?.toLowerCase() || "";
  const errorName = error.name?.toLowerCase() || "";

  return config.retryableErrors.some(
    (pattern) =>
      errorMessage.includes(pattern.toLowerCase()) ||
      errorName.includes(pattern.toLowerCase()),
  );
}

/**
 * Retry a function with exponential backoff
 *
 * @example
 * ```typescript
 * const data = await withRetry(
 *   async () => {
 *     const response = await fetch('/api/data');
 *     if (!response.ok) throw new Error('Fetch failed');
 *     return response.json();
 *   },
 *   { maxRetries: 3, initialDelay: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt === finalConfig.maxRetries) {
        break;
      }

      // Check if error should be retried
      if (!shouldRetry(lastError, finalConfig)) {
        throw lastError;
      }

      // Calculate delay and notify
      const delay = calculateDelay(attempt, finalConfig);
      finalConfig.onRetry(attempt + 1, lastError);

      if (__DEV__) {
        /* console.log(
          `[Retry] Attempt ${attempt + 1}/${finalConfig.maxRetries} failed: ${lastError.message}. Retrying in ${Math.round(delay)}ms...`,
        ); */
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a retry wrapper for a function
 *
 * @example
 * ```typescript
 * const fetchWithRetry = retryable(
 *   async (url: string) => {
 *     const response = await fetch(url);
 *     return response.json();
 *   },
 *   { maxRetries: 3 }
 * );
 *
 * const data = await fetchWithRetry('/api/data');
 * ```
 */
export function retryable<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config: RetryConfig = {},
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => withRetry(() => fn(...args), config);
}

/**
 * Retry with custom predicate function
 *
 * @example
 * ```typescript
 * const data = await retryUntil(
 *   async () => fetch('/api/status'),
 *   (response) => response.status === 200,
 *   { maxRetries: 5, initialDelay: 2000 }
 * );
 * ```
 */
export async function retryUntil<T>(
  fn: () => Promise<T>,
  predicate: (result: T) => boolean,
  config: RetryConfig = {},
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const result = await fn();

      if (predicate(result)) {
        return result;
      }

      // Don't retry on last attempt
      if (attempt === finalConfig.maxRetries) {
        throw new Error("Retry predicate not satisfied");
      }

      const delay = calculateDelay(attempt, finalConfig);
      if (__DEV__) {
        /* console.log(
          `[Retry] Predicate not satisfied. Attempt ${attempt + 1}/${finalConfig.maxRetries}. Retrying in ${Math.round(delay)}ms...`,
        ); */
      }

      await sleep(delay);
    } catch (error) {
      // Don't retry on last attempt
      if (attempt === finalConfig.maxRetries) {
        throw error;
      }

      const lastError =
        error instanceof Error ? error : new Error(String(error));

      if (!shouldRetry(lastError, finalConfig)) {
        throw lastError;
      }

      const delay = calculateDelay(attempt, finalConfig);
      finalConfig.onRetry(attempt + 1, lastError);

      if (__DEV__) {
        /* console.log(
          `[Retry] Attempt ${attempt + 1}/${finalConfig.maxRetries} failed. Retrying in ${Math.round(delay)}ms...`,
        ); */
      }

      await sleep(delay);
    }
  }

  throw new Error("Max retries exceeded");
}

/**
 * Batch retry - retry multiple operations with shared backoff
 *
 * Useful for retrying multiple related operations that should share
 * the same backoff timing (e.g., multiple API calls that all failed
 * due to network issue).
 */
export async function batchRetry<T>(
  operations: (() => Promise<T>)[],
  config: RetryConfig = {},
): Promise<T[]> {
  return withRetry(async () => {
    return Promise.all(operations.map((op) => op()));
  }, config);
}
