import fs from 'fs';

const typesPath = 'src/types/index.ts';
let types = fs.readFileSync(typesPath, 'utf8');
if (!types.includes('eventName')) {
  types = types.replace(
    `export interface Registration {
  id: string;
  eventId: string;`,
    `export interface Registration {
  id: string;
  eventId: string;
  eventName?: string;`
  );
  fs.writeFileSync(typesPath, types, 'utf8');
  console.log('types updated');
}

const storagePath = 'src/utils/storage.ts';
let storage = fs.readFileSync(storagePath, 'utf8');
if (!storage.includes('eventName:')) {
  storage = storage.replace(
    `    eventId: String(raw.eventId ?? ''),
    nombre: String(raw.nombre ?? ''),`,
    `    eventId: String(raw.eventId ?? ''),
    eventName: String(raw.eventName ?? ''),
    nombre: String(raw.nombre ?? ''),`
  );
  storage = storage.replace(
    `    comprobantePagoArchivo: String(raw.comprobantePagoArchivo ?? ''),`,
    `    comprobantePagoArchivo: String(raw.comprobantePagoArchivo ?? raw.comprobantePagoUrl ?? ''),`
  );
  fs.writeFileSync(storagePath, storage, 'utf8');
  console.log('storage updated');
}
