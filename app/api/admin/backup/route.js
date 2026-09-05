import { NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookies } from '../../../../src/lib/auth-edge';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink } from 'fs/promises';
import { writeFile } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export async function GET(request) {
  try {
    const token = getTokenFromCookies(request);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `backup-${timestamp}.sql`;
    const filepath = path.join('/tmp', filename);

    const dbUrl = process.env.DATABASE_URL;
    const urlObj = new URL(dbUrl);
    const user = urlObj.username;
    const password = urlObj.password;
    const host = urlObj.hostname;
    const port = urlObj.port || '5432';
    const dbname = urlObj.pathname.replace('/', '');

    await execAsync(
      `PGPASSWORD="${password}" pg_dump -U ${user} -h ${host} -p ${port} -d ${dbname} -Fp --no-owner --no-acl > "${filepath}"`
    );

    const fileContent = await readFile(filepath, 'utf-8');

    await unlink(filepath).catch(() => {});

    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Backup failed' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const token = getTokenFromCookies(request);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const filename = file.name || 'restore.sql';
    if (!filename.endsWith('.sql')) {
      return NextResponse.json({ error: 'Only .sql files are supported' }, { status: 400 });
    }

    const filepath = path.join('/tmp', `restore-${Date.now()}.sql`);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, fileBuffer);

    const dbUrl = process.env.DATABASE_URL;
    const urlObj = new URL(dbUrl);
    const user = urlObj.username;
    const password = urlObj.password;
    const host = urlObj.hostname;
    const port = urlObj.port || '5432';
    const dbname = urlObj.pathname.replace('/', '');

    try {
      await execAsync(
        `PGPASSWORD="${password}" psql -U ${user} -h ${host} -p ${port} -d ${dbname} -f "${filepath}"`
      );
    } finally {
      await unlink(filepath).catch(() => {});
    }

    return NextResponse.json({ success: true, message: 'Database restored successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Restore failed' }, { status: 500 });
  }
}
