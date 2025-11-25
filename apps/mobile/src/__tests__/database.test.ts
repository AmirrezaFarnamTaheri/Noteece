import { initializeDatabase, dbQuery, dbExecute } from '../lib/database';

// Mock SQLite needs to be defined before imports
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() =>
    Promise.resolve({
      execAsync: jest.fn(),
      runAsync: jest.fn(),
      getAllAsync: jest.fn(() => Promise.resolve([])),
    }),
  ),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

describe('Database', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  describe('initializeDatabase', () => {
    it('should initialize database without errors', async () => {
      await expect(initializeDatabase()).resolves.not.toThrow();
    });
  });

  describe('dbQuery', () => {
    it('should execute queries and return results', async () => {
      const results = await dbQuery('SELECT 1 as value');
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('dbExecute', () => {
    it.skip('should execute statements without errors', async () => {
      await expect(dbExecute('SELECT 1')).resolves.not.toThrow();
    });
  });
});
