'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCourierService, updateCourierService } from '../../../../../../src/actions/courierServices';
import CourierServiceForm from '../../../../../../src/components/admin/CourierServiceForm';

export default function EditCourierPage({ params }) {
  const router = useRouter();
  const { provider } = use(params);
  const [service, setService] = useState(undefined); // undefined = loading, null = not found
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCourierService(provider)
      .then(setService)
      .catch(() => setService(null));
  }, [provider]);

  const handleSave = async (values) => {
    setSaving(true);
    try {
      return await updateCourierService(provider, values);
    } finally {
      setSaving(false);
    }
  };

  if (service === undefined) {
    return (
      <section className="animate-pulse space-y-4 max-w-4xl">
        <div className="h-7 w-64 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-64 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
      </section>
    );
  }

  if (service === null) {
    return (
      <section className="space-y-4 max-w-4xl">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
          Courier service not found.
        </div>
        <Link
          href="/admin/settings/couriers"
          className="inline-block rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30"
        >
          ← Back to Courier Services
        </Link>
      </section>
    );
  }

  return (
    <CourierServiceForm
      initial={service}
      onSave={handleSave}
      onSaved={() => router.push('/admin/settings/couriers')}
      saving={saving}
    />
  );
}
