import { renderFooter } from '../components/footer';
import { renderNavbar, initNavbar } from '../components/navbar';
import {
  REGLAMENTO_SECTIONS,
  type ReglamentoSection,
} from '../content/reglamento-sections';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderParagraphs(texts: string[]): string {
  return texts
    .map(
      (p) =>
        `<p class="text-gray-light leading-relaxed mt-4 first:mt-0">${escapeHtml(p)}</p>`
    )
    .join('');
}

function renderTable(section: ReglamentoSection): string {
  const table = section.table;
  if (!table) return '';

  const head = table.headers
    .map(
      (h) =>
        `<th class="px-4 py-3 text-left text-sm font-semibold text-secondary uppercase tracking-wide">${escapeHtml(h)}</th>`
    )
    .join('');

  const body = table.rows
    .map(
      (row) =>
        `<tr class="border-t border-secondary/15 hover:bg-secondary/5 transition-colors">${row
          .map(
            (cell) =>
              `<td class="px-4 py-3 text-gray-light">${escapeHtml(cell)}</td>`
          )
          .join('')}</tr>`
    )
    .join('');

  return `
    <div class="my-6 overflow-x-auto rounded-xl border border-secondary/25">
      <table class="w-full min-w-[280px] text-sm">
        <thead class="bg-primary/80"><tr>${head}</tr></thead>
        <tbody class="bg-blue-medium/40">${body}</tbody>
      </table>
    </div>`;
}

function renderBullets(items: string[]): string {
  if (!items.length) return '';
  return `
    <ul class="mt-4 space-y-2 text-gray-light leading-relaxed list-disc pl-5 marker:text-secondary">
      ${items.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}
    </ul>`;
}

function renderSection(section: ReglamentoSection): string {
  let body = '';

  if (section.id === 'puntuacion' && section.paragraphs?.length) {
    body += `<p class="text-gray-light leading-relaxed">${escapeHtml(section.paragraphs[0])}</p>`;
    body += renderTable(section);
    if (section.paragraphs[1]) {
      body += `<p class="text-gray-light leading-relaxed mt-4">${escapeHtml(section.paragraphs[1])}</p>`;
    }
  } else {
    body += renderParagraphs(section.paragraphs ?? []);
    body += renderTable(section);
    body += renderBullets(section.bullets ?? []);
    body += (section.subsections ?? [])
      .map(
        (sub) => `
      <div class="mt-6">
        <h3 class="font-title text-xl tracking-wide text-accent">${escapeHtml(sub.title)}</h3>
        ${renderBullets(sub.bullets)}
      </div>`
      )
      .join('');
    body += renderParagraphs(section.paragraphsAfter ?? []);
  }

  return `
    <article id="${section.id}" class="card scroll-mt-28">
      <h2 class="section-title text-3xl md:text-4xl">${escapeHtml(section.title)}</h2>
      ${body}
    </article>`;
}

function renderToc(): string {
  return REGLAMENTO_SECTIONS.map(
    (s) =>
      `<a href="#${s.id}" class="block py-1.5 text-sm text-gray-light hover:text-secondary transition-colors border-l-2 border-transparent hover:border-secondary pl-3">${escapeHtml(s.title)}</a>`
  ).join('');
}

export function initReglamentoPage(): void {
  const app = document.getElementById('app');
  if (!app) return;

  const sectionsHtml = REGLAMENTO_SECTIONS.map(renderSection).join('');

  app.innerHTML = `
    ${renderNavbar('reglamento')}
    <main class="mx-auto max-w-7xl px-4 py-10 md:py-14 md:px-6">
      <header class="text-center mb-10 md:mb-14">
        <p class="text-secondary font-semibold tracking-widest uppercase text-sm mb-2">Campeonato Junior Minicross Colombia</p>
        <h1 class="section-title text-4xl md:text-5xl lg:text-6xl">Reglamento oficial</h1>
        <p class="mt-4 max-w-2xl mx-auto text-gray-light leading-relaxed">
          Normas oficiales del campeonato. Al inscribirte aceptas este reglamento en su totalidad.
        </p>
        <a href="./reglamento-oficial-minicross.pdf" target="_blank" rel="noopener noreferrer"
           class="btn-outline inline-flex items-center gap-2 mt-6">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Descargar PDF oficial
        </a>
      </header>

      <div class="lg:grid lg:grid-cols-[240px_1fr] lg:gap-10 xl:gap-14">
        <aside class="hidden lg:block">
          <nav class="sticky top-24 rounded-xl border border-secondary/25 bg-blue-medium/50 p-4 backdrop-blur-sm" aria-label="Índice del reglamento">
            <p class="font-title text-lg text-accent tracking-wide mb-3">Índice</p>
            ${renderToc()}
          </nav>
        </aside>
        <div class="space-y-8">${sectionsHtml}</div>
      </div>
    </main>
    ${renderFooter()}
  `;

  initNavbar();
}
