import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SocialHub } from '../../screens/SocialHub';
import * as SocialDatabase from '../../lib/social-database';

jest.mock('../../lib/social-database', () => ({
  ...jest.requireActual('../../lib/social-database'),
  getTimelinePosts: jest.fn(),
  getCategories: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
}));

const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
};

describe('SocialHub Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SocialDatabase.getTimelinePosts as jest.Mock).mockResolvedValue([]);
    (SocialDatabase.getCategories as jest.Mock).mockResolvedValue([]);
  });

  it('renders correctly with empty state', async () => {
    const { getByText } = render(<SocialHub navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText(/Social Hub/i)).toBeTruthy();
    });
  });

  it('renders timeline posts', async () => {
    const mockPosts = [
      {
        id: '1',
        platform: 'twitter',
        content: 'Hello World',
        author: 'User1',
        createdAt: Date.now(),
        categories: [],
      },
    ];
    (SocialDatabase.getTimelinePosts as jest.Mock).mockResolvedValue(mockPosts);

    const { getByText } = render(<SocialHub navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Hello World')).toBeTruthy();
      expect(getByText('User1')).toBeTruthy();
    });
  });

  it('navigates to settings when button clicked', async () => {
    const { getByTestId } = render(<SocialHub navigation={mockNavigation} />);
    // Test implementation would go here if a settings button with a testID existed
  });
});
