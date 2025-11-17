import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import ProjectHub from '../ProjectHub';
import { invoke } from '@tauri-apps/api/tauri';

jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn(),
}));

describe('ProjectHub', () => {
  beforeEach(() => {
    (invoke as jest.Mock).mockResolvedValue([]);
  });

  it('should render the ProjectHub component', async () => {
    const { getByText } = render(
      <MantineProvider>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ProjectHub />
        </MemoryRouter>
      </MantineProvider>,
    );

    await waitFor(() => {
      expect(getByText('Project Hub')).toBeInTheDocument();
    });
  });
});
