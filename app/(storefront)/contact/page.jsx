import Link from 'next/link';
import { getSiteSettings } from '../../../src/lib/getSiteSettings';
import { siteNameOf, siteUrlOf } from '../../../src/lib/siteSettings';

export async function generateMetadata() {
  const settings = await getSiteSettings();
  const siteName = siteNameOf(settings);
  const siteUrl = siteUrlOf(settings);
  return {
    title: { absolute: `Contact Us | ${siteName}` },
    description: `Get in touch with ${siteName}. Contact us for orders, inquiries, or support. We're here to help across Bangladesh.`,
    alternates: { canonical: '/contact' },
  };
}

export default async function ContactPage() {
  const settings = await getSiteSettings();
  const siteName = siteNameOf(settings);
  const siteUrl = siteUrlOf(settings);

  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: siteName,
    url: siteUrl,
    ...(settings?.mobile && { telephone: settings.mobile }),
    ...(settings?.email && { email: settings.email }),
    ...(settings?.address && { address: settings.address }),
    areaServed: 'Bangladesh',
    priceRange: '$$',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
    <div className="mx-auto max-w-4xl px-page-margin-mobile sm:px-6 lg:px-page-margin-desktop py-12 sm:py-16">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-1.5 text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-primary dark:hover:text-primary transition-colors">Home</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-on-surface dark:text-dark-text">Contact Us</span>
      </nav>

      <h1 className="font-display text-headline-md font-bold text-on-surface sm:text-headline-lg dark:text-dark-text">Contact Us</h1>
      <p className="mt-2 text-muted dark:text-dark-muted">We&apos;d love to hear from you. Here&apos;s how you can reach us.</p>

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        {/* Contact Info */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-white p-6 shadow-ambient dark:border-dark-border dark:bg-dark-card">
            <h2 className="text-lg font-semibold text-on-surface dark:text-dark-text">Get in Touch</h2>

            <div className="mt-4 space-y-4">
              {settings?.mobile && (
                <a href={`tel:${settings.mobile}`} className="flex items-center gap-3 text-on-surface/70 hover:text-primary transition dark:text-dark-text/70 dark:hover:text-primary">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-warm-sand dark:bg-dark-card">
                    <span className="material-symbols-outlined text-[20px] text-muted dark:text-dark-muted">call</span>
                  </span>
                  <div>
                    <p className="text-sm font-medium text-on-surface dark:text-dark-text">Phone</p>
                    <p className="text-sm text-muted dark:text-dark-muted">{settings.mobile}</p>
                  </div>
                </a>
              )}

              {settings?.email && (
                <a href={`mailto:${settings.email}`} className="flex items-center gap-3 text-on-surface/70 hover:text-primary transition dark:text-dark-text/70 dark:hover:text-primary">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-warm-sand dark:bg-dark-card">
                    <span className="material-symbols-outlined text-[20px] text-muted dark:text-dark-muted">mail</span>
                  </span>
                  <div>
                    <p className="text-sm font-medium text-on-surface dark:text-dark-text">Email</p>
                    <p className="text-sm text-muted dark:text-dark-muted">{settings.email}</p>
                  </div>
                </a>
              )}

              {settings?.address && (
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warm-sand dark:bg-dark-card">
                    <span className="material-symbols-outlined text-[20px] text-muted dark:text-dark-muted">location_on</span>
                  </span>
                  <div>
                    <p className="text-sm font-medium text-on-surface dark:text-dark-text">Address</p>
                    <p className="text-sm text-muted dark:text-dark-muted">{settings.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="rounded-xl border border-border bg-white p-6 shadow-ambient dark:border-dark-border dark:bg-dark-card">
          <h2 className="text-lg font-semibold text-on-surface dark:text-dark-text">Send a Message</h2>
          <form className="mt-4 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-on-surface/70 dark:text-dark-text/70">Name</label>
              <input type="text" id="name" name="name" required className="mt-1 block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-on-surface placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:placeholder:text-dark-muted/50 dark:focus:border-primary dark:focus:ring-primary" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-on-surface/70 dark:text-dark-text/70">Email</label>
              <input type="email" id="email" name="email" required className="mt-1 block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-on-surface placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:placeholder:text-dark-muted/50 dark:focus:border-primary dark:focus:ring-primary" />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-on-surface/70 dark:text-dark-text/70">Message</label>
              <textarea id="message" name="message" rows={4} required className="mt-1 block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-on-surface placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:placeholder:text-dark-muted/50 dark:focus:border-primary dark:focus:ring-primary" />
            </div>
            <button type="submit" className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition dark:bg-primary dark:text-dark-text">
              Send Message
            </button>
          </form>
        </div>
      </div>
      </div>
    </>
  );
}
