import fs from 'fs';

const path = 'src/pages/admin.ts';
let s = fs.readFileSync(path, 'utf8');

if (!s.includes("import { getCategoriesForAge } from '../types';")) {
  throw new Error('unexpected imports');
}

s = s.replace(
  "import { getCategoriesForAge } from '../types';",
  "import { getCategoriesForAge, getCategoryById, validateCategorySelection } from '../types';"
);

const renderCategoryFn = `
function parseCategoryIds(value: string): string[] {
  return value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function renderCategoryCheckboxes(age: number, selected: string[] = []): string {
  const categories = getCategoriesForAge(age);
  if (categories.length === 0) {
    return '<p class="text-sm text-gray-light">Sin categorias disponibles para esta edad.</p>';
  }
  return \`<div class="edit-categoria-checkboxes space-y-2">
    \${categories
      .map(
        (c) => \`
      <label class="flex items-center gap-3 rounded-lg border border-secondary/20 bg-primary/40 px-3 py-2 cursor-pointer hover:border-secondary/50">
        <input type="checkbox" name="categoriaIds" value="\${c.id}" class="accent-secondary h-4 w-4" \${selected.includes(c.id) ? 'checked' : ''} />
        <span class="text-sm font-medium">\${c.label}</span>
      </label>\`
      )
      .join('')}
  </div>\`;
}

function refreshEditFormCategories(form: HTMLFormElement): void {
  const birthInput = form.querySelector<HTMLInputElement>('input[name="fechaNacimiento"]');
  const container = form.querySelector<HTMLElement>('.edit-categoria-container');
  if (!birthInput || !container) return;

  const selected = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="categoriaIds"]:checked')).map(
    (el) => el.value
  );
  const age = birthInput.value ? calculateAge(parseSheetDate(birthInput.value)) : -1;

  if (age < 0) {
    container.innerHTML = '<p class="text-sm text-gray-light">Fecha invalida</p>';
    return;
  }

  container.innerHTML = renderCategoryCheckboxes(age, selected);
}
`;

if (!s.includes('function parseCategoryIds')) {
  s = s.replace('function renderDocumentLinkCell', `${renderCategoryFn}\nfunction renderDocumentLinkCell`);
}

const oldRow = `function renderRegistrationRow(reg: Registration): string {
  const firstCategoryId = reg.categoriaId.split(',')[0]?.trim() ?? '';
  const birthDate = parseSheetDate(reg.fechaNacimiento);
  const ageForCategories = birthDate ? calculateAge(birthDate) : reg.edad;
  const categoryAge = ageForCategories >= 0 ? ageForCategories : reg.edad;

  return \`
    <tr class="border-b border-secondary/10 hover:bg-secondary/5" data-id="\${reg.id}">
      <td class="px-3 py-3 text-sm">#\${reg.numeroPiloto}</td>
      <td class="px-3 py-3 text-sm">\${reg.nombre} \${reg.apellido}</td>
      <td class="px-3 py-3 text-sm hidden md:table-cell">\${reg.edad} anos</td>
      <td class="px-3 py-3 text-sm hidden lg:table-cell">\${reg.categoriaLabel}</td>
      <td class="px-3 py-3 text-sm hidden lg:table-cell">\${reg.ciudad}</td>
      <td class="px-3 py-3 text-sm hidden xl:table-cell">\${reg.celular}</td>
      <td class="px-3 py-3 text-sm text-center">\${renderDocumentLinkCell(reg.identificacionArchivo, 'Ver cédula', 'Ver cédula')}</td>
      <td class="px-3 py-3 text-sm text-center">\${renderDocumentLinkCell(reg.comprobantePagoArchivo, 'Ver comprobante de pago', 'Ver comprobante de pago')}</td>
      <td class="px-3 py-3 text-sm">
        <button class="edit-reg text-secondary hover:text-accent mr-2" data-id="\${reg.id}">Editar</button>
        <button class="delete-reg text-orange hover:text-accent" data-id="\${reg.id}">Eliminar</button>
      </td>
    </tr>
    <tr class="hidden edit-row bg-primary/40" data-edit-id="\${reg.id}">
      <td colspan="9" class="px-4 py-4">
        <form class="edit-form grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-id="\${reg.id}">
          <input type="text" name="nombre" value="\${reg.nombre}" placeholder="Nombre" class="input-field text-sm" required />
          <input type="text" name="apellido" value="\${reg.apellido}" placeholder="Apellido" class="input-field text-sm" required />
          <input type="date" name="fechaNacimiento" value="\${birthDate}" class="input-field text-sm" required />
          <input type="email" name="email" value="\${reg.email}" placeholder="Email" class="input-field text-sm" required />
          <input type="tel" name="celular" value="\${reg.celular}" placeholder="Celular" class="input-field text-sm" required />
          <input type="text" name="ciudad" value="\${reg.ciudad}" placeholder="Ciudad" class="input-field text-sm" required />
          <input type="text" name="marcaMoto" value="\${reg.marcaMoto}" placeholder="Marca moto" class="input-field text-sm" required />
          <input type="number" name="numeroPiloto" value="\${reg.numeroPiloto}" min="4" max="999" class="input-field text-sm" required />
          <select name="categoriaId" class="input-field text-sm" required>
            \${getCategoriesForAge(categoryAge)
              .map(
                (c) =>
                  \`<option value="\${c.id}" \${c.id === firstCategoryId ? 'selected' : ''}>\${c.label}</option>\`
              )
              .join('')}
          </select>
          <div class="sm:col-span-2 lg:col-span-3 flex gap-2">
            <button type="submit" class="btn-secondary text-sm py-2 px-4">Guardar</button>
            <button type="button" class="cancel-edit btn-outline text-sm py-2 px-4" data-id="\${reg.id}">Cancelar</button>
          </div>
        </form>
      </td>
    </tr>\`;
}`;

const newRow = `function renderRegistrationRow(reg: Registration): string {
  const selectedCategoryIds = parseCategoryIds(reg.categoriaId);
  const birthDate = parseSheetDate(reg.fechaNacimiento);
  const ageForCategories = birthDate ? calculateAge(birthDate) : reg.edad;
  const categoryAge = ageForCategories >= 0 ? ageForCategories : reg.edad;

  return \`
    <tr class="border-b border-secondary/10 hover:bg-secondary/5" data-id="\${reg.id}">
      <td class="px-3 py-3 text-sm">#\${reg.numeroPiloto}</td>
      <td class="px-3 py-3 text-sm">\${reg.nombre} \${reg.apellido}</td>
      <td class="px-3 py-3 text-sm hidden md:table-cell">\${reg.edad} anos</td>
      <td class="px-3 py-3 text-sm hidden lg:table-cell">\${reg.categoriaLabel}</td>
      <td class="px-3 py-3 text-sm hidden lg:table-cell">\${reg.ciudad}</td>
      <td class="px-3 py-3 text-sm hidden xl:table-cell">\${reg.celular}</td>
      <td class="px-3 py-3 text-sm text-center">\${renderDocumentLinkCell(reg.identificacionArchivo, 'Ver cédula', 'Ver cédula')}</td>
      <td class="px-3 py-3 text-sm text-center">\${renderDocumentLinkCell(reg.comprobantePagoArchivo, 'Ver comprobante de pago', 'Ver comprobante de pago')}</td>
      <td class="px-3 py-3 text-sm">
        <button class="edit-reg text-secondary hover:text-accent mr-2" data-id="\${reg.id}">Editar</button>
        <button class="delete-reg text-orange hover:text-accent" data-id="\${reg.id}">Eliminar</button>
      </td>
    </tr>
    <tr class="hidden edit-row bg-primary/40" data-edit-id="\${reg.id}">
      <td colspan="9" class="px-4 py-4">
        <form class="edit-form grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-id="\${reg.id}">
          <input type="text" name="nombre" value="\${reg.nombre}" placeholder="Nombre" class="input-field text-sm" required />
          <input type="text" name="apellido" value="\${reg.apellido}" placeholder="Apellido" class="input-field text-sm" required />
          <input type="date" name="fechaNacimiento" value="\${birthDate}" class="input-field text-sm" required />
          <input type="email" name="email" value="\${reg.email}" placeholder="Email" class="input-field text-sm" required />
          <input type="tel" name="celular" value="\${reg.celular}" placeholder="Celular" class="input-field text-sm" required />
          <input type="text" name="ciudad" value="\${reg.ciudad}" placeholder="Ciudad" class="input-field text-sm" required />
          <input type="text" name="marcaMoto" value="\${reg.marcaMoto}" placeholder="Marca moto" class="input-field text-sm" required />
          <input type="number" name="numeroPiloto" value="\${reg.numeroPiloto}" min="4" max="999" class="input-field text-sm" required />
          <div class="sm:col-span-2 lg:col-span-3">
            <p class="text-sm text-secondary mb-2 font-medium">Categorias *</p>
            <div class="edit-categoria-container">\${renderCategoryCheckboxes(categoryAge, selectedCategoryIds)}</div>
          </div>
          <div class="sm:col-span-2 lg:col-span-3 flex gap-2">
            <button type="submit" class="btn-secondary text-sm py-2 px-4">Guardar</button>
            <button type="button" class="cancel-edit btn-outline text-sm py-2 px-4" data-id="\${reg.id}">Cancelar</button>
          </div>
        </form>
      </td>
    </tr>\`;
}`;

if (!s.includes(oldRow)) throw new Error('renderRegistrationRow block not found');
s = s.replace(oldRow, newRow);

const oldSubmit = `      const fechaNacimiento = parseSheetDate(fd.get('fechaNacimiento') as string);
      const catId = fd.get('categoriaId') as string;
      const cat = getCategoriesForAge(calculateAge(fechaNacimiento)).find((c) => c.id === catId);

      if (!fechaNacimiento) {
        await showError('Fecha invalida', 'Revisa la fecha de nacimiento.');
        return;
      }

      showSaving('Guardando inscripcion...');
      try {
        await updateRegistration(id, {
          nombre: fd.get('nombre') as string,
          apellido: fd.get('apellido') as string,
          fechaNacimiento,
          email: fd.get('email') as string,
          celular: fd.get('celular') as string,
          ciudad: fd.get('ciudad') as string,
          marcaMoto: fd.get('marcaMoto') as string,
          numeroPiloto: Number(fd.get('numeroPiloto')),
          categoriaId: catId,
          categoriaLabel: cat?.label ?? catId,
        });`;

const newSubmit = `      const fechaNacimiento = parseSheetDate(fd.get('fechaNacimiento') as string);
      const categoriaIds = fd.getAll('categoriaIds').map(String);
      const validCategories = getCategoriesForAge(calculateAge(fechaNacimiento));

      if (!fechaNacimiento) {
        await showError('Fecha invalida', 'Revisa la fecha de nacimiento.');
        return;
      }

      if (categoriaIds.length === 0 || !categoriaIds.every((cid) => validCategories.some((c) => c.id === cid))) {
        await showError('Categorias', 'Selecciona al menos una categoria valida para la edad del piloto.');
        return;
      }

      const categoryError = validateCategorySelection(categoriaIds);
      if (categoryError) {
        await showError('Categorias', categoryError);
        return;
      }

      const categoriaLabel = categoriaIds.map((cid) => getCategoryById(cid)?.label ?? cid).join('|');

      showSaving('Guardando inscripcion...');
      try {
        await updateRegistration(id, {
          nombre: fd.get('nombre') as string,
          apellido: fd.get('apellido') as string,
          fechaNacimiento,
          email: fd.get('email') as string,
          celular: fd.get('celular') as string,
          ciudad: fd.get('ciudad') as string,
          marcaMoto: fd.get('marcaMoto') as string,
          numeroPiloto: Number(fd.get('numeroPiloto')),
          categoriaId: categoriaIds.join(','),
          categoriaLabel,
        });`;

if (!s.includes(oldSubmit)) throw new Error('submit block not found');
s = s.replace(oldSubmit, newSubmit);

const oldEditForms = `  document.querySelectorAll('.edit-form').forEach((form) => {
    form.addEventListener('submit', async (e) => {`;

const newEditForms = `  document.querySelectorAll('.edit-form').forEach((form) => {
    const birthInput = form.querySelector<HTMLInputElement>('input[name="fechaNacimiento"]');
    birthInput?.addEventListener('change', () => refreshEditFormCategories(form as HTMLFormElement));

    form.addEventListener('submit', async (e) => {`;

if (!s.includes(oldEditForms)) throw new Error('edit-form bind block not found');
s = s.replace(oldEditForms, newEditForms);

fs.writeFileSync(path, s, 'utf8');
console.log('admin.ts patched');

// Fix storage.ts multi-category label on update
const storagePath = 'src/utils/storage.ts';
let storage = fs.readFileSync(storagePath, 'utf8');

const oldStorageCat = `  if (updates.categoriaId) {
    const firstId = updates.categoriaId.split(',')[0]?.trim();
    const cat = firstId ? getCategoryById(firstId) : undefined;
    merged.categoriaLabel = cat?.label ?? updates.categoriaId;
  }`;

const newStorageCat = `  if (updates.categoriaId) {
    const categoryIds = updates.categoriaId.split(',').map((id) => id.trim()).filter(Boolean);
    const categoryError = validateCategorySelection(categoryIds);
    if (categoryError) throw new Error(categoryError);
    merged.categoriaId = categoryIds.join(',');
    merged.categoriaLabel = categoryIds.map((id) => getCategoryById(id)?.label ?? id).join('|');
  }`;

if (!storage.includes(oldStorageCat)) throw new Error('storage categoria block not found');
storage = storage.replace(oldStorageCat, newStorageCat);
fs.writeFileSync(storagePath, storage, 'utf8');
console.log('storage.ts patched');
