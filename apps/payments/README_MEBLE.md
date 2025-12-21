# @meble/payments - Payment Gateway

Payment and credits management application for e-meble platform.

## Features

- Credit purchases with PayU and Przelewy24
- Supabase for authentication and database
- Guest and authenticated user credit management
- Shop products management
- Webhook handling for payment providers

## Setup

### 1. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

### 2. Supabase Setup

1. Create a new Supabase project at https://app.supabase.com
2. Run migrations from `supabase/migrations/`
3. Get your project URL and API keys from Project Settings > API
4. Update `.env.local` with your Supabase credentials

### 3. PayU/Przelewy24 Setup

1. Get sandbox/production credentials from PayU and/or Przelewy24
2. Configure webhook URLs in merchant panels
3. Update `.env.local` with payment provider credentials

### 4. Development

```bash
pnpm dev
```

The app will run on http://localhost:3002

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm supabase:start` - Start local Supabase instance
- `pnpm supabase:stop` - Stop local Supabase instance
- `pnpm supabase:generate-types` - Generate TypeScript types from database

## Important Note

**This app requires Supabase and payment provider configuration to build and run properly.**

To exclude from builds temporarily, use:
```bash
pnpm turbo build --filter=!@meble/payments
```

## Documentation

- [PayU Documentation](https://developers.payu.com/)
- [Przelewy24 Documentation](https://developers.przelewy24.pl/)
- [Supabase Documentation](https://supabase.com/docs)
