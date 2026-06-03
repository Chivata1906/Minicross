import fs from 'fs';

const path = 'src/pages/admin.ts';
let s = fs.readFileSync(path, 'utf8');

const old = `<input type="file" id="event-reglamento" accept=".pdf,application/pdf" class="input-field text-sm" />`;
const neu = `<input type="file" id="event-reglamento" accept=".pdf,application/pdf"
                class="w-full rounded-xl border border-dashed border-secondary/40 bg-primary/40 px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:py-2 file:font-semibold file:text-primary" />`;

if (!s.includes(old)) {
  console.error('block not found');
  process.exit(1);
}

s = s.replace(old, neu);
fs.writeFileSync(path, s, 'utf8');
console.log('patched admin file input');
