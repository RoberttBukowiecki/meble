/**
 * Admin Credits Page
 *
 * Comprehensive credits management with stats, filtering, and bulk operations.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Users,
  TrendingUp,
  Infinity,
  Filter,
  Plus,
  Download,
  User,
  Clock,
  Package,
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

const API_BASE = '/api';
const SEARCH_DEBOUNCE_MS = 300;

// Package type labels in Polish
const PACKAGE_TYPE_LABELS: Record<string, string> = {
  single: 'Pojedynczy',
  starter: 'Starter',
  standard: 'Standard',
  pro: 'Pro',
  migrated_guest: 'Migrowany gość',
  bonus: 'Bonus',
};

// Date formatter - created once, reused
const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDate(dateStr: string): string {
  return dateFormatter.format(new Date(dateStr));
}

function formatShortDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
}

interface CreditsStats {
  totalCredits: number;
  totalUsed: number;
  totalAvailable: number;
  totalUsers: number;
  unlimitedUsers: number;
  byPackageType: Record<string, number>;
}

interface GuestStats {
  activeGuests: number;
  totalCredits: number;
  totalUsed: number;
}

interface CreditItem {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  creditsTotal: number;
  creditsUsed: number;
  creditsAvailable: number;
  packageType: string;
  isUnlimited: boolean;
  validUntil: string | null;
  paymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RecentActivity {
  id: string;
  action: string;
  userId: string;
  adminUserId: string | null;
  oldValues: { credits_total?: number } | null;
  newValues: { credits_total?: number } | null;
  metadata: { operation?: string; amount?: number; reason?: string } | null;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Stats Card Component
function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
      {trend && (
        <div className={`mt-2 text-xs ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
          {trend.positive ? '+' : ''}{trend.value}% vs poprzedni miesiąc
        </div>
      )}
    </div>
  );
}

export default function AdminCreditsPage() {
  const [stats, setStats] = useState<CreditsStats | null>(null);
  const [guestStats, setGuestStats] = useState<GuestStats | null>(null);
  const [credits, setCredits] = useState<CreditItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [packageTypeFilter, setPackageTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bulk dialog state
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchCredits = useCallback(async (
    page = 1,
    searchQuery = '',
    packageType = ''
  ) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });

      if (searchQuery) {
        params.set('search', searchQuery);
      }

      if (packageType) {
        params.set('packageType', packageType);
      }

      const response = await fetch(`${API_BASE}/admin/credits?${params}`, {
        signal: abortControllerRef.current.signal,
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch credits');
      }

      setStats(data.data.stats);
      setGuestStats(data.data.guestStats);
      setCredits(data.data.credits);
      setRecentActivity(data.data.recentActivity || []);
      setPagination(data.data.pagination);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to fetch credits');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCredits(1, '', '');
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchCredits]);

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [search]);

  // Fetch when debounced search or filter changes
  useEffect(() => {
    fetchCredits(1, debouncedSearch, packageTypeFilter);
  }, [debouncedSearch, packageTypeFilter, fetchCredits]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCredits(1, search, packageTypeFilter);
  };

  const handlePageChange = useCallback((newPage: number) => {
    fetchCredits(newPage, search, packageTypeFilter);
  }, [fetchCredits, search, packageTypeFilter]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleAllUsers = () => {
    if (selectedUsers.size === credits.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(credits.map((c) => c.userId)));
    }
  };

  const handleBulkAddCredits = useCallback(async () => {
    const amount = parseInt(bulkAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setBulkError('Liczba kredytów musi być większa od 0');
      return;
    }

    if (selectedUsers.size === 0) {
      setBulkError('Wybierz przynajmniej jednego użytkownika');
      return;
    }

    try {
      setIsBulkSaving(true);
      setBulkError(null);

      const response = await fetch(`${API_BASE}/admin/credits/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          items: Array.from(selectedUsers).map((userId) => ({
            userId,
            amount,
          })),
          reason: bulkReason || undefined,
          packageType: 'bonus',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to add credits');
      }

      // Refresh data
      await fetchCredits(pagination.page, search, packageTypeFilter);

      // Reset dialog
      setBulkDialogOpen(false);
      setBulkAmount('');
      setBulkReason('');
      setSelectedUsers(new Set());
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Nie udało się dodać kredytów');
    } finally {
      setIsBulkSaving(false);
    }
  }, [bulkAmount, bulkReason, selectedUsers, fetchCredits, pagination.page, search, packageTypeFilter]);

  const handleDialogOpenChange = (open: boolean) => {
    setBulkDialogOpen(open);
    if (!open) {
      setBulkError(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kredyty</h1>
          <p className="text-muted-foreground">
            Zarządzanie kredytami eksportów
          </p>
        </div>
        <div className="flex gap-2">
          {selectedUsers.size > 0 && (
            <Button onClick={() => setBulkDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj kredyty ({selectedUsers.size})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCredits(pagination.page, search, packageTypeFilter)}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Odśwież
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Dostępne kredyty"
            value={stats.totalAvailable.toLocaleString('pl-PL')}
            subtitle={`z ${stats.totalCredits.toLocaleString('pl-PL')} przyznanych`}
            icon={CreditCard}
          />
          <StatsCard
            title="Wykorzystane"
            value={stats.totalUsed.toLocaleString('pl-PL')}
            subtitle={stats.totalCredits > 0 ? `${Math.round((stats.totalUsed / stats.totalCredits) * 100)}% zużycia` : undefined}
            icon={TrendingUp}
          />
          <StatsCard
            title="Użytkownicy z kredytami"
            value={stats.totalUsers}
            subtitle={stats.unlimitedUsers > 0 ? `w tym ${stats.unlimitedUsers} bez limitu` : undefined}
            icon={Users}
          />
          {guestStats && (
            <StatsCard
              title="Aktywni goście"
              value={guestStats.activeGuests}
              subtitle={`${guestStats.totalCredits - guestStats.totalUsed} dostępnych kredytów`}
              icon={User}
            />
          )}
        </div>
      )}

      {/* Package Type Breakdown */}
      {stats?.byPackageType && Object.keys(stats.byPackageType).length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Podział wg typu pakietu
          </h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.byPackageType).map(([type, count]) => (
              <div
                key={type}
                className="px-3 py-2 rounded-lg bg-muted text-sm"
              >
                <span className="font-medium">{PACKAGE_TYPE_LABELS[type] || type}</span>
                <span className="text-muted-foreground ml-2">({count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Szukaj po email lub nazwie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            Szukaj
          </Button>
        </form>

        <Select
          value={packageTypeFilter || 'all'}
          onValueChange={(v) => setPackageTypeFilter(v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Typ pakietu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie typy</SelectItem>
            {Object.entries(PACKAGE_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
          {error}
        </div>
      )}

      {/* Credits Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium w-12">
                  <input
                    type="checkbox"
                    checked={credits.length > 0 && selectedUsers.size === credits.length}
                    onChange={toggleAllUsers}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="text-left p-3 font-medium">Użytkownik</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Pakiet</th>
                <th className="text-right p-3 font-medium">Przyznane</th>
                <th className="text-right p-3 font-medium">Wykorzystane</th>
                <th className="text-right p-3 font-medium">Dostępne</th>
                <th className="text-left p-3 font-medium">Ważność</th>
                <th className="text-left p-3 font-medium">Data utworzenia</th>
                <th className="text-right p-3 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && credits.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    Ładowanie...
                  </td>
                </tr>
              ) : credits.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    Nie znaleziono kredytów
                  </td>
                </tr>
              ) : (
                credits.map((credit) => (
                  <tr
                    key={credit.id}
                    className={`border-b last:border-0 hover:bg-muted/30 ${
                      selectedUsers.has(credit.userId) ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(credit.userId)}
                        onChange={() => toggleUserSelection(credit.userId)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="p-3">
                      <span className="font-medium">
                        {credit.userName || '-'}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {credit.userEmail}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-muted">
                        {PACKAGE_TYPE_LABELS[credit.packageType] || credit.packageType}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono">
                      {credit.isUnlimited ? (
                        <span className="flex items-center justify-end gap-1 text-primary">
                          <Infinity className="h-4 w-4" />
                        </span>
                      ) : (
                        credit.creditsTotal
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {credit.creditsUsed}
                    </td>
                    <td className="p-3 text-right font-mono font-medium">
                      {credit.isUnlimited ? (
                        <span className="text-primary">Bez limitu</span>
                      ) : (
                        <span className={credit.creditsAvailable > 0 ? 'text-green-600' : 'text-muted-foreground'}>
                          {credit.creditsAvailable}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {credit.validUntil ? (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatShortDate(credit.validUntil)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatShortDate(credit.createdAt)}
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/admin/users/${credit.userId}`}
                        className="text-primary hover:underline text-sm"
                      >
                        Szczegóły
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t">
            <p className="text-sm text-muted-foreground">
              Wyświetlono {credits.length} z {pagination.total} rekordów
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Strona {pagination.page} z {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Ostatnia aktywność</h3>
          </div>
          <div className="divide-y">
            {recentActivity.slice(0, 10).map((activity) => (
              <div key={activity.id} className="p-4 flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">
                      {activity.metadata?.operation === 'add' ? 'Dodano' : 'Ustawiono'}
                    </span>
                    {' '}
                    {activity.metadata?.amount && (
                      <span className="text-primary font-medium">
                        {activity.metadata.amount} kredytów
                      </span>
                    )}
                    {activity.metadata?.reason && (
                      <span className="text-muted-foreground">
                        {' - '}{activity.metadata.reason}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    User ID: {activity.userId}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(activity.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Add Credits Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj kredyty zbiorowo</DialogTitle>
            <DialogDescription>
              Dodaj kredyty do {selectedUsers.size} wybranych użytkowników
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {bulkError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {bulkError}
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Liczba kredytów do dodania
              </label>
              <Input
                type="number"
                min="1"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                placeholder="np. 10"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Powód (opcjonalnie)
              </label>
              <Input
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                placeholder="np. Promocja świąteczna"
              />
            </div>
            <div className="p-3 rounded-lg bg-muted text-sm">
              <p className="font-medium">Podsumowanie:</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>Użytkownicy: {selectedUsers.size}</li>
                <li>Kredyty na użytkownika: {bulkAmount || 0}</li>
                <li>
                  Łącznie kredytów: {(parseInt(bulkAmount) || 0) * selectedUsers.size}
                </li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={isBulkSaving}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleBulkAddCredits}
              disabled={!bulkAmount || isBulkSaving}
            >
              {isBulkSaving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Dodaj kredyty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
