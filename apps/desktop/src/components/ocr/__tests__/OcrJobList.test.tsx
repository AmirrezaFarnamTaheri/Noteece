import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { OcrJobList } from '../OcrJobList';
import { OcrJob } from '../types';

const mockJobs: OcrJob[] = [
  {
    id: 'job1',
    space_id: 'space1',
    image_path: '/path/to/image1.png',
    status: 'completed',
    result_text: 'Hello World',
    confidence: 0.95,
    language: 'en',
    created_at: Date.now() / 1000 - 3600,
    processed_at: Date.now() / 1000 - 3500,
  },
  {
    id: 'job2',
    space_id: 'space1',
    image_path: '/path/to/image2.jpg',
    status: 'pending',
    created_at: Date.now() / 1000 - 1800,
  },
  {
    id: 'job3',
    space_id: 'space1',
    image_path: '/path/to/image3.png',
    status: 'failed',
    error: 'OCR failed',
    created_at: Date.now() / 1000 - 7200,
  },
];

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('OcrJobList', () => {
  const mockOnView = jest.fn();
  const mockOnRetry = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all jobs', () => {
    renderWithProviders(
      <OcrJobList jobs={mockJobs} onView={mockOnView} onRetry={mockOnRetry} onDelete={mockOnDelete} />,
    );
    expect(screen.getByText('image1.png')).toBeInTheDocument();
    expect(screen.getByText('image2.jpg')).toBeInTheDocument();
    expect(screen.getByText('image3.png')).toBeInTheDocument();
  });

  it('shows status badges', () => {
    renderWithProviders(
      <OcrJobList jobs={mockJobs} onView={mockOnView} onRetry={mockOnRetry} onDelete={mockOnDelete} />,
    );
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('shows confidence for completed jobs', () => {
    renderWithProviders(
      <OcrJobList jobs={mockJobs} onView={mockOnView} onRetry={mockOnRetry} onDelete={mockOnDelete} />,
    );
    expect(screen.getByText('95.0%')).toBeInTheDocument();
  });

  it('shows empty state when no jobs', () => {
    renderWithProviders(<OcrJobList jobs={[]} onView={mockOnView} onRetry={mockOnRetry} onDelete={mockOnDelete} />);
    expect(screen.getByText(/No OCR jobs yet/)).toBeInTheDocument();
  });
});
