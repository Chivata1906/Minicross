import fs from 'fs';
const p = 'src/utils/storage.ts';
let s = fs.readFileSync(p, 'utf8');
if (!s.includes('validateCategorySelection }')) {
  s = s.replace(
    "import { getCategoryById } from '../types';",
    "import { getCategoryById, validateCategorySelection } from '../types';"
  );
  fs.writeFileSync(p, s, 'utf8');
  console.log('fixed import');
} else {
  console.log('import ok');
}
