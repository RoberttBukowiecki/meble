# Konfiguracja Vercel - Deployment Protection

Ten dokument opisuje jak skonfigurować Vercel, żeby deploy następował dopiero po przejściu testów w GitHub Actions.

## Architektura

Każda aplikacja ma swój osobny GitHub Check:

| Aplikacja | GitHub Check | Vercel Project |
|-----------|--------------|----------------|
| app | `App CI` | meble-app |
| landing2 | `Landing2 CI` | meble-landing2 |
| payments | `Payments CI` | meble-payments |

**Dzięki temu:**
- Fail w `app` **nie blokuje** deployu `landing2` ani `payments`
- Każda aplikacja jest niezależna

## Konfiguracja krok po kroku

### 1. Otwórz Vercel Dashboard

Przejdź do: https://vercel.com/dashboard

### 2. Dla każdego projektu (app, landing2, payments):

#### A. Wejdź w ustawienia projektu

```
Project → Settings → Git
```

#### B. Znajdź sekcję "Deployment Protection"

Przewiń do sekcji **"Deployment Protection"** lub **"Checks"**.

#### C. Włącz wymagane checki

1. Zaznacz **"Require checks to pass before deploying"**
2. Kliknij **"Add Check"**
3. Wybierz odpowiedni check dla danej aplikacji:

| Projekt Vercel | Wybierz Check |
|----------------|---------------|
| meble-app | `App CI` |
| meble-landing2 | `Landing2 CI` |
| meble-payments | `Payments CI` |

4. Zapisz zmiany

### 3. Powtórz dla każdego projektu

Upewnij się, że każdy projekt Vercel ma skonfigurowany **tylko swój** check.

## Wizualizacja flow

```
Push do repozytorium
        │
        ▼
┌───────────────────────────────────────────────────┐
│              GitHub Actions CI                     │
├─────────────┬─────────────────┬───────────────────┤
│   Test App  │  Test Landing2  │  Test Payments    │
│      │      │        │        │        │          │
│      ▼      │        ▼        │        ▼          │
│   App CI    │   Landing2 CI   │   Payments CI     │
│    ✅/❌    │      ✅/❌      │      ✅/❌        │
└─────┬───────┴────────┬────────┴────────┬──────────┘
      │                │                 │
      ▼                ▼                 ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────────┐
│ Vercel App  │ │Vercel Land2 │ │ Vercel Payments │
│ czeka na    │ │ czeka na    │ │ czeka na        │
│ "App CI"    │ │"Landing2 CI"│ │ "Payments CI"   │
└─────────────┘ └─────────────┘ └─────────────────┘
```

## Przykład: Fail w jednej aplikacji

Jeśli `App CI` failuje:

```
App CI:       ❌ FAILED
Landing2 CI:  ✅ PASSED
Payments CI:  ✅ PASSED

Rezultat:
- meble-app:      ⏸️  BLOCKED (czeka na fix)
- meble-landing2: ✅  DEPLOYED
- meble-payments: ✅  DEPLOYED
```

## Troubleshooting

### Check nie pojawia się w Vercel

1. Upewnij się, że workflow został uruchomiony przynajmniej raz
2. Sprawdź czy GitHub App dla Vercel ma odpowiednie uprawnienia
3. Poczekaj kilka minut - czasem synchronizacja trwa

### Deploy nadal się blokuje

1. Sprawdź czy wybrałeś właściwy check (np. `App CI` a nie `Test App`)
2. Upewnij się, że check kończy się sukcesem (zielona ikonka)

### Chcę wyłączyć protection dla preview

W Vercel Settings możesz skonfigurować osobno:
- **Production** - wymaga checks
- **Preview** - opcjonalnie bez checks (dla szybszych PR previews)

## Dodatkowe zasoby

- [Vercel Deployment Protection Docs](https://vercel.com/docs/security/deployment-protection)
- [GitHub Actions Status Checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
