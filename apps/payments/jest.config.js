const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@meble/ui$': '<rootDir>/../../packages/ui/src/index.tsx',
    '^@meble/constants$': '<rootDir>/test/__mocks__/constants.js',
    '^@meble/payment-providers$': '<rootDir>/test/__mocks__/payment-providers.ts',
    '^@meble/payment-providers/(.*)$': '<rootDir>/test/__mocks__/payment-providers.ts',
    '^react-merge-refs$': '<rootDir>/test/__mocks__/react-merge-refs.js',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '^.+\\.(svg|png|jpg|jpeg|gif|webp|avif|ico|bmp)$': '<rootDir>/test/__mocks__/fileMock.js',
  },
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  transformIgnorePatterns: [
    '/node_modules/(?!(react-merge-refs)/)',
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'utils/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/index.ts',
  ],
};

module.exports = createJestConfig(customJestConfig);
