/* eslint-disable @typescript-eslint/ban-ts-comment */
// jest-pre-setup.js
import "react-native-gesture-handler/jestSetup";
import { jest } from "@jest/globals";

// Silence the warning: Animated: `useNativeDriver` is not supported because the native animated module is missing
jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper");

// Mock ResizeObserver
if (
  typeof window !== "undefined" &&
  typeof window.ResizeObserver === "undefined"
) {
  // @ts-ignore
  window.ResizeObserver = jest.fn(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
}

// Wrap Object.defineProperty to handle null/undefined gracefully during initial module load only
const originalDefineProperty = Object.defineProperty;
const guardedDefineProperty = function (obj, prop, descriptor) {
  try {
    if (
      obj === null ||
      obj === undefined ||
      (typeof obj !== "object" && typeof obj !== "function")
    ) {
      return obj;
    }
    return originalDefineProperty.call(Object, obj, prop, descriptor);
  } catch {
    return obj;
  }
};

// Temporarily swap during early setup (module init time)
// @ts-ignore
Object.defineProperty = guardedDefineProperty;

// Mock for async storage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Mock for nanoid (non-secure variant used in tests to avoid ESM/CJS issues)
jest.mock("nanoid/non-secure", () => ({
  nanoid: () => "test-id",
}));

// Mock for tauri-apps
jest.mock("@tauri-apps/api/fs", () => ({
  readTextFile: jest.fn(),
  writeTextFile: jest.fn(),
  exists: jest.fn(),
  createDir: jest.fn(),
  removeDir: jest.fn(),
}));

// Mock for AppState
jest.mock("react-native/Libraries/AppState/AppState", () => ({
  addEventListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
}));

// Mock for Linking
jest.mock("expo-linking", () => ({
  addEventListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  getInitialURL: jest.fn(() => Promise.resolve("")),
}));

// Mock crypto if needed
if (typeof global.crypto === "undefined") {
  // @ts-ignore
  global.crypto = {
    getRandomValues: (arr) => {
      if (
        !arr ||
        typeof arr.length !== "number" ||
        !ArrayBuffer.isView(arr) ||
        !(arr.BYTES_PER_ELEMENT && arr.BYTES_PER_ELEMENT === 1)
      ) {
        throw new TypeError("Expected a Uint8Array or similar typed array");
      }
      for (let i = 0; i < arr.length; i++) {
        arr[i] = (Math.random() * 256) & 0xff;
      }
      return arr;
    },
    // Minimal subtle stub to satisfy existence checks
    subtle: {
      digest: async () => {
        throw new Error(
          "crypto.subtle.digest is not implemented in test environment",
        );
      },
      generateKey: async () => {
        throw new Error(
          "crypto.subtle.generateKey is not implemented in test environment",
        );
      },
      importKey: async () => {
        throw new Error(
          "crypto.subtle.importKey is not implemented in test environment",
        );
      },
      encrypt: async () => {
        throw new Error(
          "crypto.subtle.encrypt is not implemented in test environment",
        );
      },
      decrypt: async () => {
        throw new Error(
          "crypto.subtle.decrypt is not implemented in test environment",
        );
      },
    },
  };
}

// Provide a no-op requestAnimationFrame for libraries expecting it
if (typeof global.requestAnimationFrame === "undefined") {
  // @ts-ignore
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
}

// Mock @expo/vector-icons to avoid loading native font modules
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { View } = require("react-native");

  // eslint-disable-next-line react/display-name
  const MockIcon = React.forwardRef((props, ref) =>
    React.createElement(View, { ref, ...props }),
  );

  return new Proxy(
    {},
    {
      // Whenever a specific icon set is requested (e.g., AntDesign)
      get: (_, prop) => {
        if (prop === "__esModule") {
          return true;
        }
        return MockIcon;
      },
    },
  );
});

// Provide a lightweight mock for expo-font since @expo/vector-icons depends on it
jest.mock("expo-font", () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
  unloadAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-linear-gradient which requires native view managers
jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");

  // eslint-disable-next-line react/display-name
  const MockLinearGradient = React.forwardRef((props, ref) =>
    React.createElement(View, { ref, ...props }),
  );

  return {
    __esModule: true,
    LinearGradient: MockLinearGradient,
    default: MockLinearGradient,
  };
});


// Quiet expected console noise during tests while leaving other logs intact
const SUPPRESSED_ERROR_PATTERNS = [
  "JSON parse error:",
  "JSON validation failed for:",
  "Failed to get data stats:",
  "🔒 SECURITY WARNING",
  "Sync failed:",
];

const SUPPRESSED_LOG_PATTERNS = [
  "Running migrations",
  "Running migration v1 -> v2",
  "Running migration v2 -> v3",
  "Added space_id column",
  "Added all_day column",
  "Added recurrence_rule column",
  "Added created_at column",
  "Added updated_at column",
  "Migration v1 -> v2 completed successfully",
  "Migration v2 -> v3",
  "Database migrated to version",
  "Database initialized successfully",
  "Database already at version",
];

const normalizeForMatch = (value) => {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Error) {
    return value.message;
  }
  if (value === undefined || value === null) {
    return "";
  }
  try {
    return String(value);
  } catch {
    return "";
  }
};

const shouldSuppress = (value, patterns) => {
  const normalized = normalizeForMatch(value);
  return (
    Boolean(normalized) &&
    patterns.some((pattern) => normalized.includes(pattern))
  );
};

const originalConsoleError = console.error;
console.error = (...args) => {
  if (args.length && shouldSuppress(args[0], SUPPRESSED_ERROR_PATTERNS)) {
    return;
  }
  originalConsoleError(...args);
};

const originalConsoleLog = console.log;
console.log = (...args) => {
  if (args.length && shouldSuppress(args[0], SUPPRESSED_LOG_PATTERNS)) {
    return;
  }
  originalConsoleLog(...args);
};

// Restore to avoid global side effects in tests
Object.defineProperty = originalDefineProperty;
