import { initializeDatabase, dbQuery, dbExecute } from "@/lib/database";

describe("Database", () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  describe("initializeDatabase", () => {
    it("should initialize database without errors", async () => {
      await expect(initializeDatabase()).resolves.not.toThrow();
    });
  });

  describe("dbQuery", () => {
    it("should execute queries and return results", async () => {
      const results = await dbQuery("SELECT 1 as value");
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("dbExecute", () => {
    it("should execute statements without errors", async () => {
      await expect(dbExecute("SELECT 1")).resolves.not.toThrow();
    });
  });
});
