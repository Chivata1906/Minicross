# Configurar Google Sheets como backend en tiempo real

Con esta configuracion, las inscripciones se guardan directamente en una Google Sheet, los documentos de identidad van a Google Drive, y los numeros de piloto se validan en tiempo real contra la hoja.

## Paso 1 — Crear la Google Sheet

1. Ve a [Google Sheets](https://sheets.google.com) y crea una hoja nueva.
2. Nombra el archivo: **Minicross Inscripciones 2026**
3. Copia el **ID de la hoja** desde la URL:
   ```
   https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
   ```

## Paso 2 — Crear carpeta en Google Drive para documentos

1. Ve a [Google Drive](https://drive.google.com) y crea una carpeta: **Minicross Documentos ID**
2. Abre la carpeta y copia el **ID** desde la URL:
   ```
   https://drive.google.com/drive/folders/ESTE_ES_EL_ID
   ```

## Paso 3 — Instalar el Apps Script

1. En la Google Sheet: **Extensiones → Apps Script**
2. Borra el contenido default y pega todo el codigo de `docs/google-apps-script.gs`
3. Reemplaza en las lineas 10-11:
   ```javascript
   const SPREADSHEET_ID = 'tu-id-de-la-sheet';//1g5crmfmbcxyvmLMXxYECxO90gFYiXf7P5JaSze7pmbI
   const DRIVE_FOLDER_ID = 'tu-id-de-la-carpeta-drive';//1oImoS0x__kgBBXaL9HAg3Qf-4Zj0Xz0l
   ```
4. Guarda el proyecto (Ctrl+S)
5. En el selector de funciones (arriba), elige **`setupSheets`** — NO elijas `doGet` ni `doPost`
6. Clic en **Ejecutar** y autoriza los permisos (Sheets + Drive)
7. Revisa tu Google Sheet: deben aparecer las pestanas `Events` y `Registrations`

> **Nota:** Si ejecutas `doGet` desde el editor veras un error o respuesta vacia. Esa funcion solo funciona cuando la Web App recibe peticiones HTTP desde la pagina web.

## Paso 4 — Desplegar como Web App

1. En Apps Script: **Implementar → Nueva implementacion**
2. Tipo: **Aplicacion web**
3. Ejecutar como: **Yo**
4. Quien tiene acceso: **Cualquier persona**
5. Clic en **Implementar**
6. Copia la URL que termina en `/exec`

## Paso 5 — Conectar la pagina web

Abre `src/config.ts` y pega la URL:
idimplementación: AKfycbzOsYJzbNYJ7DUPTTJ4lp2x5svHEkFXOKvTruZV1X_JvsrukeBdfEWkcoe4WnYXN6Ck
```typescript
apiUrl: 'https://script.google.com/macros/s/AKfycb.../exec',//https://script.google.com/macros/s/AKfycbzOsYJzbNYJ7DUPTTJ4lp2x5svHEkFXOKvTruZV1X_JvsrukeBdfEWkcoe4WnYXN6Ck/exec
```

Reconstruye y despliega:

```bash
npm run build
```

## Como funciona

| Accion | Que pasa |
|--------|----------|
| Piloto elige numero | La web consulta Google Sheets en tiempo real |
| Piloto envia formulario | Datos + documento van a Sheets/Drive al instante |
| Admin abre panel oculto | Ve inscripciones directo desde Sheets |
| Admin edita/elimina | Cambios se reflejan en Sheets al momento |

## Estructura de la hoja Events

| Columna | Descripcion |
|---------|-------------|
| id | UUID unico |
| name | Nombre del evento |
| date | Fecha (YYYY-MM-DD) |
| location / city | Ubicacion |
| description | Descripcion |
| active | Habilitado para inscripciones (true/false) |
| reglamentoUrl | URL del PDF del reglamento en Drive |
| finished | Evento finalizado; habilita boton Ver resultados (true/false) |
| valorInscripcion | Valor de inscripcion por categoria (COP, numero) |

Si agregaste columnas manualmente, ejecuta **repairEventsSheet** o **repairAllSheets** en Apps Script (deben aparecer en el selector de funciones tras pegar el script actualizado).

> **Importante:** Las funciones `repair*` crean una **copia de seguridad** de la hoja (`BACKUP_Registrations_...`) antes de remapear columnas. El uso normal del sitio **solo agrega columnas nuevas** al final y **no borra inscripciones**. Ejecuta `repair*` solo si las columnas estan cruzadas/desordenadas.

## Estructura de la hoja Registrations

| Columna | Descripcion |
|---------|-------------|
| id | UUID unico |
| eventId | ID interno del evento |
| eventName | Nombre del evento (para filtrar en la hoja) |
| nombre / apellido | Datos del piloto |
| identificacion | Numero de cedula |
| identificacionArchivo | URL del documento de identidad en Drive |
| comprobantePagoUrl | URL del comprobante de pago en Drive |
| fechaNacimiento / edad | Fecha y edad calculada |
| email / celular / ciudad | Contacto |
| marcaMoto | Marca de la moto |
| numeroPiloto | Numero del 4 al 999 |
| categoriaId / categoriaLabel | Categoria asignada |
| valorTotalInscripcion | Total pagado (valorInscripcion × cantidad de categorias) |

### Reparar columnas cruzadas

Si agregaste columnas manualmente en Sheets o los datos quedaron desalineados tras actualizar el script:

1. Copia el contenido actualizado de `docs/google-apps-script.gs` en el editor de Apps Script.
2. **Implementar** una nueva version del Web App (Implementar > Gestionar implementaciones > Editar > Nueva version).
3. En Apps Script, ejecuta **`repairAllSheets`** (repara Events y Registrations) o **`repairRegistrationsSheet`** solo para inscripciones. Autoriza si lo pide.
4. Revisa la hoja `Registrations`: la fila 1 debe coincidir exactamente con el orden de columnas del script.

El script reordena las filas existentes por **nombre de columna**, migra `comprobantePagoArchivo` a `comprobantePagoUrl` y rellena `eventName` automaticamente.

## Probar la conexion

Abre en el navegador (reemplaza con tu URL):

```
https://script.google.com/macros/s/TU_ID/exec?action=events
```

Deberias ver un JSON con los eventos.

Para probar disponibilidad de numero:

```
https://script.google.com/macros/s/TU_ID/exec?action=checkPilot&eventId=evt-001&numero=42
```

Respuesta: `{"available":true}`

## Notas importantes

- **Gratis**: Google Sheets + Apps Script no tienen costo para este volumen de datos.
- **Limites**: Apps Script permite ~20.000 peticiones/dia (mas que suficiente).
- **Documentos**: Los PDF/fotos se guardan en Drive, no en la celda (evita limites de tamano).
- **Seguridad**: La URL del script es publica pero solo accede a TU hoja. Cambia la contrasena del panel admin en `config.ts`.
- **Sin export manual**: Ya no necesitas exportar/importar JSON. El panel admin lee y escribe directo en Sheets.
