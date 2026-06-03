/**
 * Configura git para usar .githooks/ (pre-commit bloquea node_modules y dist).
 * Se ejecuta automaticamente con npm install (script "prepare").
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hooksDir = path.join(root, '.githooks');

if (!fs.existsSync(path.join(root, '.git'))) {
  process.exit(0);
}

try {
  execSync('git config core.hooksPath .githooks', { cwd: root, stdio: 'inherit' });
  console.log('[minicross] Git hooks activos: .githooks/pre-commit');
} catch {
  console.warn('[minicross] No se pudieron configurar los git hooks.');
}
