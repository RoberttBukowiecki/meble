import nextConfig from 'eslint-config-next';

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ['coverage/**', 'test/**/__mocks__/**', 'types_db.ts'],
  },
  {
    rules: {
      // Downgrade to warning - setState in useEffect is valid for initialization
      'react-hooks/set-state-in-effect': 'warn',
      // Disable unescaped entities - Polish text uses apostrophes
      'react/no-unescaped-entities': 'off',
    },
  },
];

export default eslintConfig;
