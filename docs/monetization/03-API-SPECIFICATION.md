# Specyfikacja API

## 1. Przegląd endpointów

```
┌─────────────────────────────────────────────────────────────┐
│                    API ENDPOINTS MAP                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  /api/                                                      │
│  ├── credits/                    # System kredytów          │
│  │   ├── GET    /                # Pobierz saldo            │
│  │   ├── POST   /use             # Zużyj kredyt             │
│  │   └── GET    /session/:hash   # Sprawdź sesję            │
│  │                                                          │
│  ├── guest/                      # Kredyty gości            │
│  │   ├── GET    /credits         # Saldo (by session_id)    │
│  │   ├── POST   /credits/use     # Zużyj kredyt             │
│  │   └── POST   /recover         # Odzyskaj przez email     │
│  │                                                          │
│  ├── payments/                   # Płatności                │
│  │   ├── POST   /create          # Utwórz płatność          │
│  │   ├── GET    /:id/status      # Status płatności         │
│  │   └── POST   /verify          # Weryfikuj (P24)          │
│  │                                                          │
│  ├── webhooks/                   # Webhooki                 │
│  │   ├── POST   /payu            # PayU notifications       │
│  │   └── POST   /p24             # Przelewy24 notifications │
│  │                                                          │
│  ├── export/                     # Eksport                  │
│  │   ├── POST   /                # Eksportuj projekt        │
│  │   ├── GET    /:token          # Pobierz eksport (guest)  │
│  │   └── POST   /preview         # Podgląd (z watermark)    │
│  │                                                          │
│  ├── orders/                     # Zamówienia               │
│  │   ├── GET    /                # Lista zamówień           │
│  │   ├── POST   /                # Utwórz zamówienie        │
│  │   ├── GET    /:id             # Szczegóły                │
│  │   ├── PATCH  /:id             # Aktualizuj               │
│  │   └── POST   /:id/pay         # Zapłać                   │
│  │                                                          │
│  ├── producers/                  # Producenci               │
│  │   ├── GET    /                # Lista producentów        │
│  │   ├── GET    /:id             # Szczegóły                │
│  │   └── POST   /:id/quote       # Pobierz wycenę           │
│  │                                                          │
│  ├── shop/                       # Sklep                    │
│  │   ├── GET    /products        # Lista produktów          │
│  │   ├── GET    /products/:slug  # Szczegóły produktu       │
│  │   ├── GET    /recommendations # Rekomendacje             │
│  │   ├── GET    /cart            # Koszyk                   │
│  │   ├── POST   /cart            # Dodaj do koszyka         │
│  │   ├── PATCH  /cart/:id        # Zmień ilość              │
│  │   └── DELETE /cart/:id        # Usuń z koszyka           │
│  │                                                          │
│  └── tenant/                     # Multi-tenant             │
│      ├── GET    /                # Konfiguracja tenanta     │
│      └── GET    /materials       # Materiały tenanta        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Kredyty - zalogowani użytkownicy

### GET /api/credits

Pobierz saldo kredytów zalogowanego użytkownika.

**Headers:**
```
Authorization: Bearer <supabase_access_token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "totalCredits": 20,
    "usedCredits": 5,
    "availableCredits": 15,
    "hasUnlimited": false,
    "unlimitedExpiresAt": null,
    "packages": [
      {
        "id": "uuid",
        "type": "standard",
        "total": 20,
        "used": 5,
        "remaining": 15,
        "validUntil": null,
        "purchasedAt": "2024-12-10T10:00:00Z"
      }
    ]
  }
}
```

**Response 401:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Wymagane zalogowanie"
  }
}
```

---

### POST /api/credits/use

Zużyj kredyt na eksport.

**Headers:**
```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

**Request:**
```json
{
  "projectHash": "a1b2c3d4e5f6g7h8"
}
```

**Response 200 (nowy kredyt zużyty):**
```json
{
  "success": true,
  "data": {
    "creditUsed": true,
    "sessionId": "uuid",
    "sessionExpiresAt": "2024-12-15T14:00:00Z",
    "creditsRemaining": 14,
    "message": "Kredyt zużyty, sesja aktywna 24h"
  }
}
```

**Response 200 (re-export w sesji):**
```json
{
  "success": true,
  "data": {
    "creditUsed": false,
    "sessionId": "uuid",
    "sessionExpiresAt": "2024-12-15T14:00:00Z",
    "creditsRemaining": 15,
    "message": "Darmowy re-export (sesja aktywna)"
  }
}
```

**Response 402:**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Brak dostępnych kredytów",
    "data": {
      "creditsRemaining": 0,
      "packages": [
        { "id": "starter", "name": "Starter", "credits": 5, "price": 1900 },
        { "id": "standard", "name": "Standard", "credits": 20, "price": 4900 }
      ]
    }
  }
}
```

---

### GET /api/credits/session/:hash

Sprawdź czy istnieje aktywna sesja dla projektu.

**Headers:**
```
Authorization: Bearer <supabase_access_token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "hasActiveSession": true,
    "session": {
      "id": "uuid",
      "expiresAt": "2024-12-15T14:00:00Z",
      "exportsCount": 3
    }
  }
}
```

---

## 3. Kredyty - goście

### GET /api/guest/credits

Pobierz saldo kredytów gościa.

**Headers:**
```
X-Session-ID: <localStorage_session_id>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "sessionId": "abc123xyz",
    "availableCredits": 3,
    "expiresAt": "2024-01-14T10:00:00Z",
    "email": "user@example.com",
    "canRecover": true
  }
}
```

**Response 404:**
```json
{
  "success": false,
  "error": {
    "code": "NO_CREDITS",
    "message": "Brak kredytów dla tej sesji"
  }
}
```

---

### POST /api/guest/credits/use

Zużyj kredyt gościa.

**Headers:**
```
X-Session-ID: <localStorage_session_id>
Content-Type: application/json
```

**Request:**
```json
{
  "projectHash": "a1b2c3d4e5f6g7h8"
}
```

**Response:** (taki sam jak dla zalogowanych)

---

### POST /api/guest/recover

Odzyskaj kredyty przez email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "message": "Link do odzyskania kredytów wysłany na email",
    "creditsFound": 5
  }
}
```

---

## 4. Płatności

### POST /api/payments/create

Utwórz nową płatność.

**Headers (opcjonalnie):**
```
Authorization: Bearer <supabase_access_token>
X-Session-ID: <localStorage_session_id>
Content-Type: application/json
```

**Request (zakup kredytów):**
```json
{
  "type": "credit_purchase",
  "provider": "payu",
  "packageId": "standard",
  "email": "user@example.com",
  "returnUrl": "https://meblarz.pl/export?payment=success"
}
```

**Request (płatność za zamówienie):**
```json
{
  "type": "order",
  "provider": "przelewy24",
  "orderId": "uuid",
  "returnUrl": "https://meblarz.pl/orders/ORD-2024-001234"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "paymentId": "uuid",
    "externalOrderId": "PAY-1702561234-abc123",
    "redirectUrl": "https://secure.payu.com/pay?orderId=xxx",
    "provider": "payu",
    "amount": 4900,
    "currency": "PLN"
  }
}
```

**Response 400:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PACKAGE",
    "message": "Nieprawidłowy pakiet kredytów"
  }
}
```

---

### GET /api/payments/:id/status

Pobierz status płatności.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "paymentId": "uuid",
    "status": "completed",
    "amount": 4900,
    "currency": "PLN",
    "provider": "payu",
    "completedAt": "2024-12-14T12:30:00Z",
    "creditsGranted": 20
  }
}
```

---

## 5. Webhooki

### POST /api/webhooks/payu

Webhook PayU.

**Headers:**
```
Content-Type: application/json
OpenPayU-Signature: signature=xxx;algorithm=SHA-256
```

**Request (PayU notification):**
```json
{
  "order": {
    "orderId": "WZHF5FFDRJ140731GUEST000P01",
    "extOrderId": "PAY-1702561234-abc123",
    "orderCreateDate": "2024-12-14T12:00:00.000+01:00",
    "customerIp": "127.0.0.1",
    "status": "COMPLETED",
    "totalAmount": "4900",
    "currencyCode": "PLN"
  }
}
```

**Response 200:**
```
OK
```

---

### POST /api/webhooks/p24

Webhook Przelewy24.

**Request:**
```json
{
  "merchantId": 12345,
  "posId": 12345,
  "sessionId": "PAY-1702561234-abc123",
  "amount": 4900,
  "originAmount": 4900,
  "currency": "PLN",
  "orderId": 987654321,
  "methodId": 25,
  "statement": "Meblarz - pakiet Standard",
  "sign": "abc123signature"
}
```

**Response 200:**
```json
{
  "error": 0
}
```

---

## 6. Eksport

### POST /api/export

Eksportuj projekt do CSV.

**Headers:**
```
Authorization: Bearer <supabase_access_token>
-- lub --
X-Session-ID: <localStorage_session_id>
Content-Type: application/json
```

**Request:**
```json
{
  "project": {
    "parts": [...],
    "materials": [...],
    "furnitures": [...]
  },
  "options": {
    "columns": ["furniture", "friendly_part_id", "part_name", "material", "thickness_mm", "length_x_mm", "width_y_mm"],
    "separator": ";",
    "includeHeader": true
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "csv": "furniture;friendly_part_id;part_name;...\nSzafka;szafka-bok-lewy;Bok lewy;...",
    "filename": "meblarz_export_2024-12-14.csv",
    "partsCount": 12,
    "creditUsed": true,
    "creditsRemaining": 14,
    "sessionExpiresAt": "2024-12-15T14:00:00Z"
  }
}
```

**Response 402:**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Brak kredytów",
    "data": {
      "packages": [...]
    }
  }
}
```

---

### POST /api/export/preview

Podgląd eksportu (z watermarkiem, bez zużywania kredytów).

**Request:**
```json
{
  "project": {...},
  "options": {...}
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "preview": "=== PODGLĄD - PEŁNA WERSJA PO ZAKUPIE ===\nfurniture;part_name;...\nSzafka;Bok lewy;...\n...\n=== POKAZANO 5 z 12 CZĘŚCI ===",
    "totalParts": 12,
    "previewParts": 5
  }
}
```

---

### GET /api/export/:token

Pobierz eksport gościa przez token.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "csv": "...",
    "filename": "meblarz_export_2024-12-14.csv",
    "expiresAt": "2024-01-14T10:00:00Z"
  }
}
```

---

## 7. Zamówienia

### GET /api/orders

Lista zamówień użytkownika.

**Headers:**
```
Authorization: Bearer <supabase_access_token>
```

**Query params:**
```
?status=paid,processing,shipped
&page=1
&limit=10
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "orderNumber": "ORD-2024-001234",
        "status": "processing",
        "producer": {
          "id": "uuid",
          "name": "Drewnoland",
          "logo": "https://..."
        },
        "total": 125000,
        "currency": "PLN",
        "itemsCount": 12,
        "createdAt": "2024-12-10T10:00:00Z",
        "estimatedDelivery": "2024-12-20"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "pages": 1
    }
  }
}
```

---

### POST /api/orders

Utwórz zamówienie.

**Request:**
```json
{
  "producerId": "uuid",
  "project": {
    "parts": [...],
    "materials": [...]
  },
  "services": {
    "cutting": true,
    "edging": ["top", "bottom"]
  },
  "deliveryAddress": {
    "name": "Jan Kowalski",
    "street": "ul. Przykładowa 1",
    "city": "Warszawa",
    "postalCode": "00-001",
    "phone": "+48123456789"
  },
  "notes": "Proszę o kontakt przed dostawą"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "orderNumber": "ORD-2024-001235",
      "status": "draft",
      "subtotal": 120000,
      "shipping": 5000,
      "total": 125000,
      "currency": "PLN",
      "items": [...],
      "estimatedDelivery": "2024-12-20"
    }
  }
}
```

---

### POST /api/producers/:id/quote

Pobierz wycenę od producenta.

**Request:**
```json
{
  "project": {
    "parts": [...],
    "materials": [...]
  },
  "services": {
    "cutting": true,
    "edging": true
  },
  "deliveryPostalCode": "00-001"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "quote": {
      "producerId": "uuid",
      "validUntil": "2024-12-15T23:59:59Z",
      "items": [
        {
          "partId": "part-1",
          "materialCode": "H3700-ST10",
          "dimensions": { "length": 800, "width": 400, "thickness": 18 },
          "unitPrice": 4500,
          "quantity": 2,
          "totalPrice": 9000,
          "services": [
            { "type": "cutting", "price": 0, "included": true },
            { "type": "edging", "sides": 2, "price": 800 }
          ]
        }
      ],
      "subtotal": 120000,
      "shipping": 5000,
      "estimatedDelivery": "2024-12-20",
      "total": 125000
    }
  }
}
```

---

## 8. Sklep

### GET /api/shop/products

Lista produktów.

**Query params:**
```
?category=prowadnice
&tags=has_drawers,kitchen
&page=1
&limit=20
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "slug": "prowadnica-blum-tandem-350",
        "name": "Prowadnica Blum TANDEM 350mm",
        "shortDescription": "Ciche domykanie, pełny wysuw",
        "price": 8900,
        "compareAtPrice": 9900,
        "currency": "PLN",
        "category": "prowadnice",
        "imageUrl": "https://...",
        "inStock": true,
        "rating": 4.8,
        "reviewsCount": 124
      }
    ],
    "pagination": {...}
  }
}
```

---

### GET /api/shop/recommendations

Rekomendacje na podstawie projektu.

**Request:**
```json
{
  "projectAnalysis": {
    "hasDrawers": true,
    "hasCabinets": true,
    "hasKitchen": true,
    "totalParts": 25,
    "categories": ["kitchen", "drawers"]
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "product": {...},
        "reason": "Twój projekt zawiera szuflady",
        "relevanceScore": 0.95
      }
    ]
  }
}
```

---

### POST /api/shop/cart

Dodaj do koszyka.

**Headers:**
```
Authorization: Bearer <supabase_access_token>
-- lub --
X-Session-ID: <localStorage_session_id>
```

**Request:**
```json
{
  "productId": "uuid",
  "quantity": 2,
  "variant": {
    "Kolor": "Chrom",
    "Rozmiar": "350mm"
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "cartItem": {
      "id": "uuid",
      "product": {...},
      "quantity": 2,
      "variant": {...},
      "lineTotal": 17800
    },
    "cartTotal": 35600,
    "cartItemsCount": 3
  }
}
```

---

## 9. Tenant

### GET /api/tenant

Pobierz konfigurację aktualnego tenanta.

**Response 200 (subdomain: plytymax.meblarz.pl):**
```json
{
  "success": true,
  "data": {
    "tenant": {
      "id": "plytymax",
      "companyName": "PłytyMax",
      "branding": {
        "logo": "https://...",
        "primaryColor": "#2563eb",
        "secondaryColor": "#1e40af",
        "favicon": "https://..."
      },
      "features": {
        "customMaterials": true,
        "ordersEnabled": true,
        "shopSource": "tenant"
      }
    }
  }
}
```

**Response 200 (no tenant - main app):**
```json
{
  "success": true,
  "data": {
    "tenant": null
  }
}
```

---

### GET /api/tenant/materials

Pobierz materiały tenanta.

**Query params:**
```
?category=board
&search=egger
&inStock=true
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "materials": [
      {
        "id": "uuid",
        "code": "H3700-ST10",
        "name": "Egger Natural Halifax Oak",
        "category": "board",
        "thickness": 18,
        "color": "#8B7355",
        "textureUrl": "https://...",
        "pricePerM2": 12500,
        "currency": "PLN",
        "inStock": true,
        "manufacturer": "Egger"
      }
    ]
  }
}
```

---

## 10. Kody błędów

| Kod | HTTP | Opis |
|-----|------|------|
| `UNAUTHORIZED` | 401 | Brak autoryzacji |
| `FORBIDDEN` | 403 | Brak uprawnień |
| `NOT_FOUND` | 404 | Nie znaleziono zasobu |
| `VALIDATION_ERROR` | 400 | Błąd walidacji |
| `INSUFFICIENT_CREDITS` | 402 | Brak kredytów |
| `PAYMENT_FAILED` | 402 | Płatność nieudana |
| `INVALID_PACKAGE` | 400 | Nieprawidłowy pakiet |
| `SESSION_EXPIRED` | 410 | Sesja wygasła |
| `PRODUCER_UNAVAILABLE` | 503 | Producent niedostępny |
| `QUOTE_EXPIRED` | 410 | Wycena wygasła |
| `RATE_LIMIT` | 429 | Zbyt wiele żądań |
| `SERVER_ERROR` | 500 | Błąd serwera |

---

*Następny dokument: [04-PAYMENT-INTEGRATION.md](./04-PAYMENT-INTEGRATION.md)*
