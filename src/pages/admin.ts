import { CONFIG } from '../config';
import {
  loadEvents,
  loadRegistrations,
  saveEvents,
  readFileAsDataUrl,
  updateRegistration,
  deleteRegistration,
  isApiEnabled,
} from '../utils/storage';
import { calculateAge, formatDate, generateId, parseSheetDate } from '../utils/age';
import {
  formatCategoryDisplayLabel,
  getCategoriesForAge,
  getCategoryById,
  validateCategorySelection,
} from '../types';
import type { Event, EventSavePayload, Registration } from '../types';
import Swal from 'sweetalert2';

function isAuthenticated(): boolean {
  return sessionStorage.getItem(CONFIG.storageKeys.adminSession) === 'true';
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function renderLoadingPanel(): string {
  return `
    <div class="min-h-screen flex items-center justify-center px-4">
      <div class="card w-full max-w-lg border border-secondary/30">
        <div class="flex flex-col items-center justify-center gap-5 py-14 text-center" role="status" aria-live="polite">
          <div class="h-14 w-14 animate-spin rounded-full border-4 border-secondary/25 border-t-secondary"></div>
          <div>
            <p class="font-title text-xl tracking-wide text-secondary uppercase">Procesando datos</p>
            <p class="mt-2 text-sm text-gray-light">Consultando eventos e inscripciones en la base de datos...</p>
          </div>
          <div class="flex gap-1.5">
            <span class="h-2 w-2 animate-pulse rounded-full bg-secondary" style="animation-delay: 0ms"></span>
            <span class="h-2 w-2 animate-pulse rounded-full bg-accent" style="animation-delay: 150ms"></span>
            <span class="h-2 w-2 animate-pulse rounded-full bg-secondary" style="animation-delay: 300ms"></span>
          </div>
        </div>
      </div>
    </div>`;
}

function showSaving(title = 'Guardando...'): void {
  Swal.fire({
    title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading(),
  });
}

async function showSuccess(title: string, text?: string): Promise<void> {
  await Swal.fire({ icon: 'success', title, text, confirmButtonText: 'Aceptar' });
}

async function showError(title: string, text?: string): Promise<void> {
  await Swal.fire({ icon: 'error', title, text, confirmButtonText: 'Aceptar' });
}

async function confirmAction(title: string, text: string): Promise<boolean> {
  const result = await Swal.fire({
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: 'Confirmar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#f97316',
  });
  return result.isConfirmed;
}

function renderLogin(): string {
  return `
    <div class="min-h-screen flex items-center justify-center px-4">
      <div class="card w-full max-w-md">
        <h1 class="font-title text-3xl text-center text-accent mb-6 tracking-wider">Panel de Gestion</h1>
        <form id="login-form" class="space-y-4">
          <div>
            <label class="block text-sm text-secondary mb-2" for="password">Contrasena</label>
            <input type="password" id="password" required class="input-field" />
          </div>
          <div id="login-error" class="hidden text-orange text-sm"></div>
          <button type="submit" class="btn-primary w-full">Ingresar</button>
        </form>
      </div>
    </div>`;
}


function parseCategoryIds(value: string): string[] {
  return value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function renderCategoryCheckboxes(age: number, selected: string[] = []): string {
  const categories = getCategoriesForAge(age);
  if (categories.length === 0) {
    return '<p class="text-sm text-gray-light">Sin categorias disponibles para esta edad.</p>';
  }
  return `<div class="edit-categoria-checkboxes space-y-2">
    ${categories
      .map(
        (c) => `
      <label class="flex items-center gap-3 rounded-lg border border-secondary/20 bg-primary/40 px-3 py-2 cursor-pointer hover:border-secondary/50">
        <input type="checkbox" name="categoriaIds" value="${c.id}" class="accent-secondary h-4 w-4" ${selected.includes(c.id) ? 'checked' : ''} />
        <span class="text-sm font-medium">${c.label}</span>
      </label>`
      )
      .join('')}
  </div>`;
}

function refreshEditFormCategories(form: HTMLFormElement): void {
  const birthInput = form.querySelector<HTMLInputElement>('input[name="fechaNacimiento"]');
  const container = form.querySelector<HTMLElement>('.edit-categoria-container');
  if (!birthInput || !container) return;

  const selected = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="categoriaIds"]:checked')).map(
    (el) => el.value
  );
  const age = birthInput.value ? calculateAge(parseSheetDate(birthInput.value)) : -1;

  if (age < 0) {
    container.innerHTML = '<p class="text-sm text-gray-light">Fecha invalida</p>';
    return;
  }

  container.innerHTML = renderCategoryCheckboxes(age, selected);
}

function renderDocumentLinkCell(url: string | undefined, title: string, ariaLabel: string): string {
  const link = url?.trim() ?? '';
  if (!isHttpUrl(link)) {
    return '<span class="text-gray-light text-xs">—</span>';
  }
  return `<a href="${link}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-secondary hover:text-accent" title="${title}" aria-label="${ariaLabel}">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
  </a>`;
}

function renderRegistrationRow(reg: Registration): string {
  const selectedCategoryIds = parseCategoryIds(reg.categoriaId);
  const birthDate = parseSheetDate(reg.fechaNacimiento);
  const ageForCategories = birthDate ? calculateAge(birthDate) : reg.edad;
  const categoryAge = ageForCategories >= 0 ? ageForCategories : reg.edad;

  return `
    <tr class="border-b border-secondary/10 hover:bg-secondary/5" data-id="${reg.id}">
      <td class="px-3 py-3 text-sm">#${reg.numeroPiloto}</td>
      <td class="px-3 py-3 text-sm">${reg.nombre} ${reg.apellido}</td>
      <td class="px-3 py-3 text-sm hidden md:table-cell">${reg.edad} años</td>
      <td class="px-3 py-3 text-sm hidden lg:table-cell">${formatCategoryDisplayLabel(reg.categoriaId, reg.categoriaLabel)}</td>
      <td class="px-3 py-3 text-sm hidden lg:table-cell">${reg.ciudad}</td>
      <td class="px-3 py-3 text-sm hidden xl:table-cell">${reg.celular}</td>
      <td class="px-3 py-3 text-sm text-center">${renderDocumentLinkCell(reg.identificacionArchivo, 'Ver cédula', 'Ver cédula')}</td>
      <td class="px-3 py-3 text-sm text-center">${renderDocumentLinkCell(reg.comprobantePagoArchivo, 'Ver comprobante de pago', 'Ver comprobante de pago')}</td>
      <td class="px-3 py-3 text-sm">
        <button class="edit-reg text-secondary hover:text-accent mr-2" data-id="${reg.id}">Editar</button>
        <button class="delete-reg text-orange hover:text-accent" data-id="${reg.id}">Eliminar</button>
      </td>
    </tr>
    <tr class="hidden edit-row bg-primary/40" data-edit-id="${reg.id}">
      <td colspan="9" class="px-4 py-4">
        <form class="edit-form grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-id="${reg.id}">
          <input type="text" name="nombre" value="${reg.nombre}" placeholder="Nombre" class="input-field text-sm" required />
          <input type="text" name="apellido" value="${reg.apellido}" placeholder="Apellido" class="input-field text-sm" required />
          <input type="date" name="fechaNacimiento" value="${birthDate}" class="input-field text-sm" required />
          <input type="email" name="email" value="${reg.email}" placeholder="Email" class="input-field text-sm" required />
          <input type="tel" name="celular" value="${reg.celular}" placeholder="Celular" class="input-field text-sm" required />
          <input type="text" name="ciudad" value="${reg.ciudad}" placeholder="Ciudad" class="input-field text-sm" required />
          <input type="text" name="marcaMoto" value="${reg.marcaMoto}" placeholder="Marca moto" class="input-field text-sm" required />
          <input type="number" name="numeroPiloto" value="${reg.numeroPiloto}" min="4" max="999" class="input-field text-sm" required />
          <div class="sm:col-span-2 lg:col-span-3">
            <p class="text-sm text-secondary mb-2 font-medium">Categorias *</p>
            <div class="edit-categoria-container">${renderCategoryCheckboxes(categoryAge, selectedCategoryIds)}</div>
          </div>
          <div class="sm:col-span-2 lg:col-span-3 flex gap-2">
            <button type="submit" class="btn-secondary text-sm py-2 px-4">Guardar</button>
            <button type="button" class="cancel-edit btn-outline text-sm py-2 px-4" data-id="${reg.id}">Cancelar</button>
          </div>
        </form>
      </td>
    </tr>`;
}

function renderAdminPanel(events: Event[], registrations: Registration[]): string {
  const activeEvents = events.filter((e) => e.active);

  const eventTabs = events
    .map(
      (e) =>
        `<button class="event-tab px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          e.active ? 'bg-secondary/20 text-secondary' : 'bg-primary/60 text-gray-light'
        }" data-event-id="${e.id}">${e.name}</button>`
    )
    .join('');

  const registrationsByEvent = events
    .map((event) => {
      const regs = registrations.filter((r) => r.eventId === event.id);
      return `
        <div class="event-panel hidden" data-event-panel="${event.id}">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-title text-2xl text-accent">${event.name}</h3>
            <span class="text-sm text-gray-light">${regs.length} inscrito(s)</span>
          </div>
          ${
            regs.length === 0
              ? '<p class="text-gray-light py-6 text-center">Sin inscripciones para este evento.</p>'
              : `<div class="overflow-x-auto">
                  <table class="w-full text-left">
                    <thead>
                      <tr class="border-b border-secondary/30 text-secondary text-sm">
                        <th class="px-3 py-2"># Piloto</th>
                        <th class="px-3 py-2">Nombre</th>
                        <th class="px-3 py-2 hidden md:table-cell">Edad</th>
                        <th class="px-3 py-2 hidden lg:table-cell">Categoria</th>
                        <th class="px-3 py-2 hidden lg:table-cell">Ciudad</th>
                        <th class="px-3 py-2 hidden xl:table-cell">Celular</th>
                        <th class="px-3 py-2 text-center">Cédula</th>
                        <th class="px-3 py-2 text-center">Pago</th>
                        <th class="px-3 py-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>${regs.map((r) => renderRegistrationRow(r)).join('')}</tbody>
                  </table>
                </div>`
          }
        </div>`;
    })
    .join('');

  return `
    <div class="min-h-screen">
      <header class="border-b border-secondary/20 bg-primary/95 px-4 py-4">
        <div class="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 class="font-title text-3xl text-accent tracking-wider">Panel Minicross 2026</h1>
            <p class="text-sm text-gray-light">Gestión de inscripciones y eventos</p>
          </div>
          <button id="logout-btn" class="btn-outline text-sm py-2 px-4">Cerrar sesion</button>
        </div>
      </header>

      <main class="mx-auto max-w-7xl px-4 py-8 space-y-10">
        <section class="card">
          <h2 class="font-title text-2xl text-secondary mb-4">Datos del campeonato</h2>
          ${
            isApiEnabled()
              ? `<p class="text-secondary text-sm mb-4 font-semibold">
                  Conectado a Google Sheets en tiempo real. Las inscripciones y cambios se guardan automaticamente.
                </p>`
              : `<p class="text-gray-light text-sm mb-4">
                  Modo local activo. Configura Google Sheets (ver docs/SETUP-GOOGLE-SHEETS.md) y la URL en src/config.ts.
                </p>`
          }
          <a href="${CONFIG.spreadsheetUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary inline-block">
            Abrir Google Sheet
          </a>
        </section>

        <section class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-title text-2xl text-secondary">Eventos (${activeEvents.length} activos)</h2>
            <button id="add-event-btn" class="btn-secondary text-sm py-2 px-4">+ Nuevo evento</button>
          </div>
          <div id="events-admin" class="space-y-3">
            ${events
              .map(
                (e) => `
              <div class="flex flex-wrap items-center gap-3 rounded-lg border border-secondary/20 bg-primary/40 p-4" data-event-admin="${e.id}">
                <div class="flex-1 min-w-[200px]">
                  <p class="font-semibold">${e.name}</p>
                  <p class="text-sm text-gray-light">${formatDate(e.date)} · ${e.city}</p>
                </div>
                <label class="flex items-center gap-2 text-sm">
                  <input type="checkbox" class="event-active-toggle accent-secondary" data-id="${e.id}" ${e.active ? 'checked' : ''} />
                  Habilitado inscripciones
                </label>
                <label class="flex items-center gap-2 text-sm">
                  <input type="checkbox" class="event-finished-toggle accent-accent" data-id="${e.id}" ${e.finished ? 'checked' : ''} />
                  Finalizado
                </label>
                ${e.reglamentoUrl?.trim() ? '<a href="' + e.reglamentoUrl + '" target="_blank" rel="noopener noreferrer" class="text-secondary text-sm hover:text-accent">Ver reglamento</a>' : '<span class="text-xs text-gray-light">Sin reglamento</span>'}
                <button class="edit-event-btn text-secondary text-sm hover:text-accent" data-id="${e.id}">Editar</button>
                <button class="delete-event-btn text-orange text-sm hover:text-accent" data-id="${e.id}">Eliminar</button>
              </div>`
              )
              .join('')}
          </div>
          <form id="event-form" class="hidden mt-4 space-y-3 border-t border-secondary/20 pt-4">
            <input type="hidden" id="event-form-id" />
            <div class="grid gap-3 sm:grid-cols-2">
              <input type="text" id="event-name" placeholder="Nombre del evento" class="input-field" required />
              <input type="date" id="event-date" class="input-field" required />
              <input type="text" id="event-location" placeholder="Ubicacion / Pista" class="input-field" required />
              <input type="text" id="event-city" placeholder="Ciudad" class="input-field" required />
            </div>
            <textarea id="event-description" placeholder="Descripcion" class="input-field" rows="2" required></textarea>
            <div>
              <label class="block text-sm text-secondary mb-2" for="event-reglamento">Reglamento (PDF)</label>
              <input type="file" id="event-reglamento" accept=".pdf,application/pdf"
                class="w-full rounded-xl border border-dashed border-secondary/40 bg-primary/40 px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:py-2 file:font-semibold file:text-primary" />
              <p id="event-reglamento-preview" class="mt-2 text-xs text-gray-light hidden"></p>
              <p id="event-reglamento-current" class="mt-2 text-xs text-secondary hidden"></p>
            </div>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" id="event-finished" class="accent-accent" />
              Evento finalizado (habilita boton Ver resultados)
            </label>
            <div class="flex gap-2">
              <button type="submit" class="btn-primary text-sm py-2 px-4">Guardar evento</button>
              <button type="button" id="cancel-event-form" class="btn-outline text-sm py-2 px-4">Cancelar</button>
            </div>
          </form>
        </section>

        <section class="card">
          <h2 class="font-title text-2xl text-secondary mb-4">Inscripciones por evento</h2>
          <div class="flex flex-wrap gap-2 mb-6">${eventTabs}</div>
          <div id="registrations-panels">${registrationsByEvent}</div>
        </section>
      </main>
    </div>`;
}

async function refreshAdmin(showLoading = false): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  if (showLoading) {
    app.innerHTML = renderLoadingPanel();
  }

  try {
    const [events, registrations] = await Promise.all([loadEvents(), loadRegistrations()]);
    app.innerHTML = renderAdminPanel(events, registrations);
    bindAdminEvents(events);
  } catch (err) {
    Swal.close();
    await showError(
      'Error al cargar',
      err instanceof Error ? err.message : 'No se pudieron obtener los datos del panel.'
    );
    app.innerHTML = renderLoadingPanel();
  }
}

function bindAdminEvents(events: Event[]): void {
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    sessionStorage.removeItem(CONFIG.storageKeys.adminSession);
    initAdminPage();
  });

  const panels = document.querySelectorAll('.event-panel');
  const tabs = document.querySelectorAll('.event-tab');
  if (panels.length > 0) {
    (panels[0] as HTMLElement).classList.remove('hidden');
  }
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const eventId = tab.getAttribute('data-event-id');
      tabs.forEach((t) => t.classList.remove('ring-2', 'ring-secondary'));
      tab.classList.add('ring-2', 'ring-secondary');
      panels.forEach((p) => {
        p.classList.toggle('hidden', p.getAttribute('data-event-panel') !== eventId);
      });
    });
  });
  tabs[0]?.classList.add('ring-2', 'ring-secondary');

  document.querySelectorAll('.event-active-toggle').forEach((toggle) => {
    toggle.addEventListener('change', async (e) => {
      const id = (e.target as HTMLInputElement).getAttribute('data-id')!;
      const updated = events.map((ev) =>
        ev.id === id ? { ...ev, active: (e.target as HTMLInputElement).checked } : ev
      );
      showSaving('Actualizando evento...');
      try {
        await saveEvents(updated);
        Swal.close();
        await showSuccess('Evento actualizado', 'El estado del evento se guardo correctamente.');
        await refreshAdmin();
      } catch (err) {
        Swal.close();
        await showError('Error', err instanceof Error ? err.message : 'No se pudo actualizar el evento.');
        await refreshAdmin();
      }
    });
  });

  document.querySelectorAll('.event-finished-toggle').forEach((toggle) => {
    toggle.addEventListener('change', async (e) => {
      const id = (e.target as HTMLInputElement).getAttribute('data-id')!;
      const updated = events.map((ev) =>
        ev.id === id ? { ...ev, finished: (e.target as HTMLInputElement).checked } : ev
      );
      showSaving('Actualizando evento...');
      try {
        await saveEvents(updated);
        Swal.close();
        await showSuccess('Evento actualizado', 'El estado de finalizacion se guardo correctamente.');
        await refreshAdmin();
      } catch (err) {
        Swal.close();
        await showError('Error', err instanceof Error ? err.message : 'No se pudo actualizar el evento.');
        await refreshAdmin();
      }
    });
  });

  const eventForm = document.getElementById('event-form') as HTMLFormElement;
  document.getElementById('add-event-btn')?.addEventListener('click', () => {
    eventForm.classList.remove('hidden');
    (document.getElementById('event-form-id') as HTMLInputElement).value = '';
    eventForm.reset();
    document.getElementById('event-reglamento-preview')?.classList.add('hidden');
    document.getElementById('event-reglamento-current')?.classList.add('hidden');
  });
  document.getElementById('cancel-event-form')?.addEventListener('click', () => {
    eventForm.classList.add('hidden');
  });

  document.querySelectorAll('.edit-event-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id')!;
      const event = events.find((e) => e.id === id);
      if (!event) return;
      eventForm.classList.remove('hidden');
      (document.getElementById('event-form-id') as HTMLInputElement).value = event.id;
      (document.getElementById('event-name') as HTMLInputElement).value = event.name;
      (document.getElementById('event-date') as HTMLInputElement).value = parseSheetDate(event.date);
      (document.getElementById('event-location') as HTMLInputElement).value = event.location;
      (document.getElementById('event-city') as HTMLInputElement).value = event.city;
      (document.getElementById('event-description') as HTMLTextAreaElement).value = event.description;
      (document.getElementById('event-finished') as HTMLInputElement).checked = event.finished;
      const reglamentoInput = document.getElementById('event-reglamento') as HTMLInputElement;
      const reglamentoPreview = document.getElementById('event-reglamento-preview');
      const reglamentoCurrent = document.getElementById('event-reglamento-current');
      if (reglamentoInput) reglamentoInput.value = '';
      reglamentoPreview?.classList.add('hidden');
      if (event.reglamentoUrl?.trim()) {
        reglamentoCurrent?.classList.remove('hidden');
        if (reglamentoCurrent) {
          reglamentoCurrent.innerHTML = `Reglamento actual: <a href="${event.reglamentoUrl}" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">Ver PDF</a> (sube otro archivo para reemplazarlo)`;
        }
      } else {
        reglamentoCurrent?.classList.add('hidden');
        if (reglamentoCurrent) reglamentoCurrent.textContent = '';
      }
    });
  });

  document.querySelectorAll('.delete-event-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id')!;
      const event = events.find((e) => e.id === id);
      const confirmed = await confirmAction(
        'Eliminar evento',
        `Se eliminara "${event?.name ?? 'este evento'}". Las inscripciones asociadas permaneceran.`
      );
      if (!confirmed) return;

      showSaving('Eliminando evento...');
      try {
        await saveEvents(events.filter((e) => e.id !== id));
        Swal.close();
        await showSuccess('Evento eliminado', 'El evento se elimino correctamente.');
        await refreshAdmin();
      } catch (err) {
        Swal.close();
        await showError('Error', err instanceof Error ? err.message : 'No se pudo eliminar el evento.');
      }
    });
  });


  const reglamentoInput = document.getElementById('event-reglamento') as HTMLInputElement | null;
  reglamentoInput?.addEventListener('change', async () => {
    const preview = document.getElementById('event-reglamento-preview');
    const file = reglamentoInput.files?.[0];
    if (!file || !preview) return;
    const maxBytes = CONFIG.maxFileSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      preview.textContent = `Archivo demasiado grande. Maximo ${CONFIG.maxFileSizeMB} MB.`;
      preview.classList.remove('hidden');
      reglamentoInput.value = '';
      return;
    }
    preview.textContent = `Archivo seleccionado: ${file.name}`;
    preview.classList.remove('hidden');
  });

  eventForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formId = (document.getElementById('event-form-id') as HTMLInputElement).value;
    const isEdit = Boolean(formId);
    const existing = formId ? events.find((ev) => ev.id === formId) : undefined;

    const newEvent: EventSavePayload = {
      id: formId || generateId(),
      name: (document.getElementById('event-name') as HTMLInputElement).value,
      date: parseSheetDate((document.getElementById('event-date') as HTMLInputElement).value),
      location: (document.getElementById('event-location') as HTMLInputElement).value,
      city: (document.getElementById('event-city') as HTMLInputElement).value,
      description: (document.getElementById('event-description') as HTMLTextAreaElement).value,
      active: existing?.active ?? true,
      finished: (document.getElementById('event-finished') as HTMLInputElement).checked,
      reglamentoUrl: existing?.reglamentoUrl ?? '',
    };

    const reglamentoFile = (document.getElementById('event-reglamento') as HTMLInputElement).files?.[0];
    if (reglamentoFile) {
      newEvent.reglamentoArchivo = await readFileAsDataUrl(reglamentoFile);
      newEvent.reglamentoFileName = reglamentoFile.name;
      newEvent.reglamentoFileType = reglamentoFile.type || 'application/pdf';
    }

    const updated = formId
      ? events.map((ev) => (ev.id === formId ? { ...ev, ...newEvent, id: formId } : ev))
      : [...events, newEvent];

    showSaving(isEdit ? 'Guardando cambios...' : 'Creando evento...');
    try {
      await saveEvents(updated);
      Swal.close();
      await showSuccess(
        isEdit ? 'Evento actualizado' : 'Evento creado',
        isEdit ? 'Los cambios se guardaron correctamente.' : 'El nuevo evento se creo correctamente.'
      );
      await refreshAdmin();
    } catch (err) {
      Swal.close();
      await showError('Error', err instanceof Error ? err.message : 'No se pudo guardar el evento.');
    }
  });

  document.querySelectorAll('.edit-reg').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id')!;
      document.querySelector(`[data-edit-id="${id}"]`)?.classList.remove('hidden');
    });
  });

  document.querySelectorAll('.cancel-edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id')!;
      document.querySelector(`[data-edit-id="${id}"]`)?.classList.add('hidden');
    });
  });

  document.querySelectorAll('.delete-reg').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id')!;
      const confirmed = await confirmAction(
        'Eliminar inscripcion',
        'Esta accion no se puede deshacer. Se eliminara la inscripcion seleccionada.'
      );
      if (!confirmed) return;

      showSaving('Eliminando inscripcion...');
      try {
        await deleteRegistration(id);
        Swal.close();
        await showSuccess('Inscripcion eliminada', 'La inscripcion se elimino correctamente.');
        await refreshAdmin();
      } catch (err) {
        Swal.close();
        await showError('Error', err instanceof Error ? err.message : 'No se pudo eliminar la inscripcion.');
      }
    });
  });

  document.querySelectorAll('.edit-form').forEach((form) => {
    const birthInput = form.querySelector<HTMLInputElement>('input[name="fechaNacimiento"]');
    birthInput?.addEventListener('change', () => refreshEditFormCategories(form as HTMLFormElement));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = form.getAttribute('data-id')!;
      const fd = new FormData(form as HTMLFormElement);
      const fechaNacimiento = parseSheetDate(fd.get('fechaNacimiento') as string);
      const categoriaIds = fd.getAll('categoriaIds').map(String);
      const validCategories = getCategoriesForAge(calculateAge(fechaNacimiento));

      if (!fechaNacimiento) {
        await showError('Fecha invalida', 'Revisa la fecha de nacimiento.');
        return;
      }

      if (categoriaIds.length === 0 || !categoriaIds.every((cid) => validCategories.some((c) => c.id === cid))) {
        await showError('Categorias', 'Selecciona al menos una categoria valida para la edad del piloto.');
        return;
      }

      const categoryError = validateCategorySelection(categoriaIds);
      if (categoryError) {
        await showError('Categorias', categoryError);
        return;
      }

      const categoriaLabel = categoriaIds.map((cid) => getCategoryById(cid)?.label ?? cid).join('|');

      showSaving('Guardando inscripcion...');
      try {
        await updateRegistration(id, {
          nombre: fd.get('nombre') as string,
          apellido: fd.get('apellido') as string,
          fechaNacimiento,
          email: fd.get('email') as string,
          celular: fd.get('celular') as string,
          ciudad: fd.get('ciudad') as string,
          marcaMoto: fd.get('marcaMoto') as string,
          numeroPiloto: Number(fd.get('numeroPiloto')),
          categoriaId: categoriaIds.join(','),
          categoriaLabel,
        });
        Swal.close();
        await showSuccess('Inscripcion actualizada', 'Los cambios se guardaron correctamente.');
        await refreshAdmin();
      } catch (err) {
        Swal.close();
        await showError('Error', err instanceof Error ? err.message : 'No se pudo guardar la inscripcion.');
      }
    });
  });
}

export async function initAdminPage(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  if (!isAuthenticated()) {
    app.innerHTML = renderLogin();
    document.getElementById('login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const password = (document.getElementById('password') as HTMLInputElement).value;
      const errorEl = document.getElementById('login-error');
      if (password === CONFIG.adminPassword) {
        sessionStorage.setItem(CONFIG.storageKeys.adminSession, 'true');
        initAdminPage();
      } else if (errorEl) {
        errorEl.textContent = 'Contrasena incorrecta.';
        errorEl.classList.remove('hidden');
      }
    });
    return;
  }

  await refreshAdmin(true);
}
