const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@meble/ui$': '<rootDir>/../../packages/ui/src/index.tsx',
    '^@meble/config$': '<rootDir>/../../packages/config/src/index.ts',
    '^@meble/constants$': '<rootDir>/test/__mocks__/constants.js',
    '^@meble/analytics$': '<rootDir>/test/__mocks__/analytics.ts',
    '^uuid$': '<rootDir>/test/__mocks__/uuid.js',
    '^three$': '<rootDir>/test/__mocks__/three.ts',
    '^@react-three/fiber$': '<rootDir>/test/__mocks__/react-three-fiber.tsx',
    '^@react-three/drei$': '<rootDir>/test/__mocks__/react-three-drei.tsx',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '^.+\\.(svg|png|jpg|jpeg|gif|webp|avif|ico|bmp)$': '<rootDir>/test/__mocks__/fileMock.js',
  },
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
};

module.exports = createJestConfig(customJestConfig);
