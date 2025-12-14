# Monetyzacja Niezalogowanych Użytkowników

## 1. Przegląd

System monetyzacji gości opiera się na identyfikacji przez `session_id` przechowywany w localStorage przeglądarki, z opcjonalnym backupem przez email.

```
┌─────────────────────────────────────────────────────────────┐
│                 GUEST MONETIZATION FLOW                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                    NOWY GOŚĆ                         │  │
│  │                        │                             │  │
│  │                        ▼                             │  │
│  │            ┌───────────────────────┐                │  │
│  │            │ Generuj session_id    │                │  │
│  │            │ (UUID w localStorage) │                │  │
│  │            └───────────┬───────────┘                │  │
│  │                        │                             │  │
│  │                        ▼                             │  │
│  │            ┌───────────────────────┐                │  │
│  │            │  Projektuj mebel      │                │  │
│  │            │  (bez ograniczeń)     │                │  │
│  │            └───────────┬───────────┘                │  │
│  │                        │                             │  │
│  │                        ▼                             │  │
│  │            ┌───────────────────────┐                │  │
│  │            │  Kliknij "Eksportuj"  │                │  │
│  │            └───────────┬───────────┘                │  │
│  │                        │                             │  │
│  │          ┌─────────────┴─────────────┐              │  │
│  │          │                           │              │  │
│  │          ▼                           ▼              │  │
│  │   ┌─────────────┐             ┌─────────────┐      │  │
│  │   │ Ma kredyty  │             │ Brak        │      │  │
│  │   │ (session)   │             │ kredytów    │      │  │
│  │   └──────┬──────┘             └──────┬──────┘      │  │
│  │          │                           │              │  │
│  │          ▼                           ▼              │  │
│  │   ┌─────────────┐             ┌─────────────────┐  │  │
│  │   │   Export    │             │  Modal zakupu:  │  │  │
│  │   │   (zużyj)   │             │  • Pakiet       │  │  │
│  │   └─────────────┘             │  • Email (opt)  │  │  │
│  │                               │  • Płatność     │  │  │
│  │                               └────────┬────────┘  │  │
│  │                                        │            │  │
│  │                                        ▼            │  │
│  │                               ┌─────────────────┐  │  │
│  │                               │ Kredyty        │  │  │
│  │                               │ przyznane      │  │  │
│  │                               │ → Export       │  │  │
│  │                               └─────────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Identyfikacja gościa

### 2.1 Session ID

```typescript
// Plik: packages/payments/src/guest/session.ts

const SESSION_STORAGE_KEY = 'meblarz_guest_session';

interface GuestSession {
  id: string;
  createdAt: string;
  lastActivityAt: string;
}

export function getOrCreateGuestSession(): GuestSession {
  if (typeof window === 'undefined') {
    throw new Error('Guest session only available in browser');
  }

  const stored = localStorage.getItem(SESSION_STORAGE_KEY);

  if (stored) {
    const session: GuestSession = JSON.parse(stored);

    // Aktualizuj last activity
    session.lastActivityAt = new Date().toISOString();
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

    return session;
  }

  // Utwórz nową sesję
  const newSession: GuestSession = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  };

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));

  return newSession;
}

export function getGuestSessionId(): string | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) return null;

  const session: GuestSession = JSON.parse(stored);
  return session.id;
}

export function clearGuestSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
}
```

### 2.2 Hook React

```typescript
// Plik: apps/app/src/hooks/useGuestSession.ts

import { useEffect, useState } from 'react';
import { getOrCreateGuestSession, getGuestSessionId } from '@meble/payments';

export function useGuestSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = getOrCreateGuestSession();
    setSessionId(session.id);
    setIsLoading(false);
  }, []);

  return { sessionId, isLoading };
}
```

---

## 3. Kredyty gościa

### 3.1 Hook useGuestCredits

```typescript
// Plik: apps/app/src/hooks/useGuestCredits.ts

import { useEffect, useState, useCallback } from 'react';
import { useGuestSession } from './useGuestSession';

interface GuestCredits {
  sessionId: string;
  availableCredits: number;
  expiresAt: string;
  email?: string;
}

export function useGuestCredits() {
  const { sessionId, isLoading: sessionLoading } = useGuestSession();
  const [credits, setCredits] = useState<GuestCredits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = useCallback(async () => {
    if (!sessionId) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/guest/credits', {
        headers: {
          'X-Session-ID': sessionId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCredits(data.data);
      } else if (response.status === 404) {
        // Brak kredytów - to normalne
        setCredits(null);
      } else {
        throw new Error('Failed to fetch credits');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionLoading && sessionId) {
      fetchCredits();
    }
  }, [sessionLoading, sessionId, fetchCredits]);

  const useCredit = useCallback(async (projectHash: string) => {
    if (!sessionId) {
      return { success: false, error: 'No session' };
    }

    try {
      const response = await fetch('/api/guest/credits/use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
        },
        body: JSON.stringify({ projectHash }),
      });

      const data = await response.json();

      if (response.ok) {
        // Odśwież kredyty
        await fetchCredits();
        return { success: true, data: data.data };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  }, [sessionId, fetchCredits]);

  return {
    sessionId,
    credits,
    availableCredits: credits?.availableCredits ?? 0,
    expiresAt: credits?.expiresAt,
    isLoading: sessionLoading || isLoading,
    error,
    useCredit,
    refetch: fetchCredits,
  };
}
```

---

## 4. Modal zakupu dla gościa

### 4.1 Komponent GuestPurchaseModal

```typescript
// Plik: apps/app/src/components/export/GuestPurchaseModal.tsx

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@meble/ui/dialog';
import { Button } from '@meble/ui/button';
import { Input } from '@meble/ui/input';
import { Label } from '@meble/ui/label';
import { RadioGroup, RadioGroupItem } from '@meble/ui/radio-group';
import { EXPORT_PACKAGES } from '@meble/config/pricing';
import { useGuestSession } from '@/hooks/useGuestSession';

interface GuestPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  onPurchaseComplete: () => void;
}

type PackageId = keyof typeof EXPORT_PACKAGES;

export function GuestPurchaseModal({
  open,
  onClose,
  onPurchaseComplete,
}: GuestPurchaseModalProps) {
  const { sessionId } = useGuestSession();
  const [selectedPackage, setSelectedPackage] = useState<PackageId>('starter');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availablePackages = Object.entries(EXPORT_PACKAGES).filter(
    ([_, pkg]) => !pkg.guestOnly || pkg.guestOnly === true
  );

  const handlePurchase = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId!,
        },
        body: JSON.stringify({
          type: 'credit_purchase',
          provider: 'payu', // lub wybór użytkownika
          packageId: selectedPackage,
          email: email || undefined,
          returnUrl: `${window.location.origin}/export?payment=success`,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect do PayU/P24
        window.location.href = data.data.redirectUrl;
      } else {
        setError(data.error?.message || 'Wystąpił błąd');
      }
    } catch (err) {
      setError('Błąd połączenia');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPkg = EXPORT_PACKAGES[selectedPackage];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kup kredyty eksportu</DialogTitle>
          <DialogDescription>
            Wybierz pakiet i zapłać aby pobrać swój projekt
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Wybór pakietu */}
          <RadioGroup
            value={selectedPackage}
            onValueChange={(v) => setSelectedPackage(v as PackageId)}
          >
            {availablePackages.map(([id, pkg]) => (
              <div
                key={id}
                className={`
                  flex items-center space-x-3 p-4 border rounded-lg cursor-pointer
                  ${selectedPackage === id ? 'border-primary bg-primary/5' : 'border-border'}
                  ${pkg.popular ? 'ring-2 ring-primary' : ''}
                `}
              >
                <RadioGroupItem value={id} id={id} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={id} className="font-medium cursor-pointer">
                      {pkg.name}
                    </Label>
                    {pkg.popular && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                        Popularne
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {pkg.credits === -1
                      ? `Unlimited przez ${pkg.validDays} dni`
                      : `${pkg.credits} eksportów`}
                    {pkg.savings && (
                      <span className="text-green-600 ml-2">
                        Oszczędzasz {pkg.savings}
                      </span>
                    )}
                  </p>
                </div>
                <div className="font-bold">
                  {(pkg.price / 100).toFixed(0)} zł
                </div>
              </div>
            ))}
          </RadioGroup>

          {/* Email (opcjonalny) */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email (opcjonalnie)
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="twoj@email.pl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Podaj email aby móc odzyskać kredyty na innym urządzeniu
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
              {error}
            </div>
          )}

          {/* Info */}
          <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
            <p className="font-medium">Co otrzymujesz:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>
                {selectedPkg.credits === -1
                  ? 'Nieograniczona liczba eksportów'
                  : `${selectedPkg.credits} eksportów do wykorzystania`}
              </li>
              <li>Smart Export - darmowe rewizje przez 24h</li>
              <li>Kredyty ważne 30 dni</li>
              {email && <li>Link do odzyskania kredytów na email</li>}
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Anuluj
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              'Przekierowuję...'
            ) : (
              `Zapłać ${(selectedPkg.price / 100).toFixed(0)} zł`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 4.2 Integracja z ExportDialog

```typescript
// Plik: apps/app/src/components/export/ExportDialog.tsx (rozszerzenie)

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGuestCredits } from '@/hooks/useGuestCredits';
import { useUserCredits } from '@/hooks/useUserCredits';
import { GuestPurchaseModal } from './GuestPurchaseModal';
import { hashProject } from '@/lib/project-hash';

export function ExportDialog({ project, open, onClose }) {
  const { user } = useAuth();
  const guestCredits = useGuestCredits();
  const userCredits = useUserCredits();

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Wybierz odpowiedni hook w zależności od statusu logowania
  const credits = user ? userCredits : guestCredits;

  const handleExport = async () => {
    if (credits.availableCredits <= 0) {
      setShowPurchaseModal(true);
      return;
    }

    setIsExporting(true);

    try {
      const projectHash = hashProject(project);
      const result = await credits.useCredit(projectHash);

      if (result.success) {
        // Generuj i pobierz CSV
        await downloadCSV(project);
      } else if (result.error?.code === 'INSUFFICIENT_CREDITS') {
        setShowPurchaseModal(true);
      } else {
        // Pokaż błąd
        console.error(result.error);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          {/* ... reszta dialogu ... */}

          <div className="flex items-center justify-between py-4 border-t">
            <div className="text-sm">
              {user ? (
                <span>
                  Kredyty: <strong>{credits.availableCredits}</strong>
                </span>
              ) : (
                <span>
                  {credits.availableCredits > 0 ? (
                    <>Kredyty: <strong>{credits.availableCredits}</strong></>
                  ) : (
                    <span className="text-muted-foreground">
                      Brak kredytów
                    </span>
                  )}
                </span>
              )}
            </div>

            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? 'Eksportuję...' : 'Eksportuj CSV'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <GuestPurchaseModal
        open={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onPurchaseComplete={() => {
          setShowPurchaseModal(false);
          handleExport();
        }}
      />
    </>
  );
}
```

---

## 5. Odzyskiwanie kredytów

### 5.1 Przez email

```typescript
// Plik: apps/app/src/components/credits/RecoverCreditsForm.tsx

'use client';

import { useState } from 'react';
import { Button } from '@meble/ui/button';
import { Input } from '@meble/ui/input';

export function RecoverCreditsForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch('/api/guest/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(`Link do odzyskania ${data.data.creditsFound} kredytów został wysłany na ${email}`);
      } else {
        setStatus('error');
        setMessage(data.error?.message || 'Nie znaleziono kredytów');
      }
    } catch {
      setStatus('error');
      setMessage('Błąd połączenia');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          type="email"
          placeholder="Twój email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      {status === 'success' && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded">
          {message}
        </div>
      )}

      {status === 'error' && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
          {message}
        </div>
      )}

      <Button type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Wysyłam...' : 'Odzyskaj kredyty'}
      </Button>
    </form>
  );
}
```

### 5.2 API endpoint

```typescript
// Plik: apps/payments/app/api/guest/recover/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_EMAIL', message: 'Email wymagany' } },
      { status: 400 }
    );
  }

  // Znajdź kredyty z tym emailem
  const { data: guestCredits } = await supabase
    .from('guest_credits')
    .select('*')
    .eq('email', email)
    .is('migrated_to_user_id', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (!guestCredits || guestCredits.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Nie znaleziono kredytów' } },
      { status: 404 }
    );
  }

  // Oblicz sumę dostępnych kredytów
  const totalCredits = guestCredits.reduce(
    (sum, gc) => sum + (gc.credits_total - gc.credits_used),
    0
  );

  // Generuj token recovery
  const recoveryToken = crypto.randomUUID();

  // Zapisz token (opcjonalnie - możesz też wysłać session_id bezpośrednio)
  await supabase.from('recovery_tokens').insert({
    token: recoveryToken,
    email,
    session_ids: guestCredits.map(gc => gc.session_id),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
  });

  // Wyślij email
  await sendEmail({
    to: email,
    subject: 'Odzyskaj swoje kredyty Meblarz',
    html: `
      <h1>Twoje kredyty czekają!</h1>
      <p>Masz <strong>${totalCredits}</strong> kredytów eksportu do wykorzystania.</p>
      <p>
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/recover?token=${recoveryToken}">
          Kliknij tutaj aby odzyskać kredyty
        </a>
      </p>
      <p>Link jest ważny przez 24 godziny.</p>
    `,
  });

  return NextResponse.json({
    success: true,
    data: {
      message: 'Link wysłany na email',
      creditsFound: totalCredits,
    },
  });
}
```

---

## 6. Migracja przy rejestracji

### 6.1 Automatyczna migracja (trigger DB)

Trigger SQL zdefiniowany w `02-DATABASE-SCHEMA.md` automatycznie migruje kredyty gdy użytkownik zakłada konto z emailem powiązanym z guest credits.

### 6.2 Migracja z session_id

```typescript
// Plik: apps/payments/app/api/auth/migrate-credits/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const sessionId = request.headers.get('X-Session-ID');

  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: 'No session ID' },
      { status: 400 }
    );
  }

  // Pobierz guest credits
  const { data: guestCredit } = await supabase
    .from('guest_credits')
    .select('*')
    .eq('session_id', sessionId)
    .is('migrated_to_user_id', null)
    .single();

  if (!guestCredit) {
    return NextResponse.json({
      success: true,
      data: { migrated: 0 },
    });
  }

  const remainingCredits = guestCredit.credits_total - guestCredit.credits_used;

  if (remainingCredits > 0) {
    // Utwórz kredyty dla zalogowanego użytkownika
    await supabase.from('export_credits').insert({
      user_id: session.user.id,
      credits_total: remainingCredits,
      credits_used: 0,
      package_type: 'migrated_guest',
      metadata: {
        migrated_from_session: sessionId,
        original_email: guestCredit.email,
      },
    });
  }

  // Oznacz jako zmigrowane
  await supabase
    .from('guest_credits')
    .update({
      migrated_to_user_id: session.user.id,
      migrated_at: new Date().toISOString(),
    })
    .eq('id', guestCredit.id);

  return NextResponse.json({
    success: true,
    data: { migrated: remainingCredits },
  });
}
```

---

## 7. Zachęta do rejestracji

### 7.1 Banner po eksporcie

```typescript
// Plik: apps/app/src/components/export/RegisterPrompt.tsx

'use client';

import { X } from 'lucide-react';
import { Button } from '@meble/ui/button';

interface RegisterPromptProps {
  creditsRemaining: number;
  expiresAt: string;
  onClose: () => void;
  onRegister: () => void;
}

export function RegisterPrompt({
  creditsRemaining,
  expiresAt,
  onClose,
  onRegister,
}: RegisterPromptProps) {
  const daysRemaining = Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white border shadow-lg rounded-lg p-4 animate-in slide-in-from-bottom">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X className="w-4 h-4" />
      </button>

      <h3 className="font-semibold text-lg mb-2">
        Załóż konto i zyskaj więcej!
      </h3>

      <p className="text-sm text-muted-foreground mb-4">
        Masz jeszcze <strong>{creditsRemaining}</strong> kredytów
        (wygasają za {daysRemaining} dni).
      </p>

      <ul className="text-sm space-y-2 mb-4">
        <li className="flex items-center gap-2">
          <span className="text-green-500">✓</span>
          Kredyty nigdy nie wygasają
        </li>
        <li className="flex items-center gap-2">
          <span className="text-green-500">✓</span>
          Historia projektów i eksportów
        </li>
        <li className="flex items-center gap-2">
          <span className="text-green-500">✓</span>
          +2 darmowe kredyty na start
        </li>
        <li className="flex items-center gap-2">
          <span className="text-green-500">✓</span>
          Dostęp z każdego urządzenia
        </li>
      </ul>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Może później
        </Button>
        <Button onClick={onRegister} className="flex-1">
          Załóż konto
        </Button>
      </div>
    </div>
  );
}
```

---

## 8. Podsumowanie

| Aspekt | Rozwiązanie |
|--------|-------------|
| **Identyfikacja** | `session_id` w localStorage |
| **Backup** | Opcjonalny email |
| **Ważność kredytów** | 30 dni od zakupu |
| **Ponowny dostęp** | Ta sama przeglądarka lub recovery przez email |
| **Migracja** | Auto przy rejestracji (email match lub session merge) |
| **Zachęta do konta** | Banner + bonus kredytów + brak wygasania |

---

*Następny dokument: [06-TENANT-SYSTEM.md](./06-TENANT-SYSTEM.md)*
