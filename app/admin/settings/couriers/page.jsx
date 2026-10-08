'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCourierServices, deleteCourierService, setCourierServiceEnabled } from '../../../../src/actions/courierServices';
import ConfirmDialog from '../../../../src/components/ConfirmDialog';

const STATUS_BADGE = {
  ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'credentials-pending': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'adapter-pending': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  disabled: 'bg-slate-100 text-slate-500 dark:bg-slate-900/30 dark:text-slate-400',
};

const STATUS_LABEL = {
  ready: 'Ready',
  'credentials-pending': 'Credentials pending',
  'adapter-pending': 'Integration pending',
  disabled: 'Disabled',
};

const SECRET_LABEL = {
  apiKey: 'API key',
  secretKey: 'Secret key',
  webhookToken: 'Webhook token',
};

export default function AdminCourierServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [busy, setBusy] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = () => {
    setLoading(true);
    setLoadError('');
    getCourierServices()
      .then(setServices)
      .catch(() => {
        setServices([]);
        setLoadError('Could not load courier services — check that the server is running, then refresh.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, []);

  const handleToggle = async (svc) => {
    setBusy(svc.provider);
    try {
      await setCourierServiceEnabled(svc.provider, !svc.enabled);
      fetchData();
    } catch {
    } finally {
      setBusy('');
    }
  };

  const handleDelete = (svc) => {
    setPendingDelete(svc);
  };

  const performDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteCourierService(pendingDelete.provider);
      setPendingDelete(null);
      fetchData();
    } catch {
    } finally {
      setDeleting(false);
    }
  };

  const filtered = services.filter((s) => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${s.name} ${s.provider}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Courier Services</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} {filtered.length === 1 ? 'service' : 'services'} · credentials stay on the server, never in the browser
          </p>
        </div>
        <Link
          href="/admin/settings/couriers/create"
          className="shrink-0 rounded-lg bg-[#2f0f6b] px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#2f0f6b]/90 transition dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90"
        >
          + New Courier Service
        </Link>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
          {loadError}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
        >
          <option value="">Status</option>
          <option value="ready">Ready</option>
          <option value="credentials-pending">Credentials pending</option>
          <option value="adapter-pending">Integration pending</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50">
              <th className="w-10 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">SN</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Service</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Credentials</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Enabled</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map((svc, index) => (
              <tr key={svc.provider} className="hover:bg-slate-50/50 transition-colors dark:hover:bg-slate-700/30">
                <td className="w-10 py-3 text-center text-slate-500 whitespace-nowrap dark:text-slate-400">{index + 1}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/settings/couriers/edit/${svc.provider}`}
                    className="block font-medium text-slate-900 hover:text-[#2f0f6b] transition dark:text-white dark:hover:text-[#a78bfa]"
                  >
                    {svc.name}
                  </Link>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {svc.provider}
                    <span className="mx-1">·</span>
                    {svc.hasAdapter ? `built-in API (${svc.adapterLabel})` : 'no integration yet'}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex h-5 min-w-[3.5rem] items-center justify-center whitespace-nowrap rounded-full px-2 text-[11px] font-semibold ${STATUS_BADGE[svc.status]}`}>
                    {STATUS_LABEL[svc.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {Object.keys(svc.secrets).length === 0 ? (
                    <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(svc.secrets).map(([field, source]) => (
                        <span
                          key={field}
                          title="Saved in the database"
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700/60 dark:text-slate-300"
                        >
                          {SECRET_LABEL[field] || field}
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">DB</span>
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={svc.enabled}
                    disabled={busy === svc.provider}
                    onClick={() => handleToggle(svc)}
                    title={svc.enabled ? 'Disable' : 'Enable'}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition disabled:opacity-50 ${svc.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${svc.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <Link
                      href={`/admin/settings/couriers/edit/${svc.provider}`}
                      className="rounded-lg p-2 text-emerald-500 transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                      title="Edit"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </Link>
                    {svc.hasRow && (
                      <button
                        onClick={() => handleDelete(svc)}
                        disabled={busy === svc.provider}
                        className="rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 disabled:opacity-50"
                        title="Delete"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">No courier services found.</td></tr>
            )}
            {loading && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</td></tr>
            )}
          </tbody>
        </table>
      </div>


      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete courier service"
        message={
          pendingDelete
            ? pendingDelete.hasAdapter
              ? `Delete "${pendingDelete.name}"? Its saved credentials are removed and the courier will show "credentials pending" until you save keys again.`
              : `Delete "${pendingDelete.name}"? It disappears from the list and the order booking dropdown.`
            : ''
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={performDelete}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
      />
    </section>
  );
}
