'use client';

import { useEffect, useState } from 'react';

function Toast({ toast }) {
  if (!toast) return null;
  const isSuccess = toast.type === 'success';
  return (
    <div className="fixed left-4 right-4 top-20 z-50 animate-fade-in sm:left-auto sm:right-6">
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md sm:px-5 sm:py-3.5 ${
          isSuccess
            ? 'border-emerald-200 bg-emerald-50/95 text-emerald-800'
            : 'border-red-200 bg-red-50/95 text-red-800'
        }`}
      >
        {isSuccess ? (
          <svg className="h-5 w-5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-6 px-4 sm:space-y-8 sm:px-0">
      <div>
        <div className="mb-2 h-7 w-48 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-72 rounded-lg bg-slate-100 dark:bg-slate-700/50" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        <div className="mb-4 h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-4">
          <div className="h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-700/50" />
          <div className="h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-700/50" />
        </div>
      </div>
      <div className="h-10 w-36 rounded-lg bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

function InputField({ label, type = 'text', value, onChange, onBlur, placeholder, hint, error }) {
  const baseCls =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-[#2f0f6b] focus:outline-none focus:ring-2 focus:ring-[#2f0f6b]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]';
  const errorCls =
    'w-full rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 dark:border-red-500/60 dark:bg-slate-900 dark:text-white dark:focus:ring-red-500/30';

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</label>
      <input type={type} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} aria-invalid={!!error} className={error ? errorCls : baseCls} />
      {hint && <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

function SectionCard({ title, description, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4 dark:border-slate-700">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      <div className="space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5">{children}</div>
    </div>
  );
}

export default function NotificationSettingsPage() {
  const [form, setForm] = useState({ telegramBotToken: '', telegramChatId: '', gtmId: '', whatsappNumber: '', siteUrl: '', jwtSecret: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState(null);

  const validators = {
    siteUrl: (v) => {
      if (!v.trim()) return '';
      let url;
      try {
        url = new URL(v.trim());
      } catch {
        return 'Enter a valid URL, e.g. https://radiantpicks.com';
      }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'URL must start with http:// or https://';
      if (url.pathname.length > 1 && url.pathname.endsWith('/')) return 'Remove the trailing slash';
      return '';
    },
    jwtSecret: (v) => {
      if (!v) return '';
      if (v.length < 32) return 'JWT secret must be at least 32 characters (e.g. run openssl rand -base64 32).';
      if (/\s/.test(v)) return 'JWT secret must not contain spaces.';
      return '';
    },
    telegramBotToken: (v) => {
      if (!v.trim()) return '';
      if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(v.trim())) return 'Invalid bot token. Expected format: 123456789:AA... from @BotFather.';
      return '';
    },
    telegramChatId: (v) => {
      if (!v.trim()) return '';
      if (!/^-?\d+$/.test(v.trim())) return 'Chat ID must be a numeric id, e.g. 1234567890 (groups may start with -100).';
      return '';
    },
    gtmId: (v) => {
      if (!v.trim()) return '';
      if (!/^GTM-[A-Za-z0-9]+$/.test(v.trim())) return 'GTM id must look like GTM-XXXXXXX.';
      return '';
    },
    whatsappNumber: (v) => {
      if (!v.trim()) return '';
      if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(v.trim())) return 'Enter a valid Bangladeshi mobile number, e.g. 01945090085 or +8801945090085.';
      return '';
    },
  };

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: validators[name](value) }));
  };

  const blurField = (name) => {
    const msg = validators[name](form[name]);
    setErrors((prev) => ({ ...prev, [name]: msg }));
  };

  useEffect(() => {
    fetch('/api/admin/settings/site-config')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setForm({
          telegramBotToken: data.telegramBotToken || '',
          telegramChatId: data.telegramChatId || '',
          gtmId: data.gtmId || '',
          whatsappNumber: data.whatsappNumber || '',
          siteUrl: data.siteUrl || '',
          jwtSecret: data.jwtSecret || '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSave = async () => {
    const newErrors = {};
    for (const [name, validate] of Object.entries(validators)) {
      const msg = validate(form[name]);
      if (msg) newErrors[name] = msg;
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setToast({ type: 'error', message: 'Please fix the highlighted fields before saving.' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setErrors({});
        setToast({ type: 'success', message: 'Settings saved successfully.' });
      } else {
        setToast({ type: 'error', message: 'Failed to save settings.' });
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/admin/settings/site-config/test', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setToast({ type: 'success', message: data.message || 'Test notification sent.' });
      } else {
        setToast({ type: 'error', message: data.error || 'Test notification failed.' });
      }
    } catch {
      setToast({ type: 'error', message: 'Test notification failed.' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <Skeleton />;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-0">
      <Toast toast={toast} />

      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#2f0f6b]/10 dark:bg-[#a78bfa]/20 sm:h-10 sm:w-10">
            <svg className="h-4 w-4 text-[#2f0f6b] dark:text-[#a78bfa] sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Site Config</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Configure your site URL, JWT secret for admin login, Telegram order alerts, and Google Tag Manager.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <SectionCard
          title="Site URL & JWT Secret"
          description="Site URL feeds canonical links, Open Graph, sitemap and robots.txt. The JWT secret signs admin login sessions. Values left blank fall back to the server environment variables."
        >
          <InputField
            label="Site URL (NEXT_PUBLIC_SITE_URL)"
            type="url"
            value={form.siteUrl}
            onChange={(e) => updateField('siteUrl', e.target.value)}
            onBlur={() => blurField('siteUrl')}
            error={errors.siteUrl}
            placeholder="https://radiantpicks.com"
            hint="Your production base URL, without a trailing slash. Used for canonical, OG, structured data, sitemap and robots. Leave blank to use the NEXT_PUBLIC_SITE_URL env variable."
          />
          <InputField
            label="JWT Secret (Admin Login)"
            type="password"
            value={form.jwtSecret}
            onChange={(e) => updateField('jwtSecret', e.target.value)}
            onBlur={() => blurField('jwtSecret')}
            error={errors.jwtSecret}
            placeholder="A long random string, e.g. openssl rand -base64 32"
            hint="Signs the admin session cookie used at /admin/login. Changing it logs all admins out. Leave blank to use the JWT_SECRET env variable."
          />
        </SectionCard>

        <SectionCard
          title="Telegram Alerts"
          description="Receive a push notification on Telegram every time a new order arrives. Values left blank fall back to the server environment variables."
        >
          <InputField
            label="Bot Token"
            type="password"
            value={form.telegramBotToken}
            onChange={(e) => updateField('telegramBotToken', e.target.value)}
            onBlur={() => blurField('telegramBotToken')}
            error={errors.telegramBotToken}
            placeholder="123456789:AA..."
            hint="Get this from @BotFather when you create your bot."
          />
          <InputField
            label="Chat ID"
            value={form.telegramChatId}
            onChange={(e) => updateField('telegramChatId', e.target.value)}
            onBlur={() => blurField('telegramChatId')}
            error={errors.telegramChatId}
            placeholder="1234567890"
            hint="Your Telegram user id, or the group/channel id. Message @userinfobot to find your id."
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2f0f6b]/20 bg-[#2f0f6b]/5 px-4 py-2.5 text-sm font-semibold text-[#2f0f6b] transition hover:bg-[#2f0f6b]/10 disabled:opacity-50 dark:border-[#a78bfa]/30 dark:bg-[#a78bfa]/10 dark:text-[#a78bfa] dark:hover:bg-[#a78bfa]/20"
          >
            {testing ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l5-5v3a8 8 0 015 5h-3l5 5H2l3-3 3 3 2-2" />
                </svg>
                Send Test Notification
              </>
            )}
          </button>
        </SectionCard>

        <SectionCard title="Google Tag Manager" description="Your GTM container id. Used to load analytics and tracking scripts across the storefront.">
          <InputField
            label="GTM Container ID"
            value={form.gtmId}
            onChange={(e) => updateField('gtmId', e.target.value)}
            onBlur={() => blurField('gtmId')}
            error={errors.gtmId}
            placeholder="GTM-XXXXXXX"
            hint="Found in the GTM dashboard when you set up your container."
          />
        </SectionCard>

        <SectionCard title="WhatsApp" description="Phone number customers will message to place orders via the 'Order on WhatsApp' button on product pages.">
          <InputField
            label="WhatsApp Number"
            value={form.whatsappNumber}
            onChange={(e) => updateField('whatsappNumber', e.target.value)}
            onBlur={() => blurField('whatsappNumber')}
            error={errors.whatsappNumber}
            placeholder="+8801XXXXXXXXX"
            hint="Bangladeshi mobile number with or without +88 country code, e.g. 01945090085 or +8801945090085"
          />
        </SectionCard>

        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <p className="text-xs text-slate-400 dark:text-slate-500">All changes are saved immediately to your site.</p>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2f0f6b] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f0f6b]/90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#2f0f6b]/30 dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90 disabled:opacity-50 sm:w-auto"
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
