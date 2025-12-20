# Image Generation Guide for SEO Pages

> Przewodnik generowania obrazów dla stron SEO (blog, pillar pages, landing pages)
> Ostatnia aktualizacja: 2025-12-20

---

## 1. Przegląd systemu

### Architektura:

```
blog-prompts.ts          → Definicje promptów
    ↓
generate-blog-images/    → API Route (Next.js)
    ↓
Google Gemini API        → Generowanie obrazów
    ↓
public/img/              → Zapisane obrazy
├── blog/                → Artykuły blogowe
└── pillar/              → Pillar pages
```

### Pliki:

| Plik | Opis |
|------|------|
| `src/lib/blog-prompts.ts` | Definicje promptów dla wszystkich stron |
| `src/app/api/cron/generate-blog-images/route.ts` | API endpoint do generowania |
| `scripts/trigger-image-gen.sh` | Skrypt CLI do uruchamiania |

---

## 2. Specyfikacje obrazów

### Wymagania techniczne:

| Parametr | Wartość | Powód |
|----------|---------|-------|
| **Format** | WebP | Najlepsza kompresja, wsparcie przeglądarek |
| **Rozmiar** | 1200x675 px | Optymalny dla OG/Twitter cards |
| **Aspect Ratio** | 16:9 | Standard dla social media |
| **Jakość** | 80-85% | Balans jakość/rozmiar pliku |
| **Max rozmiar** | <200 KB | Szybkie ładowanie |

### Użycie w Next.js:

```tsx
import Image from 'next/image';

<Image
  src="/img/pillar/projektowanie-mebli-online.webp"
  alt="Projektowanie mebli online - darmowy projektant 3D"
  width={1200}
  height={675}
  priority // dla above-the-fold
/>
```

---

## 3. Struktura promptów

### Szablon promptu:

```
[SCENA] + [STYL] + [JAKOŚĆ] + [ASPECT RATIO]
```

### Elementy:

| Element | Przykład | Cel |
|---------|----------|-----|
| **Scena** | "Modern home office, person using laptop" | Co jest na obrazie |
| **Szczegóły** | "3D furniture design software on screen" | Kontekst tematyczny |
| **Atmosfera** | "bright minimalist interior, professional" | Nastrój |
| **Styl** | "photorealistic 4k" lub "3D illustration" | Typ grafiki |
| **Jakość** | "high quality, soft natural lighting" | Parametry jakości |
| **Ratio** | "Aspect Ratio 16:9" | Proporcje |

### Przykład kompletnego promptu:

```typescript
'projektowanie-mebli-online':
  'Modern home office, person using laptop with 3D furniture design software on screen, ' +
  'wardrobe blueprint visible, bright minimalist interior, wooden desk, ' +
  'professional but approachable atmosphere, photorealistic 4k, soft natural lighting. Aspect Ratio 16:9',
```

---

## 4. Typy stron i ich prompty

### 4.1 Pillar Pages (SEO landing pages)

**Charakterystyka:**
- Profesjonalne, ale przystępne
- Pokazują produkt/usługę w akcji
- Jasne, nowoczesne wnętrza
- Ludzie używający narzędzia (opcjonalnie)

**Szablon:**

```typescript
PILLAR_PAGE_PROMPTS['nazwa-strony'] =
  '[Scena z człowiekiem używającym produktu], ' +
  '[kontekst branżowy], ' +
  '[atmosfera: bright, modern, professional], ' +
  'photorealistic 4k, soft natural lighting. Aspect Ratio 16:9';
```

**Przykłady:**

```typescript
// Strona o projektowaniu
'projektowanie-mebli-online':
  'Modern home office, person using laptop with 3D furniture design software on screen, ' +
  'wardrobe blueprint visible, bright minimalist interior, wooden desk, ' +
  'professional but approachable atmosphere, photorealistic 4k, soft natural lighting. Aspect Ratio 16:9',

// Strona o zamawianiu
'zamawianie-mebli-online':
  'Furniture warehouse interior, stacks of laminated boards in various colors, ' +
  'delivery truck visible through large windows, worker with tablet checking orders, ' +
  'modern logistics, industrial but clean atmosphere, photorealistic 4k. Aspect Ratio 16:9',
```

### 4.2 Blog Articles

**Charakterystyka:**
- Ilustrują konkretny temat artykułu
- Mogą być bardziej szczegółowe/techniczne
- Często pokazują "jak to zrobić"

**Typy:**

| Typ artykułu | Styl obrazu |
|--------------|-------------|
| Poradnik (how-to) | Osoba wykonująca czynność |
| Porównanie | Split composition, side-by-side |
| Koszty/Finanse | Kalkulator, dokumenty, piggy bank |
| Inspiracje | Piękne wnętrza, gotowe realizacje |
| DIY | Warsztat, narzędzia, atmosfera maker |

**Przykłady:**

```typescript
// Poradnik
'jak-zaprojektowac-szafe-na-wymiar-poradnik':
  'Modern interior design, photo realistic, a person measuring an empty wall alcove for a custom wardrobe, ' +
  'bright room, tape measure, professional tools, 4k, architectural visualization style. Aspect Ratio 16:9',

// Koszty
'ile-kosztuje-szafa-na-wymiar-2024':
  'Conceptual 3D illustration, cost comparison of wardrobes, piggy bank and calculator on a wooden table ' +
  'with furniture blueprints, high quality, soft lighting, financial planning theme. Aspect Ratio 16:9',

// Porównanie
'szafa-wnekowa-czy-wolnostojaca-co-wybrac':
  'Split composition, left side showing a sleek built-in wardrobe seamlessly integrated into wall, ' +
  'right side showing a stylish freestanding wardrobe, interior design comparison, photorealistic 4k. Aspect Ratio 16:9',
```

---

## 5. Dodawanie nowej strony

### Krok 1: Dodaj prompt do `blog-prompts.ts`

```typescript
// Dla pillar page:
export const PILLAR_PAGE_PROMPTS: Record<string, string> = {
  // ... istniejące
  'nowa-strona-seo':
    '[Twój prompt]. Aspect Ratio 16:9',
};

// Dla artykułu:
export const BLOG_IMAGE_PROMPTS: Record<string, string> = {
  // ... istniejące
  'nowy-artykul-slug':
    '[Twój prompt]. Aspect Ratio 16:9',
};
```

### Krok 2: Wygeneruj obraz

```bash
# Z katalogu landing2:
./scripts/trigger-image-gen.sh

# Wybierz:
# - type: pillar (dla pillar pages) lub blog (dla artykułów)
# - limit: 1
# - force: y (jeśli regenerujesz)
```

### Krok 3: Użyj w komponencie

```tsx
// Pillar page
<Image
  src="/img/pillar/nowa-strona-seo.webp"
  alt="[Opisowy alt text z frazą kluczową]"
  width={1200}
  height={675}
/>

// Blog article (już obsługiwane przez blog-data.ts)
image: {
  src: '/img/blog/nowy-artykul-slug.webp',
  alt: {
    pl: 'Polski alt text',
    en: 'English alt text',
  },
},
```

---

## 6. Best Practices dla promptów

### DO (rób):

```
✅ Używaj konkretnych opisów: "person measuring wall with tape measure"
✅ Dodawaj kontekst branżowy: "furniture design", "wardrobe", "workshop"
✅ Określaj atmosferę: "bright", "professional", "cozy"
✅ Zawsze kończyj: "Aspect Ratio 16:9"
✅ Używaj angielskiego w promptach (lepsze wyniki)
```

### DON'T (nie rób):

```
❌ Zbyt ogólne: "furniture image"
❌ Zbyt długie prompty (>500 znaków)
❌ Tekst na obrazie (trudny do kontrolowania)
❌ Skomplikowane sceny z wieloma elementami
❌ Abstrakcyjne koncepty bez wizualnego przedstawienia
```

### Słowa kluczowe do jakości:

```
Fotorealizm:  photorealistic, 4k, high quality, sharp focus
Ilustracja:   3D illustration, conceptual, clean lines
Oświetlenie:  soft natural lighting, studio lighting, ambient
Atmosfera:    professional, modern, cozy, minimalist, industrial
```

---

## 7. Obsługiwane modele

### Aktualny: Google Gemini (Nano Banana)

```typescript
MODEL_NAME = 'gemini-3-pro-image-preview';
```

**Ograniczenia:**
- Aspect ratio w prompt (nie w API config)
- Max ~1024x1024 natywnie (skalowane do 16:9)
- Rate limit: 2s między requestami

### Fallback: placehold.co (mock)

Gdy brak API key, generuje placeholder:

```
https://placehold.co/1200x675/4f46e5/ffffff/webp?text=slug-name
```

---

## 8. Troubleshooting

### Problem: Obraz ma złe proporcje

**Rozwiązanie:** Upewnij się że prompt kończy się "Aspect Ratio 16:9"

### Problem: Obraz jest zbyt generyczny

**Rozwiązanie:** Dodaj więcej szczegółów kontekstowych:
```
❌ "office with computer"
✅ "modern home office, person using laptop with 3D furniture design software visible on screen"
```

### Problem: Obraz nie pasuje do marki

**Rozwiązanie:** Dodaj stałe elementy stylu:
```typescript
const BRAND_STYLE = 'bright minimalist interior, professional atmosphere, soft natural lighting';

// Użycie:
`${scene}, ${BRAND_STYLE}, photorealistic 4k. Aspect Ratio 16:9`
```

### Problem: API zwraca błąd

**Sprawdź:**
1. `NANO_BANANA_API_KEY` w `.env.local`
2. Limit API (rate limiting)
3. Treść promptu (może zawierać zabronione słowa)

---

## 9. Automatyzacja

### Cron job (produkcja):

```typescript
// W Vercel/Next.js można ustawić cron:
// vercel.json lub innne rozwiązanie

// Endpoint:
GET /api/cron/generate-blog-images?key=CRON_SECRET_KEY&type=all&limit=all
```

### CI/CD (GitHub Actions):

```yaml
- name: Generate missing images
  run: |
    curl "${{ secrets.SITE_URL }}/api/cron/generate-blog-images?key=${{ secrets.CRON_KEY }}&type=all&limit=all"
```

---

## 10. Checklist dla nowej strony

- [ ] Prompt dodany do `blog-prompts.ts` (PILLAR_PAGE_PROMPTS lub BLOG_IMAGE_PROMPTS)
- [ ] Prompt kończy się "Aspect Ratio 16:9"
- [ ] Prompt używa angielskiego
- [ ] Obraz wygenerowany (`./scripts/trigger-image-gen.sh`)
- [ ] Plik istnieje w `public/img/pillar/` lub `public/img/blog/`
- [ ] Format: WebP, 1200x675
- [ ] Alt text zdefiniowany (z frazą kluczową)
- [ ] Obraz użyty w komponencie z `priority` jeśli above-the-fold

---

**Autor:** Claude Code
**Wersja:** 1.0
