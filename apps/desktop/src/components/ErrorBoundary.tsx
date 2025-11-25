import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, Button, Container, Text, Stack, Code } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { logger } from '@/utils/logger';

interface Properties {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
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
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('Error caught by boundary:', error);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
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
