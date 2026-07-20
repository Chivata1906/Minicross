import { renderFooter } from '../components/footer';
import { renderNavbar, initNavbar } from '../components/navbar';
import { eventHasResults, loadEventResults, loadEvents } from '../utils/storage';
import { formatDate } from '../utils/age';
import { HEAT_KEYS, HEAT_LABELS, getRowComment } from '../utils/parse-results-csv';
import type { CategoryResults, Event, EventResults, HeatKey, ResultsTable } from '../types';
import Swal from 'sweetalert2';

function getEventIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('evento');
}

function availableHeats(category: CategoryResults): HeatKey[] {
  return HEAT_KEYS.filter((key) => Boolean(category[key]));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTable(table: ResultsTable, heat: HeatKey, categoryId: string): string {
  const commentCol = table.commentColumn;
  const rowsHtml = table.rows
    .map((row, rowIndex) => {
      const comment = getRowComment(row, commentCol);
      const cells = table.columns
        .map((col) => `<td class="px-3 py-2 text-sm whitespace-nowrap">${escapeHtml(row[col] ?? '')}</td>`)
        .join('');
      const commentBtn = comment
        ? `<td class="px-3 py-2 text-center">
            <button type="button"
              class="comment-btn inline-flex h-7 w-7 items-center justify-center rounded-full border border-orange/60 text-orange hover:bg-orange/20"
              data-category="${categoryId}" data-heat="${heat}" data-row="${rowIndex}"
              title="Ver comentario" aria-label="Ver comentario">!</button>
          </td>`
        : '<td class="px-3 py-2"></td>';
      return `<tr class="border-t border-secondary/10 hover:bg-secondary/5">${cells}${commentBtn}</tr>`;
    })
    .join('');

  const headers = table.columns
    .map((col) => `<th class="px-3 py-2 text-left text-xs uppercase tracking-wide text-secondary">${escapeHtml(col)}</th>`)
    .join('');

  return `
    <div class="overflow-x-auto rounded-xl border border-secondary/20">
      <table class="min-w-full">
        <thead class="bg-primary/60">
          <tr>${headers}<th class="px-3 py-2 text-xs uppercase tracking-wide text-secondary">Info</th></tr>
        </thead>
        <tbody>${rowsHtml || '<tr><td class="px-3 py-6 text-center text-gray-light" colspan="' + (table.columns.length + 1) + '">Sin filas</td></tr>'}</tbody>
      </table>
    </div>`;
}

function renderHeatPanel(category: CategoryResults, heat: HeatKey, active: boolean): string {
  const table = category[heat];
  if (!table) return '';

  const pdfBtn =
    heat !== 'final' && table.pdfUrl
      ? `<a href="${table.pdfUrl}" target="_blank" rel="noopener noreferrer" class="btn-outline text-sm py-2 px-4">Vuelta a vuelta (PDF)</a>`
      : heat !== 'final'
        ? '<span class="text-xs text-gray-light">Sin PDF de vuelta a vuelta</span>'
        : '';

  return `
    <div class="heat-panel ${active ? '' : 'hidden'} space-y-4" data-heat-panel="${category.categoryId}:${heat}">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="font-title text-2xl tracking-wide text-white">${HEAT_LABELS[heat]}</h3>
        ${pdfBtn}
      </div>
      ${renderTable(table, heat, category.categoryId)}
    </div>`;
}

function renderCategoryPanel(category: CategoryResults, active: boolean): string {
  const heats = availableHeats(category);
  if (heats.length === 0) return '';

  const heatTabs = heats
    .map(
      (heat, i) => `
      <button type="button"
        class="heat-tab rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${i === 0 ? 'bg-secondary text-primary' : 'bg-primary/50 text-gray-light hover:text-white'}"
        data-category="${category.categoryId}" data-heat="${heat}">
        ${HEAT_LABELS[heat]}
      </button>`
    )
    .join('');

  return `
    <div class="category-panel ${active ? '' : 'hidden'} space-y-4" data-category-panel="${category.categoryId}">
      <div class="flex flex-wrap gap-2">${heatTabs}</div>
      ${heats.map((heat, i) => renderHeatPanel(category, heat, i === 0)).join('')}
    </div>`;
}

function bindResultsUi(container: HTMLElement, results: EventResults): void {
  const categoryTabs = container.querySelectorAll<HTMLButtonElement>('.category-tab');
  const categoryPanels = container.querySelectorAll<HTMLElement>('.category-panel');

  categoryTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const categoryId = tab.getAttribute('data-category');
      categoryTabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('bg-secondary', active);
        t.classList.toggle('text-primary', active);
        t.classList.toggle('bg-primary/40', !active);
        t.classList.toggle('text-gray-light', !active);
      });
      categoryPanels.forEach((panel) => {
        panel.classList.toggle('hidden', panel.getAttribute('data-category-panel') !== categoryId);
      });
    });
  });

  container.querySelectorAll<HTMLButtonElement>('.heat-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const categoryId = tab.getAttribute('data-category');
      const heat = tab.getAttribute('data-heat');
      const panel = container.querySelector(`[data-category-panel="${categoryId}"]`);
      if (!panel) return;

      panel.querySelectorAll<HTMLButtonElement>('.heat-tab').forEach((t) => {
        const active = t === tab;
        t.classList.toggle('bg-secondary', active);
        t.classList.toggle('text-primary', active);
        t.classList.toggle('bg-primary/50', !active);
        t.classList.toggle('text-gray-light', !active);
      });

      panel.querySelectorAll<HTMLElement>('.heat-panel').forEach((heatPanel) => {
        heatPanel.classList.toggle(
          'hidden',
          heatPanel.getAttribute('data-heat-panel') !== `${categoryId}:${heat}`
        );
      });
    });
  });

  container.querySelectorAll<HTMLButtonElement>('.comment-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const categoryId = btn.getAttribute('data-category');
      const heat = btn.getAttribute('data-heat') as HeatKey | null;
      const rowIndex = Number(btn.getAttribute('data-row'));
      const category = results.categories.find((c) => c.categoryId === categoryId);
      const table = category && heat ? category[heat] : undefined;
      const row = table?.rows[rowIndex];
      if (!row) return;
      const comment = getRowComment(row, table?.commentColumn);
      void Swal.fire({
        title: 'Comentario',
        text: comment || 'Sin comentario',
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#06b6d4',
      });
    });
  });
}

function renderResultsContent(event: Event, results: EventResults): string {
  const categories = results.categories.filter((c) => availableHeats(c).length > 0);
  if (categories.length === 0) {
    return `
      <h1 class="section-title mb-2">Resultados</h1>
      <p class="text-secondary font-semibold mb-1">${event.name}</p>
      <p class="text-sm text-gray-light mb-6">${formatDate(event.date)} · ${event.city}</p>
      <p class="text-gray-light">Aun no hay tablas publicadas para este evento.</p>
      <a href="./eventos.html" class="btn-outline inline-block mt-8">Volver a eventos</a>`;
  }

  const categoryTabs = categories
    .map(
      (cat, i) => `
      <button type="button"
        class="category-tab rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${i === 0 ? 'bg-secondary text-primary' : 'bg-primary/40 text-gray-light hover:text-white'}"
        data-category="${cat.categoryId}">
        ${escapeHtml(cat.categoryLabel)}
      </button>`
    )
    .join('');

  return `
    <div class="text-left">
      <div class="text-center mb-8">
        <h1 class="section-title mb-2">Resultados</h1>
        <p class="text-secondary font-semibold mb-1">${escapeHtml(event.name)}</p>
        <p class="text-sm text-gray-light">${formatDate(event.date)} · ${escapeHtml(event.city)}</p>
      </div>
      <div class="flex flex-wrap gap-2 mb-6 justify-center">${categoryTabs}</div>
      ${categories.map((cat, i) => renderCategoryPanel(cat, i === 0)).join('')}
      <div class="text-center mt-8">
        <a href="./eventos.html" class="btn-outline inline-block">Volver a eventos</a>
      </div>
    </div>`;
}

export async function initResultsPage(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  const eventId = getEventIdFromUrl();

  app.innerHTML = `
    ${renderNavbar('eventos')}
    <main class="mx-auto max-w-6xl px-4 py-12">
      <div id="results-content" class="card py-16">
        <div class="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-secondary/25 border-t-secondary"></div>
        <p class="mt-4 text-center text-gray-light">Cargando resultados...</p>
      </div>
    </main>
    ${renderFooter()}
  `;

  initNavbar();

  const content = document.getElementById('results-content');
  if (!content) return;

  if (!eventId) {
    content.innerHTML = `
      <div class="text-center">
        <h1 class="section-title mb-4">Resultados</h1>
        <p class="text-gray-light">Selecciona un evento desde la pagina de eventos.</p>
        <a href="./eventos.html" class="btn-primary inline-block mt-6">Ver eventos</a>
      </div>`;
    return;
  }

  const events = await loadEvents();
  const event = events.find((e) => e.id === eventId);

  if (!event) {
    content.innerHTML = `
      <div class="text-center">
        <h1 class="section-title mb-4">Evento no encontrado</h1>
        <p class="text-gray-light">El evento solicitado no existe o fue eliminado.</p>
        <a href="./eventos.html" class="btn-primary inline-block mt-6">Ver eventos</a>
      </div>`;
    return;
  }

  if (!eventHasResults(event)) {
    content.innerHTML = `
      <div class="text-center">
        <h1 class="section-title mb-4">${escapeHtml(event.name)}</h1>
        <p class="text-gray-light mb-2">Los resultados de este evento aun no estan disponibles.</p>
        <p class="text-sm text-gray-light/70">Se publicaran cuando se carguen desde el panel de administracion.</p>
        <a href="./eventos.html" class="btn-outline inline-block mt-6">Volver a eventos</a>
      </div>`;
    return;
  }

  const results = await loadEventResults(event.id);
  if (!results || results.categories.length === 0) {
    content.innerHTML = `
      <div class="text-center">
        <h1 class="section-title mb-4">${escapeHtml(event.name)}</h1>
        <p class="text-gray-light mb-2">No se encontraron resultados publicados para este evento.</p>
        <a href="./eventos.html" class="btn-outline inline-block mt-6">Volver a eventos</a>
      </div>`;
    return;
  }

  content.classList.remove('py-16');
  content.innerHTML = renderResultsContent(event, results);
  bindResultsUi(content, results);
}
