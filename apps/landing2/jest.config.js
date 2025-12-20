const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@meble/ui$': '<rootDir>/../../packages/ui/src/index.tsx',
    '^@meble/constants$': '<rootDir>/test/__mocks__/constants.js',
    '^@meble/analytics$': '<rootDir>/test/__mocks__/analytics.ts',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '^.+\\.(svg|png|jpg|jpeg|gif|webp|avif|ico|bmp)$': '<rootDir>/test/__mocks__/fileMock.js',
  },
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
};

module.exports = createJestConfig(customJestConfig);
