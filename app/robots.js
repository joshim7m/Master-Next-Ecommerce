import { getSiteSettings } from '../src/lib/getSiteSettings';
import { siteUrlOf } from '../src/lib/siteSettings';

export default async function robots() {
  const settings = await getSiteSettings();
  const siteUrl = siteUrlOf(settings);

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/thankyou'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}