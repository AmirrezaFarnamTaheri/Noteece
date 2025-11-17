import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import { clearAllData, getDataStats } from "../data-utils";
import { getDatabase } from "../database";

jest.mock("../database", () => ({
  getDatabase: jest.fn(),
}));

jest.mock("expo-secure-store", () => ({
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockedGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe("data-utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getDataStats", () => {
    it("returns counts from the database and computes totals", async () => {
      const fakeDb = {
        getFirstAsync: jest
          .fn()
          .mockResolvedValueOnce({ count: 2 }) // task
          .mockResolvedValueOnce({ count: 3 }) // note
          .mockResolvedValueOnce({ count: 4 }) // time_entry
          .mockResolvedValueOnce({ count: 5 }) // health_metric
          .mockResolvedValueOnce({ count: 6 }), // calendar_event
      };

      mockedGetDatabase.mockReturnValue(fakeDb as any);

      const stats = await getDataStats();

      expect(stats).toEqual({
        tasks: 2,
        notes: 3,
        timeEntries: 4,
        healthMetrics: 5,
        calendarEvents: 6,
        total: 2 + 3 + 4 + 5 + 6,
      });
      expect(fakeDb.getFirstAsync).toHaveBeenCalledTimes(5);
    });

    it("returns zeros when database throws", async () => {
      const failingDb = {
        getFirstAsync: jest.fn().mockRejectedValue(new Error("DB error")),
      };

      mockedGetDatabase.mockReturnValue(failingDb as any);

      const stats = await getDataStats();

      expect(stats).toEqual({
        tasks: 0,
        notes: 0,
        timeEntries: 0,
        healthMetrics: 0,
        calendarEvents: 0,
        total: 0,
      });
    });
  });

  describe("clearAllData", () => {
    it("drops tables and clears relevant storage keys", async () => {
      const execAsync = jest.fn().mockResolvedValue(undefined);
      const fakeDb = { execAsync };

      mockedGetDatabase.mockReturnValue(fakeDb as any);

      const asyncStorageMock = AsyncStorage as any;
      asyncStorageMock.getAllKeys = jest
        .fn()
        .mockResolvedValue(["foo", "expo-system", "has_completed_onboarding"]);
      asyncStorageMock.multiRemove = jest
        .fn()
        .mockResolvedValue(undefined);

      const result = await clearAllData();

      expect(result.success).toBe(true);
      expect(execAsync).toHaveBeenCalledTimes(1);
      expect(asyncStorageMock.getAllKeys).toHaveBeenCalledTimes(1);
      expect(asyncStorageMock.multiRemove).toHaveBeenCalledWith(["foo"]);
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "biometric_vault_data",
      );
    });
  });
});


