import { renderNavbar, initNavbar } from '../components/navbar';
import { loadEvents } from '../utils/storage';
import { formatDate } from '../utils/age';
import type { Event } from '../types';

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function renderLoadingPanel(): string {
  return `
    <div class="flex flex-col items-center justify-center gap-5 py-16 text-center" role="status" aria-live="polite">
      <div class="h-14 w-14 animate-spin rounded-full border-4 border-secondary/25 border-t-secondary"></div>
      <div>
        <p class="font-title text-xl tracking-wide text-secondary uppercase">Procesando datos</p>
        <p class="mt-2 text-sm text-gray-light">Consultando eventos en la base de datos...</p>
      </div>
      <div class="flex gap-1.5">
        <span class="h-2 w-2 animate-pulse rounded-full bg-secondary" style="animation-delay: 0ms"></span>
        <span class="h-2 w-2 animate-pulse rounded-full bg-accent" style="animation-delay: 150ms"></span>
        <span class="h-2 w-2 animate-pulse rounded-full bg-secondary" style="animation-delay: 300ms"></span>
      </div>
    </div>`;
}

function renderStatusBadge(event: Event): string {
  if (event.active) {
    return '<span class="inline-block rounded-full bg-secondary/20 px-3 py-1 text-xs font-semibold text-secondary">Habilitado para inscripciones</span>';
  }
  return '<span class="inline-block rounded-full bg-gray-light/10 px-3 py-1 text-xs font-semibold text-gray-light">No habilitado para inscripciones</span>';
}

function renderEventCard(event: Event): string {
  const reglamentoBtn = isHttpUrl(event.reglamentoUrl)
    ? `<a href="${event.reglamentoUrl}" target="_blank" rel="noopener noreferrer" class="btn-outline w-full sm:w-auto text-center">Ver reglamento</a>`
    : '';
  const resultadosBtn = event.finished
    ? `<a href="./resultados.html?evento=${event.id}" class="btn-secondary w-full sm:w-auto text-center">Ver resultados</a>`
    : '';
  const inscripcionBtn = event.active
    ? `<a href="./inscripcion.html?evento=${event.id}" class="btn-primary w-full sm:w-auto text-center">Inscribirme en este evento</a>`
    : '';

  const actions = [inscripcionBtn, reglamentoBtn, resultadosBtn].filter(Boolean).join('');

  return `
    <article class="card group">
      <div class="flex items-start justify-between gap-4 mb-4">
        <div>
          ${renderStatusBadge(event)}
          <h3 class="font-title text-2xl tracking-wide text-white group-hover:text-secondary transition-colors mt-2">${event.name}</h3>
        </div>
        <div class="text-right shrink-0">
          <p class="font-title text-xl text-secondary">${formatDate(event.date)}</p>
        </div>
      </div>
      <p class="text-gray-light mb-2">📍 ${event.location}, ${event.city}</p>
      <p class="text-gray-light/80 mb-6 text-sm leading-relaxed">${event.description}</p>
      <div class="flex flex-wrap gap-3">${actions || '<p class="text-sm text-gray-light">Sin acciones disponibles por ahora.</p>'}</div>
    </article>`;
}

export async function initEventsPage(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    ${renderNavbar('eventos')}
    <main class="mx-auto max-w-7xl px-4 py-12">
      <div class="mb-10 text-center">
        <h1 class="section-title mb-4">Eventos del Campeonato</h1>
        <p class="text-gray-light max-w-2xl mx-auto">
          Consulta las validas del campeonato, descarga el reglamento y revisa los resultados cuando esten disponibles.
        </p>
      </div>
      <div id="events-list" class="grid gap-6 md:grid-cols-2">
        <div class="col-span-full card border border-secondary/30">${renderLoadingPanel()}</div>
      </div>
    </main>
    <footer class="border-t border-secondary/20 bg-dark py-8 mt-8">
      <div class="mx-auto max-w-7xl px-4 text-center text-sm text-gray-light">
        <p>Minicross Colombia 2026 · Triple Corona</p>
      </div>
    </footer>
  `;

  initNavbar();

  const list = document.getElementById('events-list');
  if (!list) return;

  try {
    const events = (await loadEvents()).sort((a, b) => a.date.localeCompare(b.date));

    if (events.length === 0) {
      list.innerHTML = `
        <div class="col-span-full card text-center py-12">
          <p class="text-gray-light text-lg mb-4">No hay eventos publicados en este momento.</p>
          <p class="text-sm text-gray-light/60">Vuelve pronto o contactanos para mas informacion.</p>
        </div>`;
      return;
    }

    list.innerHTML = events.map(renderEventCard).join('');
  } catch {
    list.innerHTML = `
      <div class="col-span-full card text-center py-12">
        <p class="text-gray-light text-lg mb-4">No se pudieron cargar los eventos.</p>
        <p class="text-sm text-gray-light/60">Intenta de nuevo en unos minutos.</p>
      </div>`;
  }
}
