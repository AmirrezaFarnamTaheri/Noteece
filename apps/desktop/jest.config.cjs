module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tauri-apps/api/tauri$': '<rootDir>/__mocks__/@tauri-apps/api/tauri.ts',
    '^@noteece/ui$': '<rootDir>/../../packages/ui/src/index.ts',
    '^@noteece/types$': '<rootDir>/../../packages/types/src/index.ts',
  },
  modulePaths: ['<rootDir>/../../packages'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts?(x)'],
};
