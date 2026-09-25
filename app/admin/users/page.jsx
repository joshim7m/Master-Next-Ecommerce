'use client';

import { useEffect, useState, useMemo, useTransition } from 'react';
import { getUsers, createUser, updateUser, updateUserStatus, deleteUser } from '../../../src/actions/users';
import ConfirmDialog from '../../../src/components/ConfirmDialog';

const PER_PAGE = 10;

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  phoneNumber: '',
  role: 'manager',
  status: 'active',
};

const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800 dark:hover:bg-emerald-900/40',
  inactive: 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600 dark:hover:bg-slate-600',
};

function StatusPill({ status, onToggle, disabled }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={`Mark as ${status === 'active' ? 'inactive' : 'active'}`}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize transition disabled:cursor-not-allowed disabled:opacity-60 ${STATUS_STYLES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {status || 'inactive'}
    </button>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, user: null });

  const loadUsers = () =>
    getUsers()
      .then(setUsers)
      .catch((e) => setError(e?.message || 'Failed to load users.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadUsers();
  }, []);

  const resetForm = () => setForm(EMPTY_FORM);
  const openCreate = () => { setEditing('new'); resetForm(); };

  const openEdit = (user) => {
    setEditing(user.id);
      setForm({
        name: user.name || '',
        email: user.email || '',
        password: '',
        phoneNumber: user.details?.phoneNumber || '',
        role: user.role || 'manager',
        status: user.status || 'active',
      });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const filtered = useMemo(() => {
    let list = users;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.details?.phoneNumber?.toLowerCase().includes(q)
      );
    }
    if (roleFilter) list = list.filter((u) => u.role === roleFilter);
    if (statusFilter) list = list.filter((u) => (u.status || 'active') === statusFilter);
    return list;
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);

  const stats = useMemo(() => ({
    admins: users.filter((u) => u.role === 'admin').length,
    active: users.filter((u) => (u.status || 'active') === 'active').length,
    inactive: users.filter((u) => (u.status || 'active') === 'inactive').length,
  }), [users]);

  const handleSave = () => {
    if (!form.email.trim()) return;
    if (!form.name.trim()) return;
    if (editing === 'new' && !form.password) return;
    if (form.password && form.password.length < 6) return;
    setError('');
    startTransition(async () => {
      try {
        if (editing === 'new') await createUser(form);
        else await updateUser(editing, form);
      } catch (e) {
        setError(e?.message || 'Failed to save user.');
        return;
      }
      await loadUsers();
      setEditing(null);
      resetForm();
    });
  };

  const handleStatusToggle = (user, next) => {
    setError('');
    startTransition(async () => {
      try {
        await updateUserStatus(user.id, next);
      } catch (e) {
        setError(e?.message || 'Failed to update status.');
      }
      await loadUsers();
    });
  };

  const handleDelete = () => {
    const user = confirmDelete.user;
    if (!user) return;
    setConfirmDelete({ open: false, user: null });
    setError('');
    startTransition(async () => {
      try {
        await deleteUser(user.id);
      } catch (e) {
        setError(e?.message || 'Failed to delete user.');
      }
      await loadUsers();
    });
  };

  if (loading) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>;

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">All Users</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {users.length} {users.length === 1 ? 'user' : 'users'} · {stats.admins} admin{stats.admins === 1 ? '' : 's'} · {stats.active} active · {stats.inactive} inactive
          </p>
        </div>
        <button onClick={openCreate} className="shrink-0 rounded-lg bg-[#2f0f6b] px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#2f0f6b]/90 transition">+ New</button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative max-w-full sm:max-w-xs">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search name, email, phone..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500" />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="">All Roles</option>
          <option value="super-admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{error}</div>
      ) : null}

      {editing ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-base sm:text-lg font-semibold text-slate-900 dark:text-white">{editing === 'new' ? 'Add User' : 'Edit User'}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Name</label>
              <input name="name" value={form.name} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">
                Password {editing !== 'new' && <span className="normal-case text-slate-400/70">(leave blank to keep current)</span>}
              </label>
              <input name="password" type="password" value={form.password} onChange={handleChange} placeholder={editing === 'new' ? 'Min 6 characters' : ''} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm placeholder-slate-400 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Role</label>
                <select name="role" value={form.role} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm capitalize focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                  <option value="manager">manager</option>
                  <option value="admin">admin</option>
                  <option value="super-admin">super-admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Status</label>
                <select name="status" value={form.status} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm capitalize focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Phone</label>
              <input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
            </div>
          </div>
          <div className="mt-4 sm:mt-5 flex gap-3">
            <button onClick={handleSave} disabled={pending} className="flex-1 sm:flex-none rounded-lg bg-[#2f0f6b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f0f6b]/90 transition disabled:opacity-50">{pending ? 'Saving...' : 'Save'}</button>
            <button onClick={() => { setEditing(null); resetForm(); }} className="flex-1 sm:flex-none rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700">Cancel</button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50">
              <th className="w-10 py-3 pl-2 pr-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">SN</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">User</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Role</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Phone</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Joined</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {paginated.map((user, index) => {
              const isSuperAdmin = user.role === 'super-admin';
              return (
                <tr key={user.id} className={`hover:bg-slate-50/50 transition-colors dark:hover:bg-slate-700/30 ${(user.status || 'active') !== 'active' ? 'opacity-60' : ''}`}>
                  <td className="w-10 py-3 pl-2 pr-1 text-slate-500 whitespace-nowrap dark:text-slate-400">{safePage * PER_PAGE + index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                        {(user.name || user.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate font-medium text-slate-900 dark:text-white">{user.name || <span className="text-slate-400">Unnamed</span>}</span>
                        <span className="block truncate text-xs text-slate-400 dark:text-slate-400">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 capitalize dark:text-slate-400">{user.role}</td>
                  <td className="px-4 py-3">
                    <StatusPill
                      status={user.status || 'active'}
                      onToggle={() => handleStatusToggle(user, (user.status || 'active') === 'active' ? 'inactive' : 'active')}
                      disabled={pending || isSuperAdmin}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{user.details?.phoneNumber || <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap dark:text-slate-400">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        disabled={isSuperAdmin}
                        title={isSuperAdmin ? 'The super-admin account cannot be edited' : 'Edit user'}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-[#2f0f6b] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-slate-700 dark:hover:text-[#a78bfa]"
                      >
                        <svg className="h-4 w-4 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ open: true, user })}
                        disabled={pending || isSuperAdmin}
                        title={isSuperAdmin ? 'The super-admin account cannot be deleted' : 'Delete user'}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      >
                        <svg className="h-4 w-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginated.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">{search || roleFilter || statusFilter ? 'No users match your filters.' : 'No users yet.'}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-8 w-8 rounded-lg text-sm font-medium transition ${
                i === safePage
                  ? 'bg-[#2f0f6b] text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage === totalPages - 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Next
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDelete.open}
        title="Delete user"
        message={`Delete user "${confirmDelete.user?.name || confirmDelete.user?.email || ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ open: false, user: null })}
        variant="danger"
      />
    </section>
  );
}