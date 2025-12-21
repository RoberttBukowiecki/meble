import nextConfig from 'eslint-config-next';

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ['coverage/**'],
  },
  {
    rules: {
      // Downgrade to warning - setState in useEffect is valid for initialization
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default eslintConfig;
