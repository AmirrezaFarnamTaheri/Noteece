import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { PriorityBadge } from './PriorityBadge';

const wrapper = ({ children }: { children: React.ReactNode }) => <MantineProvider>{children}</MantineProvider>;

describe('PriorityBadge', () => {
  it('renders low priority', () => {
    render(<PriorityBadge priority="low" />, { wrapper });
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('renders medium priority', () => {
    render(<PriorityBadge priority="medium" />, { wrapper });
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('renders high priority', () => {
    render(<PriorityBadge priority="high" />, { wrapper });
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('renders urgent priority', () => {
    render(<PriorityBadge priority="urgent" />, { wrapper });
    expect(screen.getByText('Urgent')).toBeInTheDocument();
  });

  it('applies custom size', () => {
    const { container } = render(<PriorityBadge priority="high" size="lg" />, { wrapper });
    expect(container.firstChild).toBeTruthy();
  });

  it('defaults to sm size', () => {
    const { container } = render(<PriorityBadge priority="low" />, { wrapper });
    expect(container.firstChild).toBeTruthy();
  });
});
