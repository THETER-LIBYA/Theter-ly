import fs from 'fs';
import os from 'os';
import path from 'path';

let cachedWritableDir: string | null = null;

/**
 * Returns a guaranteed-writable runtime directory for fallback data/files.
 * Uses `<cwd>/.data` in writable environments and falls back to `os.tmpdir()`
 * on read-only serverless deployments (e.g. `/var/task`).
 */
export function getWritableDataDir(): string {
  if (cachedWritableDir) return cachedWritableDir;

  const localData = path.resolve(process.cwd(), '.data');
  try {
    fs.mkdirSync(localData, { recursive: true });
    const probe = path.join(localData, `.write-probe-${process.pid}`);
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    cachedWritableDir = localData;
    return cachedWritableDir;
  } catch {
    const tmpData = path.join(os.tmpdir(), 'tether-libya-data');
    fs.mkdirSync(tmpData, { recursive: true });
    cachedWritableDir = tmpData;
    return cachedWritableDir;
  }
}
