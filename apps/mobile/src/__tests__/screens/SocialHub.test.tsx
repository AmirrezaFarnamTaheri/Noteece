import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { SocialHub } from "../../screens/SocialHub";
import * as SocialDatabase from "../../lib/social-database";

// Mock database layer
jest.mock("../../lib/social-database", () => ({
  ...jest.requireActual("../../lib/social-database"),
  getTimelinePosts: jest.fn(),
  getCategories: jest.fn(),
  createCategory: jest.fn(),
}));

// Mock native modules
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
}));

jest.mock("expo-share-menu", () => ({
  addShareListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialShare: jest.fn().mockResolvedValue(null),
}));

// Mock context hooks
jest.mock("../../store/app-context", () => ({
  useCurrentSpace: jest.fn(() => "test-space-id"),
}));

const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
};

describe("SocialHub Screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SocialDatabase.getTimelinePosts as jest.Mock).mockResolvedValue([]);
    (SocialDatabase.getCategories as jest.Mock).mockResolvedValue([]);
  });

  it("renders correctly with empty state", async () => {
    const { getByText } = render(<SocialHub navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText("Social Hub")).toBeTruthy();
      expect(getByText("No posts yet")).toBeTruthy();
    });
  });

  it("renders timeline posts when data is available", async () => {
    const mockPosts = [
      {
        id: "1",
        platform: "twitter",
        content: "Hello World",
        author: "User1",
        created_at: Date.now(),
        categories: [],
      },
    ];
    (SocialDatabase.getTimelinePosts as jest.Mock).mockResolvedValue(mockPosts);

    const { getByText } = render(<SocialHub navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText("Hello World")).toBeTruthy();
      expect(getByText("User1")).toBeTruthy();
    });
  });
});
