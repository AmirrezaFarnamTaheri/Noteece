module.exports = {
  preset: 'jest-expo',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  // Transform everything in node_modules. Slow but necessary for pnpm + React Native + Expo
  transformIgnorePatterns: [],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^expo/src/async-require/messageSocket$': '<rootDir>/jest.mocks/expo-messageSocket.js',
    '^react-native/Libraries/BatchedBridge/NativeModules$': '<rootDir>/jest.mocks/react-native-NativeModules.js',
    '^expo-modules-core/src/polyfill/dangerous-internal$':
      '<rootDir>/jest.mocks/expo-modules-core-dangerous-internal.js',
    '^expo/src/winter/FormData$': '<rootDir>/jest.mocks/expo-winter-FormData.js',
    '^expo/src/winter$': '<rootDir>/node_modules/expo/build/winter/index.js',
    '^expo/virtual/streams$': '<rootDir>/jest.mocks/expo-virtual-streams.js',
    '^expo-share-menu$': '<rootDir>/jest.mocks/expo-share-menu.js',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/jest.mocks/fileMock.js',
  },
  setupFiles: ['<rootDir>/jest.pre-setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/__tests__/**'],
};
