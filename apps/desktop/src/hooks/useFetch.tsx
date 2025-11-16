import { useState, useEffect, useCallback } from 'react';
import { handleAsyncError } from '../utils/notifications';

export interface UseFetchOptions<T> {
  skip?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  errorContext?: string;
  dependencies?: unknown[];
}

export interface UseFetchReturn<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for data fetching with automatic loading and error handling
 * @param fetchFunction Function that returns a promise with data
 * @param options Configuration options
 * @returns Object with data, loading, error states and refetch function
 */
export function useFetch<T>(fetchFunction: () => Promise<T>, options: UseFetchOptions<T> = {}): UseFetchReturn<T> {
  const { skip = false, onSuccess, onError, errorContext = 'fetching data', dependencies = [] } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(!skip);

  const fetch = useCallback(async () => {
    if (skip) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction();
      setData(result);
      onSuccess?.(result);
    } catch (error_) {
      const error = error_ instanceof Error ? error_ : new Error(String(error_));
      setError(error);
      onError?.(error);
      handleAsyncError(error, errorContext);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, skip, onSuccess, onError, errorContext]);

  useEffect(() => {
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, ...dependencies]);

  return {
    data,
    error,
    loading,
    refetch: fetch,
  };
}
