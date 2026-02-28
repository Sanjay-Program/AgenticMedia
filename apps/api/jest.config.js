/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@agenticmedia/shared-types$': '<rootDir>/../../packages/shared-types/src',
    '^@agenticmedia/database$': '<rootDir>/../../packages/database/src',
  },
};
