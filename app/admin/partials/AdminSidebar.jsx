'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const ICON_PATHS = {
  dashboard: ['M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'],
  categories: ['M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'],
  products: ['M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'],
  orders: ['M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'],
  incomplete: ['M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'],
  home: ['M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'],
  site: [
    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  ],
  sliders: ['M4 6h16M4 10h16M4 14h16M4 18h16'],
  banner: ['M7 7h10v14l-5-3-5 3V7z', 'M7 7V4a1 1 0 011-1h8a1 1 0 011 1v3'],
  social: ['M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z'],
  notifications: ['M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'],
  reports: ['M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'],
  database: ['M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4'],
  transfer: ['M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'],
  user: ['M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'],
};

const iconColors = {
  dashboard: { bg: 'bg-indigo-100', text: 'text-indigo-600', darkBg: 'dark:bg-indigo-900/30', darkText: 'dark:text-indigo-400' },
  categories: { bg: 'bg-emerald-100', text: 'text-emerald-600', darkBg: 'dark:bg-emerald-900/30', darkText: 'dark:text-emerald-400' },
  products: { bg: 'bg-blue-100', text: 'text-blue-600', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-400' },
  orders: { bg: 'bg-amber-100', text: 'text-amber-600', darkBg: 'dark:bg-amber-900/30', darkText: 'dark:text-amber-400' },
  incomplete: { bg: 'bg-orange-100', text: 'text-orange-600', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-400' },
  home: { bg: 'bg-slate-100', text: 'text-slate-600', darkBg: 'dark:bg-slate-800', darkText: 'dark:text-slate-400' },
  site: { bg: 'bg-sky-100', text: 'text-sky-600', darkBg: 'dark:bg-sky-900/30', darkText: 'dark:text-sky-400' },
  sliders: { bg: 'bg-purple-100', text: 'text-purple-600', darkBg: 'dark:bg-purple-900/30', darkText: 'dark:text-purple-400' },
  banner: { bg: 'bg-orange-100', text: 'text-orange-600', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-400' },
  social: { bg: 'bg-rose-100', text: 'text-rose-600', darkBg: 'dark:bg-rose-900/30', darkText: 'dark:text-rose-400' },
  notifications: { bg: 'bg-teal-100', text: 'text-teal-600', darkBg: 'dark:bg-teal-900/30', darkText: 'dark:text-teal-400' },
  reports: { bg: 'bg-fuchsia-100', text: 'text-fuchsia-600', darkBg: 'dark:bg-fuchsia-900/30', darkText: 'dark:text-fuchsia-400' },
  database: { bg: 'bg-cyan-100', text: 'text-cyan-600', darkBg: 'dark:bg-cyan-900/30', darkText: 'dark:text-cyan-400' },
  transfer: { bg: 'bg-violet-100', text: 'text-violet-600', darkBg: 'dark:bg-violet-900/30', darkText: 'dark:text-violet-400' },
  user: { bg: 'bg-green-100', text: 'text-green-600', darkBg: 'dark:bg-green-900/30', darkText: 'dark:text-green-400' },
};

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: 'dashboard' },
  { label: 'Orders', href: '/admin/orders', icon: 'orders' },
  { label: 'Incomplete Orders', href: '/admin/incomplete-orders', icon: 'incomplete' },
  { label: 'Products', href: '/admin/products', icon: 'products' },
  { label: 'Categories', href: '/admin/categories', icon: 'categories' },
];

const blogSubItems = [
  { label: 'Categories', href: '/admin/blog/categories', icon: 'categories' },
  { label: 'Posts', href: '/admin/blog/posts', icon: 'products' },
  { label: 'Advertisements', href: '/admin/blog/advertisements', icon: 'site' },
];

const reportsSubItems = [
  { label: 'Sales Report', href: '/admin/reports/sales', icon: 'reports' },
];

const usersSubItems = [
  { label: 'All Users', href: '/admin/users', icon: 'user' },
];

const websiteSubItems = [
  { label: 'Site Setting', href: '/admin/settings/site', icon: 'site' },
  { label: 'Hero Sliders', href: '/admin/settings/hero-sliders', icon: 'sliders' },
  { label: 'Promo Banner', href: '/admin/settings/promo-banner', icon: 'banner' },
  { label: 'Social Media', href: '/admin/settings/social', icon: 'social' },
];

const settingsSubItems = [
  { label: 'Site Config', href: '/admin/settings/site-config', icon: 'notifications' },
  { label: 'Catalog I/O', href: '/admin/settings/catalog-import-export', icon: 'transfer' },
  { label: 'Backup DB', href: '/admin/settings/backup-db', icon: 'database' },
];

const isActive = (pathname, href) =>
  pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(`${href}/`));

function NavIcon({ icon }) {
  const paths = ICON_PATHS[icon];
  if (!paths) return null;
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {paths.map((d, i) => (
        <path key={i} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
      ))}
    </svg>
  );
}

function ColorIcon({ icon, size = 'md' }) {
  const c = iconColors[icon] || iconColors.home;
  const box = size === 'sm' ? 'h-5 w-5 rounded' : 'h-6 w-6 rounded-md';
  return (
    <div className={`flex shrink-0 items-center justify-center ${box} ${c.bg} ${c.text} ${c.darkBg} ${c.darkText}`}>
      <NavIcon icon={icon} />
    </div>
  );
}

function SectionLabel({ color, label }) {
  return (
    <div className="mb-1.5 flex items-center gap-2 px-3">
      <div className={`h-1 w-1 rounded-full ${color}`} />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
    </div>
  );
}

function NavLink({ item, pathname, onClose }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
        active
          ? 'bg-[#2f0f6b]/5 text-[#2f0f6b] dark:bg-[#a78bfa]/10 dark:text-[#a78bfa]'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
      }`}
    >
      {active && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-[#2f0f6b] dark:bg-[#a78bfa]" />}
      <ColorIcon icon={item.icon} />
      {item.label}
    </Link>
  );
}

function SubLink({ item, pathname, onClose }) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={`group flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
        active
          ? 'bg-[#2f0f6b]/5 text-[#2f0f6b] dark:bg-[#a78bfa]/10 dark:text-[#a78bfa]'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
      }`}
    >
      <ColorIcon icon={item.icon} size="sm" />
      {item.label}
    </Link>
  );
}

function CollapsibleGroup({ label, icon, items, pathname, onClose }) {
  const active = items.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  const [open, setOpen] = useState(active);

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
          active
            ? 'bg-[#2f0f6b]/5 text-[#2f0f6b] dark:bg-[#a78bfa]/10 dark:text-[#a78bfa]'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
        }`}
      >
        {active && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-[#2f0f6b] dark:bg-[#a78bfa]" />}
        <ColorIcon icon={icon} />
        <span className="flex-1 text-left">{label}</span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-100 pl-3 dark:border-slate-700">
          {items.map((item) => (
            <SubLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
          ))}
        </div>
      </div>
    </>
  );
}

function Divider() {
  return <div className="my-3 border-t border-slate-100 dark:border-slate-800" />;
}

export default function AdminSidebar({ sidebarOpen, onClose, pathname, onLogout, loggingOut }) {
  const [settings, setSettings] = useState({ logo: '', siteName: '' });

  useEffect(() => {
    fetch('/api/admin/settings/site')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setSettings({ logo: data.logo || '', siteName: data.siteName || '' }); })
      .catch(() => {});
  }, []);

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        suppressHydrationWarning
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-white border-r border-slate-200 shadow-lg transition-transform duration-300 lg:shadow-none lg:translate-x-0 dark:bg-slate-900 dark:border-slate-700 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-800">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            {settings.logo ? (
              <img src={settings.logo} alt={settings.siteName || 'Logo'} className="h-10 w-auto object-contain" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#2f0f6b] to-[#6d28d9] text-xs font-bold text-white shadow-sm">R</div>
            )}
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
          ))}

          <Divider />
          <SectionLabel color="bg-rose-400" label="Blog" />
          {blogSubItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
          ))}

          <Divider />
          <SectionLabel color="bg-fuchsia-400" label="Reports" />
          {reportsSubItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
          ))}

          <Divider />
          <SectionLabel color="bg-green-400" label="Users" />
          {usersSubItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
          ))}

          <Divider />
          <CollapsibleGroup label="Website" icon="home" items={websiteSubItems} pathname={pathname} onClose={onClose} />
          <CollapsibleGroup label="Settings" icon="site" items={settingsSubItems} pathname={pathname} onClose={onClose} />
        </nav>

        <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            {loggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </aside>
    </>
  );
}