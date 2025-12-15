/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@meble/ui", "@meble/constants", "@meble/payments"],
  // TODO: Fix Supabase RPC types and remove this
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
