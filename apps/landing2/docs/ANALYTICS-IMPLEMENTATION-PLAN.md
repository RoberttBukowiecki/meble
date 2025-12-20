# Plan Implementacji Analityki dla Landing2

## Podsumowanie Analizy

### Czy warto implementować Google Analytics?

**Rekomendacja: NIE - jako osobny system, TAK - jako uzupełnienie PostHog**

#### Uzasadnienie:

1. **PostHog już jest wdrożony** - w pełni skonfigurowany pakiet `@meble/analytics` z:
   - Automatycznym śledzeniem pageview
   - Obsługą UTM i referral tracking
   - Consent mode integration
   - Zdefiniowanymi eventami dla landing

2. **PostHog jest lepszy do analityki produktowej** - umożliwia:
   - Session recordings
   - Feature flags
   - Funnels i retention analysis
   - Cohort analysis
   - A/B testing

3. **GA4 może być uzupełnieniem** - dla:
   - Raportów SEO (integracja z Search Console)
   - Danych demograficznych
   - Benchmarkowania z branżą
   - Raportów marketingowych dla zespołu

### Główny problem: Brakujące eventy!

Mimo że PostHog jest wdrożony, **wiele kluczowych interakcji NIE jest trackowanych**:

| Komponent | Status | Eventy zdefiniowane | Eventy zaimplementowane |
|-----------|--------|---------------------|-------------------------|
| Hero CTA | ✅ | `LANDING_CTA_CLICKED` | TAK |
| Article View | ✅ | `LANDING_ARTICLE_VIEW` | TAK |
| Article CTA | ✅ | `LANDING_ARTICLE_CTA_CLICKED` | TAK |
| **PopupWidget** | ❌ | `POPUP_WIDGET_OPENED`, `POPUP_WIDGET_SUBMITTED` | **NIE** |
| **FAQ** | ❌ | Brak | **NIE** |
| **Video** | ❌ | Brak | **NIE** |
| **BlogCard** | ❌ | Brak | **NIE** |
| **Navbar CTA** | ❌ | Brak | **NIE** |
| **Footer links** | ❌ | Brak | **NIE** |
| **Cookie consent** | ❌ | Brak | **NIE** |
| **Scroll depth** | ❌ | Brak | **NIE** |

---

## Plan Implementacji

### Faza 1: Krytyczne eventy konwersji (Priorytet: WYSOKI)

Te eventy bezpośrednio wpływają na zrozumienie lejka konwersji.

#### 1.1 PopupWidget - Formularz kontaktowy
**Plik:** `src/components/PopupWidget.tsx`

```typescript
// Import
import { track, AnalyticsEvent } from '@meble/analytics';

// Tracking otwarcia widgetu (w Disclosure render props)
// Użyć useEffect do wykrycia zmiany stanu 'open'
useEffect(() => {
  if (open) {
    track(AnalyticsEvent.POPUP_WIDGET_OPENED, {
      widget_type: 'contact',
      trigger: 'click'
    });
  }
}, [open]);

// Tracking wysłania formularza (w onSubmit, po sukcesie)
if (json.success) {
  track(AnalyticsEvent.POPUP_WIDGET_SUBMITTED, {
    widget_type: 'contact',
    submission_type: 'contact'
  });
}

// Tracking błędu (opcjonalnie - nowy event)
if (!json.success) {
  track(AnalyticsEvent.CONTACT_FORM_SUBMITTED, {
    form_location: 'landing2',
    success: false
  });
}
```

**Wartość biznesowa:**
- Mierzy zainteresowanie kontaktem
- Identyfikuje problemy z formularzem
- Lead generation tracking

#### 1.2 Navbar CTA - "Get Started"
**Plik:** `src/components/Navbar.tsx`

```typescript
// Import
import { track, AnalyticsEvent } from '@meble/analytics';

// Na przycisku CTA (desktop i mobile)
onClick={() => track(AnalyticsEvent.LANDING_CTA_CLICKED, {
  location: 'header',
  cta_text: t('getStarted')
})}
```

**Wartość biznesowa:**
- Mierzy intencję konwersji z nawigacji
- Porównuje efektywność CTA w różnych miejscach

#### 1.3 BlogCard - Kliknięcia w artykuły
**Plik:** `src/components/blog/BlogCard.tsx`

```typescript
// Nowy event potrzebny w events.ts:
LANDING_BLOG_CARD_CLICKED = 'landing_blog_card_clicked'

// Interfejs:
[AnalyticsEvent.LANDING_BLOG_CARD_CLICKED]: {
  article_slug: string;
  article_title: string;
  category: string;
  featured: boolean;
  source: 'blog_listing' | 'related_articles' | 'homepage';
}

// W BlogCard:
const handleClick = () => {
  track(AnalyticsEvent.LANDING_BLOG_CARD_CLICKED, {
    article_slug: article.slug,
    article_title: content.title,
    category: article.category,
    featured,
    source: 'blog_listing' // lub przekazać jako prop
  });
};

<Link href={...} onClick={handleClick}>
```

**Wartość biznesowa:**
- Identyfikuje najpopularniejsze artykuły
- Optymalizacja content strategy
- Zrozumienie user journey z bloga

---

### Faza 2: Eventy zaangażowania (Priorytet: ŚREDNI)

Te eventy pomagają zrozumieć jak użytkownicy konsumują treść.

#### 2.1 Video - Odtwarzanie wideo
**Plik:** `src/components/Video.tsx`

```typescript
// Nowy event w events.ts:
LANDING_VIDEO_PLAYED = 'landing_video_played'

[AnalyticsEvent.LANDING_VIDEO_PLAYED]: {
  video_id: string;
  video_title?: string;
  page_path: string;
}

// W Video.tsx:
import { track, AnalyticsEvent } from '@meble/analytics';
import { usePathname } from 'next/navigation';

const pathname = usePathname();

const handlePlay = () => {
  if (!playVideo) { // Tylko przy pierwszym kliknięciu
    track(AnalyticsEvent.LANDING_VIDEO_PLAYED, {
      video_id: 'aOq49euWnIo',
      video_title: 'How it works',
      page_path: pathname
    });
  }
  setPlayVideo(!playVideo);
};

<div onClick={handlePlay}>
```

**Wartość biznesowa:**
- Mierzy zainteresowanie produktem
- Identyfikuje użytkowników "educated" przed konwersją

#### 2.2 FAQ - Rozwijanie pytań
**Plik:** `src/components/Faq.tsx`

```typescript
// Nowy event w events.ts:
LANDING_FAQ_EXPANDED = 'landing_faq_expanded'

[AnalyticsEvent.LANDING_FAQ_EXPANDED]: {
  faq_item: string;
  faq_question: string;
  page_path: string;
}

// W Faq.tsx - custom button z onExpandChange:
import { track, AnalyticsEvent } from '@meble/analytics';
import { usePathname } from 'next/navigation';

// Użyj useState do śledzenia które pytania były już otwarte
const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
const pathname = usePathname();

const handleExpand = (item: string, question: string, isOpen: boolean) => {
  if (isOpen && !expandedItems.has(item)) {
    setExpandedItems(prev => new Set([...prev, item]));
    track(AnalyticsEvent.LANDING_FAQ_EXPANDED, {
      faq_item: item,
      faq_question: question,
      page_path: pathname
    });
  }
};
```

**Wartość biznesowa:**
- Identyfikuje najczęstsze wątpliwości klientów
- Materiał do optymalizacji FAQ i landing page
- Sygnał do tworzenia content marketingowego

#### 2.3 Footer - Social Media Links
**Plik:** `src/components/Footer.tsx`

```typescript
// Nowy event w events.ts:
LANDING_SOCIAL_CLICKED = 'landing_social_clicked'

[AnalyticsEvent.LANDING_SOCIAL_CLICKED]: {
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin';
  link_url: string;
}

// W Footer.tsx:
import { track, AnalyticsEvent } from '@meble/analytics';

const handleSocialClick = (platform: string, href: string) => {
  track(AnalyticsEvent.LANDING_SOCIAL_CLICKED, {
    platform,
    link_url: href
  });
};

<a
  href={social.href}
  onClick={() => handleSocialClick(social.name.toLowerCase(), social.href)}
>
```

**Wartość biznesowa:**
- Mierzy zainteresowanie marką
- Tracking social media reach

---

### Faza 3: Eventy UX (Priorytet: NISKI-ŚREDNI)

#### 3.1 Cookie Consent - Akceptacja/Odmowa
**Plik:** `src/components/CookieConsentBanner.tsx`

```typescript
// Nowe eventy w events.ts:
LANDING_COOKIE_ACCEPTED = 'landing_cookie_accepted'
LANDING_COOKIE_DECLINED = 'landing_cookie_declined'

// W CookieConsentBanner.tsx:
import { track, AnalyticsEvent } from '@meble/analytics';

onAccept={() => {
  track(AnalyticsEvent.LANDING_COOKIE_ACCEPTED, {});
  // ...existing gtag code
}}

onDecline={() => {
  track(AnalyticsEvent.LANDING_COOKIE_DECLINED, {});
  // ...existing gtag code
}}
```

**Wartość biznesowa:**
- Mierzy compliance rate
- Wpływa na jakość danych analitycznych

#### 3.2 Scroll Depth Tracking
**Nowy komponent:** `src/components/ScrollDepthTracker.tsx`

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { track, AnalyticsEvent } from '@meble/analytics';

// Nowy event w events.ts:
LANDING_SCROLL_DEPTH = 'landing_scroll_depth'

[AnalyticsEvent.LANDING_SCROLL_DEPTH]: {
  depth: 25 | 50 | 75 | 100;
  page_path: string;
}

export function ScrollDepthTracker() {
  const pathname = usePathname();
  const trackedDepths = useRef<Set<number>>(new Set());

  useEffect(() => {
    const thresholds = [25, 50, 75, 100];

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);

      thresholds.forEach(threshold => {
        if (scrollPercent >= threshold && !trackedDepths.current.has(threshold)) {
          trackedDepths.current.add(threshold);
          track(AnalyticsEvent.LANDING_SCROLL_DEPTH, {
            depth: threshold,
            page_path: pathname
          });
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  // Reset przy zmianie strony
  useEffect(() => {
    trackedDepths.current = new Set();
  }, [pathname]);

  return null;
}
```

**Użycie w layout.tsx:**
```typescript
<AnalyticsProvider>
  <ScrollDepthTracker />
  {children}
</AnalyticsProvider>
```

**Wartość biznesowa:**
- Mierzy zaangażowanie w treść
- Identyfikuje "drop-off points"
- Optymalizacja rozmieszczenia CTA

#### 3.3 Mobile Menu Toggle
**Plik:** `src/components/Navbar.tsx`

```typescript
// Nowy event:
LANDING_MOBILE_MENU_TOGGLED = 'landing_mobile_menu_toggled'

[AnalyticsEvent.LANDING_MOBILE_MENU_TOGGLED]: {
  action: 'open' | 'close';
}

// W Navbar - śledzenie stanu menu
<DisclosureButton
  onClick={() => track(AnalyticsEvent.LANDING_MOBILE_MENU_TOGGLED, {
    action: open ? 'close' : 'open'
  })}
>
```

---

### Faza 4: Dodatkowe eventy dla pillar pages (OPCJONALNE)

#### 4.1 Różnicowanie CTA na stronach filarowych

```typescript
// Rozszerzenie location w LANDING_CTA_CLICKED:
location: 'hero' | 'pricing' | 'footer' | 'cta_section' | 'header' | 'feature'
        | 'pillar_design' | 'pillar_order'

// W stronach filarowych przekazywać odpowiedni location
```

---

## Nowe eventy do dodania w events.ts

```typescript
// ============================================
// LANDING - Extended Events
// ============================================
LANDING_BLOG_CARD_CLICKED = 'landing_blog_card_clicked',
LANDING_VIDEO_PLAYED = 'landing_video_played',
LANDING_FAQ_EXPANDED = 'landing_faq_expanded',
LANDING_SOCIAL_CLICKED = 'landing_social_clicked',
LANDING_COOKIE_ACCEPTED = 'landing_cookie_accepted',
LANDING_COOKIE_DECLINED = 'landing_cookie_declined',
LANDING_SCROLL_DEPTH = 'landing_scroll_depth',
LANDING_MOBILE_MENU_TOGGLED = 'landing_mobile_menu_toggled',
```

---

## Dashboard i Raporty - Co analizować?

### 1. Lejek Konwersji (Funnel)
```
Page View → CTA Click → App Session → Export → Purchase
```

**Metryki:**
- Conversion rate na każdym etapie
- Drop-off points
- Time to conversion

### 2. Content Performance
```
Blog Views → Article CTAs → App Conversions
```

**Metryki:**
- Top performing articles (views → conversions)
- Category performance
- Reading depth (scroll tracking)

### 3. Engagement Score
```
Video Play + FAQ Expand + Scroll 75%+ + Contact Form = Engaged User
```

**Metryki:**
- Engaged users vs total visitors
- Engagement by source (organic, paid, social)
- Engagement correlation with conversion

### 4. Lead Quality
```
Contact Form Submissions → Response Rate → Conversion
```

**Metryki:**
- Form completion rate
- Lead sources (which pages generate leads)
- Message content analysis

---

## Opcjonalna integracja Google Analytics 4

Jeśli zespół potrzebuje GA4 dla raportów marketingowych:

### Instalacja
```bash
pnpm add @next/third-parties
```

### Konfiguracja
**Plik:** `src/app/[locale]/layout.tsx`

```typescript
import { GoogleAnalytics } from '@next/third-parties/google';

// W <head> sekcji:
{process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
  <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
)}
```

### Enviroment variable
```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Consent Mode Integration
Obecny CookieConsentBanner już ma kod dla gtag - wystarczy że GA4 jest załadowany.

---

## Kolejność implementacji

| Priorytet | Zadanie | Estymowany czas |
|-----------|---------|-----------------|
| 1 | PopupWidget tracking | 30 min |
| 2 | Navbar CTA tracking | 15 min |
| 3 | BlogCard tracking (+ nowy event) | 45 min |
| 4 | Video tracking (+ nowy event) | 30 min |
| 5 | FAQ tracking (+ nowy event) | 45 min |
| 6 | ScrollDepthTracker | 1h |
| 7 | Social links tracking | 20 min |
| 8 | Cookie consent tracking | 15 min |
| 9 | Mobile menu tracking | 15 min |
| 10 | (Opcjonalne) GA4 setup | 30 min |

**Łączny czas: ~5h**

---

## Podsumowanie

### Rekomendacja końcowa:

1. **NIE implementuj Google Analytics jako głównego narzędzia** - PostHog już jest i jest lepszy
2. **ZAIMPLEMENTUJ brakujące eventy** - to jest krytyczne dla zrozumienia user journey
3. **OPCJONALNIE dodaj GA4** - tylko jeśli potrzebujesz integracji z Search Console lub raportów marketingowych
4. **STWÓRZ dashboard w PostHog** - z lejkiem konwersji i metrykami engagement

### Kluczowe metryki do monitorowania:
1. **Conversion Rate**: CTA clicks / Page views
2. **Engagement Rate**: (Video + FAQ + Scroll75) / Total users
3. **Lead Generation Rate**: Form submissions / Page views
4. **Content ROI**: Article views → App conversions
5. **Mobile vs Desktop**: Conversion rate by device

---

## Appendix: Obecna struktura analityki

### Pakiet @meble/analytics
- **Lokalizacja:** `packages/analytics/`
- **System:** PostHog
- **Konfiguracja:**
  - `NEXT_PUBLIC_POSTHOG_KEY`
  - `NEXT_PUBLIC_POSTHOG_HOST`

### Zaimplementowane eventy w landing2
1. `LANDING_CTA_CLICKED` - Hero.tsx, Cta.tsx
2. `LANDING_ARTICLE_VIEW` - ArticleTracker.tsx
3. `LANDING_ARTICLE_CTA_CLICKED` - ArticleContent.tsx, Cta.tsx

### Automatyczne śledzenie
- Pageviews (AnalyticsProvider)
- UTM parameters (client.ts)
- Referral data (client.ts)
- Page leave (PostHog config)
