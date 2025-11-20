import { NativeModules } from "react-native";

// Mock crypto
global.crypto = {
  getRandomValues: (buffer) => {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    return buffer;
  },
};

// Mock NativeModules for Expo modules
NativeModules.ExpoCrypto = {
  digestStringAsync: jest.fn(),
  getRandomBytesAsync: jest.fn().mockResolvedValue(new Uint8Array(32)),
};

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Mock Expo SQLite
jest.mock("expo-sqlite", () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn((callback) => {
      callback({
        executeSql: jest.fn((query, params, success, error) => {
          if (success) success([], { rows: { length: 0, item: () => null, _array: [] } });
        }),
      });
    }),
  })),
}));

// Mock react-native-zeroconf
jest.mock("react-native-zeroconf", () => {
  return class Zeroconf {
    scan = jest.fn();
    stop = jest.fn();
    removeDeviceListeners = jest.fn();
    on = jest.fn();
    off = jest.fn();
  };
});

// Mock expo-file-system
jest.mock("expo-file-system", () => ({
  documentDirectory: "file:///test/directory/",
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));

// Mock Expo Font
jest.mock("expo-font", () => ({
  isLoaded: jest.fn().mockReturnValue(true),
  loadAsync: jest.fn().mockResolvedValue(true),
}));

// Mock Vector Icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
  MaterialIcons: "MaterialIcons",
  MaterialCommunityIcons: "MaterialCommunityIcons",
  FontAwesome: "FontAwesome",
}));

// Mock Linear Gradient
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

// Mock console.log and console.error to reduce noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args) => {
  if (
    typeof args[0] === "string" &&
    (args[0].includes("iOS App Group access") ||
      args[0].includes("Running in non-browser environment") ||
      args[0].includes("Database initialized") ||
      args[0].includes("Running migration") ||
      args[0].includes("Added") ||
      args[0].includes("Migration"))
  ) {
    return;
  }
  originalConsoleLog(...args);
};

console.error = (...args) => {
  if (
    typeof args[0] === "string" &&
    (args[0].includes("Warning: An update to ForwardRef") ||
      args[0].includes("You are trying to `import` a file after the Jest environment has been torn down") ||
      args[0].includes("Sync failed: Error: WebSocket connection failed") ||
      args[0].includes("Failed to load timeline: Error: DB Error"))
  ) {
    return;
  }
  originalConsoleError(...args);
};
