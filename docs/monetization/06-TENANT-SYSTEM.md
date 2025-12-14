# System White-label dla Tenantów

## 1. Przegląd architektury

```
┌─────────────────────────────────────────────────────────────┐
│               MULTI-TENANT ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ meblarz.pl  │  │ plytymax.  │  │ drewnoland. │        │
│  │  (główna)   │  │ meblarz.pl │  │ meblarz.pl  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │
│         │    DNS / Reverse Proxy          │                │
│         └────────────────┼────────────────┘                │
│                          │                                 │
│                          ▼                                 │
│              ┌───────────────────────┐                     │
│              │    MIDDLEWARE         │                     │
│              │    Tenant Detection   │                     │
│              └───────────┬───────────┘                     │
│                          │                                 │
│                          ▼                                 │
│              ┌───────────────────────┐                     │
│              │    TenantProvider     │                     │
│              │    (React Context)    │                     │
│              └───────────┬───────────┘                     │
│                          │                                 │
│         ┌────────────────┼────────────────┐               │
│         ▼                ▼                ▼               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Branding   │  │  Materials  │  │   Export    │        │
│  │  Component  │  │   Catalog   │  │   Format    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Wykrywanie tenanta

### 2.1 Middleware

```typescript
// Plik: apps/app/middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySubdomain, getTenantByDomain } from '@/lib/tenant';

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const url = request.nextUrl.clone();

  // 1. Sprawdź subdomenę: xxx.meblarz.pl
  const subdomainMatch = host.match(/^([^.]+)\.meblarz\.pl$/);
  if (subdomainMatch && subdomainMatch[1] !== 'www') {
    const subdomain = subdomainMatch[1];
    const tenant = await getTenantBySubdomain(subdomain);

    if (tenant) {
      // Dodaj tenant info do headers
      const response = NextResponse.next();
      response.headers.set('x-tenant-id', tenant.id);
      response.headers.set('x-tenant-config', JSON.stringify(tenant));
      return response;
    }
  }

  // 2. Sprawdź custom domain: projektant.plytymax.pl
  const tenant = await getTenantByDomain(host);
  if (tenant) {
    const response = NextResponse.next();
    response.headers.set('x-tenant-id', tenant.id);
    response.headers.set('x-tenant-config', JSON.stringify(tenant));
    return response;
  }

  // 3. Dev mode: ?tenant=xxx
  const tenantParam = url.searchParams.get('tenant');
  if (tenantParam && process.env.NODE_ENV === 'development') {
    const tenant = await getTenantBySubdomain(tenantParam);
    if (tenant) {
      const response = NextResponse.next();
      response.headers.set('x-tenant-id', tenant.id);
      response.headers.set('x-tenant-config', JSON.stringify(tenant));
      return response;
    }
  }

  // Brak tenanta - główna aplikacja
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 2.2 Serwis tenanta

```typescript
// Plik: apps/app/src/lib/tenant/service.ts

import { createClient } from '@supabase/supabase-js';
import { TenantConfig } from '@meble/config/tenant';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cache tenantów (5 minut)
const tenantCache = new Map<string, { tenant: TenantConfig; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function getTenantBySubdomain(
  subdomain: string
): Promise<TenantConfig | null> {
  const cacheKey = `subdomain:${subdomain}`;

  // Sprawdź cache
  const cached = tenantCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.tenant;
  }

  // Pobierz z bazy
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('subdomain', subdomain)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  const tenant = mapDbToConfig(data);

  // Zapisz do cache
  tenantCache.set(cacheKey, {
    tenant,
    expires: Date.now() + CACHE_TTL,
  });

  return tenant;
}

export async function getTenantByDomain(
  domain: string
): Promise<TenantConfig | null> {
  const cacheKey = `domain:${domain}`;

  const cached = tenantCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.tenant;
  }

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('custom_domain', domain)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  const tenant = mapDbToConfig(data);

  tenantCache.set(cacheKey, {
    tenant,
    expires: Date.now() + CACHE_TTL,
  });

  return tenant;
}

function mapDbToConfig(data: any): TenantConfig {
  return {
    id: data.id,
    subdomain: data.subdomain,
    customDomain: data.custom_domain,
    branding: {
      companyName: data.company_name,
      logo: data.logo_url,
      favicon: data.favicon_url,
      primaryColor: data.primary_color,
      secondaryColor: data.secondary_color,
    },
    contact: {
      email: data.contact_email,
      phone: data.contact_phone,
      website: data.website_url,
    },
    features: data.config?.features || {},
    materials: data.config?.materials || {},
    export: data.config?.export || {},
    shop: data.config?.shop || {},
    billing: {
      model: data.billing_model,
      config: data.billing_config,
    },
  };
}
```

---

## 3. React Context

### 3.1 TenantProvider

```typescript
// Plik: apps/app/src/providers/TenantProvider.tsx

'use client';

import { createContext, useContext, ReactNode } from 'react';
import { TenantConfig } from '@meble/config/tenant';

interface TenantContextValue {
  tenant: TenantConfig | null;
  isTenantApp: boolean;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  isTenantApp: false,
});

export function useTenant() {
  return useContext(TenantContext);
}

interface TenantProviderProps {
  tenant: TenantConfig | null;
  children: ReactNode;
}

export function TenantProvider({ tenant, children }: TenantProviderProps) {
  return (
    <TenantContext.Provider value={{ tenant, isTenantApp: !!tenant }}>
      {children}
    </TenantContext.Provider>
  );
}
```

### 3.2 Server Component wrapper

```typescript
// Plik: apps/app/src/app/layout.tsx

import { headers } from 'next/headers';
import { TenantProvider } from '@/providers/TenantProvider';
import { TenantConfig } from '@meble/config/tenant';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = headers();
  const tenantConfig = headersList.get('x-tenant-config');

  const tenant: TenantConfig | null = tenantConfig
    ? JSON.parse(tenantConfig)
    : null;

  return (
    <html lang="pl">
      <head>
        {/* Dynamic favicon dla tenanta */}
        <link
          rel="icon"
          href={tenant?.branding.favicon || '/favicon.ico'}
        />
      </head>
      <body>
        <TenantProvider tenant={tenant}>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
```

---

## 4. Branding

### 4.1 Komponent TenantBranding

```typescript
// Plik: apps/app/src/components/tenant/TenantBranding.tsx

'use client';

import { useTenant } from '@/providers/TenantProvider';
import Image from 'next/image';

export function TenantLogo({ className }: { className?: string }) {
  const { tenant, isTenantApp } = useTenant();

  if (isTenantApp && tenant?.branding.logo) {
    return (
      <Image
        src={tenant.branding.logo}
        alt={tenant.branding.companyName}
        width={150}
        height={40}
        className={className}
      />
    );
  }

  // Domyślne logo Meblarz
  return (
    <Image
      src="/logo.svg"
      alt="Meblarz"
      width={150}
      height={40}
      className={className}
    />
  );
}

export function TenantName() {
  const { tenant, isTenantApp } = useTenant();

  return (
    <span>
      {isTenantApp ? tenant?.branding.companyName : 'Meblarz'}
    </span>
  );
}
```

### 4.2 Dynamic CSS Variables

```typescript
// Plik: apps/app/src/components/tenant/TenantTheme.tsx

'use client';

import { useTenant } from '@/providers/TenantProvider';
import { useEffect } from 'react';

export function TenantTheme() {
  const { tenant } = useTenant();

  useEffect(() => {
    if (!tenant) return;

    const root = document.documentElement;

    // Ustaw CSS variables
    root.style.setProperty('--tenant-primary', tenant.branding.primaryColor);
    root.style.setProperty('--tenant-secondary', tenant.branding.secondaryColor);

    // Cleanup
    return () => {
      root.style.removeProperty('--tenant-primary');
      root.style.removeProperty('--tenant-secondary');
    };
  }, [tenant]);

  return null;
}
```

### 4.3 Tailwind config extension

```typescript
// Plik: apps/app/tailwind.config.ts

import type { Config } from 'tailwindcss';

const config: Config = {
  // ... existing config
  theme: {
    extend: {
      colors: {
        tenant: {
          primary: 'var(--tenant-primary, #3b82f6)',
          secondary: 'var(--tenant-secondary, #1e40af)',
        },
      },
    },
  },
};

export default config;
```

---

## 5. Materiały tenanta

### 5.1 Hook useTenantMaterials

```typescript
// Plik: apps/app/src/hooks/useTenantMaterials.ts

import { useQuery } from '@tanstack/react-query';
import { useTenant } from '@/providers/TenantProvider';
import { Material } from '@/types';

interface TenantMaterial {
  id: string;
  code: string;
  name: string;
  category: string;
  thickness: number;
  color: string;
  textureUrl?: string;
  pricePerM2?: number;
  inStock: boolean;
  manufacturer?: string;
}

export function useTenantMaterials(options?: {
  category?: string;
  search?: string;
}) {
  const { tenant, isTenantApp } = useTenant();

  return useQuery({
    queryKey: ['tenant-materials', tenant?.id, options],
    queryFn: async (): Promise<TenantMaterial[]> => {
      if (!isTenantApp) {
        return [];
      }

      const params = new URLSearchParams();
      if (options?.category) params.set('category', options.category);
      if (options?.search) params.set('search', options.search);

      const response = await fetch(`/api/tenant/materials?${params}`);
      const data = await response.json();

      return data.data?.materials || [];
    },
    enabled: isTenantApp,
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

// Konwersja materiału tenanta na format aplikacji
export function tenantMaterialToAppMaterial(tm: TenantMaterial): Material {
  return {
    id: tm.id,
    name: `${tm.name} (${tm.code})`,
    thickness: tm.thickness,
    color: tm.color,
    category: tm.category as any,
    metadata: {
      tenantCode: tm.code,
      manufacturer: tm.manufacturer,
      pricePerM2: tm.pricePerM2,
    },
  };
}
```

### 5.2 Selector materiałów

```typescript
// Plik: apps/app/src/components/materials/TenantMaterialSelector.tsx

'use client';

import { useState } from 'react';
import { useTenant } from '@/providers/TenantProvider';
import { useTenantMaterials, tenantMaterialToAppMaterial } from '@/hooks/useTenantMaterials';
import { useStore } from '@/lib/store';
import { Input } from '@meble/ui/input';
import { Select } from '@meble/ui/select';

const CATEGORIES = [
  { value: 'board', label: 'Płyty meblowe' },
  { value: 'hdf', label: 'HDF' },
  { value: 'edge', label: 'Obrzeża' },
];

export function TenantMaterialSelector() {
  const { tenant, isTenantApp } = useTenant();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>();
  const addMaterial = useStore(state => state.addMaterial);

  const { data: materials, isLoading } = useTenantMaterials({
    search,
    category,
  });

  if (!isTenantApp) {
    return null; // Lub standardowy selector
  }

  const handleSelectMaterial = (tm: TenantMaterial) => {
    const material = tenantMaterialToAppMaterial(tm);
    addMaterial(material);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Szukaj materiału..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={category}
          onValueChange={setCategory}
          placeholder="Kategoria"
        >
          {CATEGORIES.map(cat => (
            <Select.Option key={cat.value} value={cat.value}>
              {cat.label}
            </Select.Option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Ładowanie...</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {materials?.map(material => (
            <div
              key={material.id}
              onClick={() => handleSelectMaterial(material)}
              className="p-4 border rounded-lg cursor-pointer hover:border-tenant-primary transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded border"
                  style={{ backgroundColor: material.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{material.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {material.code} • {material.thickness}mm
                  </p>
                </div>
                {material.pricePerM2 && (
                  <div className="text-sm font-medium">
                    {(material.pricePerM2 / 100).toFixed(2)} zł/m²
                  </div>
                )}
              </div>
              {!material.inStock && (
                <span className="text-xs text-red-500 mt-2 block">
                  Niedostępny
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 6. Export dla tenanta

### 6.1 Custom format eksportu

```typescript
// Plik: apps/app/src/lib/export/tenant-export.ts

import { useTenant } from '@/providers/TenantProvider';
import { Part, Material } from '@/types';

interface TenantExportConfig {
  format: 'csv' | 'xlsx' | 'json';
  columns: string[];
  includeOrderCode: boolean;
  customMapping?: Record<string, string>;
  separator?: string;
}

export function generateTenantExport(
  parts: Part[],
  materials: Material[],
  config: TenantExportConfig
): string {
  const rows: string[][] = [];

  // Header
  const headers = config.columns.map(col => {
    if (config.customMapping?.[col]) {
      return config.customMapping[col];
    }
    return col;
  });
  rows.push(headers);

  // Data
  for (const part of parts) {
    const material = materials.find(m => m.id === part.materialId);
    const row: string[] = [];

    for (const col of config.columns) {
      switch (col) {
        case 'order_code':
          row.push(config.includeOrderCode
            ? material?.metadata?.tenantCode || ''
            : '');
          break;
        case 'part_name':
          row.push(part.name);
          break;
        case 'material_code':
          row.push(material?.metadata?.tenantCode || material?.name || '');
          break;
        case 'length':
          row.push(part.width.toString());
          break;
        case 'width':
          row.push(part.height.toString());
          break;
        case 'thickness':
          row.push(material?.thickness?.toString() || '');
          break;
        case 'quantity':
          row.push('1');
          break;
        default:
          row.push('');
      }
    }

    rows.push(row);
  }

  // Format output
  const separator = config.separator || ';';
  return rows.map(row => row.join(separator)).join('\n');
}
```

### 6.2 Hook useExport z tenant support

```typescript
// Plik: apps/app/src/hooks/useExport.ts

import { useTenant } from '@/providers/TenantProvider';
import { generateCSV } from '@/lib/csv';
import { generateTenantExport } from '@/lib/export/tenant-export';
import { DEFAULT_EXPORT_COLUMNS } from '@meble/config/pricing';

export function useExport() {
  const { tenant, isTenantApp } = useTenant();

  const exportProject = (parts, materials, options) => {
    if (isTenantApp && tenant?.export) {
      // Użyj konfiguracji tenanta
      return generateTenantExport(parts, materials, {
        format: tenant.export.format || 'csv',
        columns: tenant.export.customColumns || DEFAULT_EXPORT_COLUMNS,
        includeOrderCode: tenant.export.includeOrderCode || false,
        customMapping: tenant.export.columnMapping,
        separator: tenant.export.separator,
      });
    }

    // Standardowy export Meblarz
    return generateCSV(parts, materials, options);
  };

  return { exportProject };
}
```

---

## 7. Panel administracyjny tenanta

### 7.1 Dashboard tenanta

```typescript
// Plik: apps/admin/src/app/tenant/[id]/page.tsx

import { getTenant } from '@/lib/tenant';
import { TenantStats } from '@/components/TenantStats';
import { TenantMaterialsManager } from '@/components/TenantMaterialsManager';
import { TenantConfigForm } from '@/components/TenantConfigForm';

interface PageProps {
  params: { id: string };
}

export default async function TenantDashboard({ params }: PageProps) {
  const tenant = await getTenant(params.id);

  if (!tenant) {
    return <div>Tenant nie znaleziony</div>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">{tenant.branding.companyName}</h1>
        <p className="text-muted-foreground">
          {tenant.subdomain}.meblarz.pl
          {tenant.customDomain && ` | ${tenant.customDomain}`}
        </p>
      </header>

      <TenantStats tenantId={tenant.id} />

      <div className="grid grid-cols-2 gap-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Konfiguracja</h2>
          <TenantConfigForm tenant={tenant} />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Materiały</h2>
          <TenantMaterialsManager tenantId={tenant.id} />
        </section>
      </div>
    </div>
  );
}
```

### 7.2 Import materiałów

```typescript
// Plik: apps/admin/src/components/TenantMaterialImport.tsx

'use client';

import { useState } from 'react';
import { Button } from '@meble/ui/button';
import Papa from 'papaparse';

interface TenantMaterialImportProps {
  tenantId: string;
  onImportComplete: () => void;
}

export function TenantMaterialImport({
  tenantId,
  onImportComplete,
}: TenantMaterialImportProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const materials = results.data as any[];
        const total = materials.length;

        for (let i = 0; i < materials.length; i++) {
          const material = materials[i];

          await fetch(`/api/admin/tenants/${tenantId}/materials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: material.code || material.kod,
              name: material.name || material.nazwa,
              category: material.category || material.kategoria || 'board',
              thickness: parseFloat(material.thickness || material.grubosc) || 18,
              color: material.color || material.kolor || '#cccccc',
              pricePerM2: parseInt(material.price || material.cena) || null,
              manufacturer: material.manufacturer || material.producent,
            }),
          });

          setProgress(Math.round(((i + 1) / total) * 100));
        }

        setIsUploading(false);
        setProgress(0);
        onImportComplete();
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Import z pliku CSV
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="block w-full text-sm"
        />
      </div>

      {isUploading && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Importowanie... {progress}%
          </p>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <p>Wymagane kolumny: code/kod, name/nazwa</p>
        <p>Opcjonalne: category, thickness/grubosc, color/kolor, price/cena, manufacturer/producent</p>
      </div>
    </div>
  );
}
```

---

## 8. Konfiguracja DNS

### 8.1 Subdomeny (Cloudflare/Vercel)

```
# DNS Records dla *.meblarz.pl

Type    Name              Content              TTL
────────────────────────────────────────────────────
A       meblarz.pl        76.76.21.21          Auto
CNAME   www               meblarz.pl           Auto
CNAME   *                 cname.vercel-dns.com Auto
```

### 8.2 Custom domains

```typescript
// Plik: apps/admin/src/lib/domains.ts

import { VercelClient } from '@vercel/sdk';

const vercel = new VercelClient({
  token: process.env.VERCEL_TOKEN,
});

export async function addTenantDomain(
  tenantId: string,
  domain: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Dodaj domenę w Vercel
    await vercel.projects.addDomain({
      projectId: process.env.VERCEL_PROJECT_ID!,
      domain,
    });

    // 2. Zapisz w bazie
    await supabase
      .from('tenants')
      .update({ custom_domain: domain })
      .eq('id', tenantId);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function verifyDomain(domain: string): Promise<{
  verified: boolean;
  instructions?: string;
}> {
  const response = await vercel.projects.getDomain({
    projectId: process.env.VERCEL_PROJECT_ID!,
    domain,
  });

  if (response.verified) {
    return { verified: true };
  }

  return {
    verified: false,
    instructions: `Dodaj rekord CNAME: ${domain} → cname.vercel-dns.com`,
  };
}
```

---

## 9. Rozliczenia B2B

### 9.1 Modele rozliczeń

```typescript
// Plik: packages/config/tenant.config.ts

export interface TenantBillingConfig {
  model: 'free' | 'flat_fee' | 'per_export' | 'commission';

  // Dla flat_fee
  flatFee?: {
    amount: number;
    currency: string;
    interval: 'monthly' | 'yearly';
  };

  // Dla per_export
  perExport?: {
    pricePerExport: number;
    currency: string;
    freeExportsPerMonth?: number;
  };

  // Dla commission
  commission?: {
    rate: number; // 0.05 = 5%
    minCommission?: number;
    maxCommission?: number;
  };
}
```

### 9.2 Tracking usage

```typescript
// Plik: apps/app/src/lib/tenant/usage.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function trackTenantExport(
  tenantId: string,
  userId: string | null,
  projectHash: string
): Promise<void> {
  await supabase.from('tenant_usage').insert({
    tenant_id: tenantId,
    user_id: userId,
    event_type: 'export',
    project_hash: projectHash,
    metadata: {},
  });
}

export async function getTenantUsageStats(
  tenantId: string,
  period: 'day' | 'week' | 'month'
): Promise<{
  exports: number;
  uniqueUsers: number;
  orders: number;
  orderValue: number;
}> {
  const since = getStartOfPeriod(period);

  const { data } = await supabase
    .from('tenant_usage')
    .select('event_type, user_id')
    .eq('tenant_id', tenantId)
    .gte('created_at', since.toISOString());

  const exports = data?.filter(e => e.event_type === 'export').length || 0;
  const uniqueUsers = new Set(data?.map(e => e.user_id)).size;

  // Pobierz zamówienia
  const { data: orders } = await supabase
    .from('orders')
    .select('total')
    .eq('tenant_id', tenantId)
    .gte('created_at', since.toISOString())
    .eq('status', 'delivered');

  return {
    exports,
    uniqueUsers,
    orders: orders?.length || 0,
    orderValue: orders?.reduce((sum, o) => sum + o.total, 0) || 0,
  };
}
```

---

## 10. Podsumowanie

| Aspekt | Rozwiązanie |
|--------|-------------|
| **Routing** | Middleware + subdomena/custom domain |
| **Context** | TenantProvider (React Context) |
| **Branding** | Dynamic CSS variables + komponenty |
| **Materiały** | Osobny katalog per tenant |
| **Export** | Konfigurowalny format per tenant |
| **DNS** | Wildcard subdomena + custom domains |
| **Rozliczenia** | free / flat_fee / per_export / commission |

---

*Następny dokument: [07-IMPLEMENTATION-ROADMAP.md](./07-IMPLEMENTATION-ROADMAP.md)*
