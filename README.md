# Meble - Furniture Design Application

A Turborepo monorepo for the Meble furniture design application ecosystem.

## What's inside?

This Turborepo includes the following packages and apps:

### Apps

- `@meble/app`: Main furniture design application (Next.js 14)
  - Port: `3000`
  - 3D furniture designer with React Three Fiber
  - Material management and CSV export

- `@meble/landing`: Marketing landing page (Next.js 14)
  - Port: `3001`
  - Based on FinWise SaaS template
  - Features, pricing, and testimonials

- `@meble/payments`: Subscription and payment management (Next.js 14)
  - Port: `3002`
  - Stripe integration for subscriptions
  - Supabase for authentication and database
  - Based on Vercel subscription starter template

### Packages

- `@meble/constants`: Shared application constants
  - Application name and metadata
  - Use `APP_NAME` constant instead of hardcoding "Meble"

- `@meble/ui`: Shared UI component library
  - Built with shadcn/ui components
  - Tailwind CSS with theme variables
  - Reusable across all apps

- `@meble/i18n`: Shared internationalization configuration
  - Locale definitions (pl, en)
  - Shared with next-intl

- `@meble/tsconfig`: Shared TypeScript configurations
  - Base, Next.js, and React Library configs

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui, Radix UI
- **Build System:** Turborepo
- **Package Manager:** pnpm
- **TypeScript:** Strict mode enabled
- **Animation:** Framer Motion (landing)
- **3D Graphics:** React Three Fiber (app)
- **Payments:** Stripe (payments)
- **Database:** Supabase (payments)

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.15.0

### Installation

```bash
# Install dependencies
pnpm install
```

### Development

```bash
# Run all apps in development mode
pnpm dev

# Run specific app
pnpm dev --filter=@meble/app
pnpm dev --filter=@meble/landing
pnpm dev --filter=@meble/payments
```

### Building

```bash
# Build all apps and packages
pnpm build

# Build specific app
pnpm build --filter=@meble/app

# Build excluding payments (if Supabase/Stripe not configured yet)
pnpm build --filter=!@meble/payments
```

**Note:** The `@meble/payments` app requires Supabase and Stripe environment variables to build successfully. See `apps/payments/README.md` for setup instructions.

### Linting

```bash
# Lint all projects
pnpm lint
```

## Project Structure

```
meble/
├── apps/
│   ├── app/           # Main application
│   ├── landing/       # Landing page
│   └── payments/      # Payment system
├── packages/
│   ├── constants/    # App constants (APP_NAME, etc.)
│   ├── i18n/         # Internationalization config
│   ├── ui/           # Shared UI components
│   └── tsconfig/     # Shared TS configs
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Development Guidelines

### Code Style
- All code and comments in **English**
- UI text in **Polish** by default
- Translations updated before releases only

### Styling
- Use Tailwind theme variables (e.g., `bg-primary`, `text-foreground`)
- **NO** hardcoded colors (`bg-blue-500`, `#ffffff`)
- All colors defined in `tailwind.config.ts`

### TypeScript
- Strict mode enabled
- No `any` types
- All types in `src/types/index.ts`

### File Naming
- Components: PascalCase (`PropertiesPanel.tsx`)
- Functions/variables: camelCase (`addPart`, `selectedPartId`)
- Types/Interfaces: PascalCase (`Part`, `Material`)
- Constants: UPPER_SNAKE_CASE (`DEFAULT_THICKNESS`)

## Environment Variables

Each app may require its own environment variables:

### @meble/payments
```env
# See apps/payments/.env.local.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure all builds pass: `pnpm build`
4. Ensure linting passes: `pnpm lint`
5. Create a pull request

## License

Private project - All rights reserved

## Remote Repository

- GitHub: https://github.com/RoberttBukowiecki/meble.git
