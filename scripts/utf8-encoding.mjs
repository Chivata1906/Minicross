/**
 * Deteccion y conversion UTF-8 / UTF-16 para el proyecto.
 */
import fs from 'fs';
import path from 'path';

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.html',
  '.css',
  '.md',
  '.yml',
  '.yaml',
  '.gs',
  '.gitignore',
  '.editorconfig',
  '.gitattributes',
  '.prettierrc',
]);

const ROOT_FILE_NAMES = new Set([
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'tailwind.config.js',
  'postcss.config.js',
  'README.md',
  '.gitignore',
  '.editorconfig',
  '.gitattributes',
]);

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.cursor',
  'assets',
]);

/** @returns {'utf8' | 'utf16le' | 'utf16be'} */
export function detectEncoding(buf) {
  if (buf.length < 2) return 'utf8';
  if (buf[0] === 0xff && buf[1] === 0xfe) return 'utf16le';
  if (buf[0] === 0xfe && buf[1] === 0xff) return 'utf16be';
  const sample = Math.min(buf.length, 64);
  let pairs = 0;
  for (let i = 0; i < sample - 1; i += 2) {
    if (buf[i] >= 0x09 && buf[i] <= 0x7e && buf[i + 1] === 0) pairs++;
  }
  if (pairs >= 6) return 'utf16le';
  return 'utf8';
}

export function readAsText(buf) {
  const enc = detectEncoding(buf);
  if (enc === 'utf16le') {
    let text = buf.toString('utf16le');
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    return text;
  }
  if (enc === 'utf16be') {
    const swapped = Buffer.alloc(buf.length);
    for (let i = 0; i < buf.length - 1; i += 2) {
      swapped[i] = buf[i + 1];
      swapped[i + 1] = buf[i];
    }
    let text = swapped.toString('utf16le');
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    return text;
  }
  let text = buf.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return text;
}

export function writeUtf8File(filePath, text) {
  fs.writeFileSync(filePath, text.replace(/\r\n/g, '\n'), { encoding: 'utf8' });
}

function shouldScanFile(filePath, root) {
  const base = path.basename(filePath);
  if (ROOT_FILE_NAMES.has(base)) return true;
  const ext = path.extname(filePath).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return true;
  if (filePath.includes('.github')) return true;
  return false;
}

export function collectProjectFiles(root) {
  const files = [];

  for (const name of ROOT_FILE_NAMES) {
    const p = path.join(root, name);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) files.push(p);
  }

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (shouldScanFile(full, root)) {
        files.push(full);
      }
    }
  }

  for (const sub of ['src', 'docs', 'public', 'scripts', '.github', '.githooks', '.vscode']) {
    walk(path.join(root, sub));
  }

  return [...new Set(files)].sort();
}

export function scanProject(root, { fix = false } = {}) {
  const utf16Files = [];
  const fixed = [];

  for (const filePath of collectProjectFiles(root)) {
    const buf = fs.readFileSync(filePath);
    const enc = detectEncoding(buf);
    if (enc === 'utf8') continue;
    const rel = path.relative(root, filePath);
    utf16Files.push({ rel, enc });
    if (fix) {
      writeUtf8File(filePath, readAsText(buf));
      fixed.push(rel);
    }
  }

  return { utf16Files, fixed };
}
