# Analytics Implementation Plan

## Overview

Implementation of unified analytics tracking across all apps using **PostHog** (Cloud Free Tier).

### Why PostHog?
- 1M free events/month
- Product analytics focus (ideal for SaaS)
- Built-in funnels, retention, paths analysis
- Session recording (see what users do)
- Simple, modern UI
- Official Next.js integration
- EU hosting available (GDPR-friendly)

---

## Architecture

```
packages/
└── analytics/                    # NEW shared package
    ├── src/
    │   ├── index.ts              # Main export
    │   ├── client.ts             # PostHog client setup
    │   ├── events.ts             # Typed event definitions
    │   ├── hooks.ts              # useAnalytics, useTrack hooks
    │   └── provider.tsx          # AnalyticsProvider component
    └── package.json

apps/
├── app/                          # Integration
│   └── src/app/[locale]/layout.tsx
├── landing/                      # Integration
│   └── src/app/[locale]/layout.tsx
└── landing2/                     # Integration
    └── src/app/[locale]/layout.tsx
```

---

## Implementation Steps

### Step 1: Create PostHog Account
- [ ] Go to https://posthog.com and create free account
- [ ] Choose EU or US hosting (EU recommended for GDPR)
- [ ] Get Project API Key
- [ ] Add API key to environment variables

### Step 2: Create `@meble/analytics` Package

#### 2.1 Package structure
```
packages/analytics/
├── src/
│   ├── index.ts
│   ├── client.ts
│   ├── events.ts
│   ├── hooks.ts
│   └── provider.tsx
├── package.json
└── tsconfig.json
```

#### 2.2 Event Definitions (`events.ts`)
```typescript
export enum AnalyticsEvent {
  // Landing - Conversion
  LANDING_PAGE_VIEW = 'landing_page_view',
  LANDING_CTA_CLICKED = 'landing_cta_clicked',

  // App - Session
  APP_SESSION_STARTED = 'app_session_started',

  // App - Design Actions
  PART_ADDED = 'part_added',
  CABINET_CREATED = 'cabinet_created',
  TEMPLATE_SELECTED = 'template_selected',
  CONFIG_OPENED = 'config_opened',

  // App - Export (Critical)
  EXPORT_INITIATED = 'export_initiated',
  EXPORT_VALIDATION_FAILED = 'export_validation_failed',
  EXPORT_COMPLETED = 'export_completed',
  SMART_EXPORT_USED = 'smart_export_used',

  // Monetization (Critical)
  PURCHASE_MODAL_OPENED = 'purchase_modal_opened',
  PACKAGE_SELECTED = 'package_selected',
  PAYMENT_PROVIDER_SELECTED = 'payment_provider_selected',
  PURCHASE_STARTED = 'purchase_started',
  PAYMENT_COMPLETED = 'payment_completed',
  PAYMENT_FAILED = 'payment_failed',

  // UX
  LANGUAGE_CHANGED = 'language_changed',
  VALIDATION_ERROR = 'validation_error',
  CONTACT_FORM_SUBMITTED = 'contact_form_submitted',
}

export interface EventProperties {
  [AnalyticsEvent.LANDING_CTA_CLICKED]: {
    location: 'hero' | 'pricing' | 'footer' | 'cta_section';
  };
  [AnalyticsEvent.CABINET_CREATED]: {
    template_type: string;
  };
  [AnalyticsEvent.EXPORT_INITIATED]: {
    parts_count: number;
  };
  [AnalyticsEvent.EXPORT_COMPLETED]: {
    parts_count: number;
    used_credit: boolean;
  };
  [AnalyticsEvent.PURCHASE_MODAL_OPENED]: {
    trigger: 'export' | 'badge' | 'manual';
  };
  [AnalyticsEvent.PURCHASE_STARTED]: {
    package_id: string;
    amount: number;
    provider: 'przelewy24' | 'payu';
  };
  [AnalyticsEvent.PAYMENT_COMPLETED]: {
    package_id: string;
    amount: number;
    provider: string;
  };
  // ... etc
}
```

#### 2.3 Client Setup (`client.ts`)
```typescript
import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com';

export function initAnalytics() {
  if (typeof window === 'undefined') return;
  if (!POSTHOG_KEY) {
    console.warn('PostHog key not configured');
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'localStorage',
  });
}

export { posthog };
```

#### 2.4 React Hook (`hooks.ts`)
```typescript
import { useCallback } from 'react';
import { posthog } from './client';
import { AnalyticsEvent, EventProperties } from './events';

export function useTrack() {
  return useCallback(<E extends AnalyticsEvent>(
    event: E,
    properties?: E extends keyof EventProperties ? EventProperties[E] : Record<string, unknown>
  ) => {
    posthog.capture(event, properties);
  }, []);
}

// Standalone function for non-component usage
export function track<E extends AnalyticsEvent>(
  event: E,
  properties?: E extends keyof EventProperties ? EventProperties[E] : Record<string, unknown>
) {
  posthog.capture(event, properties);
}
```

#### 2.5 Provider (`provider.tsx`)
```typescript
'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initAnalytics, posthog } from './client';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (pathname) {
      posthog.capture('$pageview', {
        $current_url: window.location.href,
      });
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}
```

### Step 3: Environment Variables

Add to each app's `.env.local`:
```env
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://eu.posthog.com
```

Add to `.env.example` in each app.

### Step 4: Integrate in Apps

#### 4.1 Landing App (`apps/landing/src/app/[locale]/layout.tsx`)
```typescript
import { AnalyticsProvider } from '@meble/analytics';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AnalyticsProvider>
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
```

#### 4.2 Main App (`apps/app/src/app/[locale]/layout.tsx`)
Same pattern as landing.

#### 4.3 Landing2 (`apps/landing2/src/app/[locale]/layout.tsx`)
Same pattern as landing.

### Step 5: Add Tracking to Components

#### 5.1 Landing CTAs
Files to modify:
- `apps/landing/src/components/Hero.tsx`
- `apps/landing/src/components/CTA.tsx`
- `apps/landing2/src/components/Hero.tsx`

```typescript
import { track, AnalyticsEvent } from '@meble/analytics';

// In onClick handler:
track(AnalyticsEvent.LANDING_CTA_CLICKED, { location: 'hero' });
```

#### 5.2 Export Dialog (`apps/app/src/components/ui/ExportDialog.tsx`)
```typescript
import { track, AnalyticsEvent } from '@meble/analytics';

// When dialog opens:
track(AnalyticsEvent.EXPORT_INITIATED, { parts_count: parts.length });

// On validation fail:
track(AnalyticsEvent.EXPORT_VALIDATION_FAILED, { error_count: errors.length });

// On successful export:
track(AnalyticsEvent.EXPORT_COMPLETED, {
  parts_count: parts.length,
  used_credit: true
});
```

#### 5.3 Credits Purchase Modal (`apps/app/src/components/ui/CreditsPurchaseModal.tsx`)
```typescript
import { track, AnalyticsEvent } from '@meble/analytics';

// When modal opens:
track(AnalyticsEvent.PURCHASE_MODAL_OPENED, { trigger: 'export' });

// When package selected:
track(AnalyticsEvent.PACKAGE_SELECTED, { package_id: 'starter', price: 49 });

// When payment started:
track(AnalyticsEvent.PURCHASE_STARTED, {
  package_id: 'starter',
  amount: 49,
  provider: 'przelewy24'
});
```

#### 5.4 Cabinet Template Dialog (`apps/app/src/components/ui/CabinetTemplateDialog.tsx`)
```typescript
// When cabinet created:
track(AnalyticsEvent.CABINET_CREATED, { template_type: 'kitchen_cabinet' });
```

#### 5.5 Sidebar - Add Part (`apps/app/src/components/ui/Sidebar.tsx`)
```typescript
// When part added:
track(AnalyticsEvent.PART_ADDED, { type: 'part' });
```

### Step 6: Server-Side Tracking (Optional, for accuracy)

For payment confirmations, add server-side tracking in webhooks:

```typescript
// apps/payments/app/api/webhooks/przelewy24/route.ts
import { PostHog } from 'posthog-node';

const posthog = new PostHog(process.env.POSTHOG_KEY);

// In webhook handler:
posthog.capture({
  distinctId: userId || sessionId,
  event: 'payment_completed',
  properties: {
    package_id: payment.packageId,
    amount: payment.amount,
    provider: 'przelewy24',
  },
});
```

---

## Events Priority Matrix

### 🔴 Critical (Implement First)
| Event | Location | Purpose |
|-------|----------|---------|
| `landing_cta_clicked` | Landing Hero/CTA | Measure landing → app conversion |
| `export_initiated` | ExportDialog | Track export funnel start |
| `export_completed` | ExportDialog | Track successful exports |
| `purchase_modal_opened` | CreditsPurchaseModal | Track monetization funnel |
| `purchase_started` | CreditsPurchaseModal | Track payment attempts |
| `payment_completed` | Webhooks | Track revenue |

### 🟡 Important (Implement Second)
| Event | Location | Purpose |
|-------|----------|---------|
| `cabinet_created` | CabinetTemplateDialog | Track feature usage |
| `template_selected` | CabinetTemplateDialog | Understand preferences |
| `part_added` | Sidebar | Track engagement |
| `config_opened` | Various dialogs | Feature popularity |

### 🟢 Nice to Have (Implement Later)
| Event | Location | Purpose |
|-------|----------|---------|
| `language_changed` | LanguageSwitcher | Locale preferences |
| `validation_error` | ExportDialog | UX issues |
| `contact_form_submitted` | Landing2 PopupWidget | Lead tracking |

---

## PostHog Dashboard Setup

After implementation, create these dashboards:

### 1. Conversion Funnel
```
Landing Page View
    ↓
Landing CTA Click
    ↓
App Session Started
    ↓
Cabinet Created
    ↓
Export Initiated
    ↓
Export Completed
```

### 2. Monetization Funnel
```
Export Initiated (No Credits)
    ↓
Purchase Modal Opened
    ↓
Package Selected
    ↓
Purchase Started
    ↓
Payment Completed
```

### 3. Key Metrics Dashboard
- Daily Active Users
- Exports per day
- Revenue per day
- Conversion rate (landing → export)
- Conversion rate (export → purchase)
- Most used templates

---

## Testing Checklist

- [ ] PostHog events visible in Live Events
- [ ] Page views tracking correctly
- [ ] CTA clicks tracked with location
- [ ] Export flow events in sequence
- [ ] Purchase flow events in sequence
- [ ] Session recording working
- [ ] Funnels showing correct data

---

## Estimated Implementation Time

1. PostHog account + env setup: Quick
2. Create `@meble/analytics` package: Quick
3. Integrate in all 3 apps: Medium
4. Add tracking to critical components: Medium
5. Server-side tracking (webhooks): Optional
6. Dashboard setup: Quick

---

## Remove Legacy Analytics

After PostHog is working:
- [ ] Remove Google Analytics from `apps/landing` (optional, can keep both)
- [ ] Clean up any unused analytics code

---

## Notes

- Start with critical events only, add more later
- Use PostHog's Session Recording to understand user behavior
- Set up Slack/Email alerts for payment events
- Review data weekly to optimize conversion funnel
