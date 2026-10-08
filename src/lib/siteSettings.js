export const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://radiantpicks.com';

export const DEFAULT_BRAND = 'Radiant Picks';

export function siteNameOf(settings = {}) {
  return settings.siteName || DEFAULT_BRAND;
}

export function siteUrlOf(settings = {}) {
  return settings.siteUrl || DEFAULT_SITE_URL;
}

export function brandSuffix(settings = {}) {
  return settings.metaTitle || settings.siteName || DEFAULT_BRAND;
}

export function splitKeywords(keywords = '') {
  return keywords
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

// SEO text is emitted ONLY when the admin has entered it (docs/seo.md strategy:
// "no hardcoded brand in render output"). Returns undefined when blank so pages
// and layouts can conditionally omit the <meta> tag instead of falling back to
// invented marketing copy.
export function seoDescription(settings = {}) {
  const d = settings.metaDescription;
  return d && d.trim() ? d.trim() : undefined;
}

export function seoKeywords(settings = {}) {
  const k = settings.metaKeywords;
  return k && k.trim() ? splitKeywords(k) : undefined;
}