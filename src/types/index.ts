export interface Category {
  id: string;
  label: string;
  minAge: number;
  maxAge: number;
}

export const CATEGORIES: Category[] = [
  { id: '50cc-4-6', label: '50 cc - 4 a 6 anos', minAge: 4, maxAge: 6 },
  { id: '50cc-6-8', label: '50 cc - 6 a 8 anos', minAge: 6, maxAge: 8 },
  { id: '65cc-7-9', label: '65 cc - 7 a 9 anos', minAge: 7, maxAge: 9 },
  { id: '65cc-8-10', label: '65 cc - 8 a 10 anos', minAge: 8, maxAge: 10 },
  { id: '85cc-9-11', label: '85 cc - 9 a 11 anos', minAge: 9, maxAge: 11 },
  { id: '85cc-11-13', label: '85 cc - 11 a 13 anos', minAge: 11, maxAge: 13 },
  { id: '125cc-junior', label: '125 cc - Junior (12 a 17 anos)', minAge: 12, maxAge: 17 },
];

export function getCategoriesForAge(age: number): Category[] {
  return CATEGORIES.filter((cat) => age >= cat.minAge && age <= cat.maxAge);
}

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((cat) => cat.id === id);
}

export const PILOT_NUMBER_MIN = 4;
export const PILOT_NUMBER_MAX = 999;

export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  city: string;
  description: string;
  active: boolean;
  maxPilotNumber?: number;
}

export interface Registration {
  id: string;
  eventId: string;
  nombre: string;
  apellido: string;
  identificacion: string;
  identificacionArchivo: string;
  identificacionFileName: string;
  identificacionFileType: string;
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

export interface AppData {
  events: Event[];
  registrations: Registration[];
}

export interface RegistrationFormData {
  eventId: string;
  nombre: string;
  apellido: string;
  identificacion: string;
  identificacionArchivo: string;
  identificacionFileName: string;
  identificacionFileType: string;
  fechaNacimiento: string;
  email: string;
  celular: string;
  ciudad: string;
  marcaMoto: string;
  numeroPiloto: number;
  categoriaId: string;
}
