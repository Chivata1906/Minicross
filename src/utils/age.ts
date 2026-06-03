export function calculateAge(birthDate: string, referenceDate: Date = new Date()): number {
  const birth = new Date(birthDate + 'T12:00:00');
  if (Number.isNaN(birth.getTime())) return -1;
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDiff = referenceDate.getMonth() - birth.getMonth();
  const dayDiff = referenceDate.getDate() - birth.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;
  return age;
}

/** Normaliza fechas de Google Sheets (serial, ISO, texto). */
export function parseSheetDate(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'number' && value > 1000) {
    const utc = new Date((value - 25569) * 86400 * 1000);
    if (!Number.isNaN(utc.getTime())) return utc.toISOString().slice(0, 10);
  }
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }
  const d = new Date(str.includes('T') ? str : str + 'T12:00:00');
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return str;
}

export function formatDate(dateInput: unknown): string {
  const dateStr = parseSheetDate(dateInput);
  if (!dateStr) return 'Fecha por confirmar';
  const date = new Date(dateStr + 'T12:00:00');
  if (Number.isNaN(date.getTime())) return String(dateInput);
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function generateId(): string {
  return crypto.randomUUID();
}