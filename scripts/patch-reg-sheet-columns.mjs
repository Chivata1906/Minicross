/**
 * Actualiza REG_HEADERS: eventName + comprobantePagoUrl
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readAsText, writeUtf8File } from './utf8-encoding.mjs';

const gsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs/google-apps-script.gs');
let gs = readAsText(fs.readFileSync(gsPath));

const newHeaders = `const REG_HEADERS = [
  'id', 'eventId', 'eventName', 'nombre', 'apellido', 'identificacion',
  'identificacionArchivo', 'identificacionFileName', 'identificacionFileType',
  'comprobantePagoUrl', 'comprobantePagoFileName', 'comprobantePagoFileType',
  'fechaNacimiento', 'edad', 'email', 'celular', 'ciudad', 'marcaMoto',
  'numeroPiloto', 'categoriaId', 'categoriaLabel', 'createdAt', 'updatedAt',
];`;

gs = gs.replace(/const REG_HEADERS = \[[\s\S]*?\];/, newHeaders);

if (!gs.includes('syncRegistrationHeaders_')) {
  gs = gs.replace(
    `function getOrCreateSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
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
}`
  );
}

if (!gs.includes('prepareRegistrationRow_')) {
  gs = gs.replace(
    `  if (data.comprobantePagoArchivo && data.comprobantePagoArchivo.indexOf('data:') === 0) {
    data.comprobantePagoArchivo = saveComprobanteToDrive_(data, ss);
  }

  const sheet = getOrCreateSheet_(ss, 'Registrations', REG_HEADERS);
  appendRow_(sheet, REG_HEADERS, data);
  return { success: true, registration: data };`,
    `  if (data.comprobantePagoArchivo && data.comprobantePagoArchivo.indexOf('data:') === 0) {
    data.comprobantePagoUrl = saveComprobanteToDrive_(data, ss);
  } else if (data.comprobantePagoUrl && String(data.comprobantePagoUrl).indexOf('http') === 0) {
    // ya es URL
  } else if (data.comprobantePagoArchivo && String(data.comprobantePagoArchivo).indexOf('http') === 0) {
    data.comprobantePagoUrl = data.comprobantePagoArchivo;
  }

  var row = prepareRegistrationRow_(ss, data);
  const sheet = getOrCreateSheet_(ss, 'Registrations', REG_HEADERS);
  appendRow_(sheet, REG_HEADERS, row);
  return { success: true, registration: row };`
  );

  gs = gs.replace(
    `function validateCategorySelection_(categoriaId) {`,
    `function prepareRegistrationRow_(ss, data) {
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

function validateCategorySelection_(categoriaId) {`
  );
}

// updateRegistration: refresh eventName when eventId changes
if (!gs.includes('merged.eventName')) {
  gs = gs.replace(
    `  merged.id = id;
  merged.updatedAt = new Date().toISOString();`,
    `  merged.id = id;
  merged.updatedAt = new Date().toISOString();
  if (updates.eventId !== undefined) {
    merged.eventName = getEventNameById_(ss, merged.eventId);
  } else if (!merged.eventName && merged.eventId) {
    merged.eventName = getEventNameById_(ss, merged.eventId);
  }
  if (merged.comprobantePagoArchivo && String(merged.comprobantePagoArchivo).indexOf('http') === 0) {
    merged.comprobantePagoUrl = merged.comprobantePagoArchivo;
  }`
  );
}

writeUtf8File(gsPath, gs);
console.log('google-apps-script.gs updated');
