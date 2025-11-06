import { useState, useEffect, useCallback } from 'react';
import { handleAsyncError } from '../utils/notifications';

export interface UseAsyncOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  errorContext?: string;
}

export interface UseAsyncReturn<T, Arguments extends unknown[]> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  execute: (...arguments_: Arguments) => Promise<T | null>;
  reset: () => void;
}

/**
 * Custom hook for handling async operations with loading and error states
 * @param asyncFunction The async function to execute
 * @param options Configuration options
 * @returns Object with data, loading, error states and execute function
 */
export function useAsync<T, Arguments extends unknown[] = []>(
  asyncFunction: (...arguments_: Arguments) => Promise<T>,
  options: UseAsyncOptions<T> = {},
): UseAsyncReturn<T, Arguments> {
  const { immediate = false, onSuccess, onError, errorContext = 'operation' } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(immediate);

  const execute = useCallback(
    async (...arguments_: Arguments): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await asyncFunction(...arguments_);
        setData(result);
        onSuccess?.(result);
        return result;
      } catch (error_) {
        const error = error_ instanceof Error ? error_ : new Error(String(error_));
        setError(error);
        onError?.(error);
        handleAsyncError(error, errorContext);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [asyncFunction, onSuccess, onError, errorContext],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (immediate) {
      execute(...([] as unknown as Arguments));
    }
  }, []);

  return { data, error, loading, execute, reset };
}
