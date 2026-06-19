import { CONFIG } from '../config';
import { renderFooter } from '../components/footer';
import { renderNavbar, initNavbar } from '../components/navbar';
import {
  createRegistration,
  loadEvents,
  getAvailablePilotNumbers,
  readFileAsDataUrl,
} from '../utils/storage';
import { calculateCategoryAge, formatDate } from '../utils/age';
import { getCategoriesForAge, formatCategoryOptionLabel, type Event } from '../types';
import { formatCop } from '../utils/registration-total';
import Swal from 'sweetalert2';

let idFileData = '';
let idFileName = '';
let idFileType = '';
let paymentFileData = '';
let paymentFileName = '';
let paymentFileType = '';

const TERMS_MODAL_HTML = `
  <div style="text-align:left;font-size:0.875rem;line-height:1.65;max-height:60vh;overflow-y:auto;padding:0 0.25rem;">
    <p style="margin:0 0 1rem;">Al completar el proceso de inscripción al Campeonato Junior Minicross 2026, el participante y su padre, madre o representante legal declaran haber leído y aceptado el reglamento oficial del campeonato.</p>
    <p style="margin:0 0 1rem;">El participante se compromete a cumplir las normas deportivas, técnicas y disciplinarias establecidas por la organización, así como a utilizar los elementos de seguridad obligatorios durante cada competencia.</p>
    <p style="margin:0 0 1rem;">El padre, madre o representante legal certifica que el menor se encuentra en condiciones físicas adecuadas para participar y asume la responsabilidad derivada de su participación en el evento.</p>
    <p style="margin:0 0 1rem;">La organización podrá realizar ajustes en horarios, cronogramas, sedes o actividades por motivos de seguridad, fuerza mayor o condiciones climáticas, informando oportunamente a los participantes.</p>
    <p style="margin:0 0 1rem;">Asimismo, el participante y su representante legal autorizan el uso de fotografías, videos y demás material audiovisual captado durante el campeonato para fines informativos, promocionales y publicitarios relacionados con Minicross 2026, sin que ello genere compensación económica.</p>
    <p style="margin:0 0 1rem;">La inscripción se considerará válida únicamente cuando se haya completado el registro, realizado el pago correspondiente y entregado la documentación requerida por la organización.</p>
    <p style="margin:0;font-weight:600;">Al marcar la casilla de aceptación y finalizar la inscripción, el participante y su representante legal aceptan estos términos y condiciones.</p>
  </div>`;

function showTermsModal(): void {
  void Swal.fire({
    title: 'Términos y Condiciones',
    html: TERMS_MODAL_HTML,
    confirmButtonText: 'Entendido',
    width: '42rem',
  });
}

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
        <span class="text-sm font-medium">${formatCategoryOptionLabel(c)}</span>
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
      </div>

      <div>
        <label class="block text-sm font-medium text-secondary mb-2">Categorias * (puedes elegir mas de una si aplica)</label>
        <div id="categoria-container" class="opacity-60 pointer-events-none">
          <p class="text-sm text-gray-light">Primero ingresa tu fecha de nacimiento</p>
        </div>
      </div>

      <div id="inscription-total" class="hidden rounded-xl border border-accent/30 bg-accent/10 p-5 space-y-4">
        <div class="space-y-2">
          <p class="text-sm text-gray-light">
            Valor por categoría: <span id="inscription-unit-price" class="text-secondary font-semibold">—</span>
          </p>
          <p class="font-title text-2xl tracking-wide text-accent">
            Total a pagar: <span id="inscription-total-amount">—</span>
          </p>
          <p class="text-xs text-gray-light">
            <span id="inscription-category-count">0</span> categoría(s) seleccionada(s)
          </p>
        </div>

        <div class="rounded-xl border border-secondary/25 bg-primary/60 p-4 space-y-3">
          <p class="text-sm font-semibold text-secondary uppercase tracking-wide">
            Datos para realizar el pago
          </p>
          <p class="text-xs text-gray-light">
            Transfiere el total indicado a la siguiente cuenta de ahorros y adjunta el comprobante más abajo.
          </p>
          <dl class="grid gap-2 sm:grid-cols-2 text-sm">
            <div class="rounded-lg border border-secondary/15 bg-primary/40 px-3 py-2.5">
              <dt class="text-xs text-gray-light mb-0.5">Titular</dt>
              <dd class="font-medium text-white">Cogua moto park sas</dd>
            </div>
            <div class="rounded-lg border border-secondary/15 bg-primary/40 px-3 py-2.5">
              <dt class="text-xs text-gray-light mb-0.5">NIT</dt>
              <dd class="font-medium text-white font-mono">90203908</dd>
            </div>
            <div class="rounded-lg border border-secondary/15 bg-primary/40 px-3 py-2.5">
              <dt class="text-xs text-gray-light mb-0.5">Banco</dt>
              <dd class="font-medium text-white">BBVA</dd>
            </div>
            <div class="rounded-lg border border-secondary/15 bg-primary/40 px-3 py-2.5">
              <dt class="text-xs text-gray-light mb-0.5">Tipo de cuenta</dt>
              <dd class="font-medium text-white">Ahorros</dd>
            </div>
            <div class="rounded-lg border border-secondary/15 bg-primary/40 px-3 py-2.5 sm:col-span-2">
              <dt class="text-xs text-gray-light mb-0.5">Número de cuenta</dt>
              <dd class="font-medium text-accent font-mono text-base tracking-wide">0180011666</dd>
            </div>
            <div class="rounded-lg border border-secondary/15 bg-primary/40 px-3 py-2.5 sm:col-span-2">
              <dt class="text-xs text-gray-light mb-0.5">Llave</dt>
              <dd class="font-medium text-accent font-mono text-base tracking-wide">0091823623</dd>
            </div>
          </dl>
        </div>
      </div>

      <div id="payment-section" class="hidden">
        <label class="block text-sm font-medium text-secondary mb-2" for="paymentFile">Comprobante de pago (foto o PDF, max. ${CONFIG.maxFileSizeMB} MB) *</label>
        <input type="file" id="paymentFile" accept="image/*,.pdf" required
               class="w-full rounded-xl border border-dashed border-secondary/40 bg-primary/40 px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:py-2 file:font-semibold file:text-primary" />
        <p id="payment-preview" class="mt-2 text-sm text-gray-light hidden"></p>
      </div>

      <div class="rounded-xl border border-secondary/20 bg-primary/40 p-4">
        <label class="flex items-start gap-3 cursor-pointer" for="acceptTerms">
          <input type="checkbox" id="acceptTerms" name="acceptTerms" required
                 class="accent-secondary mt-1 h-4 w-4 shrink-0" />
          <span class="text-sm text-gray-light leading-relaxed">
            Acepto los
            <button type="button" id="terms-modal-btn"
                    class="text-secondary underline underline-offset-2 hover:text-accent font-medium transition-colors">
              términos y condiciones
            </button>
          </span>
        </label>
      </div>

      <button type="submit" id="submit-registration"
              class="btn-primary w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent disabled:hover:shadow-none"
              disabled>
        Enviar inscripción
      </button>
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

function updateCategories(age: number, events: Event[]): void {
  const container = document.getElementById('categoria-container');
  const ageDisplay = document.getElementById('age-display');
  if (!container || !ageDisplay) return;

  if (age < 0) {
    ageDisplay.classList.add('hidden');
    container.classList.add('opacity-60', 'pointer-events-none');
    container.innerHTML = '<p class="text-sm text-gray-light">Fecha invalida</p>';
    return;
  }

  ageDisplay.textContent = `Edad al 1 de enero de ${CONFIG.championshipYear}: ${age} años`;
  ageDisplay.classList.remove('hidden');

  const categories = getCategoriesForAge(age);
  container.classList.toggle('opacity-60', categories.length === 0);
  container.classList.toggle('pointer-events-none', categories.length === 0);
  container.innerHTML = renderCategoryCheckboxes(age);
  updateInscriptionTotal(events);
}

function updateInscriptionTotal(events: Event[]): void {
  const eventSelect = document.getElementById('eventId') as HTMLSelectElement | null;
  const totalBlock = document.getElementById('inscription-total');
  const paymentSection = document.getElementById('payment-section');
  const unitPriceEl = document.getElementById('inscription-unit-price');
  const totalAmountEl = document.getElementById('inscription-total-amount');
  const countEl = document.getElementById('inscription-category-count');
  if (!eventSelect || !totalBlock || !paymentSection || !unitPriceEl || !totalAmountEl || !countEl) return;

  const event = events.find((e) => e.id === eventSelect.value);
  const selectedCount = getSelectedCategoryIds().length;
  const unitPrice = event?.valorInscripcion ?? 0;
  const total = unitPrice * selectedCount;

  if (selectedCount > 0 && event) {
    totalBlock.classList.remove('hidden');
    paymentSection.classList.remove('hidden');
    unitPriceEl.textContent = formatCop(unitPrice);
    totalAmountEl.textContent = formatCop(total);
    countEl.textContent = String(selectedCount);
  } else {
    totalBlock.classList.add('hidden');
    paymentSection.classList.add('hidden');
    unitPriceEl.textContent = '—';
    totalAmountEl.textContent = '—';
    countEl.textContent = '0';
  }
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
  const categoriaContainer = document.getElementById('categoria-container');
  const acceptTerms = document.getElementById('acceptTerms') as HTMLInputElement | null;
  const submitBtn = document.getElementById('submit-registration') as HTMLButtonElement | null;

  document.getElementById('terms-modal-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showTermsModal();
  });

  acceptTerms?.addEventListener('change', () => {
    if (submitBtn) submitBtn.disabled = !acceptTerms.checked;
  });

  eventSelect?.addEventListener('change', () => {
    if (eventSelect.value) void refreshPilotSelect(eventSelect.value);
    updateInscriptionTotal(events);
  });

  birthInput?.addEventListener('change', () => {
    if (birthInput.value) updateCategories(calculateCategoryAge(birthInput.value, CONFIG.championshipYear), events);
  });

  categoriaContainer?.addEventListener('change', (e) => {
    const target = e.target as HTMLElement;
    if (target instanceof HTMLInputElement && target.name === 'categoriaIds') {
      updateInscriptionTotal(events);
    }
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
    const edad = calculateCategoryAge(fechaNacimiento, CONFIG.championshipYear);
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

    if (!paymentFileData) {
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

    if (!acceptTerms?.checked) {
      await Swal.fire({
        icon: 'error',
        title: 'Términos y condiciones',
        text: 'Debes aceptar los términos y condiciones para enviar la inscripción.',
      });
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

      const eventId = fd.get('eventId') as string;
      const event = events.find((e) => e.id === eventId);
      const eventName = event?.name ?? 'el evento';
      const eventDate = event ? formatDate(event.date) : 'la fecha programada';

      await Swal.fire({
        icon: 'success',
        title: '¡Ya estás inscrito!',
        text: `Te esperamos en ${eventName} el ${eventDate}.`,
      });

      form.reset();
      if (acceptTerms) acceptTerms.checked = false;
      if (submitBtn) submitBtn.disabled = true;
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
      updateInscriptionTotal(events);
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
        <p class="text-gray-light">Completa el formulario para registrarte en el campeonato Minicross 2026.</p>
      </div>
      <div class="card animate-fade-in-up" id="registration-card">
        ${renderLoadingPanel()}
      </div>
    </main>
    ${renderFooter()}
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
