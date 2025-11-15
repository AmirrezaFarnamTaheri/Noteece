// Notification utilities for user feedback
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { logger } from './logger';

export interface NotificationOptions {
  title?: string;
  message: string;
  autoClose?: number | false;
}

/**
 * Shows a success notification
 */
export const showSuccess = (options: NotificationOptions) => {
  notifications.show({
    title: options.title || 'Success',
    message: options.message,
    color: 'green',
    icon: <IconCheck size={18} />,
    autoClose: options.autoClose ?? 4000,
  });
};

/**
 * Shows an error notification
 */
export const showError = (options: NotificationOptions) => {
  notifications.show({
    title: options.title || 'Error',
    message: options.message,
    color: 'red',
    icon: <IconX size={18} />,
    autoClose: options.autoClose ?? 6000,
  });
};

/**
 * Shows a warning notification
 */
export const showWarning = (options: NotificationOptions) => {
  notifications.show({
    title: options.title || 'Warning',
    message: options.message,
    color: 'yellow',
    icon: <IconAlertTriangle size={18} />,
    autoClose: options.autoClose ?? 5000,
  });
};

/**
 * Shows an info notification
 */
export const showInfo = (options: NotificationOptions) => {
  notifications.show({
    title: options.title || 'Info',
    message: options.message,
    color: 'blue',
    icon: <IconInfoCircle size={18} />,
    autoClose: options.autoClose ?? 4000,
  });
};

/**
 * Shows a loading notification and returns an ID to update it later
 */
export const showLoading = (options: NotificationOptions): string => {
  const id = Math.random().toString(36).slice(7);
  notifications.show({
    id,
    title: options.title || 'Loading',
    message: options.message,
    loading: true,
    autoClose: false,
    withCloseButton: false,
  });
  return id;
};

/**
 * Updates a loading notification to success
 */
export const updateToSuccess = (id: string, options: NotificationOptions) => {
  notifications.update({
    id,
    title: options.title || 'Success',
    message: options.message,
    color: 'green',
    icon: <IconCheck size={18} />,
    loading: false,
    autoClose: 4000,
    withCloseButton: true,
  });
};

/**
 * Updates a loading notification to error
 */
export const updateToError = (id: string, options: NotificationOptions) => {
  notifications.update({
    id,
    title: options.title || 'Error',
    message: options.message,
    color: 'red',
    icon: <IconX size={18} />,
    loading: false,
    autoClose: 6000,
    withCloseButton: true,
  });
};

/**
 * Handles errors from async operations and shows appropriate notifications
 */
export const handleAsyncError = (error: unknown, context: string): void => {
  logger.error(`Error in ${context}:`, error as Error);

  let errorMessage = 'An unexpected error occurred';

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage = String(error.message);
  }

  showError({
    title: `Error: ${context}`,
    message: errorMessage,
  });
};

/**
 * Wraps an async function with error handling and notifications
 */
export const withErrorHandling = <T extends (...arguments_: unknown[]) => Promise<unknown>>(
  function_: T,
  options: {
    context: string;
    successMessage?: string;
    loadingMessage?: string;
    showSuccessNotification?: boolean;
  },
): T => {
  return (async (...arguments_: Parameters<T>) => {
    const loadingId = options.loadingMessage ? showLoading({ message: options.loadingMessage }) : undefined;

    try {
      const result = await function_(...arguments_);

      if (loadingId && options.successMessage) {
        updateToSuccess(loadingId, { message: options.successMessage });
      } else if (options.showSuccessNotification && options.successMessage) {
        showSuccess({ message: options.successMessage });
      }

      return result;
    } catch (error) {
      if (loadingId) {
        updateToError(loadingId, {
          message: error instanceof Error ? error.message : 'An error occurred',
        });
      } else {
        handleAsyncError(error, options.context);
      }
      throw error;
    }
  }) as T;
};
