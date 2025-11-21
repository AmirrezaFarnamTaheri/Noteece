import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import SyncManager from "../../components/SyncManager";
import { SyncClient } from "../../lib/sync/sync-client";

jest.mock("../../lib/sync/sync-client");

// Mock setImmediate to prevent "worker process failed to exit" issues
// global.setImmediate = jest.useRealTimers as unknown as typeof global.setImmediate;

describe("SyncManager Component", () => {
  let mockSyncClient: jest.Mocked<SyncClient>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockSyncClient = {
      discoverDevices: jest.fn().mockResolvedValue([]),
      getSyncStatus: jest.fn().mockReturnValue({
        status: "idle",
        message: "Ready to sync",
        progress: 0,
      }),
      initiateSync: jest.fn().mockResolvedValue(undefined),
      cancelSync: jest.fn(),
    } as unknown as jest.Mocked<SyncClient>;
    (SyncClient as jest.Mock).mockReturnValue(mockSyncClient);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("renders sync button", async () => {
    const { findByText } = render(<SyncManager />);
    await waitFor(() => {
        expect(mockSyncClient.discoverDevices).toHaveBeenCalled();
    });
    expect(await findByText(/Scan/i)).toBeTruthy();
  });

  it("triggers discovery on press", async () => {
    const { findByText } = render(<SyncManager />);

    // Wait for the initial discovery (triggered by useEffect) to complete
    await waitFor(() => {
      expect(mockSyncClient.discoverDevices).toHaveBeenCalled();
    });

    // Find button by text options since it changes based on state
    const button = await findByText(/Scan/i);

    // Clear the mock from the initial useEffect call
    mockSyncClient.discoverDevices.mockClear();

    fireEvent.press(button);

    await waitFor(() => {
      expect(mockSyncClient.discoverDevices).toHaveBeenCalled();
    });
  });
});

jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper");
