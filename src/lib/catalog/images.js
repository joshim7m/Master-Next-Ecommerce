import { existsSync } from 'fs';
import path from 'path';
import { getUploadPath } from '@/src/lib/storage';

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

/**
 * Translate a stored `image_path` into something export can actually read.
 *
 * Stored paths are URLs, not filesystem paths, and uploaded files live *outside*
 * `public/` — they are served through `app/api/files/[...path]` from
 * `UPLOAD_BASE_DIR` (default `data/uploads`). Joining `public/` with the stored
 * value silently resolves to a path that never exists, which is how a whole
 * export ends up with an empty `images/` folder and no error.
 *
 * Recognised forms:
 *   /api/files/products/abc.png   -> data/uploads/products/abc.png   (current)
 *   /uploads/products/abc.png     -> data/uploads/products/abc.png   (legacy)
 *   https://host/abc.png          -> downloaded at export time
 *
 * @param {string} imagePath
 * @returns {{kind:'remote', url:string} | {kind:'local', path:string} | null}
 */
export function resolveStoredImage(imagePath) {
  const value = String(imagePath || '');
  if (!value) return null;

  if (isRemotePath(value)) return { kind: 'remote', url: value };

  const segments = value.replace(/^\/+/, '').split('/').filter(Boolean);
  const markerIndex = segments.findIndex((part) => part === 'api' || part === 'uploads');
  if (markerIndex === -1) return null;

  // The two forms carry different numbers of fixed segments before the folder:
  //   /api/files/<folder>/<name>  -> three: api, files, folder
  //   /uploads/<folder>/<name>    -> two:   uploads, folder
  // Treating them alike silently resolves to a folder that does not exist.
  const afterMarker = segments.slice(markerIndex + 1);
  const rest = segments[markerIndex] === 'api' && afterMarker[0] === 'files' ? afterMarker.slice(1) : afterMarker;

  const folder = rest[0];
  const name = rest.slice(1).join('/');
  if (!folder || !name) return null;

  // getUploadPath returns null when the result escapes UPLOAD_BASE_DIR.
  const file = getUploadPath(folder, name);
  if (!file || !existsSync(file)) return null;

  return { kind: 'local', path: file };
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