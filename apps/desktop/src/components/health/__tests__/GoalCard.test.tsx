import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { GoalCard } from '../GoalCard';
import { HealthGoal } from '../types';

const mockGoal: HealthGoal = {
  id: '1',
  space_id: 'space1',
  title: 'Lose 5kg',
  target: 65,
  current: 68,
  unit: 'kg',
  category: 'health',
  start_date: Date.now() / 1000 - 86400 * 30,
  is_completed: false,
  created_at: Date.now() / 1000 - 86400 * 30,
  updated_at: Date.now() / 1000,
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('GoalCard', () => {
  it('renders goal title', () => {
    renderWithProviders(<GoalCard goal={mockGoal} />);
    expect(screen.getByText('Lose 5kg')).toBeInTheDocument();
  });

  it('shows In Progress badge for incomplete goals', () => {
    renderWithProviders(<GoalCard goal={mockGoal} />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('shows Complete badge for completed goals', () => {
    const completedGoal = { ...mockGoal, is_completed: true };
    renderWithProviders(<GoalCard goal={completedGoal} />);
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('displays current and target values', () => {
    renderWithProviders(<GoalCard goal={mockGoal} />);
    expect(screen.getByText('Current: 68 kg')).toBeInTheDocument();
    expect(screen.getByText('Target: 65 kg')).toBeInTheDocument();
  });

  it('shows Complete badge when progress is 100%', () => {
    const completedGoal = { ...mockGoal, current: 65 };
    renderWithProviders(<GoalCard goal={completedGoal} />);
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });
});

