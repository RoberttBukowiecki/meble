/**
 * Admin Layout
 *
 * Wraps all admin pages with sidebar navigation and auth guard.
 */

import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container max-w-7xl py-6 px-6">{children}</div>
        </main>
      </div>
    </AdminGuard>
  );
}
