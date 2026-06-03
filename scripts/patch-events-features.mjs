import fs from 'fs';

function patch(path, replacements) {
  let s = fs.readFileSync(path, 'utf8');
  for (const [oldStr, newStr] of replacements) {
    if (!s.includes(oldStr)) {
      throw new Error(`Block not found in ${path}: ${oldStr.slice(0, 60)}...`);
    }
    s = s.replace(oldStr, newStr);
  }
  fs.writeFileSync(path, s, 'utf8');
  console.log('patched', path);
}

// ─── types/index.ts ───────────────────────────────────────────────────────────
patch('src/types/index.ts', [
  [
    `export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  city: string;
  description: string;
  active: boolean;
}`,
    `export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  city: string;
  description: string;
  active: boolean;
  finished: boolean;
  reglamentoUrl: string;
}

/** Campos temporales al guardar (PDF en base64, no van a la hoja). */
export interface EventSavePayload extends Event {
  reglamentoArchivo?: string;
  reglamentoFileName?: string;
  reglamentoFileType?: string;
}`,
  ],
]);

// ─── storage.ts ─────────────────────────────────────────────────────────────
patch('src/utils/storage.ts', [
  [
    `import type { AppData, Event, Registration, RegistrationFormData } from '../types';`,
    `import type { AppData, Event, EventSavePayload, Registration, RegistrationFormData } from '../types';`,
  ],
  [
    `function normalizeEvent(raw: Record<string, unknown>): Event {
  const active = raw.active;
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    date: parseSheetDate(raw.date),
    location: String(raw.location ?? ''),
    city: String(raw.city ?? ''),
    description: String(raw.description ?? ''),
    active: active === true || active === 'TRUE' || active === 'true' || active === 1,
  };
}`,
    `function parseBoolField(value: unknown): boolean {
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
  };
}`,
  ],
  [
    `export async function saveEvents(events: Event[]): Promise<void> {
  if (isApiEnabled()) {
    await apiPost({ action: 'saveEvents', events });
    return;
  }
  writeLocal(CONFIG.storageKeys.events, events);
}`,
    `export async function saveEvents(events: EventSavePayload[]): Promise<void> {
  if (isApiEnabled()) {
    await apiPost({ action: 'saveEvents', events });
    return;
  }
  writeLocal(CONFIG.storageKeys.events, events);
}`,
  ],
]);

// ─── events.ts ──────────────────────────────────────────────────────────────
fs.writeFileSync(
  'src/pages/events.ts',
  `import { renderNavbar, initNavbar } from '../components/navbar';
import { loadEvents } from '../utils/storage';
import { formatDate } from '../utils/age';
import type { Event } from '../types';

function isHttpUrl(value: string): boolean {
  return /^https?:\\/\\//i.test(value.trim());
}

function renderLoadingPanel(): string {
  return \`
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
    </div>\`;
}

function renderStatusBadge(event: Event): string {
  if (event.active) {
    return '<span class="inline-block rounded-full bg-secondary/20 px-3 py-1 text-xs font-semibold text-secondary">Habilitado para inscripciones</span>';
  }
  return '<span class="inline-block rounded-full bg-gray-light/10 px-3 py-1 text-xs font-semibold text-gray-light">No habilitado para inscripciones</span>';
}

function renderEventCard(event: Event): string {
  const reglamentoBtn = isHttpUrl(event.reglamentoUrl)
    ? \`<a href="\${event.reglamentoUrl}" target="_blank" rel="noopener noreferrer" class="btn-outline w-full sm:w-auto text-center">Ver reglamento</a>\`
    : '';
  const resultadosBtn = event.finished
    ? \`<a href="./resultados.html?evento=\${event.id}" class="btn-secondary w-full sm:w-auto text-center">Ver resultados</a>\`
    : '';
  const inscripcionBtn = event.active
    ? \`<a href="./inscripcion.html?evento=\${event.id}" class="btn-primary w-full sm:w-auto text-center">Inscribirme en este evento</a>\`
    : '';

  const actions = [inscripcionBtn, reglamentoBtn, resultadosBtn].filter(Boolean).join('');

  return \`
    <article class="card group">
      <div class="flex items-start justify-between gap-4 mb-4">
        <div>
          \${renderStatusBadge(event)}
          <h3 class="font-title text-2xl tracking-wide text-white group-hover:text-secondary transition-colors mt-2">\${event.name}</h3>
        </div>
        <div class="text-right shrink-0">
          <p class="font-title text-xl text-secondary">\${formatDate(event.date)}</p>
        </div>
      </div>
      <p class="text-gray-light mb-2">📍 \${event.location}, \${event.city}</p>
      <p class="text-gray-light/80 mb-6 text-sm leading-relaxed">\${event.description}</p>
      <div class="flex flex-wrap gap-3">\${actions || '<p class="text-sm text-gray-light">Sin acciones disponibles por ahora.</p>'}</div>
    </article>\`;
}

export async function initEventsPage(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = \`
    \${renderNavbar('eventos')}
    <main class="mx-auto max-w-7xl px-4 py-12">
      <div class="mb-10 text-center">
        <h1 class="section-title mb-4">Eventos del Campeonato</h1>
        <p class="text-gray-light max-w-2xl mx-auto">
          Consulta las validas del campeonato, descarga el reglamento y revisa los resultados cuando esten disponibles.
        </p>
      </div>
      <div id="events-list" class="grid gap-6 md:grid-cols-2">
        <div class="col-span-full card border border-secondary/30">\${renderLoadingPanel()}</div>
      </div>
    </main>
    <footer class="border-t border-secondary/20 bg-dark py-8 mt-8">
      <div class="mx-auto max-w-7xl px-4 text-center text-sm text-gray-light">
        <p>Minicross Colombia 2026 · Triple Corona</p>
      </div>
    </footer>
  \`;

  initNavbar();

  const list = document.getElementById('events-list');
  if (!list) return;

  try {
    const events = (await loadEvents()).sort((a, b) => a.date.localeCompare(b.date));

    if (events.length === 0) {
      list.innerHTML = \`
        <div class="col-span-full card text-center py-12">
          <p class="text-gray-light text-lg mb-4">No hay eventos publicados en este momento.</p>
          <p class="text-sm text-gray-light/60">Vuelve pronto o contactanos para mas informacion.</p>
        </div>\`;
      return;
    }

    list.innerHTML = events.map(renderEventCard).join('');
  } catch {
    list.innerHTML = \`
      <div class="col-span-full card text-center py-12">
        <p class="text-gray-light text-lg mb-4">No se pudieron cargar los eventos.</p>
        <p class="text-sm text-gray-light/60">Intenta de nuevo en unos minutos.</p>
      </div>\`;
  }
}
`,
  'utf8'
);
console.log('wrote src/pages/events.ts');

// ─── resultados page ──────────────────────────────────────────────────────────
fs.writeFileSync(
  'resultados.html',
  `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Resultados del Campeonato Minicross Colombia 2026." />
    <title>Resultados | Minicross Colombia 2026</title>
    <link rel="icon" href="./logo-minicross.jpg" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/resultados-main.ts"></script>
  </body>
</html>
`,
  'utf8'
);

fs.writeFileSync(
  'src/resultados-main.ts',
  `import { initResultsPage } from './pages/results';

initResultsPage();
`,
  'utf8'
);

fs.writeFileSync(
  'src/pages/results.ts',
  `import { renderNavbar, initNavbar } from '../components/navbar';
import { loadEvents } from '../utils/storage';
import { formatDate } from '../utils/age';

function getEventIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('evento');
}

export async function initResultsPage(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  const eventId = getEventIdFromUrl();

  app.innerHTML = \`
    \${renderNavbar('eventos')}
    <main class="mx-auto max-w-3xl px-4 py-12">
      <div id="results-content" class="card text-center py-16">
        <div class="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-secondary/25 border-t-secondary"></div>
        <p class="mt-4 text-gray-light">Cargando resultados...</p>
      </div>
    </main>
  \`;

  initNavbar();

  const content = document.getElementById('results-content');
  if (!content) return;

  if (!eventId) {
    content.innerHTML = \`
      <h1 class="section-title mb-4">Resultados</h1>
      <p class="text-gray-light">Selecciona un evento desde la pagina de eventos.</p>
      <a href="./eventos.html" class="btn-primary inline-block mt-6">Ver eventos</a>\`;
    return;
  }

  const events = await loadEvents();
  const event = events.find((e) => e.id === eventId);

  if (!event) {
    content.innerHTML = \`
      <h1 class="section-title mb-4">Evento no encontrado</h1>
      <p class="text-gray-light">El evento solicitado no existe o fue eliminado.</p>
      <a href="./eventos.html" class="btn-primary inline-block mt-6">Ver eventos</a>\`;
    return;
  }

  if (!event.finished) {
    content.innerHTML = \`
      <h1 class="section-title mb-4">\${event.name}</h1>
      <p class="text-gray-light mb-2">Los resultados de este evento aun no estan disponibles.</p>
      <p class="text-sm text-gray-light/70">Se publicaran cuando el evento sea marcado como finalizado.</p>
      <a href="./eventos.html" class="btn-outline inline-block mt-6">Volver a eventos</a>\`;
    return;
  }

  content.innerHTML = \`
    <h1 class="section-title mb-2">Resultados</h1>
    <p class="text-secondary font-semibold mb-1">\${event.name}</p>
    <p class="text-sm text-gray-light mb-6">\${formatDate(event.date)} · \${event.city}</p>
    <p class="text-gray-light leading-relaxed">
      La tabla de resultados se conectara proximamente con los datos del evento.
      Esta pagina ya esta habilitada para <strong>\${event.name}</strong>.
    </p>
    <a href="./eventos.html" class="btn-outline inline-block mt-8">Volver a eventos</a>\`;
}
`,
  'utf8'
);
console.log('wrote resultados pages');

// ─── vite.config.ts ───────────────────────────────────────────────────────────
patch('vite.config.ts', [
  [
    `        admin: resolve(__dirname, 'panel-minicross-gestion-2026.html'),`,
    `        admin: resolve(__dirname, 'panel-minicross-gestion-2026.html'),
        resultados: resolve(__dirname, 'resultados.html'),`,
  ],
]);

// ─── public/data/events.json ──────────────────────────────────────────────────
const sampleEvents = [
  {
    id: 'evt-001',
    name: 'Valida 1 - Bogota',
    date: '2026-03-15',
    location: 'Pista Off-Road El Dorado',
    city: 'Bogota',
    description: 'Primera valida del campeonato. Triple Corona: 3 mangas.',
    active: true,
    finished: false,
    reglamentoUrl: '',
  },
  {
    id: 'evt-002',
    name: 'Valida 2 - Medellin',
    date: '2026-05-20',
    location: 'Autodromo del Oriente',
    city: 'Medellin',
    description: 'Segunda valida del campeonato.',
    active: true,
    finished: false,
    reglamentoUrl: '',
  },
];
fs.writeFileSync('public/data/events.json', JSON.stringify(sampleEvents, null, 2), 'utf8');
console.log('updated public/data/events.json');

console.log('Done — run admin + gs patches separately');
