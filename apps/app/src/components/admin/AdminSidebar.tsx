/**
 * Admin Sidebar Component
 *
 * Navigation sidebar for admin panel.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  Building2,
  FileText,
  Settings,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const navItems: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/users',
    label: 'Użytkownicy',
    icon: Users,
  },
  {
    href: '/admin/credits',
    label: 'Kredyty',
    icon: CreditCard,
  },
  {
    href: '/admin/orders',
    label: 'Zamówienia',
    icon: Package,
  },
  {
    href: '/admin/tenants',
    label: 'Tenanci',
    icon: Building2,
  },
  {
    href: '/admin/audit',
    label: 'Audit Log',
    icon: FileText,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  // Remove locale prefix from pathname for comparison
  const cleanPath = pathname.replace(/^\/(pl|en)/, '') || '/admin';

  const isActive = (href: string) => {
    if (href === '/admin') {
      return cleanPath === '/admin';
    }
    return cleanPath.startsWith(href);
  };

  return (
    <aside className="w-64 border-r bg-card min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Settings className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold">Panel Admin</h2>
            <p className="text-xs text-muted-foreground">Meblarz</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Wróć do aplikacji</span>
        </Link>
      </div>
    </aside>
  );
}
