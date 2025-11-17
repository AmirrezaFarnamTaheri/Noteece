import React from 'react';
import '@testing-library/jest-dom';

// Provide stable dimensions for Recharts ResponsiveContainer to avoid warnings in JSDOM
jest.mock('recharts', () => {
  const actualRecharts = jest.requireActual('recharts');

  const ResponsiveContainer = ({
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
    return React.createElement('div', { style: { width: numericWidth, height: numericHeight } }, content);
  };

  return {
    ...actualRecharts,
    ResponsiveContainer,
  };
});
