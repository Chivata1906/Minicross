/**
 * Minicross Colombia 2026 - Google Apps Script Backend
 *
 * SETUP: ver docs/SETUP-GOOGLE-SHEETS.md
 *
 * Configura SPREADSHEET_ID y DRIVE_FOLDER_ID abajo.
 * Despliega como Web App: Ejecutar como "Yo", Acceso "Cualquier persona".
 */

const SPREADSHEET_ID = '1kAlC3MP2DqH5KXkQQLVZF0SbHV6X8DY3nAyLxO81654';
const DRIVE_FOLDER_ID = '1TQAM3BE93OjiaODNgI_2SkXLFQ2uqQqM';

const EVENT_HEADERS = ['id', 'name', 'date', 'location', 'city', 'description', 'active', 'reglamentoUrl', 'finished', 'valorInscripcion', 'championshipId', 'resultadosUrl'];
const CATEGORY_HEADERS = ['id', 'championshipId', 'label', 'minAge', 'maxAge', 'active'];
const REG_HEADERS = [
  'id', 'eventId', 'eventName', 'nombre', 'apellido', 'identificacion',
  'identificacionArchivo', 'identificacionFileName', 'identificacionFileType',
  'comprobantePagoUrl', 'comprobantePagoFileName', 'comprobantePagoFileType',
  'fechaNacimiento', 'edad', 'email', 'celular', 'ciudad', 'marcaMoto',
  'numeroPiloto', 'categoriaId', 'categoriaLabel', 'valorTotalInscripcion', 'createdAt', 'updatedAt',
];
const HEAT_KEYS = ['manga1', 'manga2', 'manga3', 'final'];

const ADMIN_PASSWORD = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');

// ─── HTTP handlers ───────────────────────────────────────────────────────────

function doGet(e) {
  e = e || { parameter: {} };
  const action = (e.parameter.action || '').toString();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const password = (e.parameter.password || '').toString();

  // Acciones Públicas (GET)
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

  if (action === 'categories') {
    return jsonResponse({ categories: getCategories_(ss) });
  }

  if (action === 'results') {
    const eventId = (e.parameter.eventId || '').toString();
    return jsonResponse({ results: getEventResults_(ss, eventId) });
  }

  // Acciones Protegidas (GET) - Requieren contraseña
  if (action === 'registrations') {
    if (password !== ADMIN_PASSWORD) {
      return jsonResponse({ success: false, error: 'No autorizado' });
    }
    return jsonResponse({ registrations: getRegistrations_(ss) });
  }

  if (action === 'all' || !action) {
    if (password === ADMIN_PASSWORD) {
      return jsonResponse({
        events: getEvents_(ss),
        registrations: getRegistrations_(ss),
        categories: getCategories_(ss),
      });
    }
    // Si no está autorizado para ver todo, solo devolvemos los eventos y categorías
    return jsonResponse({
      events: getEvents_(ss),
      categories: getCategories_(ss),
    });
  }

  return jsonResponse({ success: false, error: 'Accion desconocida o requiere autorizacion' });
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
  const password = body.password || '';

  // Acciones Públicas (POST)
  if (body.action === 'createRegistration') {
    return jsonResponse(createRegistration_(ss, body.data));
  }

  // Acciones Protegidas (POST) - Requieren contraseña
  const adminActions = [
    'updateRegistration',
    'deleteRegistration',
    'saveEvents',
    'saveResults',
    'saveCategories',
    'saveRegistrations'
  ];

  if (adminActions.indexOf(body.action) !== -1) {
    if (password !== ADMIN_PASSWORD) {
      return jsonResponse({ success: false, error: 'No autorizado' });
    }
  }

  switch (body.action) {
    case 'updateRegistration':
      return jsonResponse(updateRegistration_(ss, body.id, body.data));
    case 'deleteRegistration':
      return jsonResponse(deleteRegistration_(ss, body.id));
    case 'saveEvents':
      writeEvents_(ss, body.events);
      return jsonResponse({ success: true });
    case 'saveResults':
      try {
        return jsonResponse(saveEventResults_(ss, body.data));
      } catch (err) {
        return jsonResponse({ success: false, error: err.message || String(err) });
      }
    case 'saveCategories':
      try {
        writeCategories_(ss, body.categories);
        return jsonResponse({ success: true });
      } catch (err) {
        return jsonResponse({ success: false, error: err.message || String(err) });
      }
    case 'saveRegistrations':
      try {
        writeRegistrations_(ss, body.registrations);
        return jsonResponse({ success: true });
      } catch (err) {
        return jsonResponse({ success: false, error: err.message || String(err) });
      }
    default:
      return jsonResponse({ success: false, error: 'Accion desconocida o requiere autorizacion' });
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
  if (merged.fechaNacimiento) {
    merged.fechaNacimiento = parseSheetDate_(merged.fechaNacimiento);
    var eventObj = getEventById_(ss, merged.eventId);
    merged.edad = calculateAge_(merged.fechaNacimiento, eventObj ? eventObj.date : null);
  }
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

  merged.valorTotalInscripcion = computeValorTotalInscripcion_(ss, merged.eventId, merged.categoriaId);

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
  var sheet = getRegistrationsSheet_(ss);
  if (!sheet || sheet.getLastRow() < 2) return true;

  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var eventIdCol = -1;
  var pilotNumCol = -1;
  var idCol = -1;

  for (var j = 0; j < headers.length; j++) {
    var h = String(headers[j] || '').trim();
    if (h === 'eventId') eventIdCol = j + 1;
    if (h === 'numeroPiloto') pilotNumCol = j + 1;
    if (h === 'id') idCol = j + 1;
  }

  var numRows = sheet.getLastRow() - 1;
  if (eventIdCol > 0 && pilotNumCol > 0 && numRows > 0) {
    var eventVals = sheet.getRange(2, eventIdCol, numRows, 1).getValues();
    var numVals = sheet.getRange(2, pilotNumCol, numRows, 1).getValues();
    var idVals = (excludeId && idCol > 0) ? sheet.getRange(2, idCol, numRows, 1).getValues() : null;

    for (var i = 0; i < numRows; i++) {
      if (
        String(eventVals[i][0]) === String(eventId) &&
        Number(numVals[i][0]) === Number(numero) &&
        (!excludeId || !idVals || String(idVals[i][0]) !== String(excludeId))
      ) {
        return false;
      }
    }
  }
  return true;
}

// ─── Normalización de fechas y cálculos ──────────────────────────────────────

function parseSheetDate_(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number' && value > 1000) {
    var utc = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(utc.getTime())) {
      var y = utc.getUTCFullYear();
      var m = ('0' + (utc.getUTCMonth() + 1)).slice(-2);
      var d = ('0' + utc.getUTCDate()).slice(-2);
      return y + '-' + m + '-' + d;
    }
  }
  if (value instanceof Date) {
    if (!isNaN(value.getTime())) {
      var y2 = value.getFullYear();
      var m2 = ('0' + (value.getMonth() + 1)).slice(-2);
      var d2 = ('0' + value.getDate()).slice(-2);
      return y2 + '-' + m2 + '-' + d2;
    }
  }
  var str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  var dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    var day = ('0' + dmy[1]).slice(-2);
    var month = ('0' + dmy[2]).slice(-2);
    return dmy[3] + '-' + month + '-' + day;
  }
  var dt = new Date(str.indexOf('T') >= 0 ? str : str + 'T12:00:00');
  if (!isNaN(dt.getTime())) {
    var y3 = dt.getFullYear();
    var m3 = ('0' + (dt.getMonth() + 1)).slice(-2);
    var d3 = ('0' + dt.getDate()).slice(-2);
    return y3 + '-' + m3 + '-' + d3;
  }
  return str;
}

function calculateAge_(birthDateStr, refDateStr) {
  if (!birthDateStr) return '';
  var birth = new Date(birthDateStr + 'T12:00:00');
  if (isNaN(birth.getTime())) return '';
  var ref = refDateStr ? new Date(parseSheetDate_(refDateStr) + 'T12:00:00') : new Date();
  if (isNaN(ref.getTime())) ref = new Date();
  var age = ref.getFullYear() - birth.getFullYear();
  var m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
  return age;
}

function countCategories_(categoriaId) {
  if (!categoriaId) return 0;
  return String(categoriaId).split(',').map(function (s) { return s.trim(); }).filter(Boolean).length;
}

function getEventById_(ss, eventId) {
  var events = getEvents_(ss);
  for (var i = 0; i < events.length; i++) {
    if (String(events[i].id) === String(eventId)) return events[i];
  }
  return null;
}

function computeValorTotalInscripcion_(ss, eventId, categoriaId) {
  var event = getEventById_(ss, eventId);
  var unit = event ? (Number(event.valorInscripcion) || 0) : 0;
  return unit * countCategories_(categoriaId);
}

function prepareRegistrationRow_(ss, data) {
  var row = {};
  REG_HEADERS.forEach(function (h) {
    row[h] = data[h] !== undefined && data[h] !== null ? data[h] : '';
  });
  row.eventName = getEventNameById_(ss, data.eventId);
  row.fechaNacimiento = parseSheetDate_(row.fechaNacimiento);
  var eventObj = getEventById_(ss, data.eventId);
  if (row.fechaNacimiento) {
    row.edad = calculateAge_(row.fechaNacimiento, eventObj ? eventObj.date : null);
  }
  if (!row.comprobantePagoUrl && data.comprobantePagoArchivo && String(data.comprobantePagoArchivo).indexOf('http') === 0) {
    row.comprobantePagoUrl = data.comprobantePagoArchivo;
  }
  row.valorTotalInscripcion = computeValorTotalInscripcion_(ss, data.eventId, row.categoriaId);
  return row;
}

function validateCategorySelection_(_categoriaId) {
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
    return '[error al subir archivo: ' + err.message + ']';
  }
}

function getAvailablePilotNumbers_(ss, eventId) {
  var sheet = getRegistrationsSheet_(ss);
  if (!sheet || sheet.getLastRow() < 2) {
    return allDefaultPilotNumbers_();
  }

  // Obtenemos solo los encabezados para saber las columnas exactas de eventId y numeroPiloto
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var eventIdCol = -1;
  var pilotNumCol = -1;

  for (var j = 0; j < headers.length; j++) {
    var h = String(headers[j] || '').trim();
    if (h === 'eventId') eventIdCol = j + 1;
    if (h === 'numeroPiloto') pilotNumCol = j + 1;
  }

  var taken = {};
  var numRows = sheet.getLastRow() - 1;

  if (eventIdCol > 0 && pilotNumCol > 0 && numRows > 0) {
    var eventVals = sheet.getRange(2, eventIdCol, numRows, 1).getValues();
    var numVals = sheet.getRange(2, pilotNumCol, numRows, 1).getValues();
    for (var i = 0; i < numRows; i++) {
      if (String(eventVals[i][0]) === String(eventId)) {
        var pNum = Number(numVals[i][0]);
        if (pNum) taken[pNum] = true;
      }
    }
  }

  var numbers = [];
  for (var n = 4; n <= 999; n++) {
    if (!taken[n]) numbers.push(n);
  }
  return numbers;
}

function allDefaultPilotNumbers_() {
  var numbers = [];
  for (var n = 4; n <= 999; n++) numbers.push(n);
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
  var sheet = getEventsSheet_(ss);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var events = sheetToObjects_(sheet);
  return events.map(function (evt) {
    evt.date = parseSheetDate_(evt.date);
    evt.active = parseBoolField_(evt.active);
    evt.finished = parseBoolField_(evt.finished);
    if (!evt.reglamentoUrl) evt.reglamentoUrl = '';
    if (!evt.resultadosUrl) evt.resultadosUrl = '';
    evt.valorInscripcion = Number(evt.valorInscripcion) || 0;
    evt.championshipId = normalizeChampionshipId_(evt.championshipId, evt.name);
    return evt;
  });
}

function getRegistrations_(ss) {
  var sheet = getRegistrationsSheet_(ss);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheetToObjects_(sheet);
}

// ─── Categorías por campeonato (gestionadas desde el panel) ──────────────────

function getCategoriesSheet_(ss) {
  return getOrCreateSheet_(ss, 'Categories', CATEGORY_HEADERS);
}

function normalizeCategoryRow_(row) {
  var maxAge = Number(row.maxAge);
  var minAge = Number(row.minAge);
  var activeRaw = row.active;
  var active =
    activeRaw === undefined || activeRaw === null || activeRaw === ''
      ? true
      : activeRaw === true ||
        activeRaw === 'TRUE' ||
        activeRaw === 'true' ||
        activeRaw === 1 ||
        activeRaw === '1';
  return {
    id: String(row.id || '').trim(),
    championshipId: String(row.championshipId || '').trim().toLowerCase() === 'enduro' ? 'enduro' : 'mx',
    label: String(row.label || '').trim(),
    minAge: isFinite(minAge) && minAge >= 0 ? minAge : 0,
    maxAge: isFinite(maxAge) && maxAge > 0 ? maxAge : 999,
    active: active,
  };
}

function getCategories_(ss) {
  var sheet = getCategoriesSheet_(ss);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheetToObjects_(sheet)
    .map(normalizeCategoryRow_)
    .filter(function (c) { return c.id && c.label; });
}

function writeCategories_(ss, categories) {
  var rows = (categories || [])
    .map(normalizeCategoryRow_)
    .filter(function (c) { return c.id && c.label; });
  if (rows.length === 0) {
    throw new Error('saveCategories bloqueado: se recibio una lista vacia.');
  }
  var sheet = getCategoriesSheet_(ss);
  writeObjects_(sheet, CATEGORY_HEADERS, rows);
}

function writeEvents_(ss, events) {
  var sheet = getEventsSheet_(ss);
  var rows = events.map(function (evt) {
    return prepareEventRow_(ss, evt);
  });
  writeObjects_(sheet, EVENT_HEADERS, rows);
}

function writeRegistrations_(ss, registrations) {
  var sheet = getRegistrationsSheet_(ss);
  var existingCount = Math.max(0, sheet.getLastRow() - 1);
  if (existingCount > 0 && (!registrations || registrations.length === 0)) {
    throw new Error(
      'saveRegistrations bloqueado: hay ' + existingCount + ' inscripciones y se recibio una lista vacia.'
    );
  }
  registrations = (registrations || []).map(function (row) {
    if (!row.valorTotalInscripcion && row.eventId && row.categoriaId) {
      row.valorTotalInscripcion = computeValorTotalInscripcion_(ss, row.eventId, row.categoriaId);
    }
    return row;
  });
  writeObjects_(sheet, REG_HEADERS, registrations);
}

// ─── Sheet helpers ───────────────────────────────────────────────────────────

function parseBoolField_(value) {
  return value === true || value === 'true' || value === 'TRUE' || value === 1 || value === '1';
}

function normalizeChampionshipId_(value, eventName) {
  var v = String(value || '').trim().toLowerCase();
  if (v === 'enduro' || v === 'mx') return v;
  return /enduro/i.test(String(eventName || '')) ? 'enduro' : 'mx';
}

function getEventsSheet_(ss) {
  return getOrCreateSheet_(ss, 'Events', EVENT_HEADERS);
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
  ensureSheetHeaders_(sheet, headers);
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
  row.valorInscripcion = Number(row.valorInscripcion) || 0;
  row.championshipId = normalizeChampionshipId_(row.championshipId, row.name);
  if (data.reglamentoArchivo && String(data.reglamentoArchivo).indexOf('data:') === 0) {
    row.reglamentoUrl = saveReglamentoToDrive_(data, ss);
  } else if (data.reglamentoUrl && String(data.reglamentoUrl).indexOf('http') === 0) {
    row.reglamentoUrl = data.reglamentoUrl;
  } else if (!row.reglamentoUrl) {
    row.reglamentoUrl = '';
  }
  if (data.resultadosUrl && String(data.resultadosUrl).indexOf('http') === 0) {
    row.resultadosUrl = data.resultadosUrl;
  } else if (!row.resultadosUrl) {
    row.resultadosUrl = '';
  }
  return row;
}

// ─── Resultados (JSON y archivos en Drive) ───────────────────────────────────

function getOrCreateResultsFolder_() {
  var root = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var name = 'Resultados';
  var folders = root.getFoldersByName(name);
  var folder = folders.hasNext() ? folders.next() : root.createFolder(name);
  makeDriveFilePublicView_(folder);
  return folder;
}

function makeDriveFilePublicView_(fileOrFolder) {
  if (!fileOrFolder) return;
  try {
    fileOrFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    try {
      fileOrFolder.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    } catch (e) {}
  }
}

function formatDrivePreviewUrl_(urlOrId) {
  if (!urlOrId) return '';
  var str = String(urlOrId).trim();
  if (str.indexOf('data:') === 0 || str.indexOf('blob:') === 0) return str;
  var match = str.match(/\/file\/d\/([-\w]{25,})/i) || str.match(/[?&]id=([-\w]{25,})/i) || str.match(/[-\w]{25,}/);
  if (match) {
    return 'https://drive.google.com/file/d/' + (match[1] || match[0]) + '/preview';
  }
  return str;
}

function parseDataUriToBlob_(dataUri, fileName, fallbackMime) {
  var parts = String(dataUri || '').split(',');
  var header = parts[0] || '';
  var base64 = parts.length > 1 ? parts[1] : parts[0];
  var mimeMatch = header.match(/data:([^;]+);/);
  var mimeType = (mimeMatch && mimeMatch[1]) ? mimeMatch[1] : (fallbackMime || 'application/octet-stream');
  return Utilities.newBlob(
    Utilities.base64Decode(base64),
    mimeType,
    fileName || 'archivo'
  );
}

function uploadResultsBlob_(folder, base64DataUrl, fileName, mimeType) {
  var blob = parseDataUriToBlob_(base64DataUrl, fileName, mimeType);
  var file = folder.createFile(blob);
  makeDriveFilePublicView_(file);
  return formatDrivePreviewUrl_(file.getId());
}

function findDriveFileByUrl_(url) {
  if (!url || String(url).indexOf('http') !== 0) return null;
  var match = String(url).match(/[-\w]{25,}/);
  if (!match) return null;
  try {
    return DriveApp.getFileById(match[0]);
  } catch (err) {
    return null;
  }
}

function processHeatUploads_(folder, eventId, eventName, categoryId, heatKey, heatData) {
  if (!heatData) return null;

  var result = {
    columns: heatData.columns || [],
    rows: heatData.rows || [],
    commentColumn: heatData.commentColumn || null,
    pdfUrl: heatData.pdfUrl || '',
    csvUrl: heatData.csvUrl || '',
  };

  var suffixBase = sanitizeFileNamePart_(eventId) + '_' + sanitizeFileNamePart_(categoryId) + '_' + heatKey;

  if (heatData.csvUpload && heatData.csvUpload.archivo && String(heatData.csvUpload.archivo).indexOf('data:') === 0) {
    var csvName = buildDriveFileName_(
      suffixBase,
      eventName,
      'CSV',
      heatData.csvUpload.fileName || (heatKey + '.csv'),
      heatData.csvUpload.fileType || 'text/csv'
    );
    result.csvUrl = uploadResultsBlob_(
      folder,
      heatData.csvUpload.archivo,
      csvName,
      heatData.csvUpload.fileType || 'text/csv'
    );
  }

  if (heatKey !== 'final' && heatData.pdfUpload && heatData.pdfUpload.archivo && String(heatData.pdfUpload.archivo).indexOf('data:') === 0) {
    var pdfName = buildDriveFileName_(
      suffixBase,
      eventName,
      'VUELTAS',
      heatData.pdfUpload.fileName || (heatKey + '.pdf'),
      heatData.pdfUpload.fileType || 'application/pdf'
    );
    result.pdfUrl = uploadResultsBlob_(
      folder,
      heatData.pdfUpload.archivo,
      pdfName,
      heatData.pdfUpload.fileType || 'application/pdf'
    );
  }

  if (!result.pdfUrl) delete result.pdfUrl;
  if (!result.csvUrl) delete result.csvUrl;
  return result;
}

function getEventResults_(ss, eventId) {
  if (!eventId) return null;
  var events = getEvents_(ss);
  var event = null;
  for (var i = 0; i < events.length; i++) {
    if (events[i].id === eventId) {
      event = events[i];
      break;
    }
  }
  if (!event || !event.resultadosUrl) return null;

  var file = findDriveFileByUrl_(event.resultadosUrl);
  if (!file) {
    if (String(event.resultadosUrl).indexOf('http') === 0) {
      return {
        eventId: eventId,
        updatedAt: '',
        mode: 'single_pdf',
        singlePdfUrl: event.resultadosUrl,
        categories: [],
      };
    }
    return null;
  }

  try {
    makeDriveFilePublicView_(file);
    var mime = file.getMimeType();
    if (mime === 'application/pdf' || file.getName().toLowerCase().indexOf('.pdf') !== -1) {
      return {
        eventId: eventId,
        updatedAt: file.getLastUpdated().toISOString(),
        mode: 'single_pdf',
        singlePdfUrl: formatDrivePreviewUrl_(file.getId()),
        categories: [],
      };
    }
    var parsed = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
    if (parsed && parsed.singlePdfUrl) {
      var singlePdfFile = findDriveFileByUrl_(parsed.singlePdfUrl);
      if (singlePdfFile) {
        makeDriveFilePublicView_(singlePdfFile);
        parsed.singlePdfUrl = formatDrivePreviewUrl_(singlePdfFile.getId());
      } else {
        parsed.singlePdfUrl = formatDrivePreviewUrl_(parsed.singlePdfUrl);
      }
    }
    return parsed;
  } catch (err) {
    return {
      eventId: eventId,
      updatedAt: '',
      mode: 'single_pdf',
      singlePdfUrl: formatDrivePreviewUrl_(file.getId()),
      categories: [],
    };
  }
}

function updateEventResultadosUrl_(ss, eventId, resultadosUrl) {
  var sheet = getEventsSheet_(ss);
  var objects = sheetToObjects_(sheet);
  var changed = false;
  objects.forEach(function (row) {
    if (row.id === eventId) {
      row.resultadosUrl = resultadosUrl;
      changed = true;
    }
  });
  if (changed) writeObjects_(sheet, EVENT_HEADERS, objects.map(function (row) {
    return prepareEventRow_(ss, row);
  }));
}

function saveEventResults_(ss, data) {
  if (!data || !data.eventId) {
    throw new Error('Falta eventId para guardar resultados.');
  }

  var eventName = data.eventName || getEventNameById_(ss, data.eventId) || data.eventId;
  var folder = getOrCreateResultsFolder_();
  var isSinglePdf = data.mode === 'single_pdf' || Boolean(data.singlePdfUpload) || (Boolean(data.singlePdfUrl) && (!data.categories || data.categories.length === 0));

  if (isSinglePdf) {
    var singlePdfUrl = data.singlePdfUrl || '';
    if (data.singlePdfUpload && data.singlePdfUpload.archivo && data.singlePdfUpload.archivo.indexOf('data:') === 0) {
      var pdfName = buildDriveFileName_(
        data.eventId,
        eventName,
        'RESULTADOS_OFICIALES',
        data.singlePdfUpload.fileName || 'resultados.pdf',
        data.singlePdfUpload.fileType || 'application/pdf'
      );
      var pdfBlob = parseDataUriToBlob_(data.singlePdfUpload.archivo, pdfName);
      var pdfFile = folder.createFile(pdfBlob);
      makeDriveFilePublicView_(pdfFile);
      singlePdfUrl = formatDrivePreviewUrl_(pdfFile.getId());
    } else if (singlePdfUrl) {
      var existingPdfFile = findDriveFileByUrl_(singlePdfUrl);
      if (existingPdfFile) {
        makeDriveFilePublicView_(existingPdfFile);
        singlePdfUrl = formatDrivePreviewUrl_(existingPdfFile.getId());
      }
    }

    var singleResults = {
      eventId: data.eventId,
      updatedAt: new Date().toISOString(),
      mode: 'single_pdf',
      singlePdfUrl: singlePdfUrl,
      categories: [],
    };

    var jsonName = buildDriveFileName_(
      data.eventId,
      eventName,
      'RESULTADOS',
      'resultados.json',
      'application/json'
    );
    var jsonBlob = Utilities.newBlob(JSON.stringify(singleResults), 'application/json', jsonName);

    var existingEvents = getEvents_(ss);
    var existingUrl = '';
    for (var i = 0; i < existingEvents.length; i++) {
      if (existingEvents[i].id === data.eventId) {
        existingUrl = existingEvents[i].resultadosUrl || '';
        break;
      }
    }

    var existingFile = findDriveFileByUrl_(existingUrl);
    if (existingFile) {
      try {
        existingFile.setTrashed(true);
      } catch (err) {}
    }

    var created = folder.createFile(jsonBlob);
    makeDriveFilePublicView_(created);
    var resultadosUrl = created.getUrl();

    updateEventResultadosUrl_(ss, data.eventId, singlePdfUrl || resultadosUrl);

    return {
      success: true,
      results: singleResults,
      resultadosUrl: singlePdfUrl || resultadosUrl,
    };
  }

  var categories = (data.categories || []).map(function (cat) {
    var out = {
      categoryId: cat.categoryId,
      categoryLabel: cat.categoryLabel || cat.categoryId,
    };
    HEAT_KEYS.forEach(function (heatKey) {
      if (!cat[heatKey]) return;
      out[heatKey] = processHeatUploads_(folder, data.eventId, eventName, cat.categoryId, heatKey, cat[heatKey]);
    });
    return out;
  });

  var results = {
    eventId: data.eventId,
    updatedAt: new Date().toISOString(),
    mode: 'categories',
    categories: categories,
  };

  var jsonName = buildDriveFileName_(
    data.eventId,
    eventName,
    'RESULTADOS',
    'resultados.json',
    'application/json'
  );
  var jsonBlob = Utilities.newBlob(JSON.stringify(results), 'application/json', jsonName);

  var existingEvents = getEvents_(ss);
  var existingUrl = '';
  for (var i = 0; i < existingEvents.length; i++) {
    if (existingEvents[i].id === data.eventId) {
      existingUrl = existingEvents[i].resultadosUrl || '';
      break;
    }
  }

  var existingFile = findDriveFileByUrl_(existingUrl);
  if (existingFile) {
    try {
      existingFile.setTrashed(true);
    } catch (err) {
      // Si no se puede borrar el JSON anterior, se crea uno nuevo de todas formas.
    }
  }

  var created = folder.createFile(jsonBlob);
  created.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var resultadosUrl = created.getUrl();

  updateEventResultadosUrl_(ss, data.eventId, resultadosUrl);

  return {
    success: true,
    results: results,
    resultadosUrl: resultadosUrl,
  };
}

function getRegistrationsSheet_(ss) {
  return getOrCreateSheet_(ss, 'Registrations', REG_HEADERS);
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
    if (!row.identificacionArchivo && row.identificacionDriveUrl) {
      row.identificacionArchivo = row.identificacionDriveUrl;
    }
    if (!row.valorTotalInscripcion && row.eventId && row.categoriaId) {
      row.valorTotalInscripcion = computeValorTotalInscripcion_(ss, row.eventId, row.categoriaId);
    }
    delete row.comprobantePagoArchivo;
    delete row.identificacionDriveUrl;
  });
  return rows;
}

function backupSheet_(sheet) {
  var ss = sheet.getParent();
  var stamp = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyyMMdd_HHmmss');
  var baseName = 'BACKUP_' + sheet.getName() + '_' + stamp;
  var copy = sheet.copyTo(ss);
  copy.setName(baseName.substring(0, 99));
  return copy.getName();
}

function headersMatchInOrder_(current, headers) {
  if (current.length < headers.length) return false;
  for (var i = 0; i < headers.length; i++) {
    if (current[i] !== headers[i]) return false;
  }
  return true;
}

function readSheetHeaders_(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var current = [];
  for (var i = 0; i < headerRow.length; i++) {
    current.push(String(headerRow[i] || '').trim());
  }
  while (current.length && !current[current.length - 1]) current.pop();
  return current;
}

/** Solo agrega columnas nuevas al final. Nunca borra filas de datos. */
function ensureSheetHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0 || (sheet.getLastRow() === 1 && !String(sheet.getRange(1, 1).getValue() || '').trim())) {
    sheet.clear();
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return;
  }

  var current = readSheetHeaders_(sheet);
  if (headersMatchInOrder_(current, headers)) return;

  var missing = [];
  for (var j = 0; j < headers.length; j++) {
    if (current.indexOf(headers[j]) === -1) missing.push(headers[j]);
  }

  missing.forEach(function (h) {
    var col = sheet.getLastColumn() + 1;
    sheet.getRange(1, col).setValue(h).setFontWeight('bold');
  });

  if (missing.length > 0) {
    Logger.log('Columnas agregadas sin borrar datos: ' + missing.join(', '));
    return;
  }

  Logger.log(
    'ADVERTENCIA: las columnas existen pero el orden difiere. ' +
    'Ejecuta repairRegistrationsSheet o repairEventsSheet (crea backup antes de remapear).'
  );
}

function remapRowsToHeaders_(rows, headers) {
  return rows.map(function (row) {
    var out = {};
    headers.forEach(function (h) {
      out[h] = row[h] !== undefined && row[h] !== null ? row[h] : '';
    });
    return out;
  });
}

function getOrCreateSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else {
    ensureSheetHeaders_(sheet, headers);
  }
  return sheet;
}

function syncRegistrationHeadersFull_(ss, sheet, headers) {
  var rows = migrateRegistrationRows_(ss, sheetToObjects_(sheet));
  writeObjects_(sheet, headers, remapRowsToHeaders_(rows, headers));
}

function syncEventHeadersFull_(ss, sheet, headers) {
  var rows = sheetToObjects_(sheet);
  rows.forEach(function (row) {
    row.active = parseBoolField_(row.active);
    row.finished = parseBoolField_(row.finished);
    if (!row.reglamentoUrl) row.reglamentoUrl = '';
    if (!row.resultadosUrl) row.resultadosUrl = '';
    row.valorInscripcion = Number(row.valorInscripcion) || 0;
    row.championshipId = normalizeChampionshipId_(row.championshipId, row.name);
  });
  writeObjects_(sheet, headers, remapRowsToHeaders_(rows, headers));
}

function sheetToObjects_(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function (h) { return String(h).trim(); });
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var rowValues = data[i];
    var isEmpty = true;
    for (var k = 0; k < rowValues.length; k++) {
      if (String(rowValues[k] || '').trim() !== '') {
        isEmpty = false;
        break;
      }
    }
    if (isEmpty) continue;

    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var headerKey = headers[j];
      if (headerKey) obj[headerKey] = rowValues[j];
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

// ─── Utilidades y reparaciones ──────────────────────────────────────────────

/**
 * Prueba minima del editor. Si ESTA falla con "error desconocido",
 * el problema es de Google Apps Script (no del codigo ni de tus datos).
 */
function ping() {
  Logger.log('ping OK - el editor puede ejecutar codigo');
}

/**
 * Solo agrega columnas nuevas a Events (p. ej. resultadosUrl) sin backup ni remapear.
 * NUNCA borra filas. Usa ESTA solo si quieres forzar la columna desde el editor.
 * En la practica NO es obligatoria: al usar el sitio, getEvents_ ya agrega columnas faltantes.
 */
function addMissingEventColumns() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = getEventsSheet_(ss);
  ensureSheetHeaders_(sheet, EVENT_HEADERS);
  Logger.log('Encabezados Events: ' + readSheetHeaders_(sheet).join(', '));
  Logger.log('Listo. Ninguna fila fue borrada.');
}

/** Ejecutar manualmente si la hoja Events tiene columnas desalineadas. Crea backup antes de remapear. */
function repairEventsSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Events');
  if (!sheet) {
    getEventsSheet_(ss);
    Logger.log('Hoja Events creada con columnas correctas.');
    return;
  }

  // Primero intenta agregar columnas faltantes sin borrar datos (ej. resultadosUrl).
  ensureSheetHeaders_(sheet, EVENT_HEADERS);
  var current = readSheetHeaders_(sheet);
  if (headersMatchInOrder_(current, EVENT_HEADERS)) {
    Logger.log('Hoja Events OK. Filas: ' + Math.max(0, sheet.getLastRow() - 1));
    return;
  }

  var backupName = backupSheet_(sheet);
  Logger.log('Backup creado: ' + backupName);
  syncEventHeadersFull_(ss, sheet, EVENT_HEADERS);
  Logger.log('Hoja Events reparada. Filas: ' + Math.max(0, sheet.getLastRow() - 1));
}

/** Ejecutar manualmente si la hoja Registrations tiene columnas cruzadas. Crea backup antes de remapear. */
function repairRegistrationsSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Registrations');
  if (!sheet) {
    getRegistrationsSheet_(ss);
    Logger.log('Hoja Registrations creada con columnas correctas.');
    return;
  }
  ensureSheetHeaders_(sheet, REG_HEADERS);
  var current = readSheetHeaders_(sheet);
  if (headersMatchInOrder_(current, REG_HEADERS)) {
    Logger.log('Hoja Registrations OK. Filas: ' + Math.max(0, sheet.getLastRow() - 1));
    return;
  }
  var backupName = backupSheet_(sheet);
  Logger.log('Backup creado: ' + backupName);
  syncRegistrationHeadersFull_(ss, sheet, REG_HEADERS);
  Logger.log('Hoja Registrations reparada. Filas: ' + Math.max(0, sheet.getLastRow() - 1));
}

/** Repara Events y Registrations en una sola ejecucion. */
function repairAllSheets() {
  try {
    repairEventsSheet();
  } catch (err) {
    Logger.log('Error en Events: ' + (err && err.message ? err.message : err));
    throw err;
  }
  try {
    repairRegistrationsSheet();
  } catch (err) {
    Logger.log('Error en Registrations: ' + (err && err.message ? err.message : err));
    throw err;
  }
  Logger.log('Reparacion completada (Events + Registrations).');
}

function setupSheets() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  getEventsSheet_(ss);
  getRegistrationsSheet_(ss);
  getCategoriesSheet_(ss);

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
        reglamentoUrl: '',
        resultadosUrl: '',
        finished: false,
        championshipId: 'mx',
      },
      {
        id: 'evt-002',
        name: 'Valida 2 - Medellin',
        date: '2026-05-20',
        location: 'Autodromo del Oriente',
        city: 'Medellin',
        description: 'Segunda valida del campeonato.',
        active: true,
        reglamentoUrl: '',
        resultadosUrl: '',
        finished: false,
        championshipId: 'mx',
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

/**
 * Utilidad administrativa para ejecutar desde el editor de Google Apps Script:
 * Asigna permisos públicos de lectura ("Cualquiera con el enlace puede ver")
 * a la carpeta Resultados y a todos los archivos y PDFs dentro de ella.
 */
function fixAllResultsDrivePermissions() {
  var folder = getOrCreateResultsFolder_();
  makeDriveFilePublicView_(folder);
  var files = folder.getFiles();
  var count = 0;
  while (files.hasNext()) {
    var f = files.next();
    makeDriveFilePublicView_(f);
    count++;
  }
  Logger.log('Se asignaron permisos publicos de lectura a ' + count + ' archivos en la carpeta Resultados.');
}
