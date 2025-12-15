const withNextIntl = require('next-intl/plugin')('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@meble/ui", "@meble/i18n", "@meble/constants"],
};

module.exports = withNextIntl(nextConfig);
