const createNextIntlPlugin = require('next-intl/plugin');
const { withPostHogConfig } = require('@posthog/nextjs-config');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@meble/ui", "@meble/i18n", "@meble/config", "@meble/constants"],
};

// Apply next-intl first, then PostHog config for source maps
const configWithIntl = withNextIntl(nextConfig);

// Only enable PostHog source maps in production with required env vars
const shouldEnableSourceMaps =
  process.env.NODE_ENV === 'production' &&
  process.env.POSTHOG_PERSONAL_API_KEY &&
  process.env.POSTHOG_ENV_ID;

module.exports = shouldEnableSourceMaps
  ? withPostHogConfig(configWithIntl, {
      personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
      envId: process.env.POSTHOG_ENV_ID,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      sourcemaps: {
        enabled: true,
        project: 'meble-app',
        deleteAfterUpload: true,
      },
    })
  : configWithIntl;
