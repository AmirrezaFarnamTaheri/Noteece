import { SyncClient } from "@/lib/sync/sync-client";

describe("SyncClient", () => {
  let syncClient: SyncClient;

  beforeEach(() => {
    syncClient = new SyncClient("test-device-id");
  });

  describe("discoverDevices", () => {
    it("should return an array of devices", async () => {
      const devices = await syncClient.discoverDevices();
      expect(Array.isArray(devices)).toBe(true);
    });
  });

  describe("initiateSync", () => {
    it("should handle sync initialization", async () => {
      const result = await syncClient.initiateSync(
        "remote-device",
        "192.168.1.100",
      );
      expect(typeof result).toBe("boolean");
    });
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
