import Swal from 'sweetalert2';
import { CONFIG } from '../config';
import {
  CATEGORIES,
  formatCategoryOptionLabel,
  type CategoryResults,
  type CategoryResultsSavePayload,
  type Event,
  type EventResults,
  type HeatKey,
  type ResultsHeatSavePayload,
  type ResultsTable,
} from '../types';
import { HEAT_KEYS, HEAT_LABELS, parseResultsCsv, readFileAsText } from '../utils/parse-results-csv';
import { loadEventResults, readFileAsDataUrl, saveEventResults } from '../utils/storage';

interface HeatDraft {
  existing?: ResultsTable;
  csvFile?: File | null;
  pdfFile?: File | null;
}

interface CategoryDraft {
  categoryId: string;
  categoryLabel: string;
  heats: Record<HeatKey, HeatDraft>;
}

function emptyHeats(): Record<HeatKey, HeatDraft> {
  return { manga1: {}, manga2: {}, manga3: {}, final: {} };
}

function categoryFromExisting(cat: CategoryResults): CategoryDraft {
  const heats = emptyHeats();
  for (const key of HEAT_KEYS) {
    const table = cat[key];
    if (table) heats[key] = { existing: table };
  }
  return {
    categoryId: cat.categoryId,
    categoryLabel: cat.categoryLabel,
    heats,
  };
}

function fileInputHtml(id: string, accept: string, label: string): string {
  return `
    <label class="block text-xs text-gray-light mb-1" for="${id}">${label}</label>
    <input type="file" id="${id}" accept="${accept}"
      class="w-full rounded-lg border border-dashed border-secondary/40 bg-primary/40 px-3 py-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary" />`;
}

function heatStatus(draft: HeatDraft, heat: HeatKey): string {
  if (draft.csvFile) return `<span class="text-secondary">CSV nuevo: ${draft.csvFile.name}</span>`;
  if (draft.existing) {
    const pdf =
      heat !== 'final' && draft.existing.pdfUrl
        ? ` · <a href="${draft.existing.pdfUrl}" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">PDF actual</a>`
        : '';
    return `<span class="text-secondary">Datos cargados (${draft.existing.rows.length} filas)${pdf}</span>`;
  }
  return `<span class="text-gray-light">Sin datos</span>`;
}

function renderCategoryBlock(draft: CategoryDraft, index: number): string {
  const heatBlocks = HEAT_KEYS.map((heat) => {
    const draftHeat = draft.heats[heat];
    return `
      <div class="rounded-lg border border-secondary/20 bg-primary/30 p-3 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-semibold text-white">${HEAT_LABELS[heat]}</p>
          <div class="text-xs heat-status" data-heat-status="${index}-${heat}">${heatStatus(draftHeat, heat)}</div>
        </div>
        ${fileInputHtml(`results-csv-${index}-${heat}`, '.csv,text/csv', 'CSV de resultados')}
        ${
          heat === 'final'
            ? '<p class="text-xs text-gray-light">La final no requiere PDF de vuelta a vuelta.</p>'
            : fileInputHtml(`results-pdf-${index}-${heat}`, '.pdf,application/pdf', 'PDF vuelta a vuelta (opcional)')
        }
      </div>`;
  }).join('');

  return `
    <div class="rounded-xl border border-secondary/30 bg-blue-medium/20 p-4 space-y-3" data-category-index="${index}">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h4 class="font-title text-xl tracking-wide text-secondary">${draft.categoryLabel}</h4>
        <button type="button" class="remove-category-btn text-orange text-sm hover:text-accent" data-index="${index}">Quitar categoria</button>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">${heatBlocks}</div>
    </div>`;
}

function availableCategories(drafts: CategoryDraft[]) {
  const used = new Set(drafts.map((d) => d.categoryId));
  return CATEGORIES.filter((c) => !used.has(c.id));
}

function renderCategoriesSection(drafts: CategoryDraft[]): string {
  if (drafts.length === 0) {
    return '<p class="text-sm text-gray-light text-center py-6">Aun no hay categorias. Agrega al menos una para cargar resultados.</p>';
  }
  return drafts.map((d, i) => renderCategoryBlock(d, i)).join('');
}

function renderAddCategorySelect(drafts: CategoryDraft[]): string {
  const available = availableCategories(drafts);
  return `
    <option value="">Selecciona una categoria...</option>
    ${available.map((c) => `<option value="${c.id}">${formatCategoryOptionLabel(c)}</option>`).join('')}`;
}

function assertFileSize(file: File): void {
  const maxBytes = CONFIG.maxFileSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`"${file.name}" supera el maximo de ${CONFIG.maxFileSizeMB} MB.`);
  }
}

async function buildHeatPayload(
  draft: HeatDraft,
  heat: HeatKey
): Promise<ResultsHeatSavePayload | undefined> {
  if (!draft.csvFile && !draft.existing) return undefined;

  let columns = draft.existing?.columns ?? [];
  let rows = draft.existing?.rows ?? [];
  let commentColumn = draft.existing?.commentColumn ?? null;
  let csvUpload: ResultsHeatSavePayload['csvUpload'];
  let pdfUpload: ResultsHeatSavePayload['pdfUpload'];

  if (draft.csvFile) {
    assertFileSize(draft.csvFile);
    const text = await readFileAsText(draft.csvFile);
    const parsed = parseResultsCsv(text, heat);
    columns = parsed.columns;
    rows = parsed.rows;
    commentColumn = parsed.commentColumn;
    csvUpload = {
      archivo: await readFileAsDataUrl(draft.csvFile),
      fileName: draft.csvFile.name,
      fileType: draft.csvFile.type || 'text/csv',
    };
  }

  if (heat !== 'final' && draft.pdfFile) {
    assertFileSize(draft.pdfFile);
    pdfUpload = {
      archivo: await readFileAsDataUrl(draft.pdfFile),
      fileName: draft.pdfFile.name,
      fileType: draft.pdfFile.type || 'application/pdf',
    };
  }

  return {
    columns,
    rows,
    commentColumn,
    pdfUrl: draft.existing?.pdfUrl,
    csvUrl: draft.existing?.csvUrl,
    csvUpload,
    pdfUpload,
  };
}

async function buildSavePayload(drafts: CategoryDraft[]): Promise<CategoryResultsSavePayload[]> {
  const categories: CategoryResultsSavePayload[] = [];

  for (const draft of drafts) {
    const cat: CategoryResultsSavePayload = {
      categoryId: draft.categoryId,
      categoryLabel: draft.categoryLabel,
    };
    let hasAny = false;
    for (const heat of HEAT_KEYS) {
      const payload = await buildHeatPayload(draft.heats[heat], heat);
      if (payload) {
        cat[heat] = payload;
        hasAny = true;
      }
    }
    if (hasAny) categories.push(cat);
  }

  return categories;
}

function refreshStatusLabels(root: HTMLElement, drafts: CategoryDraft[]): void {
  drafts.forEach((draft, index) => {
    for (const heat of HEAT_KEYS) {
      const el = root.querySelector(`[data-heat-status="${index}-${heat}"]`);
      if (el) el.innerHTML = heatStatus(draft.heats[heat], heat);
    }
  });
}

function bindCategoryUi(root: HTMLElement, drafts: CategoryDraft[]): void {
  const select = root.querySelector<HTMLSelectElement>('#results-add-category');
  const addBtn = root.querySelector<HTMLButtonElement>('#results-add-category-btn');
  const list = root.querySelector('#results-categories');

  if (select) select.innerHTML = renderAddCategorySelect(drafts);
  if (addBtn) addBtn.disabled = availableCategories(drafts).length === 0;
  if (list) list.innerHTML = renderCategoriesSection(drafts);

  drafts.forEach((draft, index) => {
    for (const heat of HEAT_KEYS) {
      const csvInput = root.querySelector<HTMLInputElement>(`#results-csv-${index}-${heat}`);
      const pdfInput = root.querySelector<HTMLInputElement>(`#results-pdf-${index}-${heat}`);
      csvInput?.addEventListener('change', () => {
        draft.heats[heat].csvFile = csvInput.files?.[0] ?? null;
        refreshStatusLabels(root, drafts);
      });
      pdfInput?.addEventListener('change', () => {
        draft.heats[heat].pdfFile = pdfInput.files?.[0] ?? null;
        refreshStatusLabels(root, drafts);
      });
    }
  });
}

export async function openResultsModal(event: Event, onSaved: () => Promise<void>): Promise<void> {
  const existing = await loadEventResults(event.id);
  const drafts: CategoryDraft[] = (existing?.categories ?? []).map(categoryFromExisting);

  const result = await Swal.fire({
    title: `Resultados · ${event.name}`,
    html: `
      <div id="results-modal-root" class="text-left space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <p class="text-sm text-gray-light">
          Agrega solo las categorias que tengas resultados. Puedes dejar mangas incompletas.
          Los archivos se guardan en Google Drive.
        </p>
        <div class="flex flex-wrap items-end gap-2">
          <div class="flex-1 min-w-[200px]">
            <label class="block text-xs text-secondary mb-1" for="results-add-category">Agregar categoria</label>
            <select id="results-add-category" class="input-field text-sm py-2"></select>
          </div>
          <button type="button" id="results-add-category-btn" class="btn-secondary text-sm py-2 px-4">+ Agregar</button>
        </div>
        <div id="results-categories" class="space-y-4"></div>
      </div>`,
    width: '56rem',
    showCancelButton: true,
    confirmButtonText: 'Guardar resultados',
    cancelButtonText: 'Cerrar',
    confirmButtonColor: '#06b6d4',
    focusConfirm: false,
    customClass: {
      popup: 'bg-primary text-white border border-secondary/30',
      title: 'text-secondary',
      htmlContainer: 'text-white',
    },
    didOpen: () => {
      const root = document.getElementById('results-modal-root');
      if (!root) return;

      const rerender = () => bindCategoryUi(root, drafts);
      rerender();

      root.addEventListener('click', (ev) => {
        const target = ev.target as HTMLElement | null;
        if (!target) return;

        if (target.id === 'results-add-category-btn' || target.closest('#results-add-category-btn')) {
          const select = root.querySelector<HTMLSelectElement>('#results-add-category');
          const id = select?.value;
          if (!id) return;
          const cat = CATEGORIES.find((c) => c.id === id);
          if (!cat || drafts.some((d) => d.categoryId === cat.id)) return;
          drafts.push({
            categoryId: cat.id,
            categoryLabel: formatCategoryOptionLabel(cat),
            heats: emptyHeats(),
          });
          rerender();
          return;
        }

        const removeBtn = target.closest('.remove-category-btn') as HTMLElement | null;
        if (removeBtn) {
          const index = Number(removeBtn.getAttribute('data-index'));
          if (Number.isNaN(index)) return;
          drafts.splice(index, 1);
          rerender();
        }
      });
    },
    preConfirm: async () => {
      try {
        if (drafts.length === 0) {
          Swal.showValidationMessage('Agrega al menos una categoria con resultados.');
          return false;
        }
        const categories = await buildSavePayload(drafts);
        if (categories.length === 0) {
          Swal.showValidationMessage('Cada categoria necesita al menos un CSV (manga o final).');
          return false;
        }
        return categories;
      } catch (err) {
        Swal.showValidationMessage(err instanceof Error ? err.message : 'No se pudieron leer los archivos.');
        return false;
      }
    },
  });

  if (!result.isConfirmed || !result.value) return;

  const categories = result.value as CategoryResultsSavePayload[];
  Swal.fire({
    title: 'Guardando resultados...',
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    await saveEventResults({
      eventId: event.id,
      eventName: event.name,
      categories,
    });
    await Swal.fire({
      icon: 'success',
      title: 'Resultados guardados',
      text: 'Los CSV y PDF se almacenaron en Drive y la pagina de resultados ya esta disponible.',
      confirmButtonText: 'Aceptar',
    });
    await onSaved();
  } catch (err) {
    await Swal.fire({
      icon: 'error',
      title: 'Error al guardar',
      text: err instanceof Error ? err.message : 'No se pudieron guardar los resultados.',
      confirmButtonText: 'Aceptar',
    });
  }
}

export function categoryHasAnyHeat(cat: CategoryResults): boolean {
  return HEAT_KEYS.some((key) => Boolean(cat[key]));
}

export function eventResultsArePublic(results: EventResults | null): boolean {
  return Boolean(results?.categories.some(categoryHasAnyHeat));
}
