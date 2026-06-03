import * as XLSX from 'xlsx';
import { formatCategoryDisplayLabel, type Event, type Registration } from '../types';
import { formatCop, resolveRegistrationTotal } from './registration-total';

export type ExportFormat = 'xlsx' | 'csv';

const EXPORT_HEADERS = [
  '# Piloto',
  'Nombre',
  'Edad',
  'Categoria',
  'Total',
  'Ciudad',
  'Marca moto',
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
    reg.marcaMoto,
    reg.celular,
    reg.identificacion,
  ];
}

function buildExportRows(registrations: Registration[], events: Event[]): string[][] {
  return [
    [...EXPORT_HEADERS],
    ...registrations.map((reg) => registrationToRow(reg, events)),
  ];
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'evento';
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, '').trim().slice(0, 31) || 'Inscripciones';
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportRegistrationsToCsv(
  registrations: Registration[],
  eventName: string,
  events: Event[]
): void {
  const rows = buildExportRows(registrations, events).map((row) =>
    row.map(escapeCsvCell).join(',')
  );
  const blob = new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `inscripciones_${sanitizeFileName(eventName)}.csv`);
}

export function exportRegistrationsToExcel(
  registrations: Registration[],
  eventName: string,
  events: Event[]
): void {
  const worksheet = XLSX.utils.aoa_to_sheet(buildExportRows(registrations, events));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(eventName));
  XLSX.writeFile(workbook, `inscripciones_${sanitizeFileName(eventName)}.xlsx`);
}

export function exportRegistrations(
  registrations: Registration[],
  eventName: string,
  events: Event[],
  format: ExportFormat
): void {
  if (format === 'csv') {
    exportRegistrationsToCsv(registrations, eventName, events);
    return;
  }
  exportRegistrationsToExcel(registrations, eventName, events);
}
