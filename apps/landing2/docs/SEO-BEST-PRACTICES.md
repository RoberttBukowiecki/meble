# SEO Best Practices - Wzorce i Transformacje

> Dokument referencyjny dla optymalizacji SEO stron e-meble.
> Ostatnia aktualizacja: 2025-12-20

---

## 1. Transformacja zastosowana w landing2

### Problem wyjściowy (dane z GSC):
- **CTR = 0%** przy pozycjach 4-9 w Google
- Frazy semantycznie podobne konkurowały ze sobą (kanibalizacja)
- Brak dedykowanych stron dla kluczowych zapytań
- Generyczne title/description bez USP

### Rozwiązanie:

```
PRZED:
/ (strona główna) ← wszystkie zapytania

PO:
/ (marka e-meble, brandowe zapytania)
├── /projektowanie-mebli-online/ (PILLAR PAGE)
│   └── linkuje do artykułów: szafa, wnęka, lista cięcia
└── /zamawianie-mebli-online/ (PILLAR PAGE)
    └── linkuje do artykułów: koszty, DIY, lista cięcia
```

---

## 2. Architektura SEO - Topic Clusters

### Wzorzec Pillar + Supporting Pages:

```
                    ┌─────────────────┐
                    │   PILLAR PAGE   │
                    │  (główna fraza) │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
    │ Article │        │ Article │        │ Article │
    │(long-tail)│      │(long-tail)│      │(long-tail)│
    └─────────┘        └─────────┘        └─────────┘
```

### Zasady:
1. **Pillar page** = główna strona dla szerokiego tematu
2. **Supporting pages** = artykuły blogowe dla long-tail
3. **Każdy supporting linkuje do pillar** (anchor z frazą kluczową)
4. **Pillar linkuje do wszystkich supporting** (sekcja "Powiązane poradniki")
5. **Supporting pages linkują między sobą** (kontekstowo)

---

## 3. Optymalizacja Title i Description (CTR)

### Wzorzec Title (max 60 znaków):

```
[Marka] | [Główna korzyść] → [Konkretna liczba]

Przykłady:
✅ e-meble | Zaprojektuj meble 3D za darmo → Oszczędź 50%
✅ Projektowanie mebli online | Darmowy projektant 3D
❌ Meble - Darmowy Projektant Mebli 3D Online | Oszczędź do 50% (za długi)
```

### Wzorzec Description (max 155 znaków):

```
[Co możesz zrobić]. [Konkretna korzyść]. [Call-to-action lub USP].

Przykłady:
✅ Projektuj szafy, komody i regały w 3D za darmo. Generuj listę cięcia CSV,
   zamów płyty z hurtowni i zaoszczędź nawet 50%. Bez rejestracji.

❌ Oferujemy narzędzie do projektowania mebli. Zapraszamy do korzystania.
   (zbyt ogólnikowe, brak liczb, brak USP)
```

### Elementy zwiększające CTR:
- **Liczby**: "50%", "w 5 minut", "127 użytkowników"
- **Symbole**: → ✓ | (przyciągają wzrok w SERP)
- **Akcja**: "Zaprojektuj", "Oszczędź", "Pobierz"
- **Bezpłatność**: "za darmo", "bez rejestracji"
- **Konkretność**: "szafy, komody, regały" zamiast "meble"

---

## 4. Struktura nagłówków (H1-H3)

### Wzorzec dla pillar page:

```html
<h1>Projektowanie mebli online – od pomysłu do realizacji</h1>

  <h2>Jak działa projektant mebli 3D?</h2>
    <h3>Krok 1: Wybierz typ mebla</h3>
    <h3>Krok 2: Dostosuj wymiary</h3>
    <h3>Krok 3: Wybierz materiały</h3>
    <h3>Krok 4: Pobierz listę cięcia</h3>

  <h2>Co możesz zaprojektować online?</h2>
    <h3>Szafy wnękowe i wolnostojące</h3>
    <h3>Komody i regały</h3>
    <h3>Meble kuchenne</h3>

  <h2>Dlaczego warto projektować meble samodzielnie?</h2>
    <h3>Oszczędność do 50%</h3>
    <h3>Pełna kontrola</h3>
    <h3>Bez pośredników</h3>

  <h2>Często zadawane pytania</h2>
    <!-- FAQ items -->

  <h2>Powiązane poradniki</h2>
    <!-- Links to supporting articles -->
```

### Zasady:
- **Jeden H1 na stronę** - zawiera główną frazę kluczową
- **H2 dla sekcji** - każda sekcja ma unikalny H2
- **H3 dla podsekcji** - logiczne podziały w sekcjach
- **Frazy kluczowe naturalnie w nagłówkach** - nie keyword stuffing

---

## 5. Schema.org - Structured Data

### Typy schema używane w e-meble:

| Typ | Gdzie | Cel |
|-----|-------|-----|
| `Organization` | Strona główna | Rich snippet z logo, kontakt |
| `WebSite` + `SearchAction` | Strona główna | Sitelinks searchbox |
| `SoftwareApplication` | Strona główna | Rating stars w SERP |
| `FAQPage` | Wszystkie strony | FAQ rich results |
| `BreadcrumbList` | Podstrony | Breadcrumbs w SERP |
| `HowTo` | Pillar pages | How-to rich results |
| `BlogPosting` | Artykuły | Article rich results |

### Przykład HowTo dla pillar page:

```typescript
{
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'Jak zaprojektować meble online',
  description: 'Zaprojektuj szafę w 5 minut...',
  totalTime: 'PT5M',
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Wybierz typ mebla',
      text: 'Szafa, komoda, regał...',
    },
    // ... więcej kroków
  ],
}
```

### Przykład FAQPage:

```typescript
{
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Czy projektowanie jest darmowe?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Tak, projektant 3D jest całkowicie darmowy...',
      },
    },
    // ... więcej pytań
  ],
}
```

---

## 6. Linkowanie wewnętrzne

### Zasady:

1. **Anchory zróżnicowane** - nie zawsze "projektowanie mebli online"
   ```
   ✅ "zaprojektuj meble online"
   ✅ "darmowy projektant 3D"
   ✅ "narzędzie do projektowania"
   ❌ "kliknij tutaj"
   ❌ "więcej informacji"
   ```

2. **Kontekstowe umiejscowienie** - link w treści, nie tylko w nawigacji

3. **Hierarchia linków**:
   - Strona główna → Pillar pages (footer, hero CTA)
   - Pillar pages → Supporting articles (sekcja "Powiązane")
   - Supporting articles → Pillar pages (w treści artykułu)
   - Supporting articles → Inne supporting (kontekstowo)

4. **Limit linków** - max 100 na stronę, ale jakość > ilość

---

## 7. Meta tagi i canonical

### Canonical URL:
```typescript
// Dla polskiej wersji (domyślnej):
canonical: 'https://meble.app/projektowanie-mebli-online'

// Dla angielskiej:
canonical: 'https://meble.app/en/projektowanie-mebli-online'
```

### Hreflang:
```typescript
alternates: {
  languages: {
    'pl-PL': 'https://meble.app/projektowanie-mebli-online',
    'en-US': 'https://meble.app/en/projektowanie-mebli-online',
    'x-default': 'https://meble.app/projektowanie-mebli-online',
  },
}
```

### Robots:
```typescript
robots: {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-video-preview': -1,
    'max-image-preview': 'large',
    'max-snippet': -1,
  },
}
```

---

## 8. Sitemap i robots.txt

### Sitemap priorities:
```typescript
{ path: '/', priority: 1.0, changeFrequency: 'weekly' }
{ path: '/projektowanie-mebli-online', priority: 0.95, changeFrequency: 'weekly' }
{ path: '/zamawianie-mebli-online', priority: 0.85, changeFrequency: 'monthly' }
{ path: '/blog', priority: 0.9, changeFrequency: 'daily' }
{ path: '/blog/[slug]', priority: 0.7-0.8, changeFrequency: 'monthly' }
```

### Robots.txt wzorzec:
```
User-agent: *
Allow: /

Disallow: /api/
Disallow: /_next/
Disallow: /admin/

Allow: /_next/static/
Allow: /img/

Sitemap: https://meble.app/sitemap.xml
```

---

## 9. Core Web Vitals - Performance

### Checklist:
- [ ] Obrazy: Next.js `Image` z `priority` dla above-the-fold
- [ ] Lazy loading dla obrazów below-the-fold
- [ ] Preconnect do zewnętrznych zasobów (fonts, analytics)
- [ ] Krytyczny CSS inline
- [ ] Kod JavaScript defer/async
- [ ] Kompresja gzip/brotli
- [ ] CDN dla statycznych zasobów

### Przykład preconnect:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link rel="dns-prefetch" href="https://www.googletagmanager.com" />
```

---

## 10. Checklist SEO dla nowej strony

### Przed publikacją:
- [ ] Title ≤60 znaków, zawiera główną frazę + USP
- [ ] Description ≤155 znaków, z call-to-action
- [ ] Jeden H1 z główną frazą
- [ ] Hierarchia H2/H3 logiczna
- [ ] Schema.org odpowiedni dla typu strony
- [ ] Canonical URL ustawiony
- [ ] Hreflang dla wszystkich wersji językowych
- [ ] Obrazy z alt text
- [ ] Linki wewnętrzne do/z pillar pages
- [ ] Strona w sitemap.xml
- [ ] Mobile-friendly (responsive)
- [ ] Page speed > 90 (Lighthouse)

### Po publikacji:
- [ ] Request indexing w GSC
- [ ] Sprawdź coverage w GSC po 1-2 dniach
- [ ] Monitoruj CTR i pozycję co tydzień
- [ ] A/B test title jeśli CTR < 3%

---

## 11. Mapowanie intencji użytkownika

### Typy intencji:

| Intencja | Przykład frazy | Typ strony |
|----------|----------------|------------|
| **Informacyjna** | "jak zaprojektować szafę" | Blog article |
| **Nawigacyjna** | "e-meble", "e meble" | Strona główna |
| **Transakcyjna** | "zamów meble online" | Pillar page + CTA |
| **Komercyjna** | "ile kosztuje szafa na wymiar" | Blog article + CTA |

### Dopasowanie treści:
- **Informacyjna** → szczegółowy poradnik, FAQ, video
- **Nawigacyjna** → jasny branding, szybki dostęp do produktu
- **Transakcyjna** → CTA above-the-fold, proces zakupu
- **Komercyjna** → porównania, ceny, case studies

---

## 12. Częste błędy SEO do unikania

| Błąd | Rozwiązanie |
|------|-------------|
| Duplikaty title/description | Unikalne dla każdej strony |
| Keyword stuffing | Naturalne użycie fraz |
| Thin content (<300 słów) | Min. 800-1500 słów dla pillar |
| Brak alt w obrazach | Opisowy alt z frazą kluczową |
| Wolne ładowanie | Optymalizacja obrazów, lazy loading |
| Brak mobile version | Responsive design |
| Kanibalizacja | Jeden URL per intencja |
| Orphan pages | Linkowanie wewnętrzne |
| 404 errors | Redirecty 301 |
| Mixed content (http/https) | Wszystko przez HTTPS |

---

## 13. Narzędzia do monitoringu

| Narzędzie | Użycie |
|-----------|--------|
| **Google Search Console** | Pozycje, CTR, coverage, errors |
| **Google Analytics 4** | Traffic, konwersje, zachowania |
| **Lighthouse** | Performance, accessibility, SEO score |
| **PageSpeed Insights** | Core Web Vitals |
| **Schema Markup Validator** | Walidacja structured data |
| **Screaming Frog** | Audyt techniczny |

---

**Autor:** Claude Code
**Wersja:** 1.0
**Licencja:** Internal use only
