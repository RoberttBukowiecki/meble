# Meble Database Structure

Supabase Project: **Meble** (`lqwdhiyozxgtovecvxaw`)
Region: `eu-central-2`
Postgres Version: 17.6.1

## Overview

The database is organized into logical domains supporting the furniture design application:

```
                    +-----------------+
                    |   auth.users    |
                    +--------+--------+
                             |
              +--------------+---------------+
              |                              |
    +---------v---------+         +----------v---------+
    |    profiles       |         |   guest_credits    |
    +-------------------+         +--------------------+
              |                              |
              |         +---------+          |
              +-------->| exports |<---------+
                        +---------+
                             |
              +--------------+--------------+
              |              |              |
        +-----v----+  +------v-----+  +-----v-----+
        |  shop    |  | producers  |  |  tenants  |
        +----------+  +------------+  +-----------+
```

---

## 1. User System

### `auth.users` (Supabase Auth)
Core authentication managed by Supabase. Stores user credentials, sessions, MFA.

### `public.profiles`
Extended user profiles linked to auth.users (1:1). Includes admin role management.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | FK to auth.users.id (PK) |
| full_name | text | Full name |
| display_name | text | Display name |
| email | text | Email (unique) |
| tenant_id | uuid | FK to tenants (for B2B users) |
| preferred_locale | text | Default: 'pl' |
| is_beta_tester | boolean | Beta access flag |
| is_active | boolean | Account status |
| login_count | integer | Login tracking |
| registration_source | text | 'direct', etc. |
| **role** | text | User role: `user` (default), `admin`, `super_admin` |
| **admin_permissions** | jsonb | Granular admin permissions (default: `{}`) |

---

## 2. Credits & Export System

### `public.export_credits`
Export credits for **authenticated users**.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK to auth.users |
| credits_total | integer | Total credits (can be -1 for unlimited) |
| credits_used | integer | Used credits |
| package_type | enum | `single`, `starter`, `standard`, `pro`, `migrated_guest`, `bonus` |
| valid_until | timestamptz | Expiration date |
| payment_id | uuid | FK to payments |

### `public.guest_credits`
Export credits for **anonymous/guest users**.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| session_id | text | Guest session identifier (unique) |
| email | text | Optional email for guest |
| credits_total | integer | Total credits |
| credits_used | integer | Used credits |
| expires_at | timestamptz | Session expiration |
| migrated_to_user_id | uuid | FK to auth.users (when guest registers) |
| migrated_at | timestamptz | Migration timestamp |

### `public.export_sessions`
**Smart Export Sessions** - allows 24h free re-exports of same project.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| credit_id | uuid | FK to export_credits (for auth users) |
| guest_credit_id | uuid | FK to guest_credits (for guests) |
| project_hash | text | Hash of project for matching |
| expires_at | timestamptz | 24h expiration |
| exports_count | integer | Number of exports in session |

### `public.export_history`
History of all exports for analytics.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK to auth.users (nullable) |
| guest_session_id | text | Guest session (nullable) |
| session_id | uuid | FK to export_sessions |
| project_hash | text | Project identifier |
| parts_count | integer | Number of parts exported |
| format | text | 'csv', etc. |
| is_free_reexport | boolean | Whether this was a free re-export |

---

## 3. Payments

### `public.payments`
Unified payment transactions table for all payment types.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| payment_type | text | Type of payment (credits, shop, order) |
| user_id | uuid | FK to auth.users (nullable) |
| guest_session_id | text | Guest session (nullable) |
| provider | enum | `payu`, `przelewy24`, `stripe`, `manual` |
| external_order_id | text | Our order ID (unique) |
| provider_order_id | text | Provider's order ID |
| amount | integer | Amount in grosze (PLN cents) |
| currency | text | Default 'PLN' |
| status | enum | `pending`, `processing`, `completed`, `failed`, `refunded`, `cancelled` |
| status_history | jsonb | Array of status changes |
| redirect_url | text | Payment redirect URL |

---

## 4. Mini Shop (E-commerce)

### `public.shop_products`
Product catalog for mini-shop.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| slug | text | URL slug (unique) |
| name | text | English name |
| name_pl | text | Polish name |
| category | text | Product category |
| price | integer | Price in grosze |
| compare_at_price | integer | Original price (for discounts) |
| stock_quantity | integer | Inventory count |
| is_affiliate | boolean | External affiliate product |
| external_url | text | Affiliate link |

### `public.shop_product_variants`
Product variants (size, color, etc.).

### `public.cart_items`
Shopping cart for users and guests.

### `public.shop_orders`
Shop orders with statuses: `pending`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`.

### `public.shop_order_items`
Individual items in an order.

---

## 5. Producers (Cutting Services Marketplace)

### `public.producers`
Furniture cutting service providers.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| owner_user_id | uuid | FK to auth.users (producer owner) |
| name | text | Company name |
| slug | text | URL slug (unique) |
| services | text[] | Available services array |
| supported_materials | text[] | Supported material types |
| api_type | enum | `rest`, `email`, `webhook`, `manual` |
| base_cutting_price | integer | Price in grosze per unit |
| minimum_order_value | integer | Min order (default 100 PLN) |
| is_verified | boolean | Admin verified |
| commission_rate | numeric | Platform commission % |

### `public.producer_quotes`
Price quotes from producers for projects.

### `public.producer_orders`
Orders placed with producers.
Statuses: `draft`, `quoted`, `pending_payment`, `paid`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`.

### `public.commissions`
Platform commission tracking per order.

### `public.payout_requests`
Producer payout requests.
Statuses: `pending`, `processing`, `completed`, `failed`, `cancelled`.

---

## 6. Tenants (White-label B2B)

### `public.tenants`
White-label tenant organizations.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| slug | text | Tenant URL slug (unique) |
| name | text | Organization name |
| owner_user_id | uuid | FK to auth.users |
| plan | enum | `starter`, `professional`, `enterprise` |
| status | enum | `pending`, `active`, `suspended`, `cancelled` |
| custom_domain | text | Custom domain (unique) |
| domain_verified | boolean | DNS verification status |
| branding | jsonb | Logo, colors, etc. |
| max_materials | integer | Material limit per plan |
| max_users | integer | User limit per plan |
| max_exports_per_month | integer | Export limit per plan |
| stripe_customer_id | text | Stripe integration |

### `public.tenant_users`
Tenant membership with roles: `owner`, `admin`, `member`.

### `public.tenant_materials`
Custom materials defined by tenant.

### `public.tenant_usage`
Monthly usage tracking (exports, users, projects, API calls).

### `public.tenant_export_configs`
Custom export column configurations.

### `public.tenant_subscriptions`
Subscription management.
Statuses: `trial`, `active`, `past_due`, `cancelled`, `expired`.

### `public.tenant_invoices`
Invoice generation and tracking.

---

## 7. Admin & Analytics

> **Note:** Admin roles are now stored directly in `profiles.role` column.
> Available roles: `user` (default), `admin`, `super_admin`.

### `public.audit_logs`
Comprehensive audit trail.
Actions: `create`, `update`, `delete`, `login`, `logout`, `export`, `payment`, `refund`, `suspend`, `activate`, `config_change`.

### `public.analytics_daily`
Daily aggregated metrics: users, exports, revenue by source, orders, tenants.

---

## Enums Reference

| Enum | Values |
|------|--------|
| credit_package_type | `single`, `starter`, `standard`, `pro`, `migrated_guest`, `bonus` |
| payment_provider | `payu`, `przelewy24`, `stripe`, `manual` |
| payment_status | `pending`, `processing`, `completed`, `failed`, `refunded`, `cancelled` |
| shop_order_status | `pending`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded` |
| producer_api_type | `rest`, `email`, `webhook`, `manual` |
| producer_order_status | `draft`, `quoted`, `pending_payment`, `paid`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded` |
| tenant_plan | `starter`, `professional`, `enterprise` |
| tenant_status | `pending`, `active`, `suspended`, `cancelled` |
| tenant_user_role | `owner`, `admin`, `member` |
| tenant_subscription_status | `trial`, `active`, `past_due`, `cancelled`, `expired` |
| invoice_status | `draft`, `pending`, `paid`, `overdue`, `cancelled` |
| payout_status | `pending`, `processing`, `completed`, `failed`, `cancelled` |
| audit_action | `create`, `update`, `delete`, `login`, `logout`, `export`, `payment`, `refund`, `suspend`, `activate`, `config_change` |

---

## Key Relationships

```
auth.users (1)──────(1) profiles
    │
    ├──(1)────────(N) export_credits
    │                      │
    │                      └──(1)────(N) export_sessions
    │                                        │
    ├──(1)────────(N) export_history ────────┘
    │
    ├──(1)────────(N) payments
    │
    ├──(1)────────(N) shop_orders
    │
    ├──(1)────────(N) producer_quotes
    │
    ├──(1)────────(N) producer_orders
    │
    └──(1)────────(N) tenant_users ──(N)────(1) tenants
```

## RLS (Row Level Security)

All public schema tables have RLS enabled for proper data isolation.
