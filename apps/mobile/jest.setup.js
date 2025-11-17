// Try to import jest-native matchers if available
try {
  require("@testing-library/jest-native/extend-expect");
} catch (e) {
  // jest-native is optional, continue without it
}

// Mock expo-sqlite
jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(() =>
    Promise.resolve({
      execAsync: jest.fn(),
      getAllAsync: jest.fn(() => Promise.resolve([])),
      runAsync: jest.fn(),
    }),
  ),
}));

// Mock expo-crypto
jest.mock("expo-crypto", () => ({
  getRandomBytesAsync: jest.fn((size) => Promise.resolve(new Uint8Array(size))),
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  Stack: "Stack",
  Tabs: "Tabs",
}));
