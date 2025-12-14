/**
 * Tenant Guard Component
 *
 * Handles tenant loading and error states.
 * Shows appropriate UI for inactive/suspended tenants.
 */

'use client';

import { useTenant } from '@/lib/tenant/context';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface TenantGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function TenantGuard({ children, fallback }: TenantGuardProps) {
  const { tenant, isLoading, error, isTenantContext } = useTenant();

  // Loading state
  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    );
  }

  // Not in tenant context - render normally
  if (!isTenantContext) {
    return <>{children}</>;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Wystąpił problem</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // Tenant not found
  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Strona nie istnieje</h1>
          <p className="text-muted-foreground">
            Nie znaleziono konfiguracji dla tej domeny.
          </p>
        </div>
      </div>
    );
  }

  // Tenant inactive
  if (tenant.status !== 'active') {
    return <TenantInactiveScreen status={tenant.status} name={tenant.name} />;
  }

  // All good
  return <>{children}</>;
}

interface TenantInactiveScreenProps {
  status: 'pending' | 'suspended' | 'cancelled';
  name: string;
}

function TenantInactiveScreen({ status, name }: TenantInactiveScreenProps) {
  const messages = {
    pending: {
      title: 'Strona w przygotowaniu',
      description: `${name} przygotowuje swój konfigurator mebli. Wróć wkrótce!`,
    },
    suspended: {
      title: 'Strona tymczasowo niedostępna',
      description: 'Ta strona została tymczasowo zawieszona. Skontaktuj się z właścicielem.',
    },
    cancelled: {
      title: 'Strona nieaktywna',
      description: 'Ten konfigurator nie jest już dostępny.',
    },
  };

  const message = messages[status];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold text-muted-foreground">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
        <h1 className="text-xl font-semibold mb-2">{message.title}</h1>
        <p className="text-muted-foreground">{message.description}</p>
      </div>
    </div>
  );
}
