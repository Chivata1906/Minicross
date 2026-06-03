/**
 * Agrega solo archivos del proyecto (excluye node_modules y dist).
 * Uso: npm run git:add
 */
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const excludes = ['node_modules', 'dist'];
const pathspec = excludes.map((d) => `':!${d}'`).join(' ');

try {
  execSync(`git add -- . ${pathspec}`, { cwd: root, stdio: 'inherit', shell: true });
  console.log('\n[minicross] git add seguro completado (sin node_modules ni dist).');
} catch {
  console.error('[minicross] Error en git add. En Windows prueba: git add src public docs ...');
  process.exit(1);
}
