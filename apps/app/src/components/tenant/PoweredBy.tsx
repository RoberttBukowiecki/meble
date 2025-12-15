/**
 * Powered By Component
 *
 * Shows "Powered by e-meble" attribution.
 * Visible for starter/professional plans unless disabled.
 */

'use client';

import { useTenant } from '@/lib/tenant/context';

interface PoweredByProps {
  className?: string;
  variant?: 'inline' | 'footer';
}

export function PoweredBy({ className = '', variant = 'inline' }: PoweredByProps) {
  const { tenant, settings, isTenantContext } = useTenant();

  // Don't show if not in tenant context
  if (!isTenantContext) return null;

  // Don't show if explicitly disabled (enterprise feature)
  if (settings.showPoweredBy === false && tenant?.plan === 'enterprise') {
    return null;
  }

  // Don't show if setting is disabled for non-enterprise (should not happen)
  if (settings.showPoweredBy === false) {
    return null;
  }

  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'e-meble.com';

  if (variant === 'footer') {
    return (
      <div className={`text-center py-4 text-sm text-muted-foreground ${className}`}>
        <a
          href={`https://${mainDomain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors"
        >
          Powered by <span className="font-semibold">e-meble</span>
        </a>
      </div>
    );
  }

  return (
    <a
      href={`https://${mainDomain}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors ${className}`}
    >
      <span>Powered by</span>
      <span className="font-semibold">e-meble</span>
    </a>
  );
}
