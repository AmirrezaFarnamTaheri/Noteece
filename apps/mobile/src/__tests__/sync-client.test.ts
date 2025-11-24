import { SyncClient } from "@/lib/sync/sync-client";

jest.mock("@/lib/database", () => ({
  dbQuery: jest.fn(async () => []),
  dbExecute: jest.fn(async () => undefined),
}));

// Mock react-native-zeroconf
jest.mock("react-native-zeroconf", () => {
  return jest.fn().mockImplementation(() => ({
    scan: jest.fn(),
    stop: jest.fn(),
    on: jest.fn(),
    removeDeviceListeners: jest.fn(),
  }));
});

describe("SyncClient", () => {
  let syncClient: SyncClient;

  beforeEach(() => {
    syncClient = new SyncClient("test-device-id");
  });

  describe("discoverDevices", () => {
    it("should return an array of devices", async () => {
      const devices = await syncClient.discoverDevices(100); // Short timeout for test
      expect(Array.isArray(devices)).toBe(true);
    });
  });

  describe("initiateSync", () => {
    it.skip("should handle sync initialization", async () => {
      const mockWebSocket = {
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        onopen: jest.fn(),
        onerror: jest.fn(),
      };

      // Mock WebSocket constructor
      global.WebSocket = jest.fn(() => mockWebSocket) as any;

      // Mock socket behavior
      setTimeout(() => {
        if (mockWebSocket.onopen) mockWebSocket.onopen({} as any);
      }, 100);

      // Mock receiving manifest response
      mockWebSocket.send.mockImplementation((data) => {
        const parsed = JSON.parse(data);
        if (parsed.type === "get_manifest") {
          setTimeout(() => {
            const listeners = (
              mockWebSocket.addEventListener as jest.Mock
            ).mock.calls
              .filter((c) => c[0] === "message")
              .map((c) => c[1]);
            listeners.forEach((l: any) =>
              l({
                data: JSON.stringify({
                  type: "manifest_response",
                  requestId: parsed.requestId,
                  manifest: { changes: [] },
                }),
              }),
            );
          }, 500);
        }
      });

      const result = await syncClient.initiateSync(
        "remote-device",
        "192.168.1.100",
      );
      expect(typeof result).toBe("boolean");
    }, 20000);
  });

  describe("queueChange", () => {
    it("should queue a change for sync", async () => {
      await expect(
        syncClient.queueChange("task", "task-123", "create", {
          title: "Test Task",
        }),
      ).resolves.not.toThrow();
    });
  });
});
