import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

function readUtf8(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.toString('utf16le');
  return buf.toString('utf8');
}

function writeUtf8(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

const footerImport = "import { renderFooter } from '../components/footer';\n";

const replacements = [
  {
    file: 'src/pages/home.ts',
    importFrom: "import { renderNavbar, initNavbar } from '../components/navbar';",
    importTo: footerImport + "import { renderNavbar, initNavbar } from '../components/navbar';",
    oldFooter: `    <footer class="border-t border-secondary/20 bg-dark py-8">
      <div class="mx-auto max-w-7xl px-4 text-center text-sm text-gray-light">
        <p class="font-title text-xl text-accent tracking-wider mb-2">MINICROSS COLOMBIA 2026</p>
        <p>Campeonato Nacional de Motocross Juvenil · Triple Corona</p>
      </div>
    </footer>`,
    newFooter: '    ${renderFooter()}',
  },
  {
    file: 'src/pages/events.ts',
    importFrom: "import { renderNavbar, initNavbar } from '../components/navbar';",
    importTo: footerImport + "import { renderNavbar, initNavbar } from '../components/navbar';",
    oldFooter: `    <footer class="border-t border-secondary/20 bg-dark py-8 mt-8">
      <div class="mx-auto max-w-7xl px-4 text-center text-sm text-gray-light">
        <p>Minicross Colombia 2026 · Triple Corona</p>
      </div>
    </footer>`,
    newFooter: '    ${renderFooter()}',
  },
  {
    file: 'src/pages/registration.ts',
    importFrom: "import { renderNavbar, initNavbar } from '../components/navbar';",
    importTo: footerImport + "import { renderNavbar, initNavbar } from '../components/navbar';",
    oldFooter: `    <footer class="border-t border-secondary/20 bg-dark py-8 mt-8">
      <div class="mx-auto max-w-7xl px-4 text-center text-sm text-gray-light">
        <p>Minicross Colombia 2026</p>
      </div>
    </footer>`,
    newFooter: '    ${renderFooter()}',
  },
];

for (const { file, importFrom, importTo, oldFooter, newFooter, skipImportIfHasFooter } of replacements) {
  const filePath = path.join(root, file);
  let content = readUtf8(filePath);

  if (!content.includes('renderFooter')) {
    if (!skipImportIfHasFooter || !content.includes("from '../components/footer'")) {
      content = content.replace(importFrom, importTo);
    }
  }

  if (content.includes(oldFooter)) {
    content = content.replace(oldFooter, newFooter);
    writeUtf8(filePath, content);
    console.log(`Updated ${file}`);
  } else if (content.includes('${renderFooter()}')) {
    console.log(`${file} already has renderFooter()`);
  } else {
    console.warn(`Footer block not found in ${file}`);
  }
}

// Admin
const adminPath = path.join(root, 'src/pages/admin.ts');
let admin = readUtf8(adminPath);
if (!admin.includes("from '../components/footer'")) {
  admin = admin.replace(
    "import { CONFIG } from '../config';",
    "import { CONFIG } from '../config';\nimport { renderFooter } from '../components/footer';"
  );
}
const loginFooterOld = `        </form>
      </div>
    </div>\`;`;
const loginFooterNew = `        </form>
      </div>
    </div>
    \${renderFooter()}\`;`;
if (admin.includes(loginFooterOld) && !admin.includes(loginFooterNew)) {
  admin = admin.replace(loginFooterOld, loginFooterNew);
}

if (!admin.includes('${renderFooter()}')) {
  admin = admin.replace(
    `          <div id="registrations-panels">\${registrationsByEvent}</div>
        </section>
      </main>
    </div>\`;`,
    `          <div id="registrations-panels">\${registrationsByEvent}</div>
        </section>
      </main>
      \${renderFooter()}
    </div>\`;`
  );
  admin = admin.replace(
    `      </div>
    </div>\`;
}

function parseCategoryIds`,
    `      </div>
    </div>
    \${renderFooter()}\`;
}

function parseCategoryIds`
  );
  writeUtf8(adminPath, admin);
  console.log('Updated src/pages/admin.ts');
} else if (admin.includes(loginFooterNew)) {
  writeUtf8(adminPath, admin);
  console.log('Updated src/pages/admin.ts (login footer)');
}
