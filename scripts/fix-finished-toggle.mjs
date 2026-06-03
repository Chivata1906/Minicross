import fs from 'fs';

const path = 'src/pages/admin.ts';
let s = fs.readFileSync(path, 'utf8');

if (s.includes(".event-finished-toggle').forEach")) {
  console.log('already has listener');
  process.exit(0);
}

const block = `  document.querySelectorAll('.event-finished-toggle').forEach((toggle) => {
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

`;

const needle = `  const eventForm = document.getElementById('event-form') as HTMLFormElement;
  document.getElementById('add-event-btn')`;

if (!s.includes(needle)) {
  console.error('needle not found');
  process.exit(1);
}

s = s.replace(needle, block + needle);
fs.writeFileSync(path, s, 'utf8');
console.log('added finished toggle listener');
