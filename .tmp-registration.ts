import { CONFIG } from '../config';
import { renderNavbar, initNavbar } from '../components/navbar';
import {
  createRegistration,
  loadEvents,
  isPilotNumberAvailableAsync,
  readFileAsDataUrl,
} from '../utils/storage';
import { calculateAge, formatDate } from '../utils/age';
import {
  getCategoriesForAge,
  PILOT_NUMBER_MIN,
  PILOT_NUMBER_MAX,
} from '../types';
import type { Event } from '../types';

let idFileData = '';
let idFileName = '';
let idFileType = '';

function getEventIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('evento');
}

function renderCategoryOptions(age: number, selected?: string): string {
  const categories = getCategoriesForAge(age);
  if (categories.length === 0) {
    return '<option value="">Sin categorías disponibles para esta edad</option>';
  }
  return (
    '<option value="">Selecciona categoría</option>' +
    categories
      .map(
        (c) =>
          `<option value="${c.id}" ${selected === c.id ? 'selected' : ''}>${c.label}</option>`
      )
      .join('')
  );
}

function renderForm(events: Event[], selectedEventId: string | null): string {
  const eventOptions = events
    .filter((e) => e.active)
    .map(
      (e) =>
        `<option value="${e.id}" ${e.id === selectedEventId ? 'selected' : ''}>${e.name} — ${formatDate(e.date)}</option>`
    )
    .join('');

  return `
    <form id="registration-form" class="space-y-6">
      <div>
        <label class="block text-sm font-medium text-secondary mb-2" for="eventId">Evento *</label>
        <select id="eventId" name="eventId" required class="input-field">${eventOptions}</select>
      </div>

      <div class="grid gap-6 sm:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-secondary mb-2" for="nombre">Nombre *</label>
          <input type="text" id="nombre" name="nombre" required class="input-field" autocomplete="given-name" />
        </div>
        <div>
          <label class="block text-sm font-medium text-secondary mb-2" for="apellido">Apellido *</label>
          <input type="text" id="apellido" name="apellido" required class="input-field" autocomplete="family-name" />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-secondary mb-2" for="identificacion">Número de identificación *</label>
        <input type="text" id="identificacion" name="identificacion" required class="input-field mb-3" placeholder="Ej: 1234567890" />
        <label class="block text-sm font-medium text-gray-light mb-2" for="idFile">Documento (foto o PDF, máx. ${CONFIG.maxFileSizeMB} MB) *</label>
        <input type="file" id="idFile" accept="image/*,.pdf" required
               class="w-full rounded-xl border border-dashed border-secondary/40 bg-primary/40 px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:py-2 file:font-semibold file:text-primary" />
        <p id="file-preview" class="mt-2 text-sm text-gray-light hidden"></p>
      </div>

      <div>
        <label class="block text-sm font-medium text-secondary mb-2" for="fechaNacimiento">Fecha de nacimiento *</label>
        <input type="date" id="fechaNacimiento" name="fechaNacimiento" required class="input-field" />
        <p id="age-display" class="mt-2 text-sm text-accent font-semibold hidden"></p>
      </div>

      <div class="grid gap-6 sm:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-secondary mb-2" for="email">Correo electrónico *</label>
          <input type="email" id="email" name="email" required class="input-field" autocomplete="email" />
        </div>
        <div>
          <label class="block text-sm font-medium text-secondary mb-2" for="celular">Celular *</label>
          <input type="tel" id="celular" name="celular" required class="input-field" placeholder="300 123 4567" autocomplete="tel" />
        </div>
      </div>

      <div class="grid gap-6 sm:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-secondary mb-2" for="ciudad">Ciudad *</label>
          <input type="text" id="ciudad" name="ciudad" required class="input-field" />
        </div>
        <div>
          <label class="block text-sm font-medium text-secondary mb-2" for="marcaMoto">Marca moto *</label>
          <input type="text" id="marcaMoto" name="marcaMoto" required class="input-field" placeholder="Ej: KTM, Yamaha, Honda..." />
        </div>
      </div>

      <div class="grid gap-6 sm:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-secondary mb-2" for="numeroPiloto">Número de piloto *</label>
          <input type="number" id="numeroPiloto" name="numeroPiloto" min="${PILOT_NUMBER_MIN}" max="${PILOT_NUMBER_MAX}" required class="input-field" placeholder="Ej: 42" />
          <p id="pilot-status" class="mt-1 text-xs text-gray-light">Números del ${PILOT_NUMBER_MIN} al ${PILOT_NUMBER_MAX}. Se valida disponibilidad al enviar.</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-secondary mb-2" for="categoriaId">Categoría *</label>
          <select id="categoriaId" name="categoriaId" required disabled class="input-field opacity-60">
            <option value="">Primero ingresa tu fecha de nacimiento</option>
          </select>
        </div>
      </div>

      <div id="form-error" class="hidden rounded-xl border border-orange/50 bg-orange/10 px-4 py-3 text-orange"></div>
      <div id="form-success" class="hidden rounded-xl border border-secondary/50 bg-secondary/10 px-4 py-3 text-secondary"></div>

      <button type="submit" class="btn-primary w-full text-lg py-4">Enviar inscripción</button>
    </form>`;
}

async function checkPilotNumber(eventId: string, number: number): Promise<boolean> {
  return isPilotNumberAvailableAsync(eventId, number);
}

function showPilotStatus(available: boolean | null, number?: number): void {
  const status = document.getElementById('pilot-status');
  if (!status) return;
  if (available === null) {
    status.textContent = `Números del ${PILOT_NUMBER_MIN} al ${PILOT_NUMBER_MAX}. Se valida disponibilidad al enviar.`;
    status.className = 'mt-1 text-xs text-gray-light';
    return;
  }
  if (available) {
    status.textContent = `El número #${number} está disponible.`;
    status.className = 'mt-1 text-xs text-secondary font-semibold';
  } else {
    status.textContent = `El número #${number} ya está ocupado en este evento.`;
    status.className = 'mt-1 text-xs text-orange font-semibold';
  }
}

function updateCategories(age: number): void {
  const select = document.getElementById('categoriaId') as HTMLSelectElement | null;
  const ageDisplay = document.getElementById('age-display');
  if (!select || !ageDisplay) return;

  if (age < 0) {
    ageDisplay.classList.add('hidden');
    select.disabled = true;
    select.classList.add('opacity-60');
    select.innerHTML = '<option value="">Fecha inválida</option>';
    return;
  }

  ageDisplay.textContent = `Edad calculada: ${age} años`;
  ageDisplay.classList.remove('hidden');

  const categories = getCategoriesForAge(age);
  select.innerHTML = renderCategoryOptions(age);
  select.disabled = categories.length === 0;
  select.classList.toggle('opacity-60', categories.length === 0);
}

export async function initRegistrationPage(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  const events = (await loadEvents()).filter((e) => e.active);
  const eventIdFromUrl = getEventIdFromUrl();
  const initialEventId = eventIdFromUrl && events.some((e) => e.id === eventIdFromUrl)
    ? eventIdFromUrl
    : events[0]?.id ?? null;

  app.innerHTML = `
    ${renderNavbar('inscripcion')}
    <main class="mx-auto max-w-3xl px-4 py-12">
      <div class="mb-8 text-center">
        <h1 class="section-title mb-4">Inscripción de Piloto</h1>
        <p class="text-gray-light">Completa el formulario para registrarte en el campeonato Minicross Colombia 2026.</p>
      </div>
      <div class="card">
        ${
          events.length === 0
            ? '<p class="text-center text-gray-light py-8">No hay eventos abiertos para inscripción.</p>'
            : renderForm(events, initialEventId)
        }
      </div>
    </main>
    <footer class="border-t border-secondary/20 bg-dark py-8 mt-8">
      <div class="mx-auto max-w-7xl px-4 text-center text-sm text-gray-light">
        <p>Minicross Colombia 2026</p>
      </div>
    </footer>
  `;

  initNavbar();
  if (events.length === 0) return;

  const form = document.getElementById('registration-form') as HTMLFormElement | null;
  const eventSelect = document.getElementById('eventId') as HTMLSelectElement | null;
  const birthInput = document.getElementById('fechaNacimiento') as HTMLInputElement | null;
  const fileInput = document.getElementById('idFile') as HTMLInputElement | null;

  eventSelect?.addEventListener('change', () => {
    showPilotStatus(null);
  });

  const pilotInput = document.getElementById('numeroPiloto') as HTMLInputElement | null;
  pilotInput?.addEventListener('blur', async () => {
    const eventId = eventSelect?.value;
    const num = Number(pilotInput.value);
    if (!eventId || !num || num < PILOT_NUMBER_MIN || num > PILOT_NUMBER_MAX) {
      showPilotStatus(null);
      return;
    }
    const available = await checkPilotNumber(eventId, num);
    showPilotStatus(available, num);
  });

  birthInput?.addEventListener('change', () => {
    if (birthInput.value) updateCategories(calculateAge(birthInput.value));
  });

  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    const preview = document.getElementById('file-preview');
    if (!file || !preview) return;

    const maxBytes = CONFIG.maxFileSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      preview.textContent = `Archivo demasiado grande. Máximo ${CONFIG.maxFileSizeMB} MB.`;
      preview.classList.remove('hidden');
      fileInput.value = '';
      idFileData = '';
      return;
    }

    idFileName = file.name;
    idFileType = file.type;
    idFileData = await readFileAsDataUrl(file);
    preview.textContent = `Archivo seleccionado: ${file.name}`;
    preview.classList.remove('hidden');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('form-error');
    const successEl = document.getElementById('form-success');
    errorEl?.classList.add('hidden');
    successEl?.classList.add('hidden');

    const fd = new FormData(form);
    const fechaNacimiento = fd.get('fechaNacimiento') as string;
    const edad = calculateAge(fechaNacimiento);
    const categoriaId = fd.get('categoriaId') as string;

    if (edad < 0) {
      if (errorEl) {
        errorEl.textContent = 'Fecha de nacimiento inválida.';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    const validCategories = getCategoriesForAge(edad);
    if (!validCategories.some((c) => c.id === categoriaId)) {
      if (errorEl) {
        errorEl.textContent = 'La categoría seleccionada no corresponde a tu edad.';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    if (!idFileData) {
      if (errorEl) {
        errorEl.textContent = 'Debes adjuntar el documento de identificación.';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    try {
      await createRegistration({
        eventId: fd.get('eventId') as string,
        nombre: fd.get('nombre') as string,
        apellido: fd.get('apellido') as string,
        identificacion: fd.get('identificacion') as string,
        identificacionArchivo: idFileData,
        identificacionFileName: idFileName,
        identificacionFileType: idFileType,
        fechaNacimiento,
        email: fd.get('email') as string,
        celular: fd.get('celular') as string,
        ciudad: fd.get('ciudad') as string,
        marcaMoto: fd.get('marcaMoto') as string,
        numeroPiloto: Number(fd.get('numeroPiloto')),
        categoriaId,
      });

      if (successEl) {
        successEl.textContent = '¡Inscripción enviada con éxito! Te contactaremos pronto.';
        successEl.classList.remove('hidden');
      }
      form.reset();
      idFileData = '';
      idFileName = '';
      idFileType = '';
      document.getElementById('file-preview')?.classList.add('hidden');
      document.getElementById('age-display')?.classList.add('hidden');
      const catSelect = document.getElementById('categoriaId') as HTMLSelectElement;
      catSelect.disabled = true;
      catSelect.innerHTML = '<option value="">Primero ingresa tu fecha de nacimiento</option>';
      showPilotStatus(null);
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err instanceof Error ? err.message : 'Error al enviar la inscripción.';
        errorEl.classList.remove('hidden');
      }
    }
  });
}
