/**
 * Verifica (o corrige con --fix) que los archivos de texto del proyecto esten en UTF-8.
 * Uso: node scripts/ensure-utf8.mjs [--fix]
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { scanProject } from './utf8-encoding.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fix = process.argv.includes('--fix');

const { utf16Files, fixed } = scanProject(root, { fix });

if (fix && fixed.length) {
  console.log(`[minicross] Convertidos a UTF-8 (${fixed.length}):`);
  for (const rel of fixed) console.log(`  - ${rel}`);
}

if (utf16Files.length === 0) {
  console.log('[minicross] Todos los archivos de texto estan en UTF-8.');
  process.exit(0);
}

if (fix) {
  const again = scanProject(root, { fix: false });
  if (again.utf16Files.length === 0) {
    console.log('[minicross] Verificacion UTF-8 OK.');
    process.exit(0);
  }
}

console.error('[minicross] Archivos que no estan en UTF-8:');
for (const { rel, enc } of utf16Files) {
  console.error(`  - ${rel} (${enc})`);
}
console.error('\nEjecuta: npm run fix:encoding');
process.exit(1);
