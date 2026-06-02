import { CONFIG } from '../config';
import {
  loadEvents,
  loadRegistrations,
  saveEvents,
  updateRegistration,
  deleteRegistration,
  exportAllData,
  importData,
  downloadJson,
  isApiEnabled,
} from '../utils/storage';
import { formatDate, generateId } from '../utils/age';
import { getCategoriesForAge } from '../types';
import type { Event, Registration } from '../types';

function isAuthenticated(): boolean {
  return sessionStorage.getItem(CONFIG.storageKeys.adminSession) === 'true';
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

function renderRegistrationRow(reg: Registration): string {
  return `
    <tr class="border-b border-secondary/10 hover:bg-secondary/5" data-id="${reg.id}">
      <td class="px-3 py-3 text-sm">#${reg.numeroPiloto}</td>
      <td class="px-3 py-3 text-sm">${reg.nombre} ${reg.apellido}</td>
      <td class="px-3 py-3 text-sm hidden md:table-cell">${reg.edad} anios</td>
      <td class="px-3 py-3 text-sm hidden lg:table-cell">${reg.categoriaLabel}</td>
      <td class="px-3 py-3 text-sm hidden lg:table-cell">${reg.ciudad}</td>
      <td class="px-3 py-3 text-sm hidden xl:table-cell">${reg.celular}</td>
      <td class="px-3 py-3 text-sm">
        <button class="edit-reg text-secondary hover:text-accent mr-2" data-id="${reg.id}">Editar</button>
        <button class="delete-reg text-orange hover:text-accent" data-id="${reg.id}">Eliminar</button>
      </td>
    </tr>
    <tr class="hidden edit-row bg-primary/40" data-edit-id="${reg.id}">
      <td colspan="7" class="px-4 py-4">
        <form class="edit-form grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-id="${reg.id}">
          <input type="text" name="nombre" value="${reg.nombre}" placeholder="Nombre" class="input-field text-sm" required />
          <input type="text" name="apellido" value="${reg.apellido}" placeholder="Apellido" class="input-field text-sm" required />
          <input type="date" name="fechaNacimiento" value="${reg.fechaNacimiento}" class="input-field text-sm" required />
          <input type="email" name="email" value="${reg.email}" placeholder="Email" class="input-field text-sm" required />
          <input type="tel" name="celular" value="${reg.celular}" placeholder="Celular" class="input-field text-sm" required />
          <input type="text" name="ciudad" value="${reg.ciudad}" placeholder="Ciudad" class="input-field text-sm" required />
          <input type="text" name="marcaMoto" value="${reg.marcaMoto}" placeholder="Marca moto" class="input-field text-sm" required />
          <input type="number" name="numeroPiloto" value="${reg.numeroPiloto}" min="4" max="999" class="input-field text-sm" required />
          <select name="categoriaId" class="input-field text-sm" required>
            ${getCategoriesForAge(reg.edad)
              .map(
                (c) =>
                  `<option value="${c.id}" ${c.id === reg.categoriaId ? 'selected' : ''}>${c.label}</option>`
              )
              .join('')}
          </select>
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
            <p class="text-sm text-gray-light">Gestion de inscripciones y eventos</p>
          </div>
          <button id="logout-btn" class="btn-outline text-sm py-2 px-4">Cerrar sesion</button>
        </div>
      </header>

      <main class="mx-auto max-w-7xl px-4 py-8 space-y-10">
        <!-- Sync tools -->
        <section class="card">
          <h2 class="font-title text-2xl text-secondary mb-4">Datos del campeonato</h2>
          ${
            isApiEnabled()
              ? `<p class="text-secondary text-sm mb-4 font-semibold">
                  Conectado a Google Sheets en tiempo real. Las inscripciones y cambios se guardan automaticamente.
                </p>
                <p class="text-gray-light text-sm mb-4">
                  Puedes ver y editar los datos tambien directamente en tu Google Sheet.
                </p>`
              : `<p class="text-gray-light text-sm mb-4">
                  Modo local activo. Para inscripciones en tiempo real, configura Google Sheets
                  (ver <code class="text-accent">docs/SETUP-GOOGLE-SHEETS.md</code>) y agrega la URL en
                  <code class="text-accent">src/config.ts</code>.
                </p>
                <p class="text-gray-light text-sm mb-4">
                  Mientras tanto, usa exportar/importar JSON para respaldar inscripciones.
                </p>`
          }
          <div class="flex flex-wrap gap-3">
            <button id="export-btn" class="btn-primary">Exportar todo (JSON)</button>
            <label class="btn-secondary cursor-pointer">
              Importar JSON
              <input type="file" id="import-file" accept=".json" class="hidden" />
            </label>
            <select id="import-mode" class="input-field w-auto text-sm py-2">
              <option value="merge">Fusionar con existentes</option>
              <option value="replace">Reemplazar todo</option>
            </select>
          </div>
          <p id="sync-message" class="mt-3 text-sm hidden"></p>
        </section>

        <!-- Events management -->
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
                  Activo
                </label>
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
            <div class="flex gap-2">
              <button type="submit" class="btn-primary text-sm py-2 px-4">Guardar evento</button>
              <button type="button" id="cancel-event-form" class="btn-outline text-sm py-2 px-4">Cancelar</button>
            </div>
          </form>
        </section>

        <!-- Registrations -->
        <section class="card">
          <h2 class="font-title text-2xl text-secondary mb-4">Inscripciones por evento</h2>
          <div class="flex flex-wrap gap-2 mb-6">${eventTabs}</div>
          <div id="registrations-panels">${registrationsByEvent}</div>
        </section>
      </main>
    </div>`;
}

async function refreshAdmin(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;
  const [events, registrations] = await Promise.all([loadEvents(), loadRegistrations()]);
  app.innerHTML = renderAdminPanel(events, registrations);
  bindAdminEvents(events);
}

function bindAdminEvents(events: Event[]): void {
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    sessionStorage.removeItem(CONFIG.storageKeys.adminSession);
    initAdminPage();
  });

  document.getElementById('export-btn')?.addEventListener('click', async () => {
    const data = await exportAllData();
    downloadJson(data, `minicross-backup-${new Date().toISOString().slice(0, 10)}.json`);
  });

  document.getElementById('import-file')?.addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    const msg = document.getElementById('sync-message');
    if (!file || !msg) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const mode = (document.getElementById('import-mode') as HTMLSelectElement).value as 'merge' | 'replace';
      await importData(data, mode);
      msg.textContent = 'Datos importados correctamente.';
      msg.className = 'mt-3 text-sm text-secondary';
      await refreshAdmin();
    } catch {
      msg.textContent = 'Error al importar. Verifica el formato del JSON.';
      msg.className = 'mt-3 text-sm text-orange';
    }
    input.value = '';
  });

  // Event tabs
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

  // Event toggles
  document.querySelectorAll('.event-active-toggle').forEach((toggle) => {
    toggle.addEventListener('change', async (e) => {
      const id = (e.target as HTMLInputElement).getAttribute('data-id')!;
      const updated = events.map((ev) =>
        ev.id === id ? { ...ev, active: (e.target as HTMLInputElement).checked } : ev
      );
      await saveEvents(updated);
    });
  });

  // Add/edit event
  const eventForm = document.getElementById('event-form') as HTMLFormElement;
  document.getElementById('add-event-btn')?.addEventListener('click', () => {
    eventForm.classList.remove('hidden');
    (document.getElementById('event-form-id') as HTMLInputElement).value = '';
    eventForm.reset();
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
      (document.getElementById('event-date') as HTMLInputElement).value = event.date;
      (document.getElementById('event-location') as HTMLInputElement).value = event.location;
      (document.getElementById('event-city') as HTMLInputElement).value = event.city;
      (document.getElementById('event-description') as HTMLTextAreaElement).value = event.description;
    });
  });

  document.querySelectorAll('.delete-event-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id')!;
      if (!confirm('Eliminar este evento? Las inscripciones asociadas permaneceran.')) return;
      await saveEvents(events.filter((e) => e.id !== id));
      await refreshAdmin();
    });
  });

  eventForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formId = (document.getElementById('event-form-id') as HTMLInputElement).value;
    const newEvent: Event = {
      id: formId || generateId(),
      name: (document.getElementById('event-name') as HTMLInputElement).value,
      date: (document.getElementById('event-date') as HTMLInputElement).value,
      location: (document.getElementById('event-location') as HTMLInputElement).value,
      city: (document.getElementById('event-city') as HTMLInputElement).value,
      description: (document.getElementById('event-description') as HTMLTextAreaElement).value,
      active: true,
    };

    const updated = formId
      ? events.map((ev) => (ev.id === formId ? { ...ev, ...newEvent, id: formId } : ev))
      : [...events, newEvent];

    await saveEvents(updated);
    await refreshAdmin();
  });

  // Registration edit/delete
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
      if (!confirm('Eliminar esta inscripcion?')) return;
      await deleteRegistration(id);
      await refreshAdmin();
    });
  });

  document.querySelectorAll('.edit-form').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = form.getAttribute('data-id')!;
      const fd = new FormData(form as HTMLFormElement);
      try {
        await updateRegistration(id, {
          nombre: fd.get('nombre') as string,
          apellido: fd.get('apellido') as string,
          fechaNacimiento: fd.get('fechaNacimiento') as string,
          email: fd.get('email') as string,
          celular: fd.get('celular') as string,
          ciudad: fd.get('ciudad') as string,
          marcaMoto: fd.get('marcaMoto') as string,
          numeroPiloto: Number(fd.get('numeroPiloto')),
          categoriaId: fd.get('categoriaId') as string,
        });
        await refreshAdmin();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al guardar.');
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

  await refreshAdmin();
}
