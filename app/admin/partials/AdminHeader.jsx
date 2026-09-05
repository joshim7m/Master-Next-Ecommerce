'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '../../../src/components/admin/ThemeProvider';

export default function AdminHeader({ onMenuToggle, currentTitle, onLogout, loggingOut }) {
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setUser(data))
      .catch(() => {});
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'A';

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleDropdownLogout = () => {
    setDropdownOpen(false);
    onLogout();
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-slate-200 bg-white/80 px-4 backdrop-blur-lg sm:px-6 lg:pl-72 dark:border-slate-700 dark:bg-slate-800/80">
      {/* Left: hamburger */}
      <div className="flex items-center gap-3 min-w-0 flex-1 lg:flex-none">
        <button
          type="button"
          onClick={onMenuToggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition lg:hidden dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Right: theme toggle + avatar */}
      <div className="flex items-center justify-end gap-3 lg:ml-auto lg:flex-none">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Avatar dropdown */}
        <div ref={dropdownRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2f0f6b] text-sm font-semibold text-white transition hover:opacity-90"
          >
            {initials}
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={handleDropdownLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {loggingOut ? 'Logging out\u2026' : 'Logout'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
