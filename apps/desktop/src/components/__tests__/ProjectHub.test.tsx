import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import ProjectHub from '../ProjectHub';
import { invoke } from '@tauri-apps/api/core';

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

describe('ProjectHub', () => {
  beforeEach(() => {
    (invoke as jest.Mock).mockResolvedValue([]);
  });

  it('should render the ProjectHub component', async () => {
    const { getByText } = render(
      <MantineProvider>
        <MemoryRouter>
          <ProjectHub />
        </MemoryRouter>
      </MantineProvider>,
    );

    await waitFor(() => {
      expect(getByText('Project Hub')).toBeInTheDocument();
    });
  });
});
