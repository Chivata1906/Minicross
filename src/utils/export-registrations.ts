import * as XLSX from 'xlsx';
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

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, '').trim().slice(0, 31) || 'Inscripciones';
}

export function exportRegistrationsToExcel(
  registrations: Registration[],
  eventName: string,
  events: Event[]
): void {
  const rows = [
    [...EXPORT_HEADERS],
    ...registrations.map((reg) => registrationToRow(reg, events)),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(eventName));
  XLSX.writeFile(workbook, `inscripciones_${sanitizeFileName(eventName)}.xlsx`);
}
