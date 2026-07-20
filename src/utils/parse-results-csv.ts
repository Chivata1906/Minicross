import type { HeatKey } from '../types';

export type { HeatKey };

export const HEAT_LABELS: Record<HeatKey, string> = {
  manga1: 'Manga 1',
  manga2: 'Manga 2',
  manga3: 'Manga 3',
  final: 'Final',
};

export const HEAT_KEYS: HeatKey[] = ['manga1', 'manga2', 'manga3', 'final'];

/** Orden preferido de columnas para mangas (la columna Comentario no se muestra). */
const MANGA_COLUMN_ORDER = [
  'Pos.',
  'N°',
  'Nombre',
  'Clase',
  'MOTO',
  'Mejor Tm',
  'Vueltas',
  'En Vuelta',
  'Puntos',
  'Dif. resp. 1°',
  'Dif. resp. anterior',
];

/** Orden preferido de columnas para la final. */
const FINAL_COLUMN_ORDER = [
  'Pos.',
  'N°',
  'Nombre',
  'Clase',
  'Total puntos',
  'Dif. resp. 1°',
  'MOTO',
  'R1.',
  'R2.',
  'R3.',
];

const COMMENT_ALIASES = ['comentario', 'comentarios', 'comment', 'comments'];

export interface ParsedResultsTable {
  columns: string[];
  rows: Array<Record<string, string>>;
  commentColumn: string | null;
}

function normalizeHeaderKey(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function isCommentHeader(header: string): boolean {
  return COMMENT_ALIASES.includes(normalizeHeaderKey(header));
}

/** Parseo CSV con soporte de comillas y saltos de linea dentro de campos. */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const input = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = input[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (ch === '\n' || (ch === '\r' && next === '\n')) {
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      if (ch === '\r') i++;
      continue;
    }

    if (ch === '\r') {
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      continue;
    }

    field += ch;
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);

  return rows;
}

function orderColumns(headers: string[], preferred: string[]): string[] {
  const remaining = [...headers];
  const ordered: string[] = [];

  for (const pref of preferred) {
    const prefKey = normalizeHeaderKey(pref);
    const idx = remaining.findIndex((h) => normalizeHeaderKey(h) === prefKey);
    if (idx >= 0) {
      ordered.push(remaining[idx]);
      remaining.splice(idx, 1);
    }
  }

  return [...ordered, ...remaining];
}

/**
 * Parsea un CSV de resultados de manga o final.
 * Las columnas se muestran en orden preferido; columnas extra al final.
 * La columna Comentario no forma parte de `columns` (queda en cada fila).
 */
export function parseResultsCsv(text: string, heat: HeatKey): ParsedResultsTable {
  const matrix = parseCsvText(text);
  if (matrix.length < 2) {
    throw new Error('El CSV no tiene filas de datos.');
  }

  const rawHeaders = matrix[0].map((h) => h.trim());
  if (rawHeaders.every((h) => !h)) {
    throw new Error('El CSV no tiene encabezados validos.');
  }

  let commentColumn: string | null = null;
  const dataHeaders: string[] = [];

  for (const header of rawHeaders) {
    if (!header) continue;
    if (isCommentHeader(header)) {
      commentColumn = header;
      continue;
    }
    dataHeaders.push(header);
  }

  if (dataHeaders.length === 0) {
    throw new Error('El CSV no tiene columnas de resultados.');
  }

  const preferred = heat === 'final' ? FINAL_COLUMN_ORDER : MANGA_COLUMN_ORDER;
  const columns = orderColumns(dataHeaders, preferred);

  const rows = matrix.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    rawHeaders.forEach((header, i) => {
      if (!header) return;
      record[header] = (cells[i] ?? '').trim();
    });
    if (commentColumn && !(commentColumn in record)) {
      record[commentColumn] = '';
    }
    return record;
  });

  return { columns, rows, commentColumn };
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo CSV.'));
    reader.readAsText(file, 'UTF-8');
  });
}

export function getRowComment(row: Record<string, string>, commentColumn?: string | null): string {
  if (commentColumn && row[commentColumn]?.trim()) return row[commentColumn].trim();
  for (const [key, value] of Object.entries(row)) {
    if (isCommentHeader(key) && value.trim()) return value.trim();
  }
  return '';
}
