import fs from 'fs';

const path = 'src/pages/admin.ts';
let s = fs.readFileSync(path, 'utf8');

s = s.replace(
  "import type { Event, Registration } from '../types';",
  "import type { Event, EventSavePayload, Registration } from '../types';"
);

s = s.replace(
  "  saveEvents,\n  updateRegistration,",
  "  saveEvents,\n  readFileAsDataUrl,\n  updateRegistration,"
);

// Event list row - add finished toggle and reglamento indicator
s = s.replace(
  `                <label class="flex items-center gap-2 text-sm">
                  <input type="checkbox" class="event-active-toggle accent-secondary" data-id="\${e.id}" \${e.active ? 'checked' : ''} />
                  Activo
                </label>
                <button class="edit-event-btn`,
  `                <label class="flex items-center gap-2 text-sm">
                  <input type="checkbox" class="event-active-toggle accent-secondary" data-id="\${e.id}" \${e.active ? 'checked' : ''} />
                  Habilitado inscripciones
                </label>
                <label class="flex items-center gap-2 text-sm">
                  <input type="checkbox" class="event-finished-toggle accent-accent" data-id="\${e.id}" \${e.finished ? 'checked' : ''} />
                  Finalizado
                </label>
                \${e.reglamentoUrl?.trim() ? '<a href="' + e.reglamentoUrl + '" target="_blank" rel="noopener noreferrer" class="text-secondary text-sm hover:text-accent">Ver reglamento</a>' : '<span class="text-xs text-gray-light">Sin reglamento</span>'}
                <button class="edit-event-btn`
);

// Event form - add PDF and finished
s = s.replace(
  `            <textarea id="event-description" placeholder="Descripcion" class="input-field" rows="2" required></textarea>
            <div class="flex gap-2">
              <button type="submit" class="btn-primary text-sm py-2 px-4">Guardar evento</button>`,
  `            <textarea id="event-description" placeholder="Descripcion" class="input-field" rows="2" required></textarea>
            <div>
              <label class="block text-sm text-secondary mb-2" for="event-reglamento">Reglamento (PDF)</label>
              <input type="file" id="event-reglamento" accept=".pdf,application/pdf" class="input-field text-sm" />
              <p id="event-reglamento-preview" class="mt-2 text-xs text-gray-light hidden"></p>
              <p id="event-reglamento-current" class="mt-2 text-xs text-secondary hidden"></p>
            </div>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" id="event-finished" class="accent-accent" />
              Evento finalizado (habilita boton Ver resultados)
            </label>
            <div class="flex gap-2">
              <button type="submit" class="btn-primary text-sm py-2 px-4">Guardar evento</button>`
);

// bindAdminEvents - finished toggle
const finishedToggleBlock = `  document.querySelectorAll('.event-finished-toggle').forEach((toggle) => {
    toggle.addEventListener('change', async (e) => {
      const id = (e.target as HTMLInputElement).getAttribute('data-id')!;
      const updated = events.map((ev) =>
        ev.id === id ? { ...ev, finished: (e.target as HTMLInputElement).checked } : ev
      );
      showSaving('Actualizando evento...');
      try {
        await saveEvents(updated);
        Swal.close();
        await showSuccess('Evento actualizado', 'El estado de finalizacion se guardo correctamente.');
        await refreshAdmin();
      } catch (err) {
        Swal.close();
        await showError('Error', err instanceof Error ? err.message : 'No se pudo actualizar el evento.');
        await refreshAdmin();
      }
    });
  });

  const eventForm = document.getElementById('event-form') as HTMLFormElement;`;

if (!s.includes('event-finished-toggle')) {
  s = s.replace(
    `  const eventForm = document.getElementById('event-form') as HTMLFormElement;`,
    finishedToggleBlock
  );
}

// edit event - populate new fields
s = s.replace(
  `      (document.getElementById('event-description') as HTMLTextAreaElement).value = event.description;
    });
  });`,
  `      (document.getElementById('event-description') as HTMLTextAreaElement).value = event.description;
      (document.getElementById('event-finished') as HTMLInputElement).checked = event.finished;
      const reglamentoInput = document.getElementById('event-reglamento') as HTMLInputElement;
      const reglamentoPreview = document.getElementById('event-reglamento-preview');
      const reglamentoCurrent = document.getElementById('event-reglamento-current');
      if (reglamentoInput) reglamentoInput.value = '';
      reglamentoPreview?.classList.add('hidden');
      if (event.reglamentoUrl?.trim()) {
        reglamentoCurrent?.classList.remove('hidden');
        if (reglamentoCurrent) {
          reglamentoCurrent.innerHTML = \`Reglamento actual: <a href="\${event.reglamentoUrl}" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">Ver PDF</a> (sube otro archivo para reemplazarlo)\`;
        }
      } else {
        reglamentoCurrent?.classList.add('hidden');
        if (reglamentoCurrent) reglamentoCurrent.textContent = '';
      }
    });
  });`
);

// add-event reset
s = s.replace(
  `  document.getElementById('add-event-btn')?.addEventListener('click', () => {
    eventForm.classList.remove('hidden');
    (document.getElementById('event-form-id') as HTMLInputElement).value = '';
    eventForm.reset();
  });`,
  `  document.getElementById('add-event-btn')?.addEventListener('click', () => {
    eventForm.classList.remove('hidden');
    (document.getElementById('event-form-id') as HTMLInputElement).value = '';
    eventForm.reset();
    document.getElementById('event-reglamento-preview')?.classList.add('hidden');
    document.getElementById('event-reglamento-current')?.classList.add('hidden');
  });`
);

// reglamento file preview listener - insert before eventForm submit
const reglamentoListener = `
  const reglamentoInput = document.getElementById('event-reglamento') as HTMLInputElement | null;
  reglamentoInput?.addEventListener('change', async () => {
    const preview = document.getElementById('event-reglamento-preview');
    const file = reglamentoInput.files?.[0];
    if (!file || !preview) return;
    const maxBytes = CONFIG.maxFileSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      preview.textContent = \`Archivo demasiado grande. Maximo \${CONFIG.maxFileSizeMB} MB.\`;
      preview.classList.remove('hidden');
      reglamentoInput.value = '';
      return;
    }
    preview.textContent = \`Archivo seleccionado: \${file.name}\`;
    preview.classList.remove('hidden');
  });

`;

if (!s.includes('event-reglamento-preview')) {
  throw new Error('reglamento preview refs missing');
}
s = s.replace(`  eventForm?.addEventListener('submit', async (e) => {`, reglamentoListener + `  eventForm?.addEventListener('submit', async (e) => {`);

// event submit handler - full replace
const oldSubmit = `  eventForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formId = (document.getElementById('event-form-id') as HTMLInputElement).value;
    const isEdit = Boolean(formId);

    const newEvent: Event = {
      id: formId || generateId(),
      name: (document.getElementById('event-name') as HTMLInputElement).value,
      date: parseSheetDate((document.getElementById('event-date') as HTMLInputElement).value),
      location: (document.getElementById('event-location') as HTMLInputElement).value,
      city: (document.getElementById('event-city') as HTMLInputElement).value,
      description: (document.getElementById('event-description') as HTMLTextAreaElement).value,
      active: true,
    };

    const updated = formId
      ? events.map((ev) => (ev.id === formId ? { ...ev, ...newEvent, id: formId } : ev))
      : [...events, newEvent];`;

const newSubmit = `  eventForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formId = (document.getElementById('event-form-id') as HTMLInputElement).value;
    const isEdit = Boolean(formId);
    const existing = formId ? events.find((ev) => ev.id === formId) : undefined;

    const newEvent: EventSavePayload = {
      id: formId || generateId(),
      name: (document.getElementById('event-name') as HTMLInputElement).value,
      date: parseSheetDate((document.getElementById('event-date') as HTMLInputElement).value),
      location: (document.getElementById('event-location') as HTMLInputElement).value,
      city: (document.getElementById('event-city') as HTMLInputElement).value,
      description: (document.getElementById('event-description') as HTMLTextAreaElement).value,
      active: existing?.active ?? true,
      finished: (document.getElementById('event-finished') as HTMLInputElement).checked,
      reglamentoUrl: existing?.reglamentoUrl ?? '',
    };

    const reglamentoFile = (document.getElementById('event-reglamento') as HTMLInputElement).files?.[0];
    if (reglamentoFile) {
      newEvent.reglamentoArchivo = await readFileAsDataUrl(reglamentoFile);
      newEvent.reglamentoFileName = reglamentoFile.name;
      newEvent.reglamentoFileType = reglamentoFile.type || 'application/pdf';
    }

    const updated = formId
      ? events.map((ev) => (ev.id === formId ? { ...ev, ...newEvent, id: formId } : ev))
      : [...events, newEvent];`;

if (!s.includes(oldSubmit)) throw new Error('event submit block not found');
s = s.replace(oldSubmit, newSubmit);

fs.writeFileSync(path, s, 'utf8');
console.log('patched admin.ts');

// ─── google-apps-script.gs ────────────────────────────────────────────────────
const gsPath = 'docs/google-apps-script.gs';
let gs = fs.readFileSync(gsPath, 'utf8');

gs = gs.replace(
  "const EVENT_HEADERS = ['id', 'name', 'date', 'location', 'city', 'description', 'active'];",
  "const EVENT_HEADERS = ['id', 'name', 'date', 'location', 'city', 'description', 'active', 'reglamentoUrl', 'finished'];"
);

const eventHelpers = `
function parseBoolField_(value) {
  return value === true || value === 'true' || value === 'TRUE' || value === 1 || value === '1';
}

function getEventsSheet_(ss) {
  return getOrCreateSheet_(ss, 'Events', EVENT_HEADERS);
}

function eventHeadersMatch_(current, headers) {
  var trimmed = current.map(function (h) { return String(h).trim(); });
  while (trimmed.length && !trimmed[trimmed.length - 1]) trimmed.pop();
  if (trimmed.length !== headers.length) return false;
  for (var i = 0; i < headers.length; i++) {
    if (trimmed[i] !== headers[i]) return false;
  }
  return true;
}

function syncEventHeaders_(ss, sheet, headers) {
  var data = sheet.getDataRange().getValues();
  if (data.length === 0 || (data.length === 1 && !String(data[0][0] || '').trim())) {
    sheet.clear();
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return;
  }
  var current = data[0].map(function (h) { return String(h).trim(); });
  if (eventHeadersMatch_(current, headers)) return;
  var rows = sheetToObjects_(sheet);
  rows.forEach(function (row) {
    row.active = parseBoolField_(row.active);
    row.finished = parseBoolField_(row.finished);
    if (!row.reglamentoUrl) row.reglamentoUrl = '';
  });
  writeObjects_(sheet, headers, rows);
}

function saveReglamentoToDrive_(data, ss) {
  try {
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var parts = data.reglamentoArchivo.split(',');
    var base64 = parts.length > 1 ? parts[1] : parts[0];
    var eventName = data.name || getEventNameById_(ss, data.id);
    var fileName = buildDriveFileName_(data.id || 'evento', eventName, 'REGLAMENTO', data.reglamentoFileName, data.reglamentoFileType || 'application/pdf');
    var blob = Utilities.newBlob(
      Utilities.base64Decode(base64),
      data.reglamentoFileType || 'application/pdf',
      fileName
    );
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    return '[error al subir reglamento: ' + err.message + ']';
  }
}

function prepareEventRow_(ss, data) {
  var row = {};
  EVENT_HEADERS.forEach(function (h) {
    row[h] = data[h] !== undefined && data[h] !== null ? data[h] : '';
  });
  row.date = parseSheetDate_(row.date);
  row.active = parseBoolField_(row.active);
  row.finished = parseBoolField_(row.finished);
  if (data.reglamentoArchivo && String(data.reglamentoArchivo).indexOf('data:') === 0) {
    row.reglamentoUrl = saveReglamentoToDrive_(data, ss);
  } else if (data.reglamentoUrl && String(data.reglamentoUrl).indexOf('http') === 0) {
    row.reglamentoUrl = data.reglamentoUrl;
  } else if (!row.reglamentoUrl) {
    row.reglamentoUrl = '';
  }
  return row;
}

/** Ejecutar manualmente si la hoja Events tiene columnas desalineadas. */
function repairEventsSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Events');
  if (!sheet) {
    getEventsSheet_(ss);
    Logger.log('Hoja Events creada con columnas correctas.');
    return;
  }
  syncEventHeaders_(ss, sheet, EVENT_HEADERS);
  Logger.log('Hoja Events reparada. Filas: ' + Math.max(0, sheet.getLastRow() - 1));
}
`;

if (!gs.includes('function prepareEventRow_')) {
  gs = gs.replace('function getRegistrationsSheet_(ss) {', eventHelpers + '\nfunction getRegistrationsSheet_(ss) {');
}

gs = gs.replace(
  `function getOrCreateSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else if (name === 'Registrations') {
    syncRegistrationHeaders_(ss, sheet, headers);
  }
  return sheet;
}`,
  `function getOrCreateSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else if (name === 'Registrations') {
    syncRegistrationHeaders_(ss, sheet, headers);
  } else if (name === 'Events') {
    syncEventHeaders_(ss, sheet, headers);
  }
  return sheet;
}`
);

gs = gs.replace(
  `function getEvents_(ss) {
  var sheet = ss.getSheetByName('Events');
  if (!sheet || sheet.getLastRow() < 2) return [];
  var events = sheetToObjects_(sheet);
  return events.map(function (evt) {
    evt.date = parseSheetDate_(evt.date);
    return evt;
  });
}`,
  `function getEvents_(ss) {
  var sheet = getEventsSheet_(ss);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var events = sheetToObjects_(sheet);
  return events.map(function (evt) {
    evt.date = parseSheetDate_(evt.date);
    evt.active = parseBoolField_(evt.active);
    evt.finished = parseBoolField_(evt.finished);
    if (!evt.reglamentoUrl) evt.reglamentoUrl = '';
    return evt;
  });
}`
);

gs = gs.replace(
  `function writeEvents_(ss, events) {
  var sheet = getOrCreateSheet_(ss, 'Events', EVENT_HEADERS);
  writeObjects_(sheet, EVENT_HEADERS, events);
}`,
  `function writeEvents_(ss, events) {
  var sheet = getEventsSheet_(ss);
  var rows = events.map(function (evt) {
    return prepareEventRow_(ss, evt);
  });
  writeObjects_(sheet, EVENT_HEADERS, rows);
}`
);

gs = gs.replace(
  `  getOrCreateSheet_(ss, 'Events', EVENT_HEADERS);
  getRegistrationsSheet_(ss);`,
  `  getEventsSheet_(ss);
  getRegistrationsSheet_(ss);`
);

gs = gs.replace(
  `        active: true,
      },
      {
        id: 'evt-002',`,
  `        active: true,
        reglamentoUrl: '',
        finished: false,
      },
      {
        id: 'evt-002',`
);

gs = gs.replace(
  `        active: true,
      },
    ]);`,
  `        active: true,
        reglamentoUrl: '',
        finished: false,
      },
    ]);`
);

fs.writeFileSync(gsPath, gs, 'utf8');
console.log('patched google-apps-script.gs');

// ─── SETUP doc ────────────────────────────────────────────────────────────────
const setupPath = 'docs/SETUP-GOOGLE-SHEETS.md';
let setup = fs.readFileSync(setupPath, 'utf8');
if (!setup.includes('reglamentoUrl')) {
  setup = setup.replace(
    '## Estructura de la hoja Registrations',
    `## Estructura de la hoja Events

| Columna | Descripcion |
|---------|-------------|
| id | UUID unico |
| name | Nombre del evento |
| date | Fecha (YYYY-MM-DD) |
| location / city | Ubicacion |
| description | Descripcion |
| active | Habilitado para inscripciones (true/false) |
| reglamentoUrl | URL del PDF del reglamento en Drive |
| finished | Evento finalizado; habilita boton Ver resultados (true/false) |

Si agregaste columnas manualmente, ejecuta **repairEventsSheet** en Apps Script.

## Estructura de la hoja Registrations`
  );
  fs.writeFileSync(setupPath, setup, 'utf8');
  console.log('updated SETUP-GOOGLE-SHEETS.md');
}

console.log('All admin + gs patches applied');
