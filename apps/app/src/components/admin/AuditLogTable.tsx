/**
 * Audit Log Table Component
 *
 * Displays audit log entries in a table.
 */

'use client';

import { Badge } from '@meble/ui';
import type { AuditLog } from '@/hooks/useAdmin';

interface AuditLogTableProps {
  logs: AuditLog[];
  isLoading?: boolean;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  login: 'bg-purple-100 text-purple-800',
  logout: 'bg-gray-100 text-gray-800',
  payment: 'bg-amber-100 text-amber-800',
  refund: 'bg-orange-100 text-orange-800',
  suspend: 'bg-red-100 text-red-800',
  activate: 'bg-green-100 text-green-800',
  config_change: 'bg-cyan-100 text-cyan-800',
  export: 'bg-indigo-100 text-indigo-800',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Utworzono',
  update: 'Zmieniono',
  delete: 'Usunięto',
  login: 'Logowanie',
  logout: 'Wylogowanie',
  payment: 'Płatność',
  refund: 'Zwrot',
  suspend: 'Zawieszono',
  activate: 'Aktywowano',
  config_change: 'Konfiguracja',
  export: 'Eksport',
};

const RESOURCE_LABELS: Record<string, string> = {
  user: 'Użytkownik',
  tenant: 'Tenant',
  order: 'Zamówienie',
  payment: 'Płatność',
  payout: 'Wypłata',
  producer: 'Producent',
  material: 'Materiał',
  subscription: 'Subskrypcja',
};

export function AuditLogTable({ logs, isLoading }: AuditLogTableProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading && !logs.length) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="p-8 text-center text-muted-foreground">
          Ładowanie...
        </div>
      </div>
    );
  }

  if (!logs.length) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="p-8 text-center text-muted-foreground">
          Brak wpisów w logu
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Data</th>
              <th className="text-left p-3 font-medium">Akcja</th>
              <th className="text-left p-3 font-medium">Zasób</th>
              <th className="text-left p-3 font-medium">Użytkownik</th>
              <th className="text-left p-3 font-medium">Szczegóły</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-3 whitespace-nowrap text-muted-foreground">
                  {formatDate(log.createdAt)}
                </td>
                <td className="p-3">
                  <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'}`}>
                    {ACTION_LABELS[log.action] || log.action}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {RESOURCE_LABELS[log.resourceType] || log.resourceType}
                    </span>
                    {log.resourceId && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {log.resourceId.substring(0, 8)}...
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <span className="text-muted-foreground">
                    {log.adminEmail || log.userEmail || '-'}
                  </span>
                </td>
                <td className="p-3">
                  {log.newValues && (
                    <details className="cursor-pointer">
                      <summary className="text-muted-foreground hover:text-foreground">
                        Pokaż zmiany
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto max-w-md">
                        {JSON.stringify(log.newValues, null, 2)}
                      </pre>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
