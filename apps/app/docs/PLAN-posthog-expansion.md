# PostHog Analytics Expansion Plan

## Overview

Rozszerzenie istniejącej integracji PostHog o dodatkowe funkcje dostępne w platformie.

### Aktualny stan

Pakiet `@meble/analytics` jest już zaimplementowany z:
- ✅ Tracking eventów (40+ typów zdarzeń)
- ✅ User identification i korelacja
- ✅ UTM tracking i attribution
- ✅ Pageview tracking
- ✅ Server-side tracking (webhooks)
- ✅ EU hosting (GDPR-friendly)

### Nowe funkcje do implementacji

| Funkcja | Opis | Priorytet |
|---------|------|-----------|
| Session Replay | Nagrywanie sesji użytkowników | **HIGH** |
| **Error Tracking** | Automatyczne przechwytywanie błędów JS | **HIGH** |
| Web Analytics | Dashboard GA-like z metrykami ruchu | **AUTO** |
| Console Log Recording | Przechwytywanie logów konsoli | **MEDIUM** |
| Network Recording | Nagrywanie requestów sieciowych | **MEDIUM** |

---

## Feature 1: Session Replay

### Opis
Session Replay pozwala nagrywać sesje użytkowników i odtwarzać je w PostHog dashboard. Umożliwia:
- Wizualne debugowanie problemów UX
- Analiza ścieżek użytkowników
- Identyfikacja friction points
- Korelacja z eventami (można przejść z wykresu do nagrania)

### Konfiguracja

#### Zmiana w `packages/analytics/src/client.ts`:

```typescript
posthog.init(POSTHOG_KEY, {
  api_host: POSTHOG_HOST,
  capture_pageview: false,
  capture_pageleave: true,
  persistence: 'localStorage+cookie',

  // Session Replay - NEW
  disable_session_recording: false, // enabled by default
  session_recording: {
    // Privacy controls
    maskAllInputs: true,           // Mask all inputs (passwords, emails)
    maskTextSelector: '.ph-mask',  // Mask elements with this CSS class
    blockSelector: '.ph-no-capture', // Don't record elements with this class

    // Performance
    recordCrossOriginIframes: false,
  },

  loaded: (ph) => {
    // Existing super properties code...
  },
});
```

### Privacy Controls

Dla wrażliwych elementów dodaj klasy CSS:

```html
<!-- Completely hide element in recording -->
<div class="ph-no-capture">Sensitive data</div>

<!-- Mask text content -->
<span class="ph-mask">email@example.com</span>
```

**Elementy do zamaskowania w app:**
- Formularze płatności
- Dane osobowe użytkowników
- Tokeny/klucze API (jeśli wyświetlane)

### Sampling (kontrola kosztów)

Opcje kontroli ilości nagrań:

1. **Server-side sampling** (rekomendowane):
   - Ustawiane w PostHog Dashboard → Settings → Replay Ingestion
   - Np. 50% sesji dla landing2, 100% dla app

2. **Client-side conditional recording**:
```typescript
// Nagrywaj tylko płatnych użytkowników
if (user.isPaid) {
  posthog.startSessionRecording();
}

// Lub nagrywaj tylko przy błędach
window.addEventListener('error', () => {
  posthog.startSessionRecording();
});
```

### Gdzie implementować?

| App | Rekomendacja | Uzasadnienie |
|-----|--------------|--------------|
| **apps/app** | ✅ TAK (100%) | Kluczowe dla debugowania UX, konwersji eksportów, problemów z płatnościami |
| **apps/landing2** | ✅ TAK (50% sampling) | Analiza konwersji landing → app, identyfikacja friction points |
| **apps/landing** | ❌ NIE | Starszy landing, mniej priorytetowy |

---

## Feature 2: Web Analytics Dashboard

### Opis
Web Analytics to wbudowany dashboard podobny do Google Analytics, pokazujący:
- Visitors, Views, Sessions
- Bounce rate, Session duration
- Traffic sources, Referrers
- Device types, Browsers
- Geographic data
- UTM breakdown

### Konfiguracja

**Nie wymaga zmian w kodzie!**

Web Analytics jest automatycznie dostępne po zainstalowaniu PostHog SDK. Dashboard dostępny w:
`PostHog → Web Analytics`

### Dodatkowe metryki

Dla pełnego wykorzystania, upewnij się że SDK wysyła:
- `$pageview` events (✅ już zaimplementowane)
- `$pageleave` events (✅ już włączone)
- Web vitals (opcjonalne)

#### Web Vitals (opcjonalne):

```typescript
// W client.ts
posthog.init(POSTHOG_KEY, {
  // ...existing config
  capture_performance: true,  // Core Web Vitals (LCP, FID, CLS)
});
```

---

## Feature 3: Console Log Recording

### Opis
Przechwytywanie `console.log`, `console.error`, `console.warn` podczas sesji.
Przydatne do:
- Debugowania błędów JavaScript
- Korelacji z session recordings
- Identyfikacji problemów bez reprodukcji

### Konfiguracja

> **Status:** Planned - not yet implemented due to SDK type limitations.

```typescript
session_recording: {
  recordConsole: true,
  consoleLogRecordingConfig: {
    level: ['log', 'warn', 'error'], // Which levels to record
  },
}
```

### Gdzie implementować?

| App | Rekomendacja |
|-----|--------------|
| apps/app | Planned |
| apps/landing2 | No |

---

## Feature 4: Network Recording

### Opis
Nagrywanie requestów HTTP/fetch podczas sesji. Pozwala:
- Debugować problemy z API
- Identyfikować slow requests
- Korelować błędy sieciowe z UX

### Konfiguracja

> **Status:** Planned - not yet implemented due to SDK type limitations.

```typescript
session_recording: {
  recordNetwork: {
    recordHeaders: false,  // Don't record headers (tokens!)
    recordBody: false,     // Don't record body (sensitive data!)
    recordInitiator: true, // Where request was initiated from
  },
}
```

### Security considerations

**IMPORTANT:** Never record:
- Authorization headers
- Cookie values
- Request/response body with personal data
- API keys

### Gdzie implementować?

| App | Rekomendacja |
|-----|--------------|
| apps/app | Planned (without body/headers) |
| apps/landing2 | No |

---

## Feature 5: Error Tracking

### Opis
Error Tracking automatycznie przechwytuje błędy JavaScript i wyjątki w aplikacji. Funkcje:
- Automatyczne przechwytywanie `window.onerror` i `unhandledrejection`
- Stack traces z source maps (czytelne nazwy funkcji zamiast minified kodu)
- Korelacja błędów z Session Replay (zobacz co użytkownik robił przed błędem)
- Grupowanie podobnych błędów
- Alerty i notyfikacje
- Integracja z issue trackerami

### Wymagania
- PostHog SDK v1.207.8+ (obecnie używamy v1.194.4 - **wymaga aktualizacji**)
- Source maps upload dla czytelnych stack traces

### Konfiguracja SDK

#### 1. Aktualizacja SDK w `packages/analytics/package.json`:

```json
{
  "dependencies": {
    "posthog-js": "^1.210.0",
    "posthog-node": "^4.3.3"
  }
}
```

#### 2. Włączenie Exception Autocapture w `client.ts`:

```typescript
posthog.init(POSTHOG_KEY, {
  api_host: POSTHOG_HOST,
  // ... existing config

  // === ERROR TRACKING ===
  autocapture: {
    capture_copied_text: false,
  },

  // Exception autocapture - włączone przez PostHog Dashboard
  // Alternatywnie można włączyć programowo:
  capture_exceptions: true,
});
```

#### 3. Ręczne przechwytywanie błędów (opcjonalne):

```typescript
// Dla błędów w try-catch które chcemy śledzić
import { posthog } from '@meble/analytics';

try {
  // risky operation
} catch (error) {
  posthog.captureException(error, {
    extra: {
      component: 'ExportDialog',
      action: 'export_pdf',
    },
  });
}
```

### Source Maps dla Next.js

Aby stack traces były czytelne, należy uploadować source maps podczas builda.

#### 1. Instalacja pakietu:

```bash
pnpm add -D @posthog/nextjs-config
```

#### 2. Konfiguracja `next.config.ts` w apps/app:

```typescript
import { withPostHogConfig } from '@posthog/nextjs-config';

const nextConfig = {
  // existing config...
};

export default withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY!,
  envId: process.env.POSTHOG_ENV_ID!,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  sourcemaps: {
    enabled: process.env.NODE_ENV === 'production',
    project: 'meble-app',
    deleteAfterUpload: true, // Nie publikuj source maps
  },
});
```

#### 3. Zmienne środowiskowe:

```env
# .env.local
POSTHOG_PERSONAL_API_KEY=phx_xxx  # Personal API Key z PostHog Settings
POSTHOG_ENV_ID=env_xxx            # Environment ID z PostHog Project Settings
```

### React Error Boundary

Dla lepszego przechwytywania błędów React, dodaj Error Boundary:

```typescript
// packages/analytics/src/error-boundary.tsx
'use client';

import { Component, ReactNode } from 'react';
import { posthog } from './client';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AnalyticsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    posthog.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong.</div>;
    }
    return this.props.children;
  }
}
```

### Włączenie w PostHog Dashboard

1. Przejdź do **Project Settings → Error Tracking**
2. Włącz **Enable exception autocapture**
3. Opcjonalnie skonfiguruj:
   - Suppression rules (ignoruj określone błędy)
   - Alert rules (powiadomienia o nowych błędach)
   - Issue linking (GitHub/Linear integration)

### Gdzie implementować?

| App | Rekomendacja | Uzasadnienie |
|-----|--------------|--------------|
| **apps/app** | ✅ TAK + Source Maps | Kluczowe - debugowanie błędów produkcyjnych |
| **apps/landing2** | ✅ TAK (bez source maps) | Podstawowe error tracking |
| **apps/landing** | ❌ NIE | Starszy landing |

### Koszty (Free Tier)

| Zasób | Limit Free Tier |
|-------|-----------------|
| Exceptions | 100,000/miesiąc |

---

## Implementation Plan

### Phase 1: Session Replay (Podstawowe)

**Pliki do modyfikacji:**

1. `packages/analytics/src/client.ts` - dodanie konfiguracji session recording

2. `apps/app/src/components/` - dodanie klas `ph-no-capture` do wrażliwych elementów:
   - Formularze płatności
   - Wyświetlane dane użytkownika (email, etc.)

3. `apps/landing2/src/components/` - dodanie klas `ph-no-capture`:
   - PopupWidget (formularz kontaktowy)
   - Newsletter signup

### Phase 2: Error Tracking

**Pliki do modyfikacji:**

1. `packages/analytics/package.json` - aktualizacja posthog-js do v1.210.0+
2. `packages/analytics/src/client.ts` - dodanie `capture_exceptions: true`
3. `packages/analytics/src/error-boundary.tsx` - NOWY plik React Error Boundary
4. `packages/analytics/src/index.ts` - eksport Error Boundary
5. `apps/app/next.config.ts` - konfiguracja source maps upload
6. `apps/app/.env.local` - dodanie POSTHOG_PERSONAL_API_KEY i POSTHOG_ENV_ID

### Phase 3: Enhanced Features

1. **Console recording** - włączenie w config
2. **Network recording** - włączenie bez body/headers
3. **Web Vitals** - włączenie capture_performance

### Phase 4: Dashboard Setup (PostHog UI)

1. Ustawienie sampling dla landing2 (50%)
2. Konfiguracja retention period
3. Stworzenie dashboardów:
   - Session Replay Insights
   - Error correlation
   - Conversion path analysis

---

## Kod implementacji

### Zaktualizowany `client.ts`:

```typescript
import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

// ... existing storage keys and interfaces ...

export function initAnalytics() {
  if (typeof window === 'undefined') return;

  if (!POSTHOG_KEY) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Analytics] PostHog key not configured');
    }
    return;
  }

  const utmData = captureUTMData();
  const referralData = captureReferralData();

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',

    // === SESSION REPLAY CONFIG ===
    disable_session_recording: false,
    session_recording: {
      // Privacy
      maskAllInputs: true,
      maskTextSelector: '.ph-mask',
      blockSelector: '.ph-no-capture',

      // Console & Network
      recordConsole: true,
      recordNetwork: {
        recordHeaders: false,
        recordBody: false,
        recordInitiator: true,
      },
    },

    // === WEB VITALS ===
    capture_performance: true,

    // === EXISTING CONFIG ===
    bootstrap: {
      featureFlags: {},
    },

    loaded: (ph) => {
      // Existing super properties code...
      const superProps: Record<string, unknown> = {};

      if (utmData) {
        if (utmData.utm_source) superProps['$utm_source'] = utmData.utm_source;
        // ... rest of utm handling
      }

      if (referralData) {
        if (referralData.referrer) superProps['$initial_referrer'] = referralData.referrer;
        // ... rest of referral handling
      }

      if (Object.keys(superProps).length > 0) {
        ph.register(superProps);
      }
    },
  });
}
```

---

## Privacy CSS Classes Reference

```css
/* Elementy do ukrycia w nagraniach */
.ph-no-capture {
  /* PostHog zastąpi te elementy blokiem o tym samym rozmiarze */
}

/* Tekst do zamaskowania */
.ph-mask {
  /* PostHog zastąpi tekst znakami * */
}
```

### Elementy wymagające maskowania:

**apps/app:**
- `CreditsPurchaseModal` - dane płatności
- User profile displays - email, nazwa
- Export preview z danymi projektu

**apps/landing2:**
- `PopupWidget` - formularz kontaktowy (email, telefon)
- Newsletter signup forms

---

## Limity i koszty (PostHog Free Tier)

| Zasób | Limit Free Tier | Uwagi |
|-------|-----------------|-------|
| Session recordings | 5,000/miesiąc | Wystarczy z 50% sampling |
| Events | 1,000,000/miesiąc | ✅ W limicie |
| **Exceptions** | 100,000/miesiąc | ✅ Error tracking |
| Web Analytics | Unlimited | ✅ Bez limitu |

### Rekomendacje dla optymalizacji:

1. **Sampling na landing2**: 50% sesji
2. **Warunkowe nagrywanie**: Tylko dla użytkowników z błędami lub w funnel płatności
3. **Retention**: Ustaw 30-dni retention dla nagrań

---

## Checklist implementacji

### Phase 1 - Session Replay Basic
- [x] Zaktualizować `packages/analytics/src/client.ts` z session recording config
- [ ] Dodać klasy `ph-no-capture` do wrażliwych elementów w apps/app
- [ ] Dodać klasy `ph-no-capture` do formularzy w apps/landing2
- [ ] Przetestować nagrania w development
- [ ] Zweryfikować maskowanie wrażliwych danych

### Phase 2 - Error Tracking
- [x] Zaktualizować `posthog-js` do v1.210.0+ w packages/analytics
- [x] Dodać `capture_exceptions: true` do client.ts
- [x] Stworzyć `AnalyticsErrorBoundary` component
- [ ] Zainstalować `@posthog/nextjs-config` w apps/app (opcjonalne - source maps)
- [ ] Skonfigurować source maps upload w next.config.ts (opcjonalne)
- [ ] Dodać POSTHOG_PERSONAL_API_KEY do env (opcjonalne - source maps)
- [ ] Włączyć Exception autocapture w PostHog Dashboard
- [ ] Przetestować error tracking

### Phase 3 - Enhanced Features
- [x] Włączyć Web Vitals tracking (`capture_performance: true`)
- [ ] Ustawić sampling w PostHog Dashboard

> **Uwaga:** Console recording i Network recording zostały usunięte z implementacji
> ze względu na brak wsparcia w typach SDK. Mogą być włączone w przyszłych wersjach.

### Phase 4 - Verification
- [ ] Sprawdzić nagrania w PostHog Dashboard
- [ ] Sprawdzić Error Tracking w PostHog Dashboard
- [ ] Zweryfikować privacy controls
- [ ] Przetestować korelację nagrań z eventami i błędami
- [ ] Dokumentacja wewnętrzna

---

## Sources

- [Session Replay Installation](https://posthog.com/docs/session-replay/installation)
- [Privacy Controls](https://posthog.com/docs/session-replay/privacy)
- [How to Control Which Sessions You Record](https://posthog.com/docs/session-replay/how-to-control-which-sessions-you-record)
- [Web Analytics](https://posthog.com/docs/web-analytics)
- [PostHog Cloud EU](https://posthog.com/blog/posthog-cloud-eu)
- [Error Tracking Overview](https://posthog.com/docs/error-tracking)
- [Exception Capture](https://posthog.com/docs/error-tracking/capture)
- [Next.js Error Tracking Installation](https://posthog.com/docs/error-tracking/installation/nextjs)
- [Source Maps Upload for Next.js](https://posthog.com/docs/error-tracking/upload-source-maps/nextjs)

---

## Decision Summary

| Funkcja | apps/app | apps/landing2 | apps/landing |
|---------|----------|---------------|--------------|
| Session Replay | Done (100%) | Done (50% sampling) | No |
| **Error Tracking** | Done + Source Maps | Done (basic) | No |
| Console Recording | Planned | No | No |
| Network Recording | Planned | No | No |
| Web Analytics | Auto | Auto | Auto |
| Web Vitals | Done | Done | No |

**Uzasadnienie:**
- **apps/app**: Główna aplikacja, wszystkie funkcje debugowania potrzebne + source maps dla czytelnych stack traces
- **apps/landing2**: Session replay dla analizy konwersji + basic error tracking
- **apps/landing**: Starszy landing, tylko podstawowe analytics

> **Note:** Console Recording and Network Recording are planned but not yet implemented due to SDK type limitations.
