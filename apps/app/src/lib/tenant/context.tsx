/**
 * Tenant Context
 *
 * React context for tenant-aware components.
 * Provides tenant info and branding throughout the app.
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { TenantInfo, TenantBranding, TenantSettings } from './middleware';

interface TenantContextValue {
  tenant: TenantInfo | null;
  isLoading: boolean;
  error: string | null;
  isTenantContext: boolean;
  branding: TenantBranding;
  settings: TenantSettings;
  refreshTenant: () => Promise<void>;
}

const DEFAULT_BRANDING: TenantBranding = {
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',
  accentColor: '#F59E0B',
  backgroundColor: '#FFFFFF',
  textColor: '#1F2937',
  fontFamily: 'Inter',
  borderRadius: '0.5rem',
};

const DEFAULT_SETTINGS: TenantSettings = {
  showPoweredBy: true,
  defaultLanguage: 'pl',
  allowedExportFormats: ['csv'],
  watermarkExports: false,
};

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  isLoading: true,
  error: null,
  isTenantContext: false,
  branding: DEFAULT_BRANDING,
  settings: DEFAULT_SETTINGS,
  refreshTenant: async () => {},
});

interface TenantProviderProps {
  children: React.ReactNode;
  initialTenant?: TenantInfo | null;
}

export function TenantProvider({ children, initialTenant }: TenantProviderProps) {
  const [tenant, setTenant] = useState<TenantInfo | null>(initialTenant || null);
  const [isLoading, setIsLoading] = useState(!initialTenant);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get hostname from window
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

      // Skip for main domain
      if (isMainDomain(hostname)) {
        setTenant(null);
        return;
      }

      const response = await fetch(`/api/tenant?host=${encodeURIComponent(hostname)}`);
      const data = await response.json();

      if (data.success && data.data) {
        setTenant(data.data);
      } else {
        setTenant(null);
        if (data.error) {
          setError(data.error.message);
        }
      }
    } catch (err) {
      setError('Failed to load tenant information');
      setTenant(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialTenant) {
      fetchTenant();
    }
  }, [initialTenant]);

  // Apply CSS variables for branding
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const branding = tenant?.branding || DEFAULT_BRANDING;

    // Apply CSS custom properties
    if (branding.primaryColor) {
      root.style.setProperty('--tenant-primary', branding.primaryColor);
      root.style.setProperty('--primary', hexToHSL(branding.primaryColor));
    }
    if (branding.secondaryColor) {
      root.style.setProperty('--tenant-secondary', branding.secondaryColor);
    }
    if (branding.accentColor) {
      root.style.setProperty('--tenant-accent', branding.accentColor);
    }
    if (branding.backgroundColor) {
      root.style.setProperty('--tenant-background', branding.backgroundColor);
    }
    if (branding.textColor) {
      root.style.setProperty('--tenant-text', branding.textColor);
    }
    if (branding.fontFamily) {
      root.style.setProperty('--tenant-font', branding.fontFamily);
    }
    if (branding.borderRadius) {
      root.style.setProperty('--tenant-radius', branding.borderRadius);
    }

    // Apply custom CSS if provided
    if (branding.customCss) {
      const styleId = 'tenant-custom-css';
      let styleEl = document.getElementById(styleId) as HTMLStyleElement;

      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }

      styleEl.textContent = branding.customCss;
    }

    // Cleanup on unmount
    return () => {
      root.style.removeProperty('--tenant-primary');
      root.style.removeProperty('--tenant-secondary');
      root.style.removeProperty('--tenant-accent');
      root.style.removeProperty('--tenant-background');
      root.style.removeProperty('--tenant-text');
      root.style.removeProperty('--tenant-font');
      root.style.removeProperty('--tenant-radius');
      root.style.removeProperty('--primary');

      const styleEl = document.getElementById('tenant-custom-css');
      if (styleEl) {
        styleEl.remove();
      }
    };
  }, [tenant]);

  const value = useMemo<TenantContextValue>(
    () => ({
      tenant,
      isLoading,
      error,
      isTenantContext: !!tenant,
      branding: tenant?.branding || DEFAULT_BRANDING,
      settings: tenant?.settings || DEFAULT_SETTINGS,
      refreshTenant: fetchTenant,
    }),
    [tenant, isLoading, error]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

// Helper: Check if main domain
function isMainDomain(hostname: string): boolean {
  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'meblarz.pl';
  const host = hostname.split(':')[0];
  return (
    host === mainDomain ||
    host === `www.${mainDomain}` ||
    host === 'localhost' ||
    host === '127.0.0.1'
  );
}

// Helper: Convert hex to HSL for CSS variables
function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
