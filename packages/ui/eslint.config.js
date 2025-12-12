const nextConfig = require('eslint-config-next/core-web-vitals');

// The `extends` key is not supported in flat config, so we have to spread the base config
// and then add our own rules.
const baseConfig = Array.isArray(nextConfig) ? nextConfig : [nextConfig];

module.exports = [
  ...baseConfig,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off",
    },
  }
];