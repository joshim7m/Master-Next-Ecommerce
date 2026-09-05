import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request) {
  const formData = await request.formData();
  const files = formData.getAll('images');
  const folder = formData.get('folder') || 'products';
  const uploaded = [];
  const errors = [];

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files provided.' }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), 'public/uploads', folder);
  await mkdir(uploadDir, { recursive: true });

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      errors.push(`${file.name}: Invalid file type (${file.type}). Allowed: JPEG, PNG, GIF, WebP, AVIF, SVG.`);
      continue;
    }

    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name}: File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: 5MB.`);
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || '.png';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);
    uploaded.push(`/uploads/${folder}/${filename}`);
  }

  if (uploaded.length === 0 && errors.length > 0) {
    return NextResponse.json({ error: 'All files failed validation.', errors }, { status: 400 });
  }

  return NextResponse.json({ urls: uploaded, errors: errors.length > 0 ? errors : undefined });
}
