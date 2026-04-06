/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Match tsconfig paths: "@/*" -> project root
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Assignment convention: colocate tests under `tests/`
  testMatch: ['<rootDir>/tests/**/*.test.[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/dist/'],
  modulePathIgnorePatterns: ['<rootDir>/.expo/'],
};
