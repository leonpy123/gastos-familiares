# Gastos Familiares

App web instalable (PWA) para registrar los ingresos y gastos de la familia, con dashboard, dictado por voz y una planilla de Google Sheets que se mantiene al día sola.

- **Front + servidor:** Nuxt 4 (Vue 3), publicado en Vercel.
- **Base de datos y login:** Supabase (PostgreSQL + login con Google).
- **Planilla:** Google Sheets, escrita con una cuenta de servicio.

Diseño: `docs/superpowers/specs/2026-11-19-gastos-familiares-design.md`

---

## Desarrollo local

Requisitos: Node 22+, Docker Desktop abierto.

```bash
npm install
npx supabase start          # levanta Supabase local (la primera vez descarga imágenes)
npx supabase db reset       # aplica la migración y la semilla
cp .env.example .env        # completar con los datos que imprime "supabase start"
npm run dev                 # http://localhost:3000
```

En `.env` local: `SUPABASE_URL=http://127.0.0.1:54321`, `SUPABASE_KEY` = ANON_KEY, `SUPABASE_SECRET_KEY` = SERVICE_ROLE_KEY.

Pruebas:

```bash
npm test          # lógica (montos, RUC, fechas, dictado, planilla, API)
npm run test:db   # reglas de la base (pgTAP; requiere Supabase local)
```

Para probar las APIs sin Google: `node --env-file=.env scripts/sesion-local.mjs correo@example.com` imprime una cookie de sesión del Supabase local (solo funciona contra 127.0.0.1).

---

## Puesta en marcha (una sola vez)

### 1. Supabase

1. Crear un proyecto en <https://supabase.com> (plan gratuito). Región sugerida: São Paulo.
2. Subir el esquema:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-del-proyecto>
   npx supabase db push
   ```
3. En **Project Settings → API** copiar: URL del proyecto, *publishable/anon key* y *secret/service_role key*.

> El plan gratuito **pausa el proyecto tras ~1 semana sin uso**. Con uso diario no pasa; si ocurre, se reactiva desde el panel.

### 2. Login con Google

1. En <https://console.cloud.google.com> crear un proyecto.
2. **APIs y servicios → Pantalla de consentimiento OAuth**: tipo *Externo*, nombre "Gastos Familiares". Mientras esté en modo *Prueba*, agregar como usuarios de prueba los emails de la familia (o publicarla).
3. **Credenciales → Crear ID de cliente OAuth → Aplicación web**. En *URI de redireccionamiento autorizados* poner la callback de Supabase: `https://<ref-del-proyecto>.supabase.co/auth/v1/callback`.
4. En Supabase: **Authentication → Providers → Google**: activar y pegar *Client ID* y *Client Secret*.
5. En Supabase: **Authentication → URL Configuration**: *Site URL* = `https://<tu-app>.vercel.app` y en *Redirect URLs* agregar `https://<tu-app>.vercel.app/confirmar`.

### 3. Planilla de Google Sheets

1. En el mismo proyecto de Google Cloud: **APIs y servicios → Biblioteca → Google Sheets API → Habilitar**.
2. **Credenciales → Crear cuenta de servicio** (sin roles). Entrar a la cuenta → **Claves → Agregar clave → JSON**. Del archivo descargado se usan `client_email` y `private_key`.
3. Crear una planilla nueva en Google Drive. **Compartir** con el `client_email` de la cuenta de servicio como **Editor**, y con los miembros de la familia como **Lector**.
4. El ID de la planilla es la parte de la URL entre `/d/` y `/edit`.

Prueba rápida (con esas tres variables en `.env`): `npx tsx --env-file=.env scripts/probar-sheets.ts` debería escribir una fila de ejemplo en la hoja *Gastos*.

### 4. Vercel

1. Subir este repositorio a GitHub e importarlo en <https://vercel.com> (plan Hobby). Vercel detecta Nuxt solo.
2. En **Settings → Environment Variables** cargar:

   | Variable | Valor |
   |---|---|
   | `SUPABASE_URL` | URL del proyecto Supabase |
   | `SUPABASE_KEY` | publishable / anon key |
   | `SUPABASE_SECRET_KEY` | secret / service_role key |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` del JSON |
   | `GOOGLE_PRIVATE_KEY` | `private_key` del JSON (tal cual, con los `\n`) |
   | `GOOGLE_SHEET_ID` | ID de la planilla |
   | `CRON_SECRET` | una cadena larga al azar |
   | `ADMIN_INICIAL_EMAIL` | tu email de Google (serás el primer administrador) |

3. Desplegar. Cada `git push` publica una versión nueva.
4. El archivo `vercel.json` programa la resincronización diaria de la planilla (06:00 de Asunción).

### 5. Primer uso

1. Entrar a la app con la cuenta de `ADMIN_INICIAL_EMAIL`: queda registrada como administradora.
2. **Admin → Miembros**: agregar los emails de Google de la familia.
3. **Admin → Tipos**: revisar tipos y palabras clave del dictado.
4. **Admin → General → Resincronizar planilla**: confirma que la planilla responde.

---

## Instalar en el celular

- **Android (Chrome):** abrir la app → menú ⋮ → **Instalar app** (o "Agregar a la pantalla principal").
- **iPhone (Safari):** abrir la app → botón **Compartir** → **Agregar a inicio**.

## Dictado

Formato (la palabra separadora se cambia en Admin → General):

```
gasto   tab fecha tab tipo tab concepto tab proveedor tab RUC tab monto
ingreso tab fecha tab tipo tab concepto tab pagador   tab RUC tab monto
```

Ejemplo: *gasto tab hoy tab hogar tab almuerzo mediodía tab supermas tab 8002147 tab 8.000*

- Fecha: "hoy", "ayer", "18/11/2026", "18 de noviembre" o "dieciocho de noviembre".
- RUC sin dígito verificador (la app lo calcula), en números o en palabras por grupos ("ocho cero cero veintiuno cuarenta y siete").
- Monto: "8.000", "8000", "8 mil", "ocho mil", "un millón quinientos mil".
- Si el micrófono no reconoce "tab", cambiar el separador en Admin → General por una palabra en español, por ejemplo "siguiente".
- En Android se usa el botón 🎤; en iPhone, el micrófono del teclado.
- Siempre se revisa el formulario antes de guardar. Un comprobante guardado no se edita: el administrador lo elimina y se carga de nuevo.
