import { CONFIG } from '../config';

export function isApiEnabled(): boolean {
  return Boolean(CONFIG.apiUrl.trim());
}

function buildUrl(params: Record<string, string>): string {
  const url = new URL(CONFIG.apiUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

export async function apiGet<T>(params: Record<string, string> = {}): Promise<T> {
  const res = await fetch(buildUrl({ action: 'all', ...params }));
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

  const res = await fetch(buildUrl(params));
  if (!res.ok) throw new Error('No se pudo verificar el numero de piloto.');
  const data = (await res.json()) as { available: boolean };
  return data.available;
}
