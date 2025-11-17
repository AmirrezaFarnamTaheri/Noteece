const { defaults } = require('jest-config');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleDirectories: [
    'node_modules',
    '<rootDir>/node_modules',
    '<rootDir>/../../node_modules',
    ...defaults.moduleDirectories,
  ],
  setupFilesAfterEnv: ['./jest.setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      babelConfig: true,
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tauri-apps/api/tauri$': '<rootDir>/__mocks__/@tauri-apps/api/tauri.ts',
    '^@noteece/ui$': '<rootDir>/../../packages/ui/src/index.ts',
    '^@noteece/types$': '<rootDir>/../../packages/types/src/index.ts',
    '\\.css$': 'identity-obj-proxy',
  },
  // Avoid altering default resolution; use moduleNameMapper for packages
  // modulePaths: ['<rootDir>/../../packages'], // removed to prevent raw TS resolution
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts?(x)'],
  setupFiles: ['<rootDir>/jest.polyfill.ts'],
};
