/**
 * Configuracion del sitio Minicross Colombia 2026
 *
 * PANEL DE ADMINISTRACION (oculto):
 *   Ruta: /panel-minicross-gestion-2026.html
 *   Clave por defecto: minicross2026
 *
 * GOOGLE SHEETS (recomendado para inscripciones en tiempo real):
 *   1. Sigue la guia en docs/SETUP-GOOGLE-SHEETS.md
 *   2. Pega aqui la URL de la Web App desplegada
 */
export const CONFIG = {
  adminPassword: 'minicross2026',

  /** URL de la Web App de Google Apps Script. Dejar vacio = modo local (solo pruebas). */
  apiUrl: 'https://script.google.com/macros/s/AKfycbzOsYJzbNYJ7DUPTTJ4lp2x5svHEkFXOKvTruZV1X_JvsrukeBdfEWkcoe4WnYXN6Ck/exec' as string,

  storageKeys: {
    registrations: 'minicross_registrations_v1',
    events: 'minicross_events_v1',
    adminSession: 'minicross_admin_session',
  },
  maxFileSizeMB: 5,
};
