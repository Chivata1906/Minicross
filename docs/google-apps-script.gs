/**
 * Minicross Colombia 2026 - Google Apps Script Backend
 *
 * SETUP: ver docs/SETUP-GOOGLE-SHEETS.md
 *
 * Configura SPREADSHEET_ID y DRIVE_FOLDER_ID abajo.
 * Despliega como Web App: Ejecutar como "Yo", Acceso "Cualquier persona".
 */

const SPREADSHEET_ID = '1g5crmfmbcxyvmLMXxYECxO90gFYiXf7P5JaSze7pmbI';
const DRIVE_FOLDER_ID = '1oImoS0x__kgBBXaL9HAg3Qf-4Zj0Xz0l';

const EVENT_HEADERS = ['id', 'name', 'date', 'location', 'city', 'description', 'active'];
const REG_HEADERS = [
  'id', 'eventId', 'eventName', 'nombre', 'apellido', 'identificacion',
  'identificacionArchivo', 'identificacionFileName', 'identificacionFileType',
  'comprobantePagoUrl', 'comprobantePagoFileName', 'comprobantePagoFileType',
  'fechaNacimiento', 'edad', 'email', 'celular', 'ciudad', 'marcaMoto',
  'numeroPiloto', 'categoriaId', 'categoriaLabel', 'createdAt', 'updatedAt',
];

// ─── HTTP handlers ───────────────────────────────────────────────────────────

function doGet(e) {
  e = e || { parameter: {} };
  const action = (e.parameter.action || 'all').toString();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  
  if (action === 'availablePilots') {
    const eventId = e.parameter.eventId;
    return jsonResponse({ numbers: getAvailablePilotNumbers_(ss, eventId) });
  }

  if (action === 'checkPilot') {
    const eventId = e.parameter.eventId;
    const numero = Number(e.parameter.numero);
    const excludeId = e.parameter.excludeId || null;
    const available = isPilotNumberAvailable_(ss, eventId, numero, excludeId);
    return jsonResponse({ available: available });
  }

  if (action === 'events') {
    return jsonResponse({ events: getEvents_(ss) });
  }

  if (action === 'registrations') {
    return jsonResponse({ registrations: getRegistrations_(ss) });
  }

  return jsonResponse({
    events: getEvents_(ss),
    registrations: getRegistrations_(ss),
  });
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return jsonResponse({
      success: false,
      error: 'doPost solo funciona via HTTP desde la web. Para configurar, ejecuta setupSheets.',
    });
  }
  const body = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  switch (body.action) {
    case 'createRegistration':
      return jsonResponse(createRegistration_(ss, body.data));
    case 'updateRegistration':
      return jsonResponse(updateRegistration_(ss, body.id, body.data));
    case 'deleteRegistration':
      return jsonResponse(deleteRegistration_(ss, body.id));
    case 'saveEvents':
      writeEvents_(ss, body.events);
      return jsonResponse({ success: true });
    case 'saveRegistrations':
      writeRegistrations_(ss, body.registrations);
      return jsonResponse({ success: true });
    default:
      return jsonResponse({ success: false, error: 'Accion desconocida' });
  }
}

// ─── Registrations CRUD ──────────────────────────────────────────────────────

function createRegistration_(ss, data) {
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
    data.comprobantePagoUrl = saveComprobanteToDrive_(data, ss);
  } else if (data.comprobantePagoUrl && String(data.comprobantePagoUrl).indexOf('http') === 0) {
    // ya es URL
  } else if (data.comprobantePagoArchivo && String(data.comprobantePagoArchivo).indexOf('http') === 0) {
    data.comprobantePagoUrl = data.comprobantePagoArchivo;
  }

  var row = prepareRegistrationRow_(ss, data);
  const sheet = getRegistrationsSheet_(ss);
  appendRow_(sheet, REG_HEADERS, row);
  return { success: true, registration: row };
}

function updateRegistration_(ss, id, updates) {
  const sheet = getRegistrationsSheet_(ss);
  if (!sheet) return { success: false, error: 'Hoja Registrations no encontrada' };

  const rows = sheetToObjects_(sheet);
  const index = rows.findIndex(function (r) { return String(r.id) === String(id); });
  if (index === -1) return { success: false, error: 'Inscripción no encontrada' };

  const merged = {};
  REG_HEADERS.forEach(function (h) {
    merged[h] = updates[h] !== undefined ? updates[h] : rows[index][h];
  });
  merged.id = id;
  merged.updatedAt = new Date().toISOString();
  if (updates.eventId !== undefined) {
    merged.eventName = getEventNameById_(ss, merged.eventId);
  } else if (!merged.eventName && merged.eventId) {
    merged.eventName = getEventNameById_(ss, merged.eventId);
  }
  if (merged.comprobantePagoArchivo && String(merged.comprobantePagoArchivo).indexOf('http') === 0) {
    merged.comprobantePagoUrl = merged.comprobantePagoArchivo;
  }

  if (
    updates.numeroPiloto !== undefined &&
    !isPilotNumberAvailable_(ss, merged.eventId, Number(merged.numeroPiloto), id)
  ) {
    return { success: false, error: 'El numero de piloto ' + merged.numeroPiloto + ' ya esta en uso.' };
  }

  const rowNum = index + 2;
  REG_HEADERS.forEach(function (h, i) {
    sheet.getRange(rowNum, i + 1).setValue(merged[h] !== undefined ? merged[h] : '');
  });

  return { success: true, registration: merged };
}

function deleteRegistration_(ss, id) {
  const sheet = getRegistrationsSheet_(ss);
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };

  const rows = sheetToObjects_(sheet);
  const index = rows.findIndex(function (r) { return String(r.id) === String(id); });
  if (index === -1) return { success: false, error: 'Inscripción no encontrada' };

  sheet.deleteRow(index + 2);
  return { success: true };
}

// ─── Pilot number check ──────────────────────────────────────────────────────

function isPilotNumberAvailable_(ss, eventId, numero, excludeId) {
  const regs = getRegistrations_(ss);
  for (var i = 0; i < regs.length; i++) {
    var r = regs[i];
    if (
      String(r.eventId) === String(eventId) &&
      Number(r.numeroPiloto) === Number(numero) &&
      (!excludeId || String(r.id) !== String(excludeId))
    ) {
      return false;
    }
  }
  return true;
}

// ─── Drive: guardar documento de identidad ───────────────────────────────────


function prepareRegistrationRow_(ss, data) {
  var row = {};
  REG_HEADERS.forEach(function (h) {
    row[h] = data[h] !== undefined && data[h] !== null ? data[h] : '';
  });
  row.eventName = getEventNameById_(ss, data.eventId);
  if (!row.comprobantePagoUrl && data.comprobantePagoArchivo && String(data.comprobantePagoArchivo).indexOf('http') === 0) {
    row.comprobantePagoUrl = data.comprobantePagoArchivo;
  }
  return row;
}

function validateCategorySelection_(categoriaId) {
  if (!categoriaId) return null;
  var ids = String(categoriaId).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  var groups = {};
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    if (id === '125cc-junior') continue;
    var m = id.match(/^(\d+cc)-(a|b)$/);
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
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 80);
}

function getFileExtension_(fileName, mimeType) {
  var m = String(fileName || '').match(/\.([a-zA-Z0-9]{1,8})$/);
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

function saveFileToDrive_(data, ss) {
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
    );
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    return '[error al subir: ' + err.message + ']';
  }
}

// ─── Events ──────────────────────────────────────────────────────────────────


function parseSheetDate_(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'number' && value > 1000) {
    var utc = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(utc.getTime())) return utc.toISOString().slice(0, 10);
  }
  var str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  var d = new Date(str.indexOf('T') >= 0 ? str : str + 'T12:00:00');
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return str;
}

function getAvailablePilotNumbers_(ss, eventId) {
  var regs = getRegistrations_(ss);
  var taken = {};
  for (var i = 0; i < regs.length; i++) {
    if (String(regs[i].eventId) === String(eventId)) {
      taken[Number(regs[i].numeroPiloto)] = true;
    }
  }
  var numbers = [];
  for (var n = 4; n <= 999; n++) {
    if (!taken[n]) numbers.push(n);
  }
  return numbers;
}

function saveComprobanteToDrive_(data, ss) {
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
    );
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    return '[error al subir comprobante: ' + err.message + ']';
  }
}

function getEvents_(ss) {
  var sheet = ss.getSheetByName('Events');
  if (!sheet || sheet.getLastRow() < 2) return [];
  var events = sheetToObjects_(sheet);
  return events.map(function (evt) {
    evt.date = parseSheetDate_(evt.date);
    return evt;
  });
}

function getRegistrations_(ss) {
  var sheet = getRegistrationsSheet_(ss);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheetToObjects_(sheet);
}

function writeEvents_(ss, events) {
  var sheet = getOrCreateSheet_(ss, 'Events', EVENT_HEADERS);
  writeObjects_(sheet, EVENT_HEADERS, events);
}

function writeRegistrations_(ss, registrations) {
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
}

function sheetToObjects_(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    result.push(obj);
  }
  return result;
}

function appendRow_(sheet, headers, obj) {
  sheet.appendRow(headers.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; }));
}

function writeObjects_(sheet, headers, objects) {
  sheet.clear();
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  objects.forEach(function (obj) {
    appendRow_(sheet, headers, obj);
  });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Utilidad: crear hojas iniciales (ejecutar una vez manualmente) ──────────

/** Ejecutar manualmente si la hoja Registrations tiene columnas cruzadas. */
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
  getRegistrationsSheet_(ss);

  var eventsSheet = ss.getSheetByName('Events');
  if (eventsSheet.getLastRow() === 1) {
    writeEvents_(ss, [
      {
        id: 'evt-001',
        name: 'Valida 1 - Bogota',
        date: '2026-03-15',
        location: 'Pista Off-Road El Dorado',
        city: 'Bogota',
        description: 'Primera valida del campeonato. Triple Corona: 3 mangas.',
        active: true,
      },
      {
        id: 'evt-002',
        name: 'Valida 2 - Medellin',
        date: '2026-05-20',
        location: 'Autodromo del Oriente',
        city: 'Medellin',
        description: 'Segunda valida del campeonato.',
        active: true,
      },
    ]);
  }
  Logger.log('Hojas creadas correctamente.');
}

/** Ejecuta ESTA funcion desde el editor (no doGet). Crea las hojas y eventos de ejemplo. */
function testConnection() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  setupSheets();
  Logger.log('Sheet: ' + ss.getName());
  Logger.log('Carpeta Drive: ' + folder.getName());
  Logger.log('Eventos: ' + getEvents_(ss).length);
  Logger.log('Todo OK. Ahora despliega como Web App.');
}
