import nextConfig from 'eslint-config-next';

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ['coverage/**', 'test/**/__mocks__/**'],
  },
  {
    rules: {
      // Downgrade to warning - setState in useEffect is valid for initialization
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default eslintConfig;
