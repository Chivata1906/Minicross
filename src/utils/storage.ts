import { CONFIG } from '../config';
import type { AppData, Event, EventSavePayload, Registration, RegistrationFormData } from '../types';
import { calculateAge, generateId, parseSheetDate } from './age';
import { getCategoryById, formatCategoryOptionLabel, validateCategorySelection } from '../types';
import { computeRegistrationTotal } from './registration-total';
import {
  apiGet,
  apiPost,
  checkPilotNumberRemote,
  getAvailablePilotNumbers as fetchAvailablePilotNumbers,
  isApiEnabled,
  allPilotNumbers,
} from './api';

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function readLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeLocal<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function parseBoolField(value: unknown): boolean {
  return value === true || value === 'TRUE' || value === 'true' || value === 1 || value === '1';
}

function normalizeEvent(raw: Record<string, unknown>): Event {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    date: parseSheetDate(raw.date),
    location: String(raw.location ?? ''),
    city: String(raw.city ?? ''),
    description: String(raw.description ?? ''),
    active: parseBoolField(raw.active),
    finished: parseBoolField(raw.finished),
    reglamentoUrl: String(raw.reglamentoUrl ?? ''),
    valorInscripcion: Number(raw.valorInscripcion ?? 0) || 0,
  };
}

function normalizeRegistration(raw: Record<string, unknown>): Registration {
  return {
    id: String(raw.id ?? ''),
    eventId: String(raw.eventId ?? ''),
    eventName: String(raw.eventName ?? ''),
    nombre: String(raw.nombre ?? ''),
    apellido: String(raw.apellido ?? ''),
    identificacion: String(raw.identificacion ?? ''),
    identificacionArchivo: String(raw.identificacionArchivo ?? raw.identificacionDriveUrl ?? ''),
    identificacionFileName: String(raw.identificacionFileName ?? ''),
    identificacionFileType: String(raw.identificacionFileType ?? ''),
    comprobantePagoArchivo: String(raw.comprobantePagoArchivo ?? raw.comprobantePagoUrl ?? ''),
    comprobantePagoFileName: String(raw.comprobantePagoFileName ?? ''),
    comprobantePagoFileType: String(raw.comprobantePagoFileType ?? ''),
    fechaNacimiento: parseSheetDate(raw.fechaNacimiento),
    edad: Number(raw.edad ?? 0),
    email: String(raw.email ?? ''),
    celular: String(raw.celular ?? ''),
    ciudad: String(raw.ciudad ?? ''),
    marcaMoto: String(raw.marcaMoto ?? ''),
    numeroPiloto: Number(raw.numeroPiloto ?? 0),
    categoriaId: String(raw.categoriaId ?? ''),
    categoriaLabel: String(raw.categoriaLabel ?? ''),
    valorTotalInscripcion: Number(raw.valorTotalInscripcion ?? 0) || 0,
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  };
}

export async function loadEvents(): Promise<Event[]> {
  if (isApiEnabled()) {
    try {
      const data = await apiGet<{ events: Record<string, unknown>[] }>({ action: 'events' });
      return (data.events ?? []).map(normalizeEvent);
    } catch {
      /* fallback below */
    }
  }

  const fromLocal = readLocal<Event[]>(CONFIG.storageKeys.events);
  if (fromLocal?.length) return fromLocal.map((e) => normalizeEvent(e as unknown as Record<string, unknown>));

  const fromFile = await fetchJson<Event[]>('./data/events.json');
  return (fromFile ?? []).map((e) => normalizeEvent(e as unknown as Record<string, unknown>));
}

export async function saveEvents(events: EventSavePayload[]): Promise<void> {
  if (isApiEnabled()) {
    await apiPost({ action: 'saveEvents', events });
    return;
  }
  writeLocal(CONFIG.storageKeys.events, events);
}

export async function loadRegistrations(): Promise<Registration[]> {
  if (isApiEnabled()) {
    try {
      const data = await apiGet<{ registrations: Record<string, unknown>[] }>({
        action: 'registrations',
      });
      return (data.registrations ?? []).map(normalizeRegistration);
    } catch {
      /* fallback below */
    }
  }

  const fromLocal = readLocal<Registration[]>(CONFIG.storageKeys.registrations);
  const fromFile = await fetchJson<Registration[]>('./data/registrations.json');

  const merged = new Map<string, Registration>();
  for (const reg of fromFile ?? []) merged.set(reg.id, normalizeRegistration(reg as unknown as Record<string, unknown>));
  for (const reg of fromLocal ?? []) merged.set(reg.id, normalizeRegistration(reg as unknown as Record<string, unknown>));

  return Array.from(merged.values());
}

export async function saveRegistrations(registrations: Registration[]): Promise<void> {
  if (isApiEnabled()) {
    await apiPost({ action: 'saveRegistrations', registrations });
    return;
  }
  writeLocal(CONFIG.storageKeys.registrations, registrations);
}

export function getTakenPilotNumbers(
  registrations: Registration[],
  eventId: string,
  excludeId?: string
): Set<number> {
  return new Set(
    registrations
      .filter((r) => r.eventId === eventId && r.id !== excludeId)
      .map((r) => r.numeroPiloto)
  );
}

export function isPilotNumberAvailable(
  registrations: Registration[],
  eventId: string,
  number: number,
  excludeId?: string
): boolean {
  return !getTakenPilotNumbers(registrations, eventId, excludeId).has(number);
}

export async function isPilotNumberAvailableAsync(
  eventId: string,
  number: number,
  excludeId?: string
): Promise<boolean> {
  if (isApiEnabled()) {
    return checkPilotNumberRemote(eventId, number, excludeId);
  }
  const registrations = await loadRegistrations();
  return isPilotNumberAvailable(registrations, eventId, number, excludeId);
}

export async function getAvailablePilotNumbers(eventId: string): Promise<number[]> {
  if (isApiEnabled()) {
    const numbers = await fetchAvailablePilotNumbers(eventId);
    if (numbers.length) return numbers;
  }
  const registrations = await loadRegistrations();
  const taken = getTakenPilotNumbers(registrations, eventId);
  return allPilotNumbers().filter((n) => !taken.has(n));
}

function resolveCategoryFields(categoriaIds: string[]): { categoriaId: string; categoriaLabel: string } {
  const labels = categoriaIds.map((id) => {
    const cat = getCategoryById(id);
    return cat ? formatCategoryOptionLabel(cat) : id;
  });
  return {
    categoriaId: categoriaIds.join(','),
    categoriaLabel: labels.join('|'),
  };
}

export async function createRegistration(data: RegistrationFormData): Promise<Registration> {
  const categoryError = validateCategorySelection(data.categoriaIds);
  if (categoryError) throw new Error(categoryError);

  const { categoriaId, categoriaLabel } = resolveCategoryFields(data.categoriaIds);
  const edad = calculateAge(data.fechaNacimiento);
  const now = new Date().toISOString();
  const events = await loadEvents();
  const event = events.find((e) => e.id === data.eventId);
  const valorTotalInscripcion = computeRegistrationTotal(event, data.categoriaIds);

  const registration: Registration = {
    id: generateId(),
    eventId: data.eventId,
    nombre: data.nombre.trim(),
    apellido: data.apellido.trim(),
    identificacion: data.identificacion.trim(),
    identificacionArchivo: data.identificacionArchivo,
    identificacionFileName: data.identificacionFileName,
    identificacionFileType: data.identificacionFileType,
    comprobantePagoArchivo: data.comprobantePagoArchivo,
    comprobantePagoFileName: data.comprobantePagoFileName,
    comprobantePagoFileType: data.comprobantePagoFileType,
    fechaNacimiento: data.fechaNacimiento,
    edad,
    email: data.email.trim(),
    celular: data.celular.trim(),
    ciudad: data.ciudad.trim(),
    marcaMoto: data.marcaMoto.trim(),
    numeroPiloto: data.numeroPiloto,
    categoriaId,
    categoriaLabel,
    valorTotalInscripcion,
    createdAt: now,
    updatedAt: now,
  };

  if (isApiEnabled()) {
    const result = await apiPost<{ success: boolean; registration: Registration }>({
      action: 'createRegistration',
      data: registration,
    });
    return result.registration ?? registration;
  }

  const registrations = await loadRegistrations();
  if (!isPilotNumberAvailable(registrations, data.eventId, data.numeroPiloto)) {
    throw new Error(`El numero de piloto ${data.numeroPiloto} ya esta registrado en este evento.`);
  }

  registrations.push(registration);
  await saveRegistrations(registrations);
  return registration;
}

export async function updateRegistration(
  id: string,
  updates: Partial<Registration>
): Promise<Registration> {
  if (isApiEnabled()) {
    const result = await apiPost<{ registration: Registration }>({
      action: 'updateRegistration',
      id,
      data: updates,
    });
    return result.registration;
  }

  const registrations = await loadRegistrations();
  const index = registrations.findIndex((r) => r.id === id);
  if (index === -1) throw new Error('Inscripción no encontrada.');

  const current = registrations[index];
  const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };

  if (
    updates.numeroPiloto !== undefined &&
    !isPilotNumberAvailable(registrations, merged.eventId, merged.numeroPiloto, id)
  ) {
    throw new Error(`El numero de piloto ${merged.numeroPiloto} ya esta en uso.`);
  }

  if (updates.fechaNacimiento) {
    merged.fechaNacimiento = parseSheetDate(updates.fechaNacimiento);
    merged.edad = calculateAge(merged.fechaNacimiento);
  }

  if (updates.categoriaId) {
    const categoryIds = updates.categoriaId.split(',').map((id) => id.trim()).filter(Boolean);
    const categoryError = validateCategorySelection(categoryIds);
    if (categoryError) throw new Error(categoryError);
    merged.categoriaId = categoryIds.join(',');
    merged.categoriaLabel = categoryIds
      .map((id) => {
        const cat = getCategoryById(id);
        return cat ? formatCategoryOptionLabel(cat) : id;
      })
      .join('|');
  }

  const events = await loadEvents();
  const event = events.find((e) => e.id === merged.eventId);
  merged.valorTotalInscripcion = computeRegistrationTotal(
    event,
    merged.categoriaId.split(',').map((id) => id.trim()).filter(Boolean)
  );

  registrations[index] = merged;
  await saveRegistrations(registrations);
  return merged;
}

export async function deleteRegistration(id: string): Promise<void> {
  if (isApiEnabled()) {
    await apiPost({ action: 'deleteRegistration', id });
    return;
  }
  const registrations = await loadRegistrations();
  await saveRegistrations(registrations.filter((r) => r.id !== id));
}

export async function exportAllData(): Promise<AppData> {
  const [events, registrations] = await Promise.all([loadEvents(), loadRegistrations()]);
  return { events, registrations };
}

export async function importData(data: AppData, mode: 'merge' | 'replace' = 'merge'): Promise<void> {
  if (mode === 'replace') {
    await saveEvents(data.events);
    await saveRegistrations(data.registrations);
    return;
  }

  const [existingEvents, existingRegs] = await Promise.all([loadEvents(), loadRegistrations()]);
  const eventMap = new Map(existingEvents.map((e) => [e.id, e]));
  const regMap = new Map(existingRegs.map((r) => [r.id, r]));

  for (const e of data.events) eventMap.set(e.id, e);
  for (const r of data.registrations) regMap.set(r.id, r);

  await saveEvents(Array.from(eventMap.values()));
  await saveRegistrations(Array.from(regMap.values()));
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

export { isApiEnabled } from './api';