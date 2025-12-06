const { defaults } = require('jest-config');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
        diagnostics: {
          ignoreCodes: [1343],
        },
        astTransformers: {
          before: [
            {
              path: 'ts-jest-mock-import-meta',
              options: { metaObjectReplacement: { env: { DEV: true, MODE: 'test' } } },
            },
          ],
        },
      },
    ],
  },
  moduleNameMapper: {
    // Map CSS modules to a proxy so Jest can import them
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Stub logger to avoid import.meta issues in tests
    '^(?:@/)?utils/logger$': '<rootDir>/__mocks__/logger.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tauri-apps/api/tauri$': '<rootDir>/__mocks__/@tauri-apps/api/tauri.ts',
    '^@noteece/ui$': '<rootDir>/../../packages/ui/src/index.ts',
    '^@noteece/types$': '<rootDir>/../../packages/types/src/index.ts',
    // Force peer dependencies to resolve to the app's node_modules
    '^@mantine/core$': '<rootDir>/node_modules/@mantine/core',
    '^@mantine/hooks$': '<rootDir>/node_modules/@mantine/hooks',
    '^react$': '<rootDir>/node_modules/react',
    '^react-dom$': '<rootDir>/node_modules/react-dom',
  },
  // Avoid altering default resolution; use moduleNameMapper for packages
  // modulePaths: ['<rootDir>/../../packages'], // removed to prevent raw TS resolution
  moduleDirectories: [
    'node_modules',
    '<rootDir>/node_modules',
    '<rootDir>/../../node_modules',
    ...defaults.moduleDirectories,
  ],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts?(x)'],
  setupFiles: ['<rootDir>/jest.polyfill.ts'],
};
