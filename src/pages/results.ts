import { renderFooter } from '../components/footer';
import { renderNavbar, initNavbar } from '../components/navbar';
import { loadEvents } from '../utils/storage';
import { formatDate } from '../utils/age';

function getEventIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('evento');
}

export async function initResultsPage(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  const eventId = getEventIdFromUrl();

  app.innerHTML = `
    ${renderNavbar('eventos')}
    <main class="mx-auto max-w-3xl px-4 py-12">
      <div id="results-content" class="card text-center py-16">
        <div class="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-secondary/25 border-t-secondary"></div>
        <p class="mt-4 text-gray-light">Cargando resultados...</p>
      </div>
    </main>
    ${renderFooter()}
  `;

  initNavbar();

  const content = document.getElementById('results-content');
  if (!content) return;

  if (!eventId) {
    content.innerHTML = `
      <h1 class="section-title mb-4">Resultados</h1>
      <p class="text-gray-light">Selecciona un evento desde la pagina de eventos.</p>
      <a href="./eventos.html" class="btn-primary inline-block mt-6">Ver eventos</a>`;
    return;
  }

  const events = await loadEvents();
  const event = events.find((e) => e.id === eventId);

  if (!event) {
    content.innerHTML = `
      <h1 class="section-title mb-4">Evento no encontrado</h1>
      <p class="text-gray-light">El evento solicitado no existe o fue eliminado.</p>
      <a href="./eventos.html" class="btn-primary inline-block mt-6">Ver eventos</a>`;
    return;
  }

  if (!event.finished) {
    content.innerHTML = `
      <h1 class="section-title mb-4">${event.name}</h1>
      <p class="text-gray-light mb-2">Los resultados de este evento aun no estan disponibles.</p>
      <p class="text-sm text-gray-light/70">Se publicaran cuando el evento sea marcado como finalizado.</p>
      <a href="./eventos.html" class="btn-outline inline-block mt-6">Volver a eventos</a>`;
    return;
  }

  content.innerHTML = `
    <h1 class="section-title mb-2">Resultados</h1>
    <p class="text-secondary font-semibold mb-1">${event.name}</p>
    <p class="text-sm text-gray-light mb-6">${formatDate(event.date)} · ${event.city}</p>
    <p class="text-gray-light leading-relaxed">
      La tabla de resultados se conectara proximamente con los datos del evento.
      Esta pagina ya esta habilitada para <strong>${event.name}</strong>.
    </p>
    <a href="./eventos.html" class="btn-outline inline-block mt-8">Volver a eventos</a>`;
}
