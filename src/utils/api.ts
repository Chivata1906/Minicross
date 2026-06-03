import { CONFIG } from '../config';
import { PILOT_NUMBER_MAX, PILOT_NUMBER_MIN } from '../types';

export function isApiEnabled(): boolean {
  return Boolean(CONFIG.apiUrl.trim());
}

function buildUrl(params: Record<string, string>): string {
  const url = new URL(CONFIG.apiUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

export async function apiGet<T>(params: Record<string, string> = {}): Promise<T> {
  const res = await fetch(buildUrl(params));
  if (!res.ok) throw new Error('No se pudo conectar con Google Sheets.');
  return (await res.json()) as T;
}

export async function apiPost<T>(body: unknown): Promise<T> {
  const res = await fetch(CONFIG.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error('Error al enviar datos a Google Sheets.');
  const data = (await res.json()) as T & { success?: boolean; error?: string };
  if (data.success === false && data.error) throw new Error(data.error);
  return data;
}

export async function getAvailablePilotNumbers(eventId: string): Promise<number[]> {
  if (isApiEnabled()) {
    const data = await apiGet<{ numbers: number[] }>({
      action: 'availablePilots',
      eventId,
    });
    return data.numbers ?? [];
  }
  return [];
}

export async function checkPilotNumberRemote(
  eventId: string,
  numero: number,
  excludeId?: string
): Promise<boolean> {
  const params: Record<string, string> = {
    action: 'checkPilot',
    eventId,
    numero: String(numero),
  };
  if (excludeId) params.excludeId = excludeId;

  const data = await apiGet<{ available: boolean }>(params);
  return data.available;
}

export function allPilotNumbers(): number[] {
  const nums: number[] = [];
  for (let n = PILOT_NUMBER_MIN; n <= PILOT_NUMBER_MAX; n++) nums.push(n);
  return nums;
}
