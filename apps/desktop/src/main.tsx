import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import App from './App.tsx';
import './global.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { theme as customTheme } from './theme';

const mantineTheme = createTheme(customTheme);

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const rootElement = document.querySelector('#root');
if (!rootElement) {
  throw new Error('Root element not found. Please ensure index.html contains a div with id="root"');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
          <Notifications position="top-right" zIndex={1000} />
          <App />
          <ReactQueryDevtools initialIsOpen={false} />
        </MantineProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
