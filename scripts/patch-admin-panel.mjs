import fs from 'fs';

// ─── age.ts: DD/MM/YYYY support ───────────────────────────────────────────────
{
  const path = 'src/utils/age.ts';
  let s = fs.readFileSync(path, 'utf8');
  const old = `  const str = String(value).trim();
  if (/^\\d{4}-\\d{2}-\\d{2}/.test(str)) return str.slice(0, 10);
  const d = new Date(str.includes('T') ? str : str + 'T12:00:00');`;
  const neu = `  const str = String(value).trim();
  if (/^\\d{4}-\\d{2}-\\d{2}/.test(str)) return str.slice(0, 10);
  const dmy = str.match(/^(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return \`\${year}-\${month}-\${day}\`;
  }
  const d = new Date(str.includes('T') ? str : str + 'T12:00:00');`;
  if (!s.includes(old)) throw new Error('age.ts block not found');
  fs.writeFileSync(path, s.replace(old, neu), 'utf8');
  console.log('patched age.ts');
}

// ─── storage.ts: normalize fechaNacimiento ───────────────────────────────────
{
  const path = 'src/utils/storage.ts';
  let s = fs.readFileSync(path, 'utf8');
  s = s.replace(
    "fechaNacimiento: String(raw.fechaNacimiento ?? ''),",
    'fechaNacimiento: parseSheetDate(raw.fechaNacimiento),'
  );
  s = s.replace(
    `  if (updates.fechaNacimiento) {
    merged.edad = calculateAge(updates.fechaNacimiento);`,
    `  if (updates.fechaNacimiento) {
    merged.fechaNacimiento = parseSheetDate(updates.fechaNacimiento);
    merged.edad = calculateAge(merged.fechaNacimiento);`
  );
  fs.writeFileSync(path, s, 'utf8');
  console.log('patched storage.ts');
}

// ─── google-apps-script.gs: date + edad on save ──────────────────────────────
{
  const path = 'docs/google-apps-script.gs';
  let s = fs.readFileSync(path, 'utf8');
  const oldParse = `  var str = String(value).trim();
  if (/^\\d{4}-\\d{2}-\\d{2}/.test(str)) return str.slice(0, 10);
  var d = new Date(str.indexOf('T') >= 0 ? str : str + 'T12:00:00');`;
  const newParse = `  var str = String(value).trim();
  if (/^\\d{4}-\\d{2}-\\d{2}/.test(str)) return str.slice(0, 10);
  var dmy = str.match(/^(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{4})$/);
  if (dmy) {
    var day = ('0' + dmy[1]).slice(-2);
    var month = ('0' + dmy[2]).slice(-2);
    return dmy[3] + '-' + month + '-' + day;
  }
  var d = new Date(str.indexOf('T') >= 0 ? str : str + 'T12:00:00');`;
  if (!s.includes(oldParse)) throw new Error('gs parseSheetDate block not found');
  s = s.replace(oldParse, newParse);

  if (!s.includes('function calculateAge_')) {
    s = s.replace(
      'function prepareRegistrationRow_(ss, data) {',
      `function calculateAge_(birthDateStr) {
  if (!birthDateStr) return '';
  var birth = new Date(birthDateStr + 'T12:00:00');
  if (isNaN(birth.getTime())) return '';
  var ref = new Date();
  var age = ref.getFullYear() - birth.getFullYear();
  var m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
  return age;
}

function prepareRegistrationRow_(ss, data) {`
    );
  }

  s = s.replace(
    `  row.eventName = getEventNameById_(ss, data.eventId);
  if (!row.comprobantePagoUrl`,
    `  row.eventName = getEventNameById_(ss, data.eventId);
  row.fechaNacimiento = parseSheetDate_(row.fechaNacimiento);
  if (row.fechaNacimiento) {
    row.edad = calculateAge_(row.fechaNacimiento);
  }
  if (!row.comprobantePagoUrl`
  );

  s = s.replace(
    `  merged.updatedAt = new Date().toISOString();
  if (updates.eventId !== undefined) {`,
    `  merged.updatedAt = new Date().toISOString();
  if (merged.fechaNacimiento) {
    merged.fechaNacimiento = parseSheetDate_(merged.fechaNacimiento);
    merged.edad = calculateAge_(merged.fechaNacimiento);
  }
  if (updates.eventId !== undefined) {`
  );

  fs.writeFileSync(path, s, 'utf8');
  console.log('patched google-apps-script.gs');
}

console.log('All patches applied');
