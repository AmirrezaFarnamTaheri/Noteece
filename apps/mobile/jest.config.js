module.exports = {
  preset: "jest-expo",
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": [
      "babel-jest",
      {
        presets: ["babel-preset-expo"],
        plugins: ["@babel/plugin-transform-flow-strip-types"],
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native|expo|@expo|@react-navigation|react-native-reanimated|react-native-gesture-handler|@tauri-apps|nanoid))",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
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
