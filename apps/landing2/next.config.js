const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@meble/ui", "@meble/i18n", "@meble/constants", "@meble/payments"],
};

module.exports = withNextIntl(nextConfig);
