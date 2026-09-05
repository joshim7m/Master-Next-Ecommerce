import Link from 'next/link';
import { getSiteSettings } from '../../../src/lib/getSiteSettings';
import { siteNameOf } from '../../../src/lib/siteSettings';

export async function generateMetadata() {
  const settings = await getSiteSettings();
  const siteName = siteNameOf(settings);
  return {
    title: { absolute: `Terms of Service | ${siteName}` },
    description: `Terms of Service for ${siteName}. Read our terms and conditions for using our website and services.`,
    alternates: { canonical: '/terms' },
  };
}

export default async function TermsPage() {
  const siteName = siteNameOf(await getSiteSettings());
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 sm:py-16">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-xs text-slate-400" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#2f0f6b] dark:hover:text-[#a78bfa] transition-colors">Home</Link>
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        <span className="text-slate-600 dark:text-slate-300">Terms of Service</span>
      </nav>

      <h1 className="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">Terms of Service</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Last updated: January 2025</p>

      <div className="prose prose-slate mt-8 max-w-none prose-headings:text-slate-900 prose-a:text-[#2f0f6b] prose-p:leading-relaxed sm:prose-lg dark:prose-invert dark:prose-headings:text-white dark:prose-a:text-[#a78bfa]">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using the {siteName} website, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our website.
        </p>

        <h2>2. Products and Orders</h2>
        <p>
          All products displayed on our website are subject to availability. We reserve the right to discontinue any product at any time. Prices for products are subject to change without notice.
        </p>
        <p>
          We reserve the right to refuse or cancel any order for any reason, including limitations on quantities available for purchase, inaccuracies in product or pricing information, or errors identified by our fraud detection systems.
        </p>

        <h2>3. Payment</h2>
        <p>
          We accept Cash on Delivery (COD) as our primary payment method. Online payment options may also be available depending on your location. All payments must be made in Bangladeshi Taka (BDT).
        </p>

        <h2>4. Shipping and Delivery</h2>
        <p>
          We ship to addresses within Bangladesh. Delivery times may vary based on your location. We are not responsible for delays caused by shipping carriers or circumstances beyond our control.
        </p>

        <h2>5. Returns and Refunds</h2>
        <p>
          We want you to be satisfied with your purchase. If you are not completely satisfied, please contact us within 7 days of receiving your order to initiate a return. Items must be unused, unworn, and in their original packaging.
        </p>
        <p>
          Refunds will be processed to the original payment method within 5-7 business days after we receive the returned items.
        </p>

        <h2>6. Intellectual Property</h2>
        <p>
          All content on this website, including text, graphics, logos, images, and software, is the property of {siteName} and is protected by copyright laws. You may not reproduce, distribute, or create derivative works without our express written permission.
        </p>

        <h2>7. User Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          {siteName} shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use our website or products.
        </p>

        <h2>9. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting on the website. Your continued use of the website after any changes constitutes acceptance of the new terms.
        </p>

        <h2>10. Contact Us</h2>
        <p>
          If you have any questions about these Terms of Service, please contact us through our <Link href="/contact">contact page</Link>.
        </p>
      </div>
    </div>
  );
}
