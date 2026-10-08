'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCourierService } from '../../../../../src/actions/courierServices';
import CourierServiceForm from '../../../../../src/components/admin/CourierServiceForm';

export default function CreateCourierPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSave = async (values) => {
    setSaving(true);
    try {
      return await createCourierService(values);
    } finally {
      setSaving(false);
    }
  };

  return (
    <CourierServiceForm
      onSave={handleSave}
      onSaved={() => router.push('/admin/settings/couriers')}
      saving={saving}
    />
  );
}
