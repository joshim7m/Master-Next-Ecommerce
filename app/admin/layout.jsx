'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AdminSidebar from './partials/AdminSidebar';
import AdminHeader from './partials/AdminHeader';
import { ThemeProvider } from '../../src/components/admin/ThemeProvider';

const pageTitles = {
  '/admin/dashboard': 'Dashboard',
  '/admin/categories': 'Categories',
  '/admin/products': 'Products',
  '/admin/products/create': 'Create Product',
  '/admin/products/edit': 'Edit Product',
  '/admin/orders': 'Orders',
  '/admin/orders/': 'Order Detail',
  '/admin/settings/home': 'Home Setting',
  '/admin/settings/site': 'Site Setting',
  '/admin/settings/hero-sliders': 'Hero Sliders',
  '/admin/settings/social': 'Social Media',
  '/admin/settings/catalog-import-export': 'Catalog Import / Export',
  '/admin/settings/backup-db': 'Backup DB',
};

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLogin = pathname === '/admin/login';

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    router.push('/admin/login');
  };

  if (isLogin) {
    return <>{children}</>;
  }

  const currentTitle = Object.entries(pageTitles).find(([key]) =>
    pathname === key || pathname.startsWith(key + '/')
  )?.[1] || 'Admin';

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <AdminSidebar
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          pathname={pathname}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />

        <AdminHeader
          onMenuToggle={() => setSidebarOpen(true)}
          currentTitle={currentTitle}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />

        <main className="lg:pl-64">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </ThemeProvider>
  );
}
