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

## Estructura de la hoja Registrations

| Columna | Descripcion |
|---------|-------------|
| id | UUID unico |
| eventId | ID del evento |
| nombre / apellido | Datos del piloto |
| identificacion | Numero de cedula |
| identificacionArchivo | URL del documento en Drive |
| fechaNacimiento / edad | Fecha y edad calculada |
| email / celular / ciudad | Contacto |
| marcaMoto | Marca de la moto |
| numeroPiloto | Numero del 4 al 999 |
| categoriaId / categoriaLabel | Categoria asignada |

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
