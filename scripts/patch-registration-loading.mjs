import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src/pages/registration.ts');
const buf = fs.readFileSync(file);
const src =
  buf[0] === 0xff && buf[1] === 0xfe
    ? buf.toString('utf16le').slice(1)
    : buf[0] === 0x69 && buf[1] === 0x00
      ? buf.toString('utf16le')
      : buf.toString('utf8');

function findFunctionEnd(code, startIdx) {
  let depth = 0;
  let started = false;
  for (let i = startIdx; i < code.length; i++) {
    const ch = code[i];
    if (ch === '{') {
      depth++;
      started = true;
    } else if (ch === '}') {
      depth--;
      if (started && depth === 0) return i + 1;
    }
  }
  return -1;
}

if (src.includes('registration-card')) {
  console.log('Already patched');
  process.exit(0);
}

const bindFn = `function bindRegistrationForm(events: Event[]): void {
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
        title: 'Categorias',
        text: 'Selecciona al menos una categoria valida para tu edad.',
      });
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
      title: 'Enviando inscripcion...',
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
        title: 'Inscripcion enviada',
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
        text: err instanceof Error ? err.message : 'No se pudo enviar la inscripcion.',
      });
    }
  });
}

`;

const newInit = `export async function initRegistrationPage(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = \`
    \${renderNavbar('inscripcion')}
    <main class="mx-auto max-w-3xl px-4 py-12">
      <div class="mb-8 text-center">
        <h1 class="section-title mb-4">Inscripcion de Piloto</h1>
        <p class="text-gray-light">Completa el formulario para registrarte en el campeonato Minicross Colombia 2026.</p>
      </div>
      <div class="card animate-fade-in-up" id="registration-card">
        \${renderLoadingPanel()}
      </div>
    </main>
    <footer class="border-t border-secondary/20 bg-dark py-8 mt-8">
      <div class="mx-auto max-w-7xl px-4 text-center text-sm text-gray-light">
        <p>Minicross Colombia 2026</p>
      </div>
    </footer>
  \`;

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
        ? '<p class="text-center text-gray-light py-8">No hay eventos abiertos para inscripcion.</p>'
        : renderForm(events, initialEventId, initialPilots);

    bindRegistrationForm(events);
  } catch {
    card.innerHTML =
      '<p class="text-center text-red-400 py-8">No se pudieron cargar los datos. Recarga la pagina e intenta de nuevo.</p>';
  }
}
`;

const marker = 'export async function initRegistrationPage(): Promise<void> {';
let start = src.indexOf(marker);
if (start === -1) {
  console.error('initRegistrationPage not found');
  process.exit(1);
}

// Remove broken partial bindRegistrationForm from failed edit
const partial = 'function bindRegistrationForm(events: Event[]): void {';
const partialIdx = src.indexOf(partial);
if (partialIdx !== -1 && partialIdx < start) {
  start = src.indexOf(marker, partialIdx + partial.length);
}

const end = findFunctionEnd(src, start);
if (end === -1) {
  console.error('could not find function end');
  process.exit(1);
}

const patched = src.slice(0, start) + bindFn + newInit + src.slice(end);
fs.writeFileSync(file, patched, 'utf8');
console.log('Patched registration.ts (UTF-8)');
