# Dokumentacja Monetyzacji Meblarz

## Spis dokumentów

| Dokument | Opis |
|----------|------|
| [01-OVERVIEW.md](./01-OVERVIEW.md) | Przegląd modeli biznesowych |
| [02-DATABASE-SCHEMA.md](./02-DATABASE-SCHEMA.md) | Schemat bazy danych Supabase |
| [03-API-SPECIFICATION.md](./03-API-SPECIFICATION.md) | Specyfikacja endpointów API |
| [04-PAYMENT-INTEGRATION.md](./04-PAYMENT-INTEGRATION.md) | Integracja PayU/Przelewy24 |
| [05-GUEST-MONETIZATION.md](./05-GUEST-MONETIZATION.md) | Monetyzacja niezalogowanych |
| [06-TENANT-SYSTEM.md](./06-TENANT-SYSTEM.md) | System white-label dla tenantów |
| [07-IMPLEMENTATION-ROADMAP.md](./07-IMPLEMENTATION-ROADMAP.md) | Szczegółowy plan implementacji |

## Pliki konfiguracyjne

| Plik | Lokalizacja | Opis |
|------|-------------|------|
| `monetization.config.ts` | `packages/config/` | Główna konfiguracja monetyzacji |
| `payment-providers.config.ts` | `packages/config/` | Konfiguracja providerów płatności |
| `pricing.config.ts` | `packages/config/` | Cennik pakietów i produktów |
| `tenant.config.ts` | `packages/config/` | Konfiguracja multi-tenant |

## Szybki start

```bash
# 1. Uruchom migracje bazy danych
pnpm supabase migration up

# 2. Skonfiguruj zmienne środowiskowe
cp apps/payments/.env.example apps/payments/.env.local

# 3. Uruchom aplikację
pnpm dev
```

---

*Ostatnia aktualizacja: 14 grudnia 2025*
