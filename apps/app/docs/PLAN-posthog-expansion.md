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
| Session Replay | Nagrywanie sesji użytkowników | 🔴 Wysoki |
| Web Analytics | Dashboard GA-like z metrykami ruchu | 🟢 Automatyczne |
| Console Log Recording | Przechwytywanie logów konsoli | 🟡 Średni |
| Network Recording | Nagrywanie requestów sieciowych | 🟡 Średni |

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

  // Session Replay - NOWE
  disable_session_recording: false, // domyślnie włączone
  session_recording: {
    // Privacy controls
    maskAllInputs: true,           // Maskuj wszystkie inputy (hasła, emaile)
    maskTextSelector: '.ph-mask',  // Maskuj elementy z tą klasą CSS
    blockSelector: '.ph-no-capture', // Nie nagrywaj elementów z tą klasą

    // Performance
    recordCrossOriginIframes: false,

    // Console & Network (opcjonalne)
    recordConsole: true,           // Nagrywaj console.log/error
    recordNetwork: {
      recordHeaders: false,        // Nie nagrywaj headerów (bezpieczeństwo)
      recordBody: false,           // Nie nagrywaj body requestów
    },
  },

  loaded: (ph) => {
    // Istniejący kod super properties...
  },
});
```

### Privacy Controls

Dla wrażliwych elementów dodaj klasy CSS:

```html
<!-- Całkowicie ukryj element w nagraniu -->
<div class="ph-no-capture">Wrażliwe dane</div>

<!-- Zamaskuj tekst -->
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

```typescript
session_recording: {
  recordConsole: true,
  consoleLogRecordingConfig: {
    level: ['log', 'warn', 'error'], // Które poziomy nagrywać
  },
}
```

### Gdzie implementować?

| App | Rekomendacja |
|-----|--------------|
| apps/app | ✅ TAK - dla debugowania |
| apps/landing2 | ⚠️ Opcjonalnie |

---

## Feature 4: Network Recording

### Opis
Nagrywanie requestów HTTP/fetch podczas sesji. Pozwala:
- Debugować problemy z API
- Identyfikować slow requests
- Korelować błędy sieciowe z UX

### Konfiguracja

```typescript
session_recording: {
  recordNetwork: {
    recordHeaders: false,  // NIE nagrywaj headerów (tokeny!)
    recordBody: false,     // NIE nagrywaj body (dane wrażliwe!)
    recordInitiator: true, // Skąd request został wywołany
  },
}
```

### Security considerations

**⚠️ WAŻNE:** Nigdy nie nagrywaj:
- Authorization headers
- Cookie values
- Request/response body z danymi osobowymi
- API keys

### Gdzie implementować?

| App | Rekomendacja |
|-----|--------------|
| apps/app | ✅ TAK (bez body/headers) |
| apps/landing2 | ❌ NIE - brak potrzeby |

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

### Phase 2: Enhanced Features

1. **Console recording** - włączenie w config
2. **Network recording** - włączenie bez body/headers
3. **Web Vitals** - włączenie capture_performance

### Phase 3: Dashboard Setup (PostHog UI)

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
| Web Analytics | Unlimited | ✅ Bez limitu |

### Rekomendacje dla optymalizacji:

1. **Sampling na landing2**: 50% sesji
2. **Warunkowe nagrywanie**: Tylko dla użytkowników z błędami lub w funnel płatności
3. **Retention**: Ustaw 30-dni retention dla nagrań

---

## Checklist implementacji

### Phase 1 - Session Replay Basic
- [ ] Zaktualizować `packages/analytics/src/client.ts` z session recording config
- [ ] Dodać klasy `ph-no-capture` do wrażliwych elementów w apps/app
- [ ] Dodać klasy `ph-no-capture` do formularzy w apps/landing2
- [ ] Przetestować nagrania w development
- [ ] Zweryfikować maskowanie wrażliwych danych

### Phase 2 - Enhanced Features
- [ ] Włączyć Console recording
- [ ] Włączyć Network recording (bez headers/body)
- [ ] Włączyć Web Vitals tracking
- [ ] Ustawić sampling w PostHog Dashboard

### Phase 3 - Verification
- [ ] Sprawdzić nagrania w PostHog Dashboard
- [ ] Zweryfikować privacy controls
- [ ] Przetestować korelację nagrań z eventami
- [ ] Dokumentacja wewnętrzna

---

## Sources

- [Session Replay Installation](https://posthog.com/docs/session-replay/installation)
- [Privacy Controls](https://posthog.com/docs/session-replay/privacy)
- [How to Control Which Sessions You Record](https://posthog.com/docs/session-replay/how-to-control-which-sessions-you-record)
- [Web Analytics](https://posthog.com/docs/web-analytics)
- [PostHog Cloud EU](https://posthog.com/blog/posthog-cloud-eu)

---

## Decision Summary

| Funkcja | apps/app | apps/landing2 | apps/landing |
|---------|----------|---------------|--------------|
| Session Replay | ✅ 100% | ✅ 50% sampling | ❌ |
| Console Recording | ✅ | ❌ | ❌ |
| Network Recording | ✅ (bez body) | ❌ | ❌ |
| Web Analytics | ✅ Auto | ✅ Auto | ✅ Auto |
| Web Vitals | ✅ | ✅ | ❌ |

**Uzasadnienie:**
- **apps/app**: Główna aplikacja, wszystkie funkcje debugowania potrzebne
- **apps/landing2**: Session replay dla analizy konwersji, reszta niepotrzebna
- **apps/landing**: Starszy landing, tylko podstawowe analytics
