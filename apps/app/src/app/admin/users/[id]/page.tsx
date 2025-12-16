/**
 * Admin User Detail Page
 *
 * View and manage individual user details, credits, payments, exports.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  User,
  CreditCard,
  Receipt,
  FileDown,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@meble/ui';
import Link from 'next/link';

// Use local API routes (same-origin, cookies work)
const API_BASE = '/api';

// Date formatter - created once, reused
const dateTimeFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const currencyFormatter = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
});

// Utility functions outside component to avoid recreation
function formatDate(dateStr: string): string {
  return dateTimeFormatter.format(new Date(dateStr));
}

function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount / 100);
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

function getStatusBadge(status: string): string {
  return STATUS_BADGE_COLORS[status] || 'bg-gray-100 text-gray-800';
}

interface UserDetail {
  id: string;
  email: string;
  fullName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  isBetaTester: boolean;
  loginCount: number;
  lastLoginAt: string | null;
  createdAt: string;
  bannedAt: string | null;
  banReason: string | null;
}

interface CreditItem {
  id: string;
  packageType: string;
  creditsTotal: number;
  creditsUsed: number;
  creditsAvailable: number;
  validUntil: string | null;
  createdAt: string;
}

interface PaymentItem {
  id: string;
  type: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface ExportItem {
  id: string;
  projectHash: string;
  partsCount: number;
  format: string;
  isFreeReexport: boolean;
  createdAt: string;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [credits, setCredits] = useState<{
    summary: { total: number; used: number; available: number };
    items: CreditItem[];
  } | null>(null);
  const [payments, setPayments] = useState<{
    summary: { totalPaid: number; completedCount: number };
    items: PaymentItem[];
  } | null>(null);
  const [exports, setExports] = useState<{
    count: number;
    items: ExportItem[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Credit dialog state
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditAction, setCreditAction] = useState<'add' | 'set'>('add');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Abort controller for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchUserDetail = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
        signal: abortControllerRef.current.signal,
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch user');
      }

      setUser(data.data.user);
      setCredits(data.data.credits);
      setPayments(data.data.payments);
      setExports(data.data.exports);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUserDetail();
    }
    return () => {
      // Cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [userId, fetchUserDetail]);

  const handleSaveCredits = useCallback(async () => {
    // Validate input
    const amount = parseInt(creditAmount, 10);
    if (isNaN(amount) || amount < 0) {
      setDialogError('Liczba kredytów musi być liczbą nieujemną');
      return;
    }

    try {
      setIsSaving(true);
      setDialogError(null);

      const response = await fetch(`${API_BASE}/admin/users/${userId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: creditAction,
          amount,
          reason: creditReason || undefined,
          packageType: 'bonus',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to save credits');
      }

      // Refresh user data
      await fetchUserDetail();

      // Close dialog and reset form
      setCreditDialogOpen(false);
      setCreditAmount('');
      setCreditReason('');
      setDialogError(null);
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Nie udało się zapisać kredytów');
    } finally {
      setIsSaving(false);
    }
  }, [creditAction, creditAmount, creditReason, fetchUserDetail, userId]);

  // Reset dialog error when closing
  const handleDialogOpenChange = useCallback((open: boolean) => {
    setCreditDialogOpen(open);
    if (!open) {
      setDialogError(null);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg">{error || 'Nie znaleziono użytkownika'}</p>
        <Button onClick={() => router.push('/admin/users')}>
          Wróć do listy
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/users"
          className="p-2 rounded-md hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {user.displayName || user.fullName || user.email}
          </h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchUserDetail}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Odśwież
        </Button>
      </div>

      {/* User Info Card */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">Informacje</p>
              <p className="text-sm text-muted-foreground">Dane użytkownika</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  user.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {user.isActive ? 'Aktywny' : 'Nieaktywny'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Logowań</span>
              <span>{user.loginCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ostatnie logowanie</span>
              <span>{user.lastLoginAt ? formatDate(user.lastLoginAt) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rejestracja</span>
              <span>{formatDate(user.createdAt)}</span>
            </div>
            {user.isBetaTester && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Beta tester</span>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            )}
          </div>
        </div>

        {/* Credits Card */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Kredyty</p>
                <p className="text-sm text-muted-foreground">Saldo eksportów</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setCreditDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Dodaj
            </Button>
          </div>
          {credits && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dostępne</span>
                <span className="font-semibold text-lg text-primary">
                  {credits.summary.available}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Wykorzystane</span>
                <span>{credits.summary.used}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Łącznie przyznane</span>
                <span>{credits.summary.total}</span>
              </div>
            </div>
          )}
        </div>

        {/* Payments Card */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <Receipt className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-semibold">Płatności</p>
              <p className="text-sm text-muted-foreground">Historia transakcji</p>
            </div>
          </div>
          {payments && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Łączna wartość</span>
                <span className="font-semibold text-lg">
                  {formatCurrency(payments.summary.totalPaid)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Liczba płatności</span>
                <span>{payments.summary.completedCount}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Credits History */}
      {credits && credits.items.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Historia kredytów</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Pakiet</th>
                  <th className="text-left p-3 font-medium">Przyznane</th>
                  <th className="text-left p-3 font-medium">Wykorzystane</th>
                  <th className="text-left p-3 font-medium">Pozostało</th>
                  <th className="text-left p-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {credits.items.map((credit) => (
                  <tr key={credit.id} className="border-b last:border-0">
                    <td className="p-3">
                      <span className="capitalize">{credit.packageType}</span>
                    </td>
                    <td className="p-3">{credit.creditsTotal}</td>
                    <td className="p-3">{credit.creditsUsed}</td>
                    <td className="p-3 font-medium">{credit.creditsAvailable}</td>
                    <td className="p-3 text-muted-foreground">
                      {formatDate(credit.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payments History */}
      {payments && payments.items.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Historia płatności</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Typ</th>
                  <th className="text-left p-3 font-medium">Provider</th>
                  <th className="text-left p-3 font-medium">Kwota</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {payments.items.map((payment) => (
                  <tr key={payment.id} className="border-b last:border-0">
                    <td className="p-3 capitalize">{payment.type}</td>
                    <td className="p-3 uppercase text-xs">{payment.provider}</td>
                    <td className="p-3 font-medium">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(
                          payment.status
                        )}`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatDate(payment.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Exports History */}
      {exports && exports.items.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b">
            <h3 className="font-semibold">
              Historia eksportów ({exports.count})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Projekt</th>
                  <th className="text-left p-3 font-medium">Części</th>
                  <th className="text-left p-3 font-medium">Format</th>
                  <th className="text-left p-3 font-medium">Typ</th>
                  <th className="text-left p-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {exports.items.map((exp) => (
                  <tr key={exp.id} className="border-b last:border-0">
                    <td className="p-3 font-mono text-xs">
                      {exp.projectHash.substring(0, 12)}...
                    </td>
                    <td className="p-3">{exp.partsCount}</td>
                    <td className="p-3 uppercase text-xs">{exp.format}</td>
                    <td className="p-3">
                      {exp.isFreeReexport ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Darmowy
                        </span>
                      ) : (
                        <span>Płatny</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatDate(exp.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Credit Dialog */}
      <Dialog open={creditDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zarządzaj kredytami</DialogTitle>
            <DialogDescription>
              Dodaj lub ustaw kredyty dla użytkownika {user.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {dialogError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p>{dialogError}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">Akcja</label>
              <Select
                value={creditAction}
                onValueChange={(v) => setCreditAction(v as 'add' | 'set')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Dodaj kredyty</SelectItem>
                  <SelectItem value="set">Ustaw kredyty bonus</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {creditAction === 'add'
                  ? 'Utworzy nowy pakiet kredytów typu "bonus"'
                  : 'Zaktualizuje istniejący pakiet bonus lub utworzy nowy'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Liczba kredytów
              </label>
              <Input
                type="number"
                min="0"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="np. 10"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Powód (opcjonalnie)
              </label>
              <Input
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="np. Bonus za rejestrację"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={isSaving}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleSaveCredits}
              disabled={!creditAmount || isSaving}
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
