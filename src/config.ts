/**
 * Configuracion del sitio Minicross Colombia 2026
 *
 * PANEL: /panel-minicross-gestion-2026.html
 * Clave: minicross2026
 */
export const CONFIG = {
  adminPassword: 'minicross2026',

  apiUrl:
    'https://script.google.com/macros/s/AKfycbzOsYJzbNYJ7DUPTTJ4lp2x5svHEkFXOKvTruZV1X_JvsrukeBdfEWkcoe4WnYXN6Ck/exec' as string,

  /** Enlace directo a la Google Sheet (pestana Registrations) */
  spreadsheetUrl:
    'https://docs.google.com/spreadsheets/d/1g5crmfmbcxyvmLMXxYECxO90gFYiXf7P5JaSze7pmbI/edit' as string,

  storageKeys: {
    registrations: 'minicross_registrations_v1',
    events: 'minicross_events_v1',
    adminSession: 'minicross_admin_session',
  },
  maxFileSizeMB: 5,
};