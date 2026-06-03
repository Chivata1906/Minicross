import fs from "fs";
import path from "path";

const root = path.resolve("c:/Users/USER/Desktop/Cogua MX");
const rels = [
  "src/types/index.ts",
  "src/utils/storage.ts",
  "src/pages/events.ts",
  "src/pages/registration.ts",
  "src/pages/admin.ts",
  "src/pages/home.ts",
  "docs/google-apps-script.gs",
];
const files = {};
for (const r of rels) {
  files[r] = fs.readFileSync(path.join(root, r), "utf8");
}
const out = `import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const files = ${JSON.stringify(files)};

for (const [rel, content] of Object.entries(files)) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('Wrote', rel);
}
console.log('Done:', Object.keys(files).length, 'files');
`;
fs.writeFileSync(path.join(root, "scripts/write-all-updates.mjs"), out, "utf8");
console.log("generated", out.length);