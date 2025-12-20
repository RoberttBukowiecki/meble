import nextConfig from 'eslint-config-next';

export default [
  ...nextConfig,
  {
    ignores: ['coverage/**', 'test/**/__mocks__/**'],
  },
];
