/**
 * Tenant Logo Component
 *
 * Displays tenant logo with fallback to default.
 * Supports light/dark mode variants.
 */

'use client';

import { useTenant } from '@/lib/tenant/context';
import { useTheme } from 'next-themes';

interface TenantLogoProps {
  className?: string;
  width?: number;
  height?: number;
  showFallback?: boolean;
}

export function TenantLogo({
  className = '',
  width = 120,
  height = 40,
  showFallback = true,
}: TenantLogoProps) {
  const { tenant, branding, isTenantContext } = useTenant();
  const { theme } = useTheme();

  // Determine which logo to show
  const isDark = theme === 'dark';
  const logoUrl = isDark && branding.logoDarkUrl ? branding.logoDarkUrl : branding.logoUrl;

  // If we have a logo, show it
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={tenant?.name || 'Logo'}
        width={width}
        height={height}
        className={`object-contain ${className}`}
      />
    );
  }

  // Show tenant name as text fallback
  if (isTenantContext && tenant) {
    return (
      <span
        className={`font-bold text-xl ${className}`}
        style={{ color: branding.primaryColor }}
      >
        {tenant.name}
      </span>
    );
  }

  // Default app logo/name
  if (showFallback) {
    return (
      <span className={`font-bold text-xl text-primary ${className}`}>
        e-meble
      </span>
    );
  }

  return null;
}
