/**
 * Verifica que archivos clave esten en UTF-8 (no UTF-16).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const critical = [
  'package.json',
  'package-lock.json',
  '.github/workflows/deploy.yml',
  '.gitignore',
  'tsconfig.json',
  'vite.config.ts',
];

let failed = false;

for (const rel of critical) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) continue;
  const buf = fs.readFileSync(p);
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    console.error(`UTF-16 detectado: ${rel}`);
    failed = true;
    continue;
  }
  if (buf.length >= 2 && buf[1] === 0x00) {
    console.error(`UTF-16 LE detectado: ${rel}`);
    failed = true;
  }
}

if (failed) {
  console.error('\nConvierte esos archivos a UTF-8 antes de commitear.');
  process.exit(1);
}

console.log('[minicross] Archivos criticos en UTF-8 OK.');