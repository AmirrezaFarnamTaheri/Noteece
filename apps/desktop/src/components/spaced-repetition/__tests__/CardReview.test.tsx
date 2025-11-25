import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { CardReview } from '../CardReview';
import { KnowledgeCard } from '../types';

const mockCard: KnowledgeCard = {
  id: 'card1',
  space_id: 'space1',
  front: 'What is the capital of France?',
  back: 'Paris',
  deck: 'Geography',
  ease_factor: 2.5,
  interval: 1,
  repetitions: 0,
  next_review: Date.now() / 1000,
  created_at: Date.now() / 1000 - 86400,
  updated_at: Date.now() / 1000,
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('CardReview', () => {
  const mockOnRate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders card front', () => {
    renderWithProviders(<CardReview card={mockCard} onRate={mockOnRate} />);
    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
  });

  it('shows deck name', () => {
    renderWithProviders(<CardReview card={mockCard} onRate={mockOnRate} />);
    expect(screen.getByText('Geography')).toBeInTheDocument();
  });

  it('shows Show Answer button initially', () => {
    renderWithProviders(<CardReview card={mockCard} onRate={mockOnRate} />);
    expect(screen.getByText('Show Answer')).toBeInTheDocument();
  });

  it('reveals answer when Show Answer is clicked', () => {
    renderWithProviders(<CardReview card={mockCard} onRate={mockOnRate} />);
    fireEvent.click(screen.getByText('Show Answer'));
    expect(screen.getByText('Paris')).toBeInTheDocument();
  });

  it('shows rating buttons after revealing answer', () => {
    renderWithProviders(<CardReview card={mockCard} onRate={mockOnRate} />);
    fireEvent.click(screen.getByText('Show Answer'));
    expect(screen.getByText('Again')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });

  it('calls onRate with correct rating', () => {
    renderWithProviders(<CardReview card={mockCard} onRate={mockOnRate} />);
    fireEvent.click(screen.getByText('Show Answer'));
    fireEvent.click(screen.getByText('Good'));
    expect(mockOnRate).toHaveBeenCalledWith('good');
  });

  it('displays card stats', () => {
    renderWithProviders(<CardReview card={mockCard} onRate={mockOnRate} />);
    expect(screen.getByText(/Interval: 1 days/)).toBeInTheDocument();
    expect(screen.getByText(/Ease: 250%/)).toBeInTheDocument();
    expect(screen.getByText(/Reviews: 0/)).toBeInTheDocument();
  });
});

