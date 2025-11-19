import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { AllTheProviders } from './test-utils';

export const renderWithProviders = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options });
