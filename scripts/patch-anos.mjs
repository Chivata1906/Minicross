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

const typesPath = path.join(root, 'src/types/index.ts');
let types = readUtf8(typesPath);

if (!types.includes('formatCategoryDisplayLabel')) {
  const fn = `
export function formatCategoryDisplayLabel(categoriaId: string, fallbackLabel = ''): string {
  const ids = categoriaId.split(',').map((id) => id.trim()).filter(Boolean);
  if (ids.length > 0) {
    return ids
      .map((id) => {
        const cat = getCategoryById(id);
        if (!cat) return fallbackLabel || id;
        return \`\${cat.label} (\${cat.minAge} a \${cat.maxAge} años)\`;
      })
      .join(' | ');
  }
  return fallbackLabel.replace(/\\banos\\b/gi, 'años');
}

`;
  types = types.replace('export function getCategoryById', `${fn}export function getCategoryById`);
  writeUtf8(typesPath, types);
  console.log('types/index.ts: added formatCategoryDisplayLabel');
}

const adminPath = path.join(root, 'src/pages/admin.ts');
let admin = readUtf8(adminPath);

admin = admin.replace(
  "import { getCategoriesForAge, getCategoryById, validateCategorySelection } from '../types';",
  `import {
  formatCategoryDisplayLabel,
  getCategoriesForAge,
  getCategoryById,
  validateCategorySelection,
} from '../types';`
);

admin = admin.replace(
  '${reg.edad} anos</td>',
  '${reg.edad} años</td>'
);

admin = admin.replace(
  '${reg.categoriaLabel}</td>',
  '${formatCategoryDisplayLabel(reg.categoriaId, reg.categoriaLabel)}</td>'
);

writeUtf8(adminPath, admin);
console.log('admin.ts: fixed años display');
