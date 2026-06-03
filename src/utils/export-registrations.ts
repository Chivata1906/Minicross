import { formatCategoryDisplayLabel, type Event, type Registration } from '../types';
import { formatCop, resolveRegistrationTotal } from './registration-total';

const EXPORT_HEADERS = [
  '# Piloto',
  'Nombre',
  'Edad',
  'Categoria',
  'Total',
  'Ciudad',
  'Celular',
  'Documento',
] as const;

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function registrationToRow(reg: Registration, events: Event[]): string[] {
  return [
    `#${reg.numeroPiloto}`,
    `${reg.nombre} ${reg.apellido}`.trim(),
    `${reg.edad} años`,
    formatCategoryDisplayLabel(reg.categoriaId, reg.categoriaLabel),
    formatCop(resolveRegistrationTotal(reg, events)),
    reg.ciudad,
    reg.celular,
    reg.identificacion,
  ];
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'evento';
}

export function exportRegistrationsToExcel(
  registrations: Registration[],
  eventName: string,
  events: Event[]
): void {
  const rows = [
    EXPORT_HEADERS.join(','),
    ...registrations.map((reg) => registrationToRow(reg, events).map(escapeCsvCell).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `inscripciones_${sanitizeFileName(eventName)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
