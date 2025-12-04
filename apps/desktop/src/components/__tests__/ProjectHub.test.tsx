import React from 'react';
import { render, screen } from '@testing-library/react';
import ProjectHub from '../ProjectHub';
import { invoke } from '@tauri-apps/api/tauri';
import { AllTheProviders } from '../../utils/test-utils';
import '@testing-library/jest-dom';

jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn(),
}));

jest.mock('../../hooks/useQueries', () => ({
  useProjects: jest.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

describe('ProjectHub', () => {
  beforeEach(() => {
    (invoke as jest.Mock).mockResolvedValue([]);
  });

  it('should render the ProjectHub component', async () => {
    render(
      <AllTheProviders>
        <ProjectHub />
      </AllTheProviders>,
    );

    // Update expected text to match what is actually in the component
    expect(await screen.findByText('Projects')).toBeInTheDocument();
  });
});
