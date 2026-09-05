import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat, rm } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { requireAdmin } from '@/src/lib/catalog/auth';
import { buildCatalogZip } from '@/src/lib/catalog/runExport';

export const maxDuration = 300;

export async function GET(request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let workDir;

  try {
    const { workDir: dir, zipPath, count } = await buildCatalogZip();
    workDir = dir;
    await stat(zipPath);

    const nodeStream = createReadStream(zipPath);
    nodeStream.on('close', () => {
      rm(workDir, { recursive: true, force: true }).catch(() => {});
    });

    return new Response(Readable.toWeb(nodeStream), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="catalog-export-${new Date()
          .toISOString()
          .replace(/[:.]/g, '-')
          .slice(0, 19)}.zip"`,
        'X-Export-Count': String(count),
      },
    });
  } catch (error) {
    if (workDir) {
      await rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
