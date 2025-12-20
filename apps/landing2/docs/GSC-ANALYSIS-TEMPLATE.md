# Google Search Console - Szablon Analizy

> Używaj tego dokumentu przy każdej analizie danych z GSC.
> Claude Code powinien wracać do tego szablonu gdy prosisz o analizę SEO.

---

## Instrukcja dla Claude Code

Gdy użytkownik prosi o analizę danych z Google Search Console:

1. **Poproś o dane** w formacie tabeli (lub wklej screenshot)
2. **Wypełnij sekcje** poniżej na podstawie danych
3. **Zaproponuj konkretne akcje** z priorytetami
4. **Zaktualizuj historię** na końcu dokumentu

---

## 1. Dane wejściowe

### Okres analizy:
- **Data początkowa:** [YYYY-MM-DD]
- **Data końcowa:** [YYYY-MM-DD]
- **Porównanie z:** [poprzedni okres / rok temu]

### Surowe dane z GSC:

| Zapytanie | Kliknięcia | Wyświetlenia | CTR | Śr. pozycja |
|-----------|------------|--------------|-----|-------------|
| | | | | |
| | | | | |
| | | | | |

---

## 2. Kategoryzacja zapytań

### A. Quick Wins (pozycja 1-10, CTR < 5%)
> Strona rankuje, ale nikt nie klika = problem ze snippetem

| Zapytanie | Pozycja | CTR | Akcja |
|-----------|---------|-----|-------|
| | | | |

**Priorytet:** 🔴 WYSOKI - natychmiastowy wpływ

### B. Low Hanging Fruit (pozycja 11-20)
> Blisko TOP10, potrzebne wzmocnienie treści

| Zapytanie | Pozycja | Wyświetlenia | Akcja |
|-----------|---------|--------------|-------|
| | | | |

**Priorytet:** 🟡 ŚREDNI - wymaga pracy nad treścią

### C. Nowe możliwości (pozycja 21-50)
> Google widzi stronę, ale nie uznaje za autorytet

| Zapytanie | Pozycja | Wyświetlenia | Akcja |
|-----------|---------|--------------|-------|
| | | | |

**Priorytet:** 🟢 NISKI - długoterminowa strategia

### D. Brand queries
> Zapytania z nazwą marki

| Zapytanie | Pozycja | CTR | Status |
|-----------|---------|-----|--------|
| | | | |

---

## 3. Analiza kanibalizacji

### Sprawdź w GSC: Pages → filtruj po zapytaniu

| Zapytanie | URL 1 | URL 2 | Decyzja |
|-----------|-------|-------|---------|
| | | | MERGE / REDIRECT / KEEP |

### Reguły decyzji:
- **MERGE** - połącz treść w jedną stronę, 301 z drugiej
- **REDIRECT** - jedna strona jest wyraźnie lepsza
- **KEEP** - różne intencje użytkownika

---

## 4. Analiza CTR vs Pozycja

### Benchmark CTR według pozycji:

| Pozycja | Oczekiwany CTR | Twój CTR | Status |
|---------|----------------|----------|--------|
| 1 | 25-35% | | |
| 2 | 15-20% | | |
| 3 | 10-15% | | |
| 4-5 | 5-10% | | |
| 6-10 | 2-5% | | |

### Jeśli CTR poniżej benchmarku:
1. Sprawdź title - czy zawiera USP?
2. Sprawdź description - czy ma call-to-action?
3. Sprawdź SERP - czy konkurencja ma rich results?
4. Rozważ A/B test snippetów

---

## 5. Mapowanie zapytań → strony

### Obecne mapowanie:

| Zapytanie | Obecna strona | Docelowa strona | Akcja |
|-----------|---------------|-----------------|-------|
| | | | |

### Brakujące strony:

| Zapytanie | Wyświetlenia | Sugerowany URL | Typ strony |
|-----------|--------------|----------------|------------|
| | | | pillar/blog/landing |

---

## 6. Plan działań

### Tydzień 1 - Quick Wins (CTR):

| # | Akcja | Zapytanie | Oczekiwany efekt |
|---|-------|-----------|------------------|
| 1 | | | |
| 2 | | | |

### Tydzień 2-3 - Treść (pozycje 11-20):

| # | Akcja | Zapytanie | Oczekiwany efekt |
|---|-------|-----------|------------------|
| 1 | | | |
| 2 | | | |

### Miesiąc 2+ - Nowe strony:

| # | Akcja | Zapytania docelowe | Typ strony |
|---|-------|-------------------|------------|
| 1 | | | |
| 2 | | | |

---

## 7. KPIs do monitorowania

### Tygodniowo:

| Metryka | Wartość bazowa | Cel | Aktualnie |
|---------|----------------|-----|-----------|
| Łączne kliknięcia | | +20% | |
| Łączne wyświetlenia | | +30% | |
| Średni CTR | | >3% | |
| Zapytania w TOP10 | | +5 | |

### Miesięcznie:

| Metryka | Wartość bazowa | Cel | Aktualnie |
|---------|----------------|-----|-----------|
| Zapytania w TOP3 | | +3 | |
| Strony indeksowane | | 100% | |
| Core Web Vitals | | Pass | |

---

## 8. Checklist po analizie

- [ ] Quick wins zidentyfikowane i zaplanowane
- [ ] Snippety do poprawy wylistowane
- [ ] Kanibalizacje rozwiązane lub zaplanowane
- [ ] Nowe strony zaproponowane
- [ ] KPIs zaktualizowane
- [ ] Następna analiza zaplanowana (za 2 tygodnie)

---

## 9. Historia analiz

### [DATA] - Analiza #X

**Kluczowe wnioski:**
-

**Podjęte akcje:**
-

**Wyniki (po 2 tygodniach):**
-

---

### 2025-12-20 - Analiza #1 (Baseline)

**Kluczowe wnioski:**
- CTR = 0% dla wszystkich zapytań mimo pozycji 4-9
- Brak pillar pages dla kluczowych fraz
- Title zbyt generyczny, brak USP
- Zapytania "e meble" i "e-meble" konkurują

**Podjęte akcje:**
- [x] Zmieniono title na CTR-optimized
- [x] Stworzono `/projektowanie-mebli-online/` (pillar)
- [x] Stworzono `/zamawianie-mebli-online/` (pillar)
- [x] Dodano Schema.org (HowTo, FAQ)
- [x] Zaktualizowano sitemap i footer

**Wyniki (sprawdzić za 2-4 tygodnie):**
- CTR dla "e meble": ___ (było 0%)
- Pozycja dla "projektowanie mebli online": ___ (było 72)
- Nowe zapytania w TOP10: ___

---

## 10. Notatki dla Claude Code

### Gdy analizujesz dane:

1. **Najpierw kategoryzuj** zapytania (A/B/C/D powyżej)
2. **Szukaj wzorców** - czy wiele zapytań ma ten sam problem?
3. **Priorytetyzuj** - CTR fix > nowa treść > nowe strony
4. **Bądź konkretny** - "zmień title z X na Y", nie "popraw title"
5. **Proponuj mierzalne cele** - "+5% CTR w 4 tygodnie"

### Gdy proponujesz zmiany:

1. Sprawdź obecną strukturę strony (czy istnieje pillar page?)
2. Sprawdź czy artykuł blogowy już pokrywa temat
3. Zaproponuj exact match snippetów (title + description)
4. Uwzględnij Schema.org dla nowych stron
5. Zaplanuj linkowanie wewnętrzne

### Typowe akcje:

| Problem | Rozwiązanie |
|---------|-------------|
| CTR < benchmark | Przepisz title/description |
| Pozycja 11-20 | Rozbuduj treść, dodaj FAQ |
| Pozycja 21-50 | Stwórz dedykowaną stronę |
| Kanibalizacja | 301 redirect + merge content |
| Brak strony | Nowy pillar lub blog article |

---

**Ostatnia aktualizacja:** 2025-12-20
**Następna zaplanowana analiza:** [za 2 tygodnie]
