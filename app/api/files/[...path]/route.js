import { NextResponse } from 'next/server';
import { stat, readFile } from 'fs/promises';
import path from 'path';
import { getUploadPath, getMimeType } from '../../../../src/lib/storage';

export async function GET(request, { params }) {
  const { path: segments } = await params;
  if (!Array.isArray(segments) || segments.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const filepath = getUploadPath(...segments);
  if (!filepath) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const info = await stat(filepath);
    if (!info.isFile()) {
      throw new Error();
    }
    const buffer = await readFile(filepath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': getMimeType(path.extname(filepath)),
        'Content-Length': String(info.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
