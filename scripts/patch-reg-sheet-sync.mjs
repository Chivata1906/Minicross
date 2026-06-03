import fs from 'fs';

const path = 'docs/google-apps-script.gs';
let s = fs.readFileSync(path, 'utf8');

const replacements = [
  [
    `function updateRegistration_(ss, id, updates) {
  const sheet = ss.getSheetByName('Registrations');`,
    `function updateRegistration_(ss, id, updates) {
  const sheet = getRegistrationsSheet_(ss);`,
  ],
  [
    `function deleteRegistration_(ss, id) {
  const sheet = ss.getSheetByName('Registrations');`,
    `function deleteRegistration_(ss, id) {
  const sheet = getRegistrationsSheet_(ss);`,
  ],
  [
    `  var row = prepareRegistrationRow_(ss, data);
  const sheet = getOrCreateSheet_(ss, 'Registrations', REG_HEADERS);
  appendRow_(sheet, REG_HEADERS, row);`,
    `  var row = prepareRegistrationRow_(ss, data);
  const sheet = getRegistrationsSheet_(ss);
  appendRow_(sheet, REG_HEADERS, row);`,
  ],
  [
    `function getRegistrations_(ss) {
  var sheet = ss.getSheetByName('Registrations');
  if (!sheet || sheet.getLastRow() < 2) return [];
  var events = sheetToObjects_(sheet);
  return events.map(function (evt) {
    evt.date = parseSheetDate_(evt.date);
    return evt;
  });
}`,
    `function getRegistrations_(ss) {
  var sheet = getRegistrationsSheet_(ss);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheetToObjects_(sheet);
}`,
  ],
];

for (const [oldStr, newStr] of replacements) {
  if (!s.includes(oldStr)) {
    console.error('NOT FOUND:', oldStr.slice(0, 80));
    process.exit(1);
  }
  s = s.replace(oldStr, newStr);
}

const oldSheetHelpers = `function writeRegistrations_(ss, registrations) {
  var sheet = getOrCreateSheet_(ss, 'Registrations', REG_HEADERS);
  writeObjects_(sheet, REG_HEADERS, registrations);
}

// ─── Sheet helpers ───────────────────────────────────────────────────────────

function getOrCreateSheet_(ss, name, headers) {
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
}

function syncRegistrationHeaders_(ss, sheet, headers) {
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return;
  }

  var current = data[0].map(function (h) { return String(h); });
  var needsSync = headers.some(function (h) { return current.indexOf(h) === -1; });
  if (!needsSync) return;

  var rows = sheetToObjects_(sheet);
  rows.forEach(function (row) {
    if (!row.eventName && row.eventId) {
      row.eventName = getEventNameById_(ss, row.eventId);
    }
    if (!row.comprobantePagoUrl && row.comprobantePagoArchivo && String(row.comprobantePagoArchivo).indexOf('http') === 0) {
      row.comprobantePagoUrl = row.comprobantePagoArchivo;
    }
  });
  writeObjects_(sheet, headers, rows);
}`;

const newSheetHelpers = `function writeRegistrations_(ss, registrations) {
  var sheet = getRegistrationsSheet_(ss);
  writeObjects_(sheet, REG_HEADERS, registrations);
}

// ─── Sheet helpers ───────────────────────────────────────────────────────────

function getRegistrationsSheet_(ss) {
  return getOrCreateSheet_(ss, 'Registrations', REG_HEADERS);
}

function registrationHeadersMatch_(current, headers) {
  var trimmed = current.map(function (h) { return String(h).trim(); });
  while (trimmed.length && !trimmed[trimmed.length - 1]) trimmed.pop();
  if (trimmed.length !== headers.length) return false;
  for (var i = 0; i < headers.length; i++) {
    if (trimmed[i] !== headers[i]) return false;
  }
  return true;
}

function migrateRegistrationRows_(ss, rows) {
  rows.forEach(function (row) {
    if (!row.eventName && row.eventId) {
      row.eventName = getEventNameById_(ss, row.eventId);
    }
    if (!row.comprobantePagoUrl && row.comprobantePagoArchivo) {
      var legacy = String(row.comprobantePagoArchivo);
      if (legacy.indexOf('http') === 0) {
        row.comprobantePagoUrl = legacy;
      }
    }
    delete row.comprobantePagoArchivo;
  });
  return rows;
}

function getOrCreateSheet_(ss, name, headers) {
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
}

function syncRegistrationHeaders_(ss, sheet, headers) {
  var data = sheet.getDataRange().getValues();
  if (data.length === 0 || (data.length === 1 && !String(data[0][0] || '').trim())) {
    sheet.clear();
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return;
  }

  var current = data[0].map(function (h) { return String(h).trim(); });
  if (registrationHeadersMatch_(current, headers)) return;

  var rows = migrateRegistrationRows_(ss, sheetToObjects_(sheet));
  writeObjects_(sheet, headers, rows);
}`;

if (!s.includes(oldSheetHelpers)) {
  console.error('Sheet helpers block NOT FOUND');
  process.exit(1);
}
s = s.replace(oldSheetHelpers, newSheetHelpers);

const oldSetup = `function setupSheets() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  getOrCreateSheet_(ss, 'Events', EVENT_HEADERS);
  getOrCreateSheet_(ss, 'Registrations', REG_HEADERS);`;

const newSetup = `/** Ejecutar manualmente si la hoja Registrations tiene columnas cruzadas. */
function repairRegistrationsSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Registrations');
  if (!sheet) {
    getRegistrationsSheet_(ss);
    Logger.log('Hoja Registrations creada con columnas correctas.');
    return;
  }
  syncRegistrationHeaders_(ss, sheet, REG_HEADERS);
  Logger.log('Hoja Registrations reparada. Filas: ' + Math.max(0, sheet.getLastRow() - 1));
}

function setupSheets() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  getOrCreateSheet_(ss, 'Events', EVENT_HEADERS);
  getRegistrationsSheet_(ss);`;

if (!s.includes(oldSetup)) {
  console.error('setupSheets block NOT FOUND');
  process.exit(1);
}
s = s.replace(oldSetup, newSetup);

fs.writeFileSync(path, s, 'utf8');
console.log('Patched successfully. Lines:', s.split(/\n/).length);
