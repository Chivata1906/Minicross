export const PILOT_NUMBER_MIN = 4;
export const PILOT_NUMBER_MAX = 999;

export interface Category {
  id: string;
  label: string;
  minAge: number;
  maxAge: number;
}

export const CATEGORIES: Category[] = [
  { id: '50cc-a', label: '50cc A', minAge: 4, maxAge: 6 },
  { id: '50cc-b', label: '50cc B', minAge: 6, maxAge: 8 },
  { id: '65cc-a', label: '65cc A', minAge: 7, maxAge: 9 },
  { id: '65cc-b', label: '65cc B', minAge: 8, maxAge: 10 },
  { id: '85cc-a', label: '85cc A', minAge: 9, maxAge: 11 },
  { id: '85cc-b', label: '85cc B', minAge: 11, maxAge: 13 },
  { id: '125cc-junior', label: '125cc Junior', minAge: 12, maxAge: 17 },
];

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getCategoriesForAge(age: number): Category[] {
  if (age < 0) return [];
  return CATEGORIES.filter((c) => age >= c.minAge && age <= c.maxAge);
}

export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  city: string;
  description: string;
  active: boolean;
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
/** No permite A y B de la misma cilindrada (ej. 65cc A + 65cc B). */
export function validateCategorySelection(categoriaIds: string[]): string | null {
  const lettersByDisplacement = new Map<string, Set<string>>();

  for (const id of categoriaIds) {
    if (id === '125cc-junior') continue;
    const match = id.match(/^(\d+cc)-(a|b)$/);
    if (!match) continue;
    const [, displacement, letter] = match;
    if (!lettersByDisplacement.has(displacement)) {
      lettersByDisplacement.set(displacement, new Set());
    }
    const letters = lettersByDisplacement.get(displacement)!;
    letters.add(letter);
    if (letters.size > 1) {
      return `No puedes inscribirte en novatos (A) y expertos (B) de la misma cilindrada (${displacement}).`;
    }
  }

  return null;
}
