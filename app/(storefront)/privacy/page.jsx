import Link from 'next/link';
import { getSiteSettings } from '../../../src/lib/getSiteSettings';
import { siteNameOf } from '../../../src/lib/siteSettings';

export async function generateMetadata() {
  const settings = await getSiteSettings();
  const siteName = siteNameOf(settings);
  return {
    title: { absolute: `Privacy Policy | ${siteName}` },
    description: `Privacy Policy for ${siteName}. Learn how we collect, use, and protect your personal information.`,
    alternates: { canonical: '/privacy' },
  };
}

export default async function PrivacyPage() {
  const siteName = siteNameOf(await getSiteSettings());
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 sm:py-16">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-xs text-slate-400" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#2f0f6b] dark:hover:text-[#a78bfa] transition-colors">Home</Link>
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        <span className="text-slate-600 dark:text-slate-300">Privacy Policy</span>
      </nav>

      <h1 className="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Last updated: January 2025</p>

      <div className="prose prose-slate mt-8 max-w-none prose-headings:text-slate-900 prose-a:text-[#2f0f6b] prose-p:leading-relaxed sm:prose-lg dark:prose-invert dark:prose-headings:text-white dark:prose-a:text-[#a78bfa]">
        <h2>1. Information We Collect</h2>
        <p>
          When you visit {siteName}, we may collect certain information about your device, your interaction with the website, and information necessary to process your purchases. We may also collect additional information if you contact us for customer support.
        </p>
        <p>
          <strong>Personal Information:</strong> Name, email address, shipping address, phone number, and payment information when you place an order.
        </p>
        <p>
          <strong>Device Information:</strong> Browser type, IP address, time zone, and cookies to help optimize our website performance.
        </p>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To process and fulfill your orders, including sending you order confirmations and shipping updates</li>
          <li>To communicate with you about your orders, returns, or customer service inquiries</li>
          <li>To screen our orders for potential risk or fraud</li>
          <li>To provide you with information or advertising relating to our products (with your consent)</li>
          <li>To optimize and improve our website and services</li>
        </ul>

        <h2>3. Information Sharing</h2>
        <p>
          We share your Personal Information with third parties to help us process payments, fulfill orders, and provide our services. For example:
        </p>
        <ul>
          <li><strong>Payment processors:</strong> To securely process your payments</li>
          <li><strong>Shipping carriers:</strong> To deliver your orders</li>
          <li><strong>Analytics providers:</strong> To help us understand how our website is used</li>
        </ul>
        <p>
          We do not sell your personal information to third parties.
        </p>

        <h2>4. Cookies</h2>
        <p>
          We use cookies to improve your experience on our website. Cookies are small data files stored on your browser. You can control cookies through your browser settings, though disabling cookies may affect website functionality.
        </p>

        <h2>5. Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
        </p>

        <h2>6. Your Rights</h2>
        <p>
          You have the right to access, correct, or delete your personal information. To exercise these rights, please contact us using the information on our <Link href="/contact">contact page</Link>.
        </p>

        <h2>7. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
        </p>

        <h2>8. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us through our <Link href="/contact">contact page</Link>.
        </p>
      </div>
    </div>
  );
}
