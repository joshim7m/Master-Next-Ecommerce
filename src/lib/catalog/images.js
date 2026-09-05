import path from 'path';

const FILENAME_WHITELIST = /[^A-Za-z0-9._-]/g;

export function sanitizeFilename(imagePath) {
  const basename = path.basename(String(imagePath));
  const sanitized = basename.replace(FILENAME_WHITELIST, '_');
  const trimmed = sanitized.replace(/^[._-]+|[._-]+$/g, '');
  return trimmed || 'image';
}

export function isRemotePath(imagePath) {
  return /^https?:\/\//.test(String(imagePath || ''));
}

export async function fetchRemoteImage(url, { timeoutMs = 15000, maxBytes = 20 * 1024 * 1024 } = {}) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (contentType && !contentType.startsWith('image/')) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0 || buffer.length > maxBytes) return null;

    return buffer;
  } catch {
    return null;
  }
}
