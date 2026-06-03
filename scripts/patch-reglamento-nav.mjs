import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

function readUtf8(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.toString('utf16le');
  }
  return buf.toString('utf8');
}

function writeUtf8(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

const navbarPath = path.join(root, 'src/components/navbar.ts');
let navbar = readUtf8(navbarPath);

if (!navbar.includes("'reglamento'")) {
  navbar = navbar.replace(
    "activePage: 'home' | 'eventos' | 'inscripcion' = 'home'",
    "activePage: 'home' | 'eventos' | 'inscripcion' | 'reglamento' = 'home'"
  );
  navbar = navbar.replace(
    "    { href: './inscripcion.html', label: 'Inscripción', key: 'inscripcion' },\n  ];",
    "    { href: './inscripcion.html', label: 'Inscripción', key: 'inscripcion' },\n    { href: './reglamento.html', label: 'Reglamento', key: 'reglamento' },\n  ];"
  );
  writeUtf8(navbarPath, navbar);
  console.log('navbar.ts updated');
} else {
  console.log('navbar.ts already has reglamento');
}

const vitePath = path.join(root, 'vite.config.ts');
let vite = readUtf8(vitePath);

if (!vite.includes('reglamento')) {
  vite = vite.replace(
    "inscripcion: resolve(__dirname, 'inscripcion.html'),",
    "inscripcion: resolve(__dirname, 'inscripcion.html'),\n        reglamento: resolve(__dirname, 'reglamento.html'),"
  );
  writeUtf8(vitePath, vite);
  console.log('vite.config.ts updated');
} else {
  console.log('vite.config.ts already has reglamento');
}
