import React from 'react';
import { render } from '@testing-library/react-native';
import { DailyBrief } from '@/components/DailyBrief';
import { Insight } from '@/types';

describe('DailyBrief', () => {
  const mockInsight: Insight = {
    id: 'insight-1',
    insightType: 'daily_brief',
    title: 'Good morning - Your Day Ahead',
    description: 'You have 3 tasks due today and 2 calendar events.',
    severity: 'info',
    suggestedActions: [
      {
        actionType: 'start_timer',
        label: 'Start 25-min timer',
        description: 'Begin a focused work session',
        parameters: { duration: 25 },
      },
    ],
    createdAt: Date.now(),
    dismissed: false,
  };

  it('should render without crashing', () => {
    const { getByText } = render(<DailyBrief brief={mockInsight} />);
    expect(getByText(mockInsight.title)).toBeTruthy();
  });

  it('should display the description', () => {
    const { getByText } = render(<DailyBrief brief={mockInsight} />);
    expect(getByText(mockInsight.description)).toBeTruthy();
  });

  it('should render suggested actions', () => {
    const { getByText } = render(<DailyBrief brief={mockInsight} />);
    expect(getByText('Start 25-min timer')).toBeTruthy();
  });
});
