import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QuickCapture } from '../QuickCapture';
import '@testing-library/jest-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { showSuccess, showError } from '../../../utils/notifications';

// Mock notifications
jest.mock('../../../utils/notifications', () => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
}));

// Mock invoke
const mockInvoke = invoke as jest.Mock;

// Mock hook
jest.mock('../../../hooks/useActiveSpace', () => ({
  useActiveSpace: jest.fn(() => ({ activeSpaceId: 'test-space-id' })),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('QuickCapture', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    (showSuccess as jest.Mock).mockReset();
    (showError as jest.Mock).mockReset();
  });

  it('renders widget title', () => {
    renderWithProviders(<QuickCapture />);
    expect(screen.getByText('Quick Capture')).toBeInTheDocument();
  });

  it('disables buttons when input is empty', () => {
    renderWithProviders(<QuickCapture />);
    expect(screen.getByRole('button', { name: 'Add as Task' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save as Note' })).toBeDisabled();
  });

  it('enables buttons when input has text', () => {
    renderWithProviders(<QuickCapture />);
    const input = screen.getByPlaceholderText(/capture a quick thought/i);
    fireEvent.change(input, { target: { value: 'Test Note' } });
    expect(screen.getByRole('button', { name: 'Add as Task' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save as Note' })).not.toBeDisabled();
  });

  it('creates a note successfully', async () => {
    mockInvoke.mockResolvedValue({});
    renderWithProviders(<QuickCapture />);

    const input = screen.getByPlaceholderText(/capture a quick thought/i);
    fireEvent.change(input, { target: { value: 'My Note Content' } });

    const saveBtn = screen.getByRole('button', { name: 'Save as Note' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('create_note_cmd', {
        spaceId: 'test-space-id',
        title: 'My Note Content',
        contentMd: 'My Note Content',
      });
      expect(showSuccess).toHaveBeenCalled();
      expect(input).toHaveValue('');
    });
  });

  it('creates a task successfully', async () => {
    mockInvoke.mockResolvedValue({});
    renderWithProviders(<QuickCapture />);

    const input = screen.getByPlaceholderText(/capture a quick thought/i);
    fireEvent.change(input, { target: { value: 'My Task' } });

    const taskBtn = screen.getByRole('button', { name: 'Add as Task' });
    fireEvent.click(taskBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('create_task_cmd', {
        spaceId: 'test-space-id',
        title: 'My Task',
        description: null,
      });
      expect(showSuccess).toHaveBeenCalled();
      expect(input).toHaveValue('');
    });
  });

  it('handles note creation failure', async () => {
    mockInvoke.mockRejectedValue(new Error('Failed'));
    renderWithProviders(<QuickCapture />);

    const input = screen.getByPlaceholderText(/capture a quick thought/i);
    fireEvent.change(input, { target: { value: 'Fail Note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save as Note' }));

    await waitFor(() => {
      expect(showError).toHaveBeenCalled();
    });
  });

  it('handles task creation failure', async () => {
    mockInvoke.mockRejectedValue(new Error('Failed'));
    renderWithProviders(<QuickCapture />);

    const input = screen.getByPlaceholderText(/capture a quick thought/i);
    fireEvent.change(input, { target: { value: 'Fail Task' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add as Task' }));

    await waitFor(() => {
      expect(showError).toHaveBeenCalled();
    });
  });
});
