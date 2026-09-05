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