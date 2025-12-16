/**
 * Admin Users Page
 *
 * User management with search, filtering, and credit editing.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, RefreshCw, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Button, Input } from '@meble/ui';
import Link from 'next/link';

// Use local API routes (same-origin, cookies work)
const API_BASE = '/api';
const SEARCH_DEBOUNCE_MS = 300;

interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  displayName: string | null;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  credits: {
    total: number;
    used: number;
    available: number;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Date formatter - created once, reused
const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function formatDate(dateStr: string): string {
  return dateFormatter.format(new Date(dateStr));
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchUsers = useCallback(async (page = 1, searchQuery = '') => {
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

      const response = await fetch(`${API_BASE}/admin/users?${params}`, {
        signal: abortControllerRef.current.signal,
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch users');
      }

      setUsers(data.data.users);
      setPagination(data.data.pagination);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchUsers(1, '');
    return () => {
      // Cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchUsers]);

  // Debounced search effect
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

  // Fetch when debounced search changes
  useEffect(() => {
    // Skip initial empty search (handled by initial fetch)
    if (debouncedSearch !== '') {
      fetchUsers(1, debouncedSearch);
    }
  }, [debouncedSearch, fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Immediate search on form submit
    fetchUsers(1, search);
  };

  const handlePageChange = useCallback((newPage: number) => {
    fetchUsers(newPage, search);
  }, [fetchUsers, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Użytkownicy</h1>
          <p className="text-muted-foreground">
            Zarządzanie użytkownikami i kredytami
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchUsers(pagination.page, search)}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Odśwież
        </Button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
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

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Użytkownik</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Kredyty</th>
                <th className="text-left p-3 font-medium">Data rejestracji</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Ładowanie...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Nie znaleziono użytkowników
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <span className="font-medium">
                            {user.displayName || user.fullName || '-'}
                          </span>
                          {user.isAdmin && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{user.email}</td>
                    <td className="p-3">
                      <span className="font-medium">
                        {user.credits.available}
                      </span>
                      <span className="text-muted-foreground text-xs ml-1">
                        / {user.credits.total}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                          user.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.isActive ? 'Aktywny' : 'Nieaktywny'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-primary hover:underline"
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
              Wyświetlono {users.length} z {pagination.total} użytkowników
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
    </div>
  );
}
