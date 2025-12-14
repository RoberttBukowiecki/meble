/**
 * Tenant Middleware
 *
 * Detects and resolves tenant from request hostname.
 * Used in Next.js middleware for multi-tenant routing.
 */

import { NextRequest, NextResponse } from 'next/server';

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'pending' | 'active' | 'suspended' | 'cancelled';
  branding: TenantBranding;
  settings: TenantSettings;
}

export interface TenantBranding {
  logoUrl?: string;
  logoDarkUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  borderRadius?: string;
  customCss?: string;
}

export interface TenantSettings {
  showPoweredBy?: boolean;
  defaultLanguage?: string;
  allowedExportFormats?: string[];
  customExportColumns?: any[];
  watermarkExports?: boolean;
}

const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'meblarz.pl';
const API_BASE = process.env.NEXT_PUBLIC_PAYMENTS_API_URL || '/api';

// Cache for tenant resolution (in-memory, per-instance)
const tenantCache = new Map<string, { tenant: TenantInfo | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Extract tenant slug from hostname
 */
export function extractTenantSlug(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];

  // Check for subdomain pattern: {slug}.meblarz.pl
  if (host.endsWith(`.${MAIN_DOMAIN}`)) {
    const slug = host.replace(`.${MAIN_DOMAIN}`, '');
    // Ignore www and other reserved subdomains
    if (!['www', 'api', 'admin', 'app'].includes(slug)) {
      return slug;
    }
  }

  // For custom domains, we need to look up in database
  // Return the full host for custom domain lookup
  if (!host.includes(MAIN_DOMAIN) && !host.includes('localhost')) {
    return host; // Will be treated as custom domain
  }

  return null;
}

/**
 * Check if this is the main domain (no tenant)
 */
export function isMainDomain(hostname: string): boolean {
  const host = hostname.split(':')[0];
  return (
    host === MAIN_DOMAIN ||
    host === `www.${MAIN_DOMAIN}` ||
    host === 'localhost' ||
    host === '127.0.0.1'
  );
}

/**
 * Resolve tenant from hostname (with caching)
 */
export async function resolveTenant(hostname: string): Promise<TenantInfo | null> {
  // Check main domain first
  if (isMainDomain(hostname)) {
    return null;
  }

  const host = hostname.split(':')[0];

  // Check cache
  const cached = tenantCache.get(host);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.tenant;
  }

  try {
    // Fetch tenant from API
    const response = await fetch(`${API_BASE}/tenant?host=${encodeURIComponent(host)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Short timeout for middleware
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      tenantCache.set(host, { tenant: null, timestamp: Date.now() });
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      tenantCache.set(host, { tenant: null, timestamp: Date.now() });
      return null;
    }

    const tenant = data.data as TenantInfo;
    tenantCache.set(host, { tenant, timestamp: Date.now() });
    return tenant;
  } catch (error) {
    console.error('Failed to resolve tenant:', error);
    return null;
  }
}

/**
 * Clear tenant cache (useful after updates)
 */
export function clearTenantCache(hostname?: string) {
  if (hostname) {
    tenantCache.delete(hostname.split(':')[0]);
  } else {
    tenantCache.clear();
  }
}

/**
 * Middleware handler for tenant detection
 */
export async function tenantMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const hostname = request.headers.get('host') || '';

  // Skip for main domain
  if (isMainDomain(hostname)) {
    return null;
  }

  // Resolve tenant
  const tenant = await resolveTenant(hostname);

  if (!tenant) {
    // Tenant not found - redirect to main domain or show error
    return NextResponse.redirect(new URL('/', `https://${MAIN_DOMAIN}`));
  }

  if (tenant.status !== 'active') {
    // Tenant suspended/cancelled - show appropriate page
    return NextResponse.redirect(new URL('/tenant-inactive', `https://${MAIN_DOMAIN}`));
  }

  // Add tenant info to headers for downstream use
  const response = NextResponse.next();
  response.headers.set('x-tenant-id', tenant.id);
  response.headers.set('x-tenant-slug', tenant.slug);
  response.headers.set('x-tenant-name', tenant.name);
  response.headers.set('x-tenant-plan', tenant.plan);

  return response;
}
