import type * as SQLite from 'expo-sqlite';
import type { initializeDatabase as InitDbType, getDatabase as GetDbType, dbQuery as DbQueryType, dbExecute as DbExecuteType } from '../lib/database';

// Types for mocks
type MockDatabase = {
  execAsync: jest.Mock;
  runAsync: jest.Mock;
  getAllAsync: jest.Mock;
};

// Top level mocks for dependencies that don't change
jest.mock('../lib/logger', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../utils/platform', () => ({
  getDatabasePath: jest.fn((name) => `/mock/path/${name}`),
}));

describe('Database', () => {
  let mockDb: MockDatabase;
  let mockOpenDatabaseAsync: jest.Mock;
  let initializeDatabase: typeof InitDbType;
  let getDatabase: typeof GetDbType;
  let dbQuery: typeof DbQueryType;
  let dbExecute: typeof DbExecuteType;
  let AsyncStorage: any;
  let syncBridge: any;

  beforeEach(() => {
    jest.resetModules(); // Clear cache
    jest.unmock('../lib/database'); // Ensure we get real implementation

    // Setup fresh mocks
    mockDb = {
      execAsync: jest.fn().mockResolvedValue(undefined),
      runAsync: jest.fn().mockResolvedValue({ insertId: 1, rowsAffected: 1 }),
      getAllAsync: jest.fn().mockResolvedValue([]),
    };

    mockOpenDatabaseAsync = jest.fn().mockResolvedValue(mockDb);

    // Mock expo-sqlite
    jest.doMock('expo-sqlite', () => ({
      openDatabaseAsync: mockOpenDatabaseAsync,
      openDatabase: jest.fn(),
    }));

    // Mock AsyncStorage
    jest.doMock('@react-native-async-storage/async-storage', () => ({
      getItem: jest.fn(),
      setItem: jest.fn(),
    }));

    // Mock syncBridge
    jest.doMock('../lib/jsi/sync-bridge', () => ({
      syncBridge: {
        isJSIAvailable: jest.fn(() => false),
        init: jest.fn(),
      },
    }));

    // Re-require modules to get fresh instances wired together
    AsyncStorage = require('@react-native-async-storage/async-storage');
    syncBridge = require('../lib/jsi/sync-bridge').syncBridge;
    const dbModule = require('../lib/database');
    initializeDatabase = dbModule.initializeDatabase;
    getDatabase = dbModule.getDatabase;
    dbQuery = dbModule.dbQuery;
    dbExecute = dbModule.dbExecute;

    jest.clearAllMocks();
  });

  describe('initializeDatabase', () => {
    it('should initialize fresh database correctly', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      await initializeDatabase();

      expect(mockOpenDatabaseAsync).toHaveBeenCalledWith('noteece.db');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('database_version');

      expect(mockDb.execAsync).toHaveBeenCalled();
      const createCall = mockDb.execAsync.mock.calls.find((call: any[]) => call[0].includes('CREATE TABLE IF NOT EXISTS space'));
      expect(createCall).toBeTruthy();
    });

    it('should run migrations if version is old', async () => {
      AsyncStorage.getItem.mockResolvedValue('6');

      await initializeDatabase();

      expect(mockDb.execAsync).toHaveBeenCalledWith('BEGIN TRANSACTION');
      const migrationCall = mockDb.execAsync.mock.calls.find((call: any[]) =>
        call[0].includes('CREATE INDEX IF NOT EXISTS idx_health_metric_type')
      );
      expect(migrationCall).toBeTruthy();
      expect(mockDb.execAsync).toHaveBeenCalledWith('COMMIT');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('database_version', '7');
    });

    it('should initialize SyncBridge if available', async () => {
      // Configure the FRESH instance of syncBridge mock
      syncBridge.isJSIAvailable.mockReturnValue(true);
      AsyncStorage.getItem.mockResolvedValue('7');

      await initializeDatabase();

      expect(syncBridge.init).toHaveBeenCalledWith('/mock/path/noteece.db');
    });

    it('should handle migration errors with rollback', async () => {
      AsyncStorage.getItem.mockResolvedValue('6');

      // Configure mockDb to fail on migration
      mockDb.execAsync.mockImplementation((sql: string) => {
        if (sql === 'BEGIN TRANSACTION') return Promise.resolve();
        // The migration SQL block contains this string
        if (sql.includes('CREATE INDEX IF NOT EXISTS idx_health_metric_type')) {
          return Promise.reject(new Error('Migration failed'));
        }
        return Promise.resolve();
      });

      await expect(initializeDatabase()).rejects.toThrow('Migration failed');

      expect(mockDb.runAsync).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Query Helpers', () => {
    beforeEach(async () => {
      AsyncStorage.getItem.mockResolvedValue('7');
      await initializeDatabase();
    });

    describe('getDatabase', () => {
      it('should return initialized database instance', () => {
        const db = getDatabase();
        expect(db).toBe(mockDb);
      });
    });

    describe('dbQuery', () => {
      it('should execute getAllAsync with correct params', async () => {
        const sql = 'SELECT * FROM space WHERE id = ?';
        const params = ['123'];
        const mockResult = [{ id: '123', name: 'Test' }];

        mockDb.getAllAsync.mockResolvedValue(mockResult);

        const result = await dbQuery(sql, params);

        expect(mockDb.getAllAsync).toHaveBeenCalledWith(sql, params);
        expect(result).toBe(mockResult);
      });
    });

    describe('dbExecute', () => {
      it('should execute runAsync with correct params', async () => {
        const sql = 'INSERT INTO space (name) VALUES (?)';
        const params = ['New Space'];

        await dbExecute(sql, params);

        expect(mockDb.runAsync).toHaveBeenCalledWith(sql, params);
      });
    });
  });
});
