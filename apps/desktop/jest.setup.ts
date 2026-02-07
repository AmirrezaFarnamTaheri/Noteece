import React, { createElement } from 'react';
import '@testing-library/jest-dom';

// Polyfill for window.matchMedia
if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    enumerable: true,
    configurable: true,
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(() => true),
    })),
  });
}

// Provide stable dimensions for Recharts ResponsiveContainer to avoid warnings in JSDOM
jest.mock('recharts', () => {
  const actualRecharts = jest.requireActual('recharts');

  return {
    ...actualRecharts,
    ResponsiveContainer: ({
      width = 800,
      height = 400,
      children,
    }: {
      width?: number | string;
      height?: number | string;
      children: React.ReactNode | ((props: { width: number; height: number }) => React.ReactNode);
    }) => {
      const numericWidth = typeof width === 'number' ? width : 800;
      const numericHeight = typeof height === 'number' ? height : 400;
      const content =
        typeof children === 'function' ? children({ width: numericWidth, height: numericHeight }) : children;
      return createElement('div', { style: { width: numericWidth, height: numericHeight } }, content);
    },
  };
});
