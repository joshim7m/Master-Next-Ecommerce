import './globals.css';
import ThemeInit from '@/src/components/ThemeInit';
import { getSiteSettings } from '@/src/lib/getSiteSettings';
import { siteNameOf, brandSuffix } from '@/src/lib/siteSettings';

export async function generateMetadata() {
  const settings = await getSiteSettings();
  const siteName = siteNameOf(settings);
  const suffix = brandSuffix(settings);
  const defaultTitle =
    settings.metaTitle && settings.metaTitle !== siteName
      ? `${settings.metaTitle} — Online Lingerie & Women's Intimates Store in Bangladesh`
      : `${siteName} — Online Lingerie & Women's Intimates Store in Bangladesh`;
  const description =
    settings.metaDescription ||
    `Shop premium lingerie, bras, panties, nightwear, and women's intimate apparel at ${siteName}. ` +
      'Discreet packaging, cash on delivery, and free shipping options across Bangladesh.';

  return {
    title: {
      default: defaultTitle,
      template: `%s | ${suffix}`,
    },
    description,
    ...(settings.metaKeywords
      ? { keywords: settings.metaKeywords.split(',').map((k) => k.trim()).filter(Boolean) }
      : {}),
    icons: settings.favicon ? { icon: settings.favicon } : undefined,
  };
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F9F7F2' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&family=Playfair+Display:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeInit />
        {children}
      </body>
    </html>
  );
}