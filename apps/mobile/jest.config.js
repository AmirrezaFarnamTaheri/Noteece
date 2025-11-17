module.exports = {
  preset: "jest-expo",
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
  // With pnpm and React Native/Expo, it's more reliable to transform
  // all modules instead of ignoring node_modules, to avoid Flow/JS syntax
  // issues in packages like @react-native/js-polyfills.
  transformIgnorePatterns: [],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^expo/src/async-require/messageSocket$":
      "<rootDir>/jest.mocks/expo-messageSocket.js",
    "^react-native/Libraries/BatchedBridge/NativeModules$":
      "<rootDir>/jest.mocks/react-native-NativeModules.js",
    "^expo-modules-core/src/polyfill/dangerous-internal$":
      "<rootDir>/jest.mocks/expo-modules-core-dangerous-internal.js",
    "^expo/src/winter/FormData$":
      "<rootDir>/jest.mocks/expo-winter-FormData.js",
    "^expo/src/winter$": "<rootDir>/node_modules/expo/build/winter/index.js",
    "^expo/virtual/streams$": "<rootDir>/jest.mocks/expo-virtual-streams.js",
  },
  setupFiles: ["<rootDir>/jest.pre-setup.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testPathIgnorePatterns: ["/node_modules/", "/android/", "/ios/"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
  ],
};
