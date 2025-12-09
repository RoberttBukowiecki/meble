# @meble/payments - Subscription & Payment Gateway

Subscription and payment management application based on [Vercel's Next.js Subscription Starter](https://github.com/vercel/nextjs-subscription-payments).

## Features

- Stripe integration for subscription management
- Supabase for authentication and database
- Customer portal for subscription management
- Webhook handling for Stripe events
- Pre-built UI components for account management

## Setup

### 1. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

### 2. Supabase Setup

1. Create a new Supabase project at https://app.supabase.com
2. Run the database schema from `schema.sql`
3. Get your project URL and API keys from Project Settings > API
4. Update `.env.local` with your Supabase credentials

### 3. Stripe Setup

1. Create a Stripe account at https://dashboard.stripe.com
2. Get your API keys from Developers > API keys
3. Set up webhook endpoint for local development:
   ```bash
   pnpm stripe:listen
   ```
4. Update `.env.local` with your Stripe credentials

### 4. Development

```bash
pnpm dev
```

The app will run on http://localhost:3002

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm stripe:login` - Login to Stripe CLI
- `pnpm stripe:listen` - Listen for Stripe webhooks locally
- `pnpm stripe:fixtures` - Load test data into Stripe
- `pnpm supabase:start` - Start local Supabase instance
- `pnpm supabase:stop` - Stop local Supabase instance

## Important Note

**This app requires Supabase and Stripe configuration to build and run properly.** The build will fail if environment variables are not set. For development purposes, you can:

1. Configure Supabase and Stripe (recommended)
2. Or exclude this app from builds until configuration is complete

To exclude from builds temporarily, use:
```bash
pnpm turbo build --filter=!@meble/payments
```

## Documentation

- [Stripe Documentation](https://stripe.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Original Template README](./README.md)
- [Original Template Repository](https://github.com/vercel/nextjs-subscription-payments)
