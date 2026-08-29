export const PILOT_NUMBER_MIN = 4;
export const PILOT_NUMBER_MAX = 999;

export interface Category {
  id: string;
  label: string;
  minAge: number;
  maxAge: number;
  /**
   * false = inhabilitada para nuevas inscripciones / eventos futuros.
   * Si se omite se considera habilitada. No se elimina si ya hay inscritos.
   */
  active?: boolean;
}

/** IDs legacy (A/B) → IDs actuales por rango de edad. */
const LEGACY_CATEGORY_IDS: Record<string, string> = {
  '50cc-a': '50cc-4-6',
  '50cc-b': '50cc-6-8',
  '65cc-a': '65cc-7-9',
  '65cc-b': '65cc-8-10',
  '85cc-a': '85cc-9-11',
  '85cc-b': '85cc-11-13',
};

export const CATEGORIES: Category[] = [
  { id: '50cc-4-6', label: '50cc Race', minAge: 4, maxAge: 6 },
  { id: '50cc-pw-4-6', label: '50cc PW', minAge: 4, maxAge: 6 },
  { id: '50cc-6-8', label: '50cc', minAge: 6, maxAge: 8 },
  { id: '65cc-7-9', label: '65cc', minAge: 7, maxAge: 9 },
  { id: '65cc-8-10', label: '65cc', minAge: 8, maxAge: 10 },
  { id: '85cc-9-11', label: '85cc', minAge: 9, maxAge: 11 },
  { id: '85cc-11-13', label: '85cc', minAge: 11, maxAge: 13 },
  { id: '125cc-junior', label: '125cc Junior', minAge: 12, maxAge: 17 },
  { id: 'iniciacion', label: 'Iniciación', minAge: 18, maxAge: 99 },
  { id: 'pre-expertos', label: 'Pre-expertos', minAge: 15, maxAge: 99 },
];

/**
 * Store mutable de categorías. Arranca con las listas por defecto del código
 * y puede ser reemplazado con lo configurado desde el panel de gestión
 * (Google Sheets / localStorage) vía setCategoryStore.
 */
let categoryStore: Category[] = [...CATEGORIES];

/**
 * Reemplaza las categorías configuradas.
 * Si la lista está vacía, se mantienen las actuales / por defecto.
 */
export function setCategoryStore(categories: Category[]): void {
  if (categories && categories.length > 0) {
    categoryStore = categories.map((c) => ({ ...c }));
  }
}

export function getCategories(): Category[] {
  return categoryStore;
}

export function isCategoryEnabled(category: Category): boolean {
  return category.active !== false;
}

/** Categorías habilitadas (aparecen en home, reglamento e inscripciones nuevas). */
export function getEnabledCategories(): Category[] {
  return categoryStore.filter(isCategoryEnabled);
}

export function resolveCategoryId(id: string): string {
  return LEGACY_CATEGORY_IDS[id] ?? id;
}

export function formatCategoryOptionLabel(category: Category): string {
  if (category.maxAge >= 99) {
    return `${category.label} (${category.minAge}+ años)`;
  }
  return `${category.label} (${category.minAge} – ${category.maxAge} años)`;
}

export function formatCategoryDisplayLabel(categoriaId: string, fallbackLabel = ''): string {
  const ids = categoriaId.split(',').map((id) => id.trim()).filter(Boolean);
  if (ids.length > 0) {
    return ids
      .map((id) => {
        const cat = getCategoryById(id);
        if (!cat) return fallbackLabel || id;
        return formatCategoryOptionLabel(cat);
      })
      .join(' | ');
  }
  return fallbackLabel.replace(/\banos\b/gi, 'años');
}

export function getCategoryById(id: string): Category | undefined {
  const resolved = resolveCategoryId(id);
  return (
    categoryStore.find((c) => c.id === resolved) ??
    CATEGORIES.find((c) => c.id === resolved)
  );
}

/**
 * Categorías elegibles por edad.
 * Por defecto solo habilita las activas; `includeIds` permite mostrar
 * categorías inhabilitadas ya seleccionadas (edición de inscripciones).
 */
export function getCategoriesForAge(
  age: number,
  options?: { includeIds?: string[] }
): Category[] {
  if (age < 0) return [];
  const include = new Set((options?.includeIds ?? []).map(resolveCategoryId));
  return categoryStore.filter((c) => {
    if (age < c.minAge || age > c.maxAge) return false;
    return isCategoryEnabled(c) || include.has(c.id);
  });
}

export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  city: string;
  description: string;
  active: boolean;
  finished: boolean;
  reglamentoUrl: string;
  /** URL del JSON de resultados en Drive (o "local" en modo sin API). */
  resultadosUrl: string;
  valorInscripcion: number;
}

/** Campos temporales al guardar (PDF en base64, no van a la hoja). */
export interface EventSavePayload extends Event {
  reglamentoArchivo?: string;
  reglamentoFileName?: string;
  reglamentoFileType?: string;
}

export type HeatKey = 'manga1' | 'manga2' | 'manga3' | 'final';

export interface ResultsTable {
  columns: string[];
  rows: Array<Record<string, string>>;
  commentColumn?: string | null;
  pdfUrl?: string;
  csvUrl?: string;
}

export interface CategoryResults {
  categoryId: string;
  categoryLabel: string;
  manga1?: ResultsTable;
  manga2?: ResultsTable;
  manga3?: ResultsTable;
  final?: ResultsTable;
}

export interface EventResults {
  eventId: string;
  updatedAt: string;
  categories: CategoryResults[];
}

/** Archivo pendiente de subir a Drive (base64 data URL). */
export interface ResultsFileUpload {
  archivo: string;
  fileName: string;
  fileType: string;
}

export interface ResultsHeatSavePayload {
  columns: string[];
  rows: Array<Record<string, string>>;
  commentColumn?: string | null;
  pdfUrl?: string;
  csvUrl?: string;
  pdfUpload?: ResultsFileUpload;
  csvUpload?: ResultsFileUpload;
}

export interface CategoryResultsSavePayload {
  categoryId: string;
  categoryLabel: string;
  manga1?: ResultsHeatSavePayload;
  manga2?: ResultsHeatSavePayload;
  manga3?: ResultsHeatSavePayload;
  final?: ResultsHeatSavePayload;
}

export interface EventResultsSavePayload {
  eventId: string;
  eventName: string;
  categories: CategoryResultsSavePayload[];
}

export interface Registration {
  id: string;
  eventId: string;
  eventName?: string;
  nombre: string;
  apellido: string;
  identificacion: string;
  identificacionArchivo: string;
  identificacionFileName: string;
  identificacionFileType: string;
  comprobantePagoArchivo: string;
  comprobantePagoFileName: string;
  comprobantePagoFileType: string;
  fechaNacimiento: string;
  edad: number;
  email: string;
  celular: string;
  ciudad: string;
  marcaMoto: string;
  numeroPiloto: number;
  categoriaId: string;
  categoriaLabel: string;
  valorTotalInscripcion: number;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationFormData {
  eventId: string;
  nombre: string;
  apellido: string;
  identificacion: string;
  identificacionArchivo: string;
  identificacionFileName: string;
  identificacionFileType: string;
  comprobantePagoArchivo: string;
  comprobantePagoFileName: string;
  comprobantePagoFileType: string;
  fechaNacimiento: string;
  email: string;
  celular: string;
  ciudad: string;
  marcaMoto: string;
  numeroPiloto: number;
  categoriaIds: string[];
}

export interface AppData {
  events: Event[];
  registrations: Registration[];
}

/** Sin restricción A/B: solo aplica elegibilidad por edad al seleccionar. */
export function validateCategorySelection(_categoriaIds: string[]): string | null {
  return null;
}
