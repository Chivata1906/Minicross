import { CONFIG } from '../config';
import { renderNavbar, initNavbar } from '../components/navbar';
import {
  createRegistration,
  loadEvents,
  getAvailablePilotNumbers,
  readFileAsDataUrl,
} from '../utils/storage';
import { calculateAge, formatDate } from '../utils/age';
import { getCategoriesForAge, validateCategorySelection } from '../types';
import type { Event } from '../types';
import Swal from 'sweetalert2';

let idFileData = '';
let idFileName = '';
let idFileType = '';
let paymentFileData = '';
let paymentFileName = '';
let paymentFileType = '';

function getEventIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('evento');
}

function renderCategoryCheckboxes(age: number, selected: string[] = []): string {
  const categories = getCategoriesForAge(age);
  if (categories.length === 0) {
    return '<p class="text-sm text-gray-light">Sin categorias disponibles para esta edad.</p>';
  }
  return `<div class="space-y-2" id="categoria-checkboxes">
    ${categories
      .map(
        (c) => `
      <label class="flex items-center gap-3 rounded-lg border border-secondary/20 bg-primary/40 px-4 py-3 cursor-pointer hover:border-secondary/50">
        <input type="checkbox" name="categoriaIds" value="${c.id}" class="accent-secondary h-4 w-4" ${selected.includes(c.id) ? 'checked' : ''} />
        <span class="text-sm font-medium">${c.label}</span>
      </label>`
      )
      .join('')}
  </div>`;
}

function renderPilotOptions(numbers: number[], selected?: number): string {
  if (numbers.length === 0) {
    return '<option value="">No hay numeros disponibles</option>';
  }
  return (
    '<option value="">Selecciona numero de piloto</option>' +
    numbers
      .map((n) => `<option value="${n}" ${selected === n ? 'selected' : ''}>#${n}</option>`)
      .join('')
  );
}

function renderLoadingPanel(): string {
  return `
    <div class="flex flex-col items-center justify-center gap-5 py-16 text-center" role="status" aria-live="polite">
      <div class="h-14 w-14 animate-spin rounded-full border-4 border-secondary/25 border-t-secondary"></div>
      <div>
        <p class="font-title text-xl tracking-wide text-secondary">Procesando datos</p>
        <p class="mt-2 text-sm text-gray-light">Consultando eventos y numeros de piloto en la base de datos...</p>
      </div>
      <div class="flex gap-1.5">
        <span class="h-2 w-2 animate-pulse rounded-full bg-secondary" style="animation-delay: 0ms"></span>
        <span class="h-2 w-2 animate-pulse rounded-full bg-accent" style="animation-delay: 150ms"></span>
        <span class="h-2 w-2 animate-pulse rounded-full bg-secondary" style="animation-delay: 300ms"></span>
      </div>
    </div>`;
}

function renderForm(events: Event[], selectedEventId: string | null, pilotNumbers: number[]): string {
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
        <label class="block text-sm font-medium text-secondary mb-2" for="identificacion">Numero de identificacion *</label>
        <input type="text" id="identificacion" name="identificacion" required class="input-field mb-3" placeholder="Ej: 1234567890" />
        <label class="block text-sm font-medium text-secondary mb-2" for="idFile">Documento de identidad (foto o PDF, max. ${CONFIG.maxFileSizeMB} MB) *</label>
        <input type="file" id="idFile" accept="image/*,.pdf" required
               class="w-full rounded-xl border border-dashed border-secondary/40 bg-primary/40 px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:py-2 file:font-semibold file:text-primary" />
        <p id="file-preview" class="mt-2 text-sm text-gray-light hidden"></p>
      </div>

      <div>
        <label class="block text-sm font-medium text-secondary mb-2" for="paymentFile">Comprobante de pago (foto o PDF, max. ${CONFIG.maxFileSizeMB} MB) *</label>
        <input type="file" id="paymentFile" accept="image/*,.pdf" required
               class="w-full rounded-xl border border-dashed border-secondary/40 bg-primary/40 px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:py-2 file:font-semibold file:text-primary" />
        <p id="payment-preview" class="mt-2 text-sm text-gray-light hidden"></p>
      </div>

      <div>
        <label class="block text-sm font-medium text-secondary mb-2" for="fechaNacimiento">Fecha de nacimiento *</label>
        <input type="date" id="fechaNacimiento" name="fechaNacimiento" required class="input-field" />
        <p id="age-display" class="mt-2 text-sm text-accent font-semibold hidden"></p>
      </div>

      <div class="grid gap-6 sm:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-secondary mb-2" for="email">Correo electronico *</label>
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
          <label class="block text-sm font-medium text-secondary mb-2" for="numeroPiloto">Numero de piloto *</label>
          <select id="numeroPiloto" name="numeroPiloto" required class="input-field">
            ${renderPilotOptions(pilotNumbers)}
          </select>
          <p id="pilot-status" class="mt-1 text-xs text-gray-light">Selecciona un evento para ver numeros disponibles.</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-secondary mb-2">Categorias * (puedes elegir mas de una si aplica)</label>
          <div id="categoria-container" class="opacity-60 pointer-events-none">
            <p class="text-sm text-gray-light">Primero ingresa tu fecha de nacimiento</p>
          </div>
        </div>
      </div>

      <button type="submit" class="btn-primary w-full text-lg py-4">Enviar inscripción</button>
    </form>`;
}

async function refreshPilotSelect(eventId: string): Promise<void> {
  const select = document.getElementById('numeroPiloto') as HTMLSelectElement | null;
  const status = document.getElementById('pilot-status');
  if (!select || !status) return;

  if (!eventId) {
    select.innerHTML = '<option value="">Selecciona un evento</option>';
    status.textContent = 'Selecciona un evento para ver numeros disponibles.';
    return;
  }

  select.disabled = true;
  select.classList.add('opacity-60', 'pointer-events-none');
  status.innerHTML =
    '<span class="inline-flex items-center gap-2 text-secondary"><span class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-secondary/30 border-t-secondary"></span>Consultando numeros disponibles...</span>';

  try {
    const numbers = await getAvailablePilotNumbers(eventId);
    const current = Number(select.value);
    select.innerHTML = renderPilotOptions(numbers, current || undefined);
    status.textContent = numbers.length
      ? `${numbers.length} numero(s) disponible(s) para este evento.`
      : 'No hay numeros disponibles en este evento.';
  } catch {
    select.innerHTML = '<option value="">Error al cargar numeros</option>';
    status.textContent = 'No se pudieron cargar los numeros. Intenta de nuevo.';
  } finally {
    select.disabled = false;
    select.classList.remove('opacity-60', 'pointer-events-none');
  }
}

function updateCategories(age: number): void {
  const container = document.getElementById('categoria-container');
  const ageDisplay = document.getElementById('age-display');
  if (!container || !ageDisplay) return;

  if (age < 0) {
    ageDisplay.classList.add('hidden');
    container.classList.add('opacity-60', 'pointer-events-none');
    container.innerHTML = '<p class="text-sm text-gray-light">Fecha invalida</p>';
    return;
  }

  ageDisplay.textContent = `Edad calculada: ${age} anos`;
  ageDisplay.classList.remove('hidden');

  const categories = getCategoriesForAge(age);
  container.classList.toggle('opacity-60', categories.length === 0);
  container.classList.toggle('pointer-events-none', categories.length === 0);
  container.innerHTML = renderCategoryCheckboxes(age);
}

function getSelectedCategoryIds(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>('input[name="categoriaIds"]:checked')
  ).map((el) => el.value);
}

async function handleFileInput(
  input: HTMLInputElement,
  previewId: string,
  onData: (data: string, name: string, type: string) => void,
  clear: () => void
): Promise<void> {
  const file = input.files?.[0];
  const preview = document.getElementById(previewId);
  if (!file || !preview) return;

  const maxBytes = CONFIG.maxFileSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    preview.textContent = `Archivo demasiado grande. Maximo ${CONFIG.maxFileSizeMB} MB.`;
    preview.classList.remove('hidden');
    input.value = '';
    clear();
    return;
  }

  const data = await readFileAsDataUrl(file);
  onData(data, file.name, file.type);
  preview.textContent = `Archivo seleccionado: ${file.name}`;
  preview.classList.remove('hidden');
}

function bindRegistrationForm(events: Event[]): void {
  if (events.length === 0) return;

  const form = document.getElementById('registration-form') as HTMLFormElement | null;
  const eventSelect = document.getElementById('eventId') as HTMLSelectElement | null;
  const birthInput = document.getElementById('fechaNacimiento') as HTMLInputElement | null;
  const fileInput = document.getElementById('idFile') as HTMLInputElement | null;
  const paymentInput = document.getElementById('paymentFile') as HTMLInputElement | null;

  eventSelect?.addEventListener('change', () => {
    if (eventSelect.value) void refreshPilotSelect(eventSelect.value);
  });

  birthInput?.addEventListener('change', () => {
    if (birthInput.value) updateCategories(calculateAge(birthInput.value));
  });

  fileInput?.addEventListener('change', () => {
    void handleFileInput(
      fileInput,
      'file-preview',
      (data, name, type) => {
        idFileData = data;
        idFileName = name;
        idFileType = type;
      },
      () => {
        idFileData = '';
        idFileName = '';
        idFileType = '';
      }
    );
  });

  paymentInput?.addEventListener('change', () => {
    void handleFileInput(
      paymentInput,
      'payment-preview',
      (data, name, type) => {
        paymentFileData = data;
        paymentFileName = name;
        paymentFileType = type;
      },
      () => {
        paymentFileData = '';
        paymentFileName = '';
        paymentFileType = '';
      }
    );
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const fechaNacimiento = fd.get('fechaNacimiento') as string;
    const edad = calculateAge(fechaNacimiento);
    const categoriaIds = getSelectedCategoryIds();

    if (edad < 0) {
      await Swal.fire({ icon: 'error', title: 'Fecha invalida', text: 'Revisa la fecha de nacimiento.' });
      return;
    }

    const validCategories = getCategoriesForAge(edad);
    if (categoriaIds.length === 0 || !categoriaIds.every((id) => validCategories.some((c) => c.id === id))) {
      await Swal.fire({
        icon: 'error',
        title: 'Categorías',
        text: 'Selecciona al menos una categoría válida para tu edad.',
      });
      return;
    }

    const categoryError = validateCategorySelection(categoriaIds);
    if (categoryError) {
      await Swal.fire({ icon: 'error', title: 'Categorías', text: categoryError });
      return;
    }

    if (!idFileData) {
      await Swal.fire({ icon: 'error', title: 'Documento', text: 'Debes adjuntar el documento de identidad.' });
      return;
    }

    if (!paymentFileData) {
      await Swal.fire({ icon: 'error', title: 'Pago', text: 'Debes adjuntar el comprobante de pago.' });
      return;
    }

    const numeroPiloto = Number(fd.get('numeroPiloto'));
    if (!numeroPiloto) {
      await Swal.fire({ icon: 'error', title: 'Numero de piloto', text: 'Selecciona un numero de piloto.' });
      return;
    }

    Swal.fire({
      title: 'Enviando inscripción...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      await createRegistration({
        eventId: fd.get('eventId') as string,
        nombre: fd.get('nombre') as string,
        apellido: fd.get('apellido') as string,
        identificacion: fd.get('identificacion') as string,
        identificacionArchivo: idFileData,
        identificacionFileName: idFileName,
        identificacionFileType: idFileType,
        comprobantePagoArchivo: paymentFileData,
        comprobantePagoFileName: paymentFileName,
        comprobantePagoFileType: paymentFileType,
        fechaNacimiento,
        email: fd.get('email') as string,
        celular: fd.get('celular') as string,
        ciudad: fd.get('ciudad') as string,
        marcaMoto: fd.get('marcaMoto') as string,
        numeroPiloto,
        categoriaIds,
      });

      await Swal.fire({
        icon: 'success',
        title: 'Inscripción enviada',
        text: 'Te contactaremos pronto con los detalles del evento.',
      });

      form.reset();
      idFileData = '';
      idFileName = '';
      idFileType = '';
      paymentFileData = '';
      paymentFileName = '';
      paymentFileType = '';
      document.getElementById('file-preview')?.classList.add('hidden');
      document.getElementById('payment-preview')?.classList.add('hidden');
      document.getElementById('age-display')?.classList.add('hidden');
      const container = document.getElementById('categoria-container');
      if (container) {
        container.classList.add('opacity-60', 'pointer-events-none');
        container.innerHTML = '<p class="text-sm text-gray-light">Primero ingresa tu fecha de nacimiento</p>';
      }
      if (eventSelect?.value) await refreshPilotSelect(eventSelect.value);
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err instanceof Error ? err.message : 'No se pudo enviar la inscripción.',
      });
    }
  });
}

export async function initRegistrationPage(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    ${renderNavbar('inscripcion')}
    <main class="mx-auto max-w-3xl px-4 py-12">
      <div class="mb-8 text-center">
        <h1 class="section-title mb-4">Inscripción de Piloto</h1>
        <p class="text-gray-light">Completa el formulario para registrarte en el campeonato Minicross Colombia 2026.</p>
      </div>
      <div class="card animate-fade-in-up" id="registration-card">
        ${renderLoadingPanel()}
      </div>
    </main>
    <footer class="border-t border-secondary/20 bg-dark py-8 mt-8">
      <div class="mx-auto max-w-7xl px-4 text-center text-sm text-gray-light">
        <p>Minicross Colombia 2026</p>
      </div>
    </footer>
  `;

  initNavbar();

  const card = document.getElementById('registration-card');
  if (!card) return;

  try {
    const events = (await loadEvents()).filter((e) => e.active);
    const eventIdFromUrl = getEventIdFromUrl();
    const initialEventId =
      eventIdFromUrl && events.some((e) => e.id === eventIdFromUrl)
        ? eventIdFromUrl
        : events[0]?.id ?? null;

    const initialPilots = initialEventId ? await getAvailablePilotNumbers(initialEventId) : [];

    card.innerHTML =
      events.length === 0
        ? '<p class="text-center text-gray-light py-8">No hay eventos abiertos para inscripción.</p>'
        : renderForm(events, initialEventId, initialPilots);

    bindRegistrationForm(events);
  } catch {
    card.innerHTML =
      '<p class="text-center text-red-400 py-8">No se pudieron cargar los datos. Recarga la pagina e intenta de nuevo.</p>';
  }
}
