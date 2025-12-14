/**
 * Tenant Head Component
 *
 * Updates document head with tenant-specific meta tags and favicon.
 */

'use client';

import { useEffect } from 'react';
import { useTenant } from '@/lib/tenant/context';

export function TenantHead() {
  const { tenant, branding, isTenantContext } = useTenant();

  useEffect(() => {
    if (!isTenantContext || !tenant) return;

    // Update document title
    document.title = `${tenant.name} - Konfigurator mebli`;

    // Update favicon
    if (branding.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl;
    }

    // Update theme-color meta tag
    if (branding.primaryColor) {
      let meta = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }
      meta.content = branding.primaryColor;
    }

    // Cleanup on unmount
    return () => {
      document.title = 'Meblarz - Konfigurator mebli';
    };
  }, [tenant, branding, isTenantContext]);

  return null;
}
