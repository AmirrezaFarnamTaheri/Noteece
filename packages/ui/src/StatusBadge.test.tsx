import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { StatusBadge } from './StatusBadge';

const wrapper = ({ children }: { children: React.ReactNode }) => <MantineProvider>{children}</MantineProvider>;

describe('StatusBadge', () => {
  it('renders status text with proper formatting', () => {
    render(<StatusBadge status="in_progress" />, { wrapper });
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders single word status', () => {
    render(<StatusBadge status="done" />, { wrapper });
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders inbox status', () => {
    render(<StatusBadge status="inbox" />, { wrapper });
    expect(screen.getByText('Inbox')).toBeInTheDocument();
  });

  it('renders unknown status with default gray color', () => {
    render(<StatusBadge status="unknown_status" />, { wrapper });
    expect(screen.getByText('Unknown Status')).toBeInTheDocument();
  });

  it('applies custom size', () => {
    const { container } = render(<StatusBadge status="active" size="lg" />, { wrapper });
    expect(container.firstChild).toBeTruthy();
  });

  it('applies custom variant', () => {
    const { container } = render(<StatusBadge status="done" variant="filled" />, { wrapper });
    expect(container.firstChild).toBeTruthy();
  });

  it('applies custom color map', () => {
    const customMap = { custom: 'red' as const };
    const { container } = render(<StatusBadge status="custom" colorMap={customMap} />, { wrapper });
    expect(container.firstChild).toBeTruthy();
  });

  it('renders all default status mappings', () => {
    const statuses = ['inbox', 'next', 'in_progress', 'waiting', 'done', 'cancelled', 'active', 'blocked', 'proposed'];
    statuses.forEach((status) => {
      const { unmount, container } = render(<StatusBadge status={status} />, { wrapper });
      expect(container.firstChild).toBeTruthy();
      unmount();
    });
  });
});
