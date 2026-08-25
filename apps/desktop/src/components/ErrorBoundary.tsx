import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, Button, Container, Text, Stack, Code } from '@mantine/core';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { logger } from '@/utils/logger';

interface Properties {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isChunkLoadError: boolean;
}

function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  const message = error.message || '';
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('Importing a module script failed') ||
    message.includes('vite:preloadError') ||
    (error.name === 'TypeError' && message.includes('fetch'))
  );
}

/**
 * Error Boundary component to catch and display React errors gracefully
 */
export class ErrorBoundary extends Component<Properties, State> {
  constructor(properties: Properties) {
    super(properties);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isChunkLoadError: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      isChunkLoadError: isChunkLoadError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('Error caught by boundary:', error);
    this.setState({
      error,
      errorInfo,
    });
  }

  componentDidMount(): void {
    window.addEventListener('vite:preloadError', this.handlePreloadError);
  }

  componentWillUnmount(): void {
    window.removeEventListener('vite:preloadError', this.handlePreloadError);
  }

  handlePreloadError = (event: Event): void => {
    event.preventDefault();
    this.setState({
      hasError: true,
      error: new Error('Failed to load application chunk. A new version may be available.'),
      isChunkLoadError: true,
    });
  };

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isChunkLoadError: false,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.state.isChunkLoadError) {
        return (
          <Container size="sm" mt="xl">
            <Alert icon={<IconRefresh size={24} />} title="Update Available" color="blue" variant="filled">
              <Stack gap="md" mt="md">
                <Text size="sm">
                  A new version of the application is available. Please reload to get the latest version.
                </Text>
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  color="white"
                  leftSection={<IconRefresh size={16} />}
                >
                  Reload Application
                </Button>
              </Stack>
            </Alert>
          </Container>
        );
      }

      return (
        <Container size="sm" mt="xl">
          <Alert icon={<IconAlertCircle size={24} />} title="Something went wrong" color="red" variant="filled">
            <Stack gap="md" mt="md">
              <Text size="sm">
                An unexpected error occurred. Please try again or contact support if the problem persists.
              </Text>

              {this.state.error && (
                <>
                  <Text size="sm" fw={500}>
                    Error details:
                  </Text>
                  <Code block>{this.state.error.message}</Code>
                </>
              )}

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <>
                  <Text size="sm" fw={500}>
                    Stack trace:
                  </Text>
                  <Code block style={{ maxHeight: '200px', overflow: 'auto' }}>
                    {this.state.errorInfo.componentStack}
                  </Code>
                </>
              )}

              <Button onClick={this.handleReset} variant="outline" color="white">
                Try Again
              </Button>
            </Stack>
          </Alert>
        </Container>
      );
    }

    // When used as errorElement, children might not be present
    return this.props.children ?? null;
  }
}

/**
 * Higher-order component to wrap a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
): React.ComponentType<P> {
  return function WithErrorBoundary(properties: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...properties} />
      </ErrorBoundary>
    );
  };
}
