import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeUtf8File, readAsText } from './utf8-encoding.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readFile(rel) {
  return readAsText(fs.readFileSync(path.join(root, rel)));
}

function writeFile(rel, content) {
  writeUtf8File(path.join(root, rel), content);
}

// ─── types/index.ts ───────────────────────────────────────────────────────────
const typesPath = 'src/types/index.ts';
let types = readFile(typesPath);
if (!types.includes('validateCategorySelection')) {
  types += `
/** No permite A y B de la misma cilindrada (ej. 65cc A + 65cc B). */
export function validateCategorySelection(categoriaIds: string[]): string | null {
  const lettersByDisplacement = new Map<string, Set<string>>();

  for (const id of categoriaIds) {
    if (id === '125cc-junior') continue;
    const match = id.match(/^(\\d+cc)-(a|b)$/);
    if (!match) continue;
    const [, displacement, letter] = match;
    if (!lettersByDisplacement.has(displacement)) {
      lettersByDisplacement.set(displacement, new Set());
    }
    const letters = lettersByDisplacement.get(displacement)!;
    letters.add(letter);
    if (letters.size > 1) {
      return \`No puedes inscribirte en novatos (A) y expertos (B) de la misma cilindrada (\${displacement}).\`;
    }
  }

  return null;
}
`;
  writeFile(typesPath, types);
  console.log('Updated types/index.ts');
}

// ─── storage.ts ─────────────────────────────────────────────────────────────
let storage = readFile('src/utils/storage.ts');
if (!storage.includes('validateCategorySelection')) {
  storage = storage.replace(
    "import { getCategoryById, PILOT_NUMBER_MIN, PILOT_NUMBER_MAX } from '../types';",
    "import { getCategoryById, validateCategorySelection, PILOT_NUMBER_MIN, PILOT_NUMBER_MAX } from '../types';"
  );
  storage = storage.replace(
    'export async function createRegistration(data: RegistrationFormData): Promise<Registration> {\n  const { categoriaId, categoriaLabel } = resolveCategoryFields(data.categoriaIds);',
    `export async function createRegistration(data: RegistrationFormData): Promise<Registration> {
  const categoryError = validateCategorySelection(data.categoriaIds);
  if (categoryError) throw new Error(categoryError);

  const { categoriaId, categoriaLabel } = resolveCategoryFields(data.categoriaIds);`
  );
  storage = storage.replace(/Inscripcion no encontrada/g, 'Inscripción no encontrada');
  writeFile('src/utils/storage.ts', storage);
  console.log('Updated storage.ts');
}

// ─── registration.ts ────────────────────────────────────────────────────────
let reg = readFile('src/pages/registration.ts');
if (!reg.includes('validateCategorySelection')) {
  reg = reg.replace(
    "import { getCategoriesForAge } from '../types';",
    "import { getCategoriesForAge, validateCategorySelection } from '../types';"
  );
  reg = reg.replace(
    `    const validCategories = getCategoriesForAge(edad);
    if (categoriaIds.length === 0 || !categoriaIds.every((id) => validCategories.some((c) => c.id === id))) {
      await Swal.fire({
        icon: 'error',
        title: 'Categorias',
        text: 'Selecciona al menos una categoria valida para tu edad.',
      });
      return;
    }`,
    `    const validCategories = getCategoriesForAge(edad);
    if (categoriaIds.length === 0 || !categoriaIds.every((id) => validCategories.some((c) => c.id === id))) {
      await Swal.fire({
        icon: 'error',
        title: 'Categorías',
        text: 'Selecciona al menos una categoría válida para tu edad.',
      });
      return;
    }

    const categoryError = validateCategorySelection(categoriaIds);
    if (categoryError) {
      await Swal.fire({ icon: 'error', title: 'Categorías', text: categoryError });
      return;
    }`
  );
}

reg = reg
  .replace(/Inscripcion de Piloto/g, 'Inscripción de Piloto')
  .replace(/inscripcion\./g, 'inscripción.')
  .replace(/Enviando inscripcion\.\.\./g, 'Enviando inscripción...')
  .replace(/Inscripcion enviada/g, 'Inscripción enviada')
  .replace(/No se pudo enviar la inscripcion/g, 'No se pudo enviar la inscripción')
  .replace(/No hay eventos abiertos para inscripcion/g, 'No hay eventos abiertos para inscripción')
  .replace(/Enviar inscripción/g, 'Enviar inscripción');

writeFile('src/pages/registration.ts', reg);
console.log('Updated registration.ts');

// ─── admin.ts ─────────────────────────────────────────────────────────────────
let admin = readFile('src/pages/admin.ts');

if (!admin.includes('renderDocumentLinkCell')) {
  admin = admin.replace(
    `function renderCedulaCell(reg: Registration): string {
  const url = reg.identificacionArchivo?.trim() ?? '';
  if (!isHttpUrl(url)) {
    return '<span class="text-gray-light text-xs">—</span>';
  }
  return \`<a href="\${url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-secondary hover:text-accent" title="Ver documento" aria-label="Ver cedula">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
  </a>\`;
}`,
    `function renderDocumentLinkCell(url: string | undefined, title: string, ariaLabel: string): string {
  const link = url?.trim() ?? '';
  if (!isHttpUrl(link)) {
    return '<span class="text-gray-light text-xs">—</span>';
  }
  return \`<a href="\${link}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-secondary hover:text-accent" title="\${title}" aria-label="\${ariaLabel}">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
  </a>\`;
}`
  );

  admin = admin.replace(
    '<td class="px-3 py-3 text-sm text-center">${renderCedulaCell(reg)}</td>\n      <td class="px-3 py-3 text-sm">',
    `<td class="px-3 py-3 text-sm text-center">\${renderDocumentLinkCell(reg.identificacionArchivo, 'Ver cédula', 'Ver cédula')}</td>
      <td class="px-3 py-3 text-sm text-center">\${renderDocumentLinkCell(reg.comprobantePagoArchivo, 'Ver comprobante de pago', 'Ver comprobante de pago')}</td>
      <td class="px-3 py-3 text-sm">`
  );

  admin = admin.replace('<td colspan="8"', '<td colspan="9"');
  admin = admin.replace(
    '<th class="px-3 py-2 text-center">Cedula</th>\n                        <th class="px-3 py-2">Acciones</th>',
    `<th class="px-3 py-2 text-center">Cédula</th>
                        <th class="px-3 py-2 text-center">Pago</th>
                        <th class="px-3 py-2">Acciones</th>`
  );
}

admin = admin
  .replace(/Gestion de inscripciones/g, 'Gestión de inscripciones')
  .replace(/Sin inscripciones/g, 'Sin inscripciones')
  .replace(/Inscripciones por evento/g, 'Inscripciones por evento')
  .replace(/Eliminar esta inscripcion\?/g, 'Eliminar esta inscripción?')
  .replace(/\$\{regs\.length\} inscrito\(s\)/g, '${regs.length} inscrito(s)');

writeFile('src/pages/admin.ts', admin);
console.log('Updated admin.ts');

// ─── inscripcion.html ─────────────────────────────────────────────────────────
let inscHtml = readFile('inscripcion.html');
inscHtml = inscHtml
  .replace(/Inscripcion de pilotos/g, 'Inscripción de pilotos')
  .replace(/Inscripcion \|/g, 'Inscripción |');
writeFile('inscripcion.html', inscHtml);
console.log('Updated inscripcion.html');

// ─── google-apps-script.gs ────────────────────────────────────────────────────
let gs = readFile('docs/google-apps-script.gs');

if (!gs.includes('validateCategorySelection_')) {
  const helpers = `
function validateCategorySelection_(categoriaId) {
  if (!categoriaId) return null;
  var ids = String(categoriaId).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  var groups = {};
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    if (id === '125cc-junior') continue;
    var m = id.match(/^(\\d+cc)-(a|b)$/);
    if (!m) continue;
    var disp = m[1];
    var letter = m[2];
    if (!groups[disp]) groups[disp] = {};
    groups[disp][letter] = true;
    if (groups[disp].a && groups[disp].b) {
      return 'No puedes inscribirte en novatos (A) y expertos (B) de la misma cilindrada (' + disp + ').';
    }
  }
  return null;
}

function getEventNameById_(ss, eventId) {
  var events = getEvents_(ss);
  for (var i = 0; i < events.length; i++) {
    if (String(events[i].id) === String(eventId)) return events[i].name;
  }
  return 'Evento';
}

function sanitizeFileNamePart_(value) {
  return String(value || 'sin_dato')
    .trim()
    .replace(/[<>:"/\\\\|?*\\u0000-\\u001F]/g, '')
    .replace(/\\s+/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 80);
}

function getFileExtension_(fileName, mimeType) {
  var m = String(fileName || '').match(/\\.([a-zA-Z0-9]{1,8})$/);
  if (m) return m[1].toLowerCase();
  if (mimeType && mimeType.indexOf('pdf') >= 0) return 'pdf';
  if (mimeType && mimeType.indexOf('jpeg') >= 0) return 'jpg';
  if (mimeType && mimeType.indexOf('png') >= 0) return 'png';
  return 'bin';
}

function buildDriveFileName_(identificacion, eventName, suffix, originalFileName, mimeType) {
  var ext = getFileExtension_(originalFileName, mimeType);
  return sanitizeFileNamePart_(identificacion) + '_' + sanitizeFileNamePart_(eventName) + '_' + suffix + '.' + ext;
}

`;

  gs = gs.replace('function saveFileToDrive_(data) {', helpers + 'function saveFileToDrive_(data, ss) {');
  gs = gs.replace('function saveComprobanteToDrive_(data) {', 'function saveComprobanteToDrive_(data, ss) {');

  gs = gs.replace(
    `function saveFileToDrive_(data, ss) {
  try {
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var parts = data.identificacionArchivo.split(',');
    var base64 = parts.length > 1 ? parts[1] : parts[0];
    var blob = Utilities.newBlob(
      Utilities.base64Decode(base64),
      data.identificacionFileType || 'application/octet-stream',
      data.identificacionFileName || 'documento'
    );`,
    `function saveFileToDrive_(data, ss) {
  try {
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var parts = data.identificacionArchivo.split(',');
    var base64 = parts.length > 1 ? parts[1] : parts[0];
    var eventName = getEventNameById_(ss, data.eventId);
    var fileName = buildDriveFileName_(data.identificacion, eventName, 'ID', data.identificacionFileName, data.identificacionFileType);
    var blob = Utilities.newBlob(
      Utilities.base64Decode(base64),
      data.identificacionFileType || 'application/octet-stream',
      fileName
    );`
  );

  gs = gs.replace(
    `function saveComprobanteToDrive_(data, ss) {
  try {
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var parts = data.comprobantePagoArchivo.split(',');
    var base64 = parts.length > 1 ? parts[1] : parts[0];
    var blob = Utilities.newBlob(
      Utilities.base64Decode(base64),
      data.comprobantePagoFileType || 'application/octet-stream',
      data.comprobantePagoFileName || 'comprobante-pago'
    );`,
    `function saveComprobanteToDrive_(data, ss) {
  try {
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var parts = data.comprobantePagoArchivo.split(',');
    var base64 = parts.length > 1 ? parts[1] : parts[0];
    var eventName = getEventNameById_(ss, data.eventId);
    var fileName = buildDriveFileName_(data.identificacion, eventName, 'PROOF', data.comprobantePagoFileName, data.comprobantePagoFileType);
    var blob = Utilities.newBlob(
      Utilities.base64Decode(base64),
      data.comprobantePagoFileType || 'application/octet-stream',
      fileName
    );`
  );

  gs = gs.replace(
    `function createRegistration_(ss, data) {
  if (!isPilotNumberAvailable_(ss, data.eventId, Number(data.numeroPiloto))) {
    return {
      success: false,
      error: 'El numero de piloto ' + data.numeroPiloto + ' ya esta registrado en este evento.',
    };
  }

  if (data.identificacionArchivo && data.identificacionArchivo.indexOf('data:') === 0) {
    data.identificacionArchivo = saveFileToDrive_(data);
  }`,
    `function createRegistration_(ss, data) {
  if (!isPilotNumberAvailable_(ss, data.eventId, Number(data.numeroPiloto))) {
    return {
      success: false,
      error: 'El numero de piloto ' + data.numeroPiloto + ' ya esta registrado en este evento.',
    };
  }

  var categoryError = validateCategorySelection_(data.categoriaId);
  if (categoryError) {
    return { success: false, error: categoryError };
  }

  if (data.identificacionArchivo && data.identificacionArchivo.indexOf('data:') === 0) {
    data.identificacionArchivo = saveFileToDrive_(data, ss);
  }

  if (data.comprobantePagoArchivo && data.comprobantePagoArchivo.indexOf('data:') === 0) {
    data.comprobantePagoArchivo = saveComprobanteToDrive_(data, ss);
  }`
  );

  gs = gs.replace(/Inscripcion no encontrada/g, 'Inscripción no encontrada');
  writeFile('docs/google-apps-script.gs', gs);
  console.log('Updated google-apps-script.gs');
}

console.log('Done.');
