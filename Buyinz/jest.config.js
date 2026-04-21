/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Match tsconfig paths: "@/*" -> project root
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Assignment convention: colocate tests under `tests/`
  testMatch: [
    '<rootDir>/tests/**/*.test.[jt]s?(x)',
    '<rootDir>/tests/**/*-tests.ts',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/dist/'],
  modulePathIgnorePatterns: ['<rootDir>/.expo/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
