import type { Event } from '../types';

export function countCategoryIds(categoriaId: string): number {
  if (!categoriaId) return 0;
  return categoriaId.split(',').map((s) => s.trim()).filter(Boolean).length;
}

export function computeRegistrationTotal(
  event: Event | undefined,
  categoriaIdOrIds: string | string[]
): number {
  const count = Array.isArray(categoriaIdOrIds)
    ? categoriaIdOrIds.filter(Boolean).length
    : countCategoryIds(categoriaIdOrIds);
  const unit = event?.valorInscripcion ?? 0;
  return unit * count;
}

export function formatCop(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function resolveRegistrationTotal(
  reg: { eventId: string; categoriaId: string; valorTotalInscripcion?: number },
  events: Event[]
): number {
  if (reg.valorTotalInscripcion != null && reg.valorTotalInscripcion > 0) {
    return reg.valorTotalInscripcion;
  }
  const event = events.find((e) => e.id === reg.eventId);
  return computeRegistrationTotal(event, reg.categoriaId);
}
