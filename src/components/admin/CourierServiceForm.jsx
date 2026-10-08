'use client';

import { useState } from 'react';
import { COURIERS } from '../../lib/couriers/registry';

/**
 * Create/edit form for Settings → Courier Services. Used by both routes:
 *   create — provider code editable, blank secrets become null
 *   edit   — provider code fixed (bookings reference it); blank secrets keep
 *            the current value, a per-field Clear marks them for removal
 * Secrets are write-only: the server never returns values, only where each
 * field's current value lives (db/env), shown here as placeholder hints.
 */

const INPUT =
  'mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]';
const LABEL = 'block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400';
const ERR = 'mt-1 text-xs font-medium text-red-500';

const SECRET_FIELDS = [
  { field: 'apiKey', label: 'API Key' },
  { field: 'secretKey', label: 'Secret Key' },
  { field: 'webhookToken', label: 'Webhook Token' },
];

const BUILTIN_IDS = COURIERS.map((c) => c.id);

const BLANK = {
  name: '',
  provider: '',
  enabled: true,
  apiKey: '',
  secretKey: '',
  webhookToken: '',
  baseUrl: '',
  trackingUrl: '',
  sortOrder: 0,
};

function FieldError({ message }) {
  return message ? <p className={ERR}>{message}</p> : null;
}

function SecretField({ label, value, saved, show, onChange, onToggleShow, error }) {
  const placeholder = value
    ? (show ? 'Stored value' : '••••••••••••')
    : saved
      ? '•••••••• saved — leave blank to keep'
      : label;

  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${INPUT} pr-10`}
        />
        <button
          type="button"
          onClick={onToggleShow}
          title={show ? 'Hide value' : 'Show value'}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
        >
          {show ? (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      <FieldError message={error} />
    </div>
  );
}

export default function CourierServiceForm({ initial = null, onSave, onSaved, saving = false }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState(() => ({
    ...BLANK,
    ...(initial
      ? {
          name: initial.name || '',
          provider: initial.provider,
          enabled: Boolean(initial.enabled),
          // Edit only: getCourierService() returns the stored values so the
          // form can display (masked) and edit them in place.
          apiKey: initial.secretValues?.apiKey || '',
          secretKey: initial.secretValues?.secretKey || '',
          webhookToken: initial.secretValues?.webhookToken || '',
          baseUrl: initial.baseUrl || '',
          trackingUrl: initial.trackingUrl || '',
          sortOrder: initial.sortOrder || 0,
        }
      : {}),
  }));
  const [showSecrets, setShowSecrets] = useState({});
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');

  const saved = initial?.secrets || {};
  const hasAdapter = initial ? Boolean(initial.hasAdapter) : BUILTIN_IDS.includes(form.provider.trim());
  const showSortOrder = !hasAdapter && (isEdit || form.provider.trim().length > 0);

  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    set(name, value);
  };

  const generateProvider = () => {
    set('provider', form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
  };

  const handleSave = async () => {
    const local = {};
    if (!form.name.trim()) local.name = 'Name is required.';
    if (!isEdit && !form.provider.trim()) local.provider = 'Provider code is required.';
    if (Object.keys(local).length) {
      setErrors(local);
      setBanner('');
      return;
    }

    setErrors({});
    setBanner('');
    let result;
    try {
      result = await onSave({ ...form, name: form.name.trim(), provider: form.provider.trim().toLowerCase() });
    } catch (e) {
      console.error('Courier service save failed:', e);
      setBanner('Could not save — the request failed. Check that the server is running, then try again.');
      return;
    }
    if (result?.ok) {
      onSaved?.();
      return;
    }
    if (result?.errors) setErrors(result.errors);
    setBanner(result?.error || 'Could not save — check the fields above.');
  };

  return (
    <section className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {isEdit ? `Edit ${initial.name}` : 'New Courier Service'}
        </h1>
        {isEdit && (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              initial.hasAdapter
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
            }`}
          >
            {initial.hasAdapter ? 'Built-in integration' : 'No integration yet'}
          </span>
        )}
      </div>

      {banner && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
          {banner}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Sundarban Express"
              className={INPUT}
            />
            <FieldError message={errors.name} />
          </div>

          <div>
            <label className={LABEL}>Provider Code {isEdit ? '' : '*'}</label>
            {isEdit ? (
              <>
                <input value={form.provider} disabled className={`${INPUT} font-mono disabled:opacity-70`} />
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Fixed — bookings and webhooks reference this code.
                </p>
              </>
            ) : (
              <>
                <div className="mt-1 flex gap-2">
                  <input
                    name="provider"
                    value={form.provider}
                    onChange={handleChange}
                    placeholder="sundarban"
                    className={`${INPUT} font-mono`}
                  />
                  <button
                    type="button"
                    onClick={generateProvider}
                    disabled={!form.name.trim()}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30"
                  >
                    Generate
                  </button>
                </div>
                <FieldError message={errors.provider} />
                {!errors.provider && (
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    Lowercase letters, digits, hyphens. Built-ins:{' '}
                    {COURIERS.map((c, i) => (
                      <span key={c.id}>
                        {i > 0 && ' · '}
                        <button
                          type="button"
                          className="font-mono text-sky-600 hover:underline dark:text-sky-400"
                          onClick={() => {
                            set('provider', c.id);
                            if (!form.name.trim()) set('name', c.label);
                          }}
                        >
                          {c.id}
                        </button>
                      </span>
                    ))}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => set('enabled', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#2f0f6b] focus:ring-[#2f0f6b]"
              />
              Enabled 
            </label>
          </div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4 space-y-4 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">API Credentials</h3>
              
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {SECRET_FIELDS.map(({ field, label }) => (
              <SecretField
                key={field}
                label={label}
                value={form[field]}
                saved={saved[field]}
                show={Boolean(showSecrets[field])}
                onChange={(v) => set(field, v)}
                onToggleShow={() => setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }))}
                error={errors[field]}
              />
            ))}

            <div>
              <label className={LABEL}>Base URL</label>
              <input
                name="baseUrl"
                value={form.baseUrl}
                onChange={handleChange}
                placeholder="https://api.example.com/v1"
                className={INPUT}
              />
              <FieldError message={errors.baseUrl} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Tracking URL Template</label>
            <input
              name="trackingUrl"
              value={form.trackingUrl}
              onChange={handleChange}
              placeholder="https://example.com/track/{trackingCode}"
              className={INPUT}
            />
            <FieldError message={errors.trackingUrl} />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{'{trackingCode}'} is replaced with the courier’s tracking code.</p>
          </div>

          {showSortOrder && (
            <div>
              <label className={LABEL}>Sort Order</label>
              <input
                name="sortOrder"
                type="number"
                min="0"
                max="9999"
                value={form.sortOrder}
                onChange={handleChange}
                className={INPUT}
              />
              <FieldError message={errors.sortOrder} />
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Custom services list lowest first (built-ins always come first).</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || (!isEdit && !form.provider.trim())}
            className="rounded-lg bg-[#2f0f6b] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#2f0f6b]/90 transition disabled:opacity-50 dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Service'}
          </button>
          <button
            type="button"
            onClick={() => onSaved?.()}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30"
          >
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
}
