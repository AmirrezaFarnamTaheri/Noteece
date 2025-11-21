import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { SocialAnalytics } from "../../screens/SocialAnalytics";
import {
  getPlatformStats,
  getCategoryStats,
  getTotalPostCount,
} from "@/lib/social-database";
import { Share } from "react-native";

// Mock dependencies
jest.mock("@/lib/social-database", () => ({
  getPlatformStats: jest.fn(),
  getCategoryStats: jest.fn(),
  getTotalPostCount: jest.fn(),
}));

jest.mock("@/store/app-context", () => ({
  useCurrentSpace: jest.fn(() => "default"),
}));

jest.mock("expo-file-system", () => ({
  documentDirectory: "file://",
  writeAsStringAsync: jest.fn(),
  EncodingType: { UTF8: "utf8" },
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(),
}));

describe("SocialAnalytics Screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state initially", async () => {
    (getPlatformStats as jest.Mock).mockImplementation(
      () => new Promise(() => {}),
    );
    const { getByText } = render(<SocialAnalytics />);
    expect(getByText("Loading analytics...")).toBeTruthy();
  });

  it("loads and displays analytics data", async () => {
    (getPlatformStats as jest.Mock).mockResolvedValue([
      { platform: "twitter", post_count: 10, percentage: 50.0, color: "blue" },
      {
        platform: "mastodon",
        post_count: 10,
        percentage: 50.0,
        color: "purple",
      },
    ]);
    (getCategoryStats as jest.Mock).mockResolvedValue([
      { category_id: "1", category_name: "Tech", post_count: 15, color: "red" },
    ]);
    (getTotalPostCount as jest.Mock).mockResolvedValue(20);

    const { findByText, getByText } = render(<SocialAnalytics />);

    expect(await findByText("20")).toBeTruthy(); // Total posts
    expect(getByText("twitter")).toBeTruthy();
    expect(getByText("Tech")).toBeTruthy();
  });

  it("handles export", async () => {
    const shareSpy = jest.spyOn(Share, "share");
    (getPlatformStats as jest.Mock).mockResolvedValue([]);
    (getCategoryStats as jest.Mock).mockResolvedValue([]);
    (getTotalPostCount as jest.Mock).mockResolvedValue(0);

    const { findByText } = render(<SocialAnalytics />);

    const exportBtn = await findByText("Export");
    fireEvent.press(exportBtn);

    expect(shareSpy).toHaveBeenCalled();
  });

  it("displays empty states correctly", async () => {
    (getPlatformStats as jest.Mock).mockResolvedValue([]);
    (getCategoryStats as jest.Mock).mockResolvedValue([]);
    (getTotalPostCount as jest.Mock).mockResolvedValue(0);

    const { findByText } = render(<SocialAnalytics />);

    expect(await findByText("No platform data available")).toBeTruthy();
    expect(await findByText("No categories assigned yet")).toBeTruthy();
  });
});
