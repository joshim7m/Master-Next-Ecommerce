import { Suspense } from 'react';
import prisma from '../../../src/lib/prisma';
import TrackOrderContent from './TrackOrderContent';
import { getSiteSettings } from '../../../src/lib/getSiteSettings';
import { siteNameOf } from '../../../src/lib/siteSettings';

/**
 * The brand name and support phone flow in from Site Config so the page and
 * its help card follow the store's settings instead of being hardcoded. When
 * no Site Config phone is set, a WhatsApp entry in Social Links serves as the
 * fallback so the help card's WhatsApp button still works.
 */
export async function generateMetadata() {
  const settings = await getSiteSettings();
  const siteName = siteNameOf(settings);
  return {
    title: { absolute: `Track Order | ${siteName}` },
    description: `Track your ${siteName} order — enter your order number or the mobile number you ordered with to see the live delivery status.`,
    alternates: { canonical: '/track-order' },
  };
}

/** Pull the support digits out of a wa.me / whatsapp.com social link URL. */
function phoneFromWhatsAppUrl(url) {
  const raw = String(url || '');
  if (/wa\.me/i.test(raw)) {
    const match = raw.match(/wa\.me\/(\d+)/i);
    return match ? match[1] : '';
  }
  const phoneParam = raw.match(/[?&]phone=(\d+)/i);
  return phoneParam ? phoneParam[1] : '';
}

export default async function TrackOrderPage() {
  const [settings, socialLinks] = await Promise.all([
    getSiteSettings(),
    prisma.socialLink
      .findMany({ where: { isActive: true }, orderBy: { order: 'asc' }, select: { url: true } })
      .catch(() => []),
  ]);

  let supportPhone = String(settings.mobile || '').trim();
  if (!supportPhone) {
    // First widget-configured WhatsApp link wins.
    supportPhone = socialLinks
      .map((link) => phoneFromWhatsAppUrl(link.url))
      .filter(Boolean)
      .at(0) || '';
  }

  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[50vh] max-w-3xl items-center justify-center px-page-margin-mobile sm:px-4 lg:px-page-margin-desktop">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-10 text-center shadow-ambient dark:border-dark-border dark:bg-dark-card">
            <p className="text-muted dark:text-dark-muted">Loading...</p>
          </div>
        </div>
      }
    >
      <TrackOrderContent siteName={settings.siteName} supportPhone={supportPhone} />
    </Suspense>
  );
}
