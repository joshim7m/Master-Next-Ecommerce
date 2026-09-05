import { tmpdir } from 'os';
import path from 'path';

export function exportWorkDir() {
  return path.join(tmpdir(), `catalog-export-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
}

export function importWorkDir() {
  return path.join(tmpdir(), `catalog-import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
}
