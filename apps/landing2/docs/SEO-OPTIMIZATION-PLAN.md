# SEO Optimization Plan - Landing2 (e-meble)

## Status: IMPLEMENTED - 2025-12-20

### Co zostało zrobione:
- [x] Title i description strony głównej zaktualizowane (CTR-optimized)
- [x] Pillar page `/projektowanie-mebli-online/` stworzona
- [x] Pillar page `/zamawianie-mebli-online/` stworzona
- [x] Sitemap.ts zaktualizowany o nowe strony
- [x] Footer zaktualizowany z linkami do pillar pages
- [x] Tłumaczenia PL/EN dodane
- [x] Schema.org (HowTo, BreadcrumbList, FAQPage) dodane
- [x] Build zweryfikowany - OK

---

## 1. Analiza obecnego stanu vs GSC

### Dane wejściowe z GSC:

| Zapytanie | Pozycja | CTR | Problem |
|-----------|---------|-----|---------|
| e meble | 5.3 | 0% | Słaby snippet |
| e-meble | 4.0 | 0% | Słaby snippet |
| profesjonalna prezentacja mebli online | 8.5 | 0% | Brak dedykowanej strony |
| projektowanie mebli online | 72.3 | 0% | Brak autorytetu |
| zamawianie mebli online | 79.6 | 0% | Brak strony |

### Obecna struktura URL:
```
/                     → Strona główna (generyczna)
/blog                 → Lista artykułów
/blog/{slug}          → 6 artykułów blogowych
/privacy, /terms, /cookies → Strony prawne
```

### Co brakuje:
- ❌ Brak pillar page `/projektowanie-mebli-online/`
- ❌ Brak strony `/zamawianie-mebli-online/`
- ❌ Snippet strony głównej zbyt generyczny
- ❌ Brak FAQ rich results widocznych w SERP

---

## 2. Docelowa struktura URL (Pillar + Supporting)

```
NOWA ARCHITEKTURA:
==================

/                                    → Landing page (marka "e-meble")
│
├── /projektowanie-mebli-online/     → PILLAR PAGE (główna SEO)
│   │                                   Target: projektowanie mebli online,
│   │                                          zaprojektuj meble,
│   │                                          projektowanie mebli na wymiar online
│   │
│   ├── /blog/jak-zaprojektowac-szafe-na-wymiar-poradnik
│   ├── /blog/jak-zmierzyc-wneke-pod-szafe-krok-po-kroku
│   └── /blog/lista-ciecia-plyt-meblowych-jak-wygenerowac-i-zamowic
│
├── /zamawianie-mebli-online/        → SECONDARY PILLAR
│   │                                   Target: zamawianie mebli online,
│   │                                          proces realizacji
│   │
│   ├── /blog/ile-kosztuje-szafa-na-wymiar-2024
│   └── /blog/meble-diy-od-czego-zaczac-poradnik-dla-poczatkujacych
│
├── /blog/                           → Blog hub (wszystkie artykuły)
│
└── /blog/szafa-wnekowa-czy-wolnostojaca-co-wybrac
                                     → Supporting article
```

---

## 3. Plan zmian snippetów (CTR fix)

### 3.1 Strona główna `/` - Marka "e-meble"

**Obecny title:**
```
Meble - Darmowy Projektant Mebli 3D Online | Oszczędź do 50%
```

**Propozycje nowych title (3 warianty):**
```
1. e-meble | Zaprojektuj meble 3D za darmo → Oszczędź 50%
2. e-meble: Darmowy konfigurator mebli 3D | Lista cięcia + Wycena
3. e-meble – Projektant mebli online | 3D + CSV do hurtowni
```

**Obecna description:**
```
Zaprojektuj meble na wymiar w 3D za darmo...
```

**Propozycje nowych description (2 warianty):**
```
1. Projektuj szafy, komody i regały w 3D za darmo. Generuj listę cięcia CSV,
   zamów płyty z hurtowni i zaoszczędź nawet 50%. Bez rejestracji, od razu w przeglądarce.

2. Stwórz meble na wymiar w przeglądarce. Darmowy projektant 3D z eksportem
   do produkcji (CSV). Ponad 2000 użytkowników oszczędziło średnio 3500 zł.
```

### 3.2 Nowa strona `/projektowanie-mebli-online/`

**Title:**
```
Projektowanie mebli online | Darmowy projektant 3D → e-meble
```

**Description:**
```
Zaprojektuj szafę, komodę lub regał online w 5 minut. Bezpłatny projektant
3D z listą cięcia do hurtowni. Oszczędź do 50% kosztów stolarza.
```

**H1:**
```
Projektowanie mebli online – od pomysłu do realizacji
```

**Struktura H2/H3:**
```
H1: Projektowanie mebli online – od pomysłu do realizacji

  H2: Jak działa projektant mebli 3D?
    H3: Krok 1: Wybierz typ mebla
    H3: Krok 2: Dostosuj wymiary
    H3: Krok 3: Pobierz listę cięcia

  H2: Co możesz zaprojektować online?
    H3: Szafy wnękowe i wolnostojące
    H3: Komody i regały
    H3: Meble kuchenne

  H2: Dlaczego projektować meble samodzielnie?
    H3: Oszczędność do 50%
    H3: Pełna kontrola nad projektem
    H3: Bez pośredników

  H2: Często zadawane pytania (FAQ)
    - Czy projektowanie jest naprawdę darmowe?
    - Jak zamówić płyty do mojego projektu?
    - Czy potrzebuję doświadczenia w projektowaniu?
```

### 3.3 Nowa strona `/zamawianie-mebli-online/`

**Title:**
```
Zamawianie mebli online | Jak kupić meble na wymiar → e-meble
```

**Description:**
```
Zamów meble na wymiar online krok po kroku. Od projektu 3D przez wycenę
do dostawy płyt. Sprawdź jak oszczędzić na meblach bez stolarza.
```

---

## 4. Zadania implementacyjne

### Faza 1: Snippety (natychmiastowy wpływ na CTR)

| # | Zadanie | Plik | Priorytet |
|---|---------|------|-----------|
| 1.1 | Zmień title strony głównej | `layout.tsx` / `seo.ts` | 🔴 HIGH |
| 1.2 | Zmień description strony głównej | `layout.tsx` / `seo.ts` | 🔴 HIGH |
| 1.3 | Dodaj liczby do FAQ (social proof) | `messages/pl.json` | 🟡 MED |
| 1.4 | Dodaj "e-meble" jako brand name wszędzie | `seo.ts`, `layout.tsx` | 🔴 HIGH |

### Faza 2: Nowe pillar pages

| # | Zadanie | Ścieżka | Priorytet |
|---|---------|---------|-----------|
| 2.1 | Stwórz `/projektowanie-mebli-online/` | `app/[locale]/projektowanie-mebli-online/page.tsx` | 🔴 HIGH |
| 2.2 | Stwórz `/zamawianie-mebli-online/` | `app/[locale]/zamawianie-mebli-online/page.tsx` | 🟡 MED |
| 2.3 | Dodaj strony do sitemap | `sitemap.ts` | 🔴 HIGH |
| 2.4 | Dodaj do nawigacji (footer) | `Footer.tsx` | 🟢 LOW |

### Faza 3: Linkowanie wewnętrzne

| # | Zadanie | Szczegóły |
|---|---------|-----------|
| 3.1 | Blog → Pillar links | Każdy artykuł linkuje do `/projektowanie-mebli-online/` |
| 3.2 | Pillar → Blog links | Sekcja "Powiązane poradniki" |
| 3.3 | Strona główna → Pillar | CTA prowadzi do pillar page |

### Faza 4: Schema.org / Rich Results

| # | Zadanie | Schema Type |
|---|---------|-------------|
| 4.1 | Dodaj HowTo schema do pillar page | `HowTo` |
| 4.2 | Rozszerz FAQ na stronie głównej | `FAQPage` (już jest) |
| 4.3 | Dodaj BreadcrumbList do pillar | `BreadcrumbList` |

---

## 5. Techniczne SEO - poprawki

### 5.1 Canonical "e meble" vs "e-meble"

```typescript
// W layout.tsx - upewnij się że canonical zawsze używa "e-meble"
// Brak problemu - domena to meble.app, nie e-meble.app
// Ale brand name powinien być spójny: "e-meble"
```

**Decyzja:** Używaj "e-meble" (z myślnikiem) jako oficjalnej nazwy marki.

### 5.2 Sitemap updates

Dodaj do `sitemap.ts`:
```typescript
// Nowe strony:
{ url: '/projektowanie-mebli-online/', priority: 0.95, changefreq: 'weekly' },
{ url: '/zamawianie-mebli-online/', priority: 0.85, changefreq: 'monthly' },
```

### 5.3 Internal linking audit

Sprawdzić czy:
- [ ] Artykuły blogowe linkują do pillar pages
- [ ] Pillar pages linkują do artykułów
- [ ] Strona główna linkuje do obu pillar pages
- [ ] Anchory są zróżnicowane (nie zawsze "projektowanie mebli online")

---

## 6. Mapowanie zapytań → strony docelowe

| Zapytanie GSC | Obecna strona | Docelowa strona | Akcja |
|---------------|---------------|-----------------|-------|
| e meble | `/` | `/` | Popraw snippet |
| e-meble | `/` | `/` | Popraw snippet (canonical) |
| projektowanie mebli online | `/` | `/projektowanie-mebli-online/` | NOWA STRONA |
| projektowanie mebli na wymiar online | `/` | `/projektowanie-mebli-online/` | NOWA STRONA |
| zaprojektuj meble online | `/` | `/projektowanie-mebli-online/` | NOWA STRONA |
| zaprojektuj meble | `/` | `/projektowanie-mebli-online/` | NOWA STRONA |
| zamawianie mebli online | brak | `/zamawianie-mebli-online/` | NOWA STRONA |
| profesjonalna prezentacja mebli online | `/` | `/projektowanie-mebli-online/` | Sekcja na pillar |
| projektowanie szafy online za darmo | blog | `/projektowanie-mebli-online/` + blog | Link cluster |

---

## 7. Mierzenie efektów

### KPIs do śledzenia w GSC (co tydzień):

1. **CTR dla "e meble" / "e-meble"** - cel: >5% w 30 dni
2. **Pozycja dla "projektowanie mebli online"** - cel: <30 w 60 dni
3. **Kliknięcia ogółem** - cel: +50% w 90 dni
4. **Wyświetlenia ogółem** - cel: +100% w 60 dni

### Narzędzia:
- Google Search Console (tygodniowy przegląd)
- Google Analytics 4 (landing page performance)

---

## 8. Timeline wdrożenia

```
TYDZIEŃ 1: Snippety
├── Dzień 1-2: Zmiana title/description strony głównej
├── Dzień 3: Aktualizacja brand name "e-meble"
└── Dzień 4-5: Deploy + Request indexing w GSC

TYDZIEŃ 2-3: Pillar Page "projektowanie"
├── Dzień 1-3: Implementacja strony
├── Dzień 4-5: Content + FAQ
├── Dzień 6-7: Schema.org + internal links
└── Dzień 8-10: Testy + Deploy

TYDZIEŃ 4: Pillar Page "zamawianie"
├── Podobny proces

TYDZIEŃ 5: Linkowanie + monitoring
├── Internal linking audit
├── Pierwszy pomiar CTR
└── Korekty jeśli potrzebne
```

---

## 9. Checklist przed wdrożeniem

- [ ] Backup obecnych meta tagów
- [ ] Przygotowanie nowych stron w branch
- [ ] Testy hreflang dla nowych URL
- [ ] Weryfikacja canonical tags
- [ ] Sitemap regeneration
- [ ] Request indexing po deploy

---

## Załączniki

### A. Obecne słowa kluczowe z `seo.ts`:

```
Primary PL: projektowanie mebli 3D, meble na wymiar, projektant mebli online,
            konfigurator mebli, lista cięcia mebli
```

### B. Propozycja rozszerzenia keywords dla pillar page:

```
Dodatkowe: zaprojektuj meble, projektowanie mebli na wymiar,
           darmowy projektant mebli, meble online projektowanie,
           konfigurator szaf online, projektuj meble 3D
```

---

**Autor:** Claude Code
**Data:** 2025-12-20
**Status:** Oczekuje na akceptację