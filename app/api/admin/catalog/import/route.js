import { NextResponse } from 'next/server';
import { writeFile, rm, mkdir } from 'fs/promises';
import path from 'path';
import { requireAdmin } from '@/src/lib/catalog/auth';
import { importCatalogFile } from '@/src/lib/catalog/runImport';
import { importWorkDir } from '@/src/lib/catalog/paths';
import { MAX_UPLOAD_BYTES, ALLOWED_IMPORT_EXTENSIONS } from '@/src/lib/catalog/constants';

export const maxDuration = 300;

export async function POST(request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let workDir;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const originalName = file.name || 'catalog.csv';
    const ext = path.extname(originalName).toLowerCase();

    if (!ALLOWED_IMPORT_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Only ${ALLOWED_IMPORT_EXTENSIONS.join(', ')} files are supported` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File exceeds the 200 MB limit' }, { status: 413 });
    }

    workDir = importWorkDir();
    await mkdir(workDir, { recursive: true });

    const storedPath = path.join(workDir, `upload${ext}`);
    await writeFile(storedPath, buffer);

    const report = await importCatalogFile(storedPath, originalName, workDir);

    return NextResponse.json({ success: true, ...report });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 });
  } finally {
    if (workDir) {
      await rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
