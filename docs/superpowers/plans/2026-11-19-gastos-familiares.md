# Gastos Familiares — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA familiar para registrar ingresos y gastos (formulario y dictado), con dashboard, comprobantes inmutables, eliminación solo por admin y espejo automático en Google Sheets.

**Architecture:** Un solo proyecto Nuxt desplegado en Vercel: páginas Vue (PWA) + rutas de servidor en `server/api/`. Supabase aporta PostgreSQL y login con Google; las reglas (todos leen, todos insertan, nadie edita, solo admin elimina) viven en la base con RLS, triggers y una función `SECURITY DEFINER`. La planilla es un espejo: cada guardado/eliminación, el cron diario y el botón del admin la **reescriben completa** desde la base.

**Tech Stack:** Nuxt 4 (Vue 3, TypeScript), `@nuxtjs/supabase`, `@vite-pwa/nuxt`, `googleapis` (Sheets v4), Vitest, Supabase CLI + pgTAP, Vercel (Hobby) con Vercel Cron.

**Spec:** `docs/superpowers/specs/2026-11-19-gastos-familiares-design.md`

## Global Constraints

- Idioma de toda la UI y mensajes de error: español.
- Moneda: guaraníes, enteros > 0, sin decimales; formato de pantalla `Gs. 12.000.000`.
- Fechas: se guardan `YYYY-MM-DD`; se muestran `dd/mm/aaaa`; "hoy"/"ayer" según zona `America/Asuncion`.
- RUC: se ingresa sin dígito verificador, 5 a 9 dígitos; DV módulo 11 (base máx. 11); se muestra `8002147-6`.
- Campos obligatorios en ingreso y gasto: fecha, tipo, concepto, contraparte (proveedor/pagador), RUC, monto.
- Tipo debe existir, estar activo y ser de la misma clase; si no, **rechazo**.
- Separadores de dictado configurables por el admin; por defecto `["tab", "tap"]`; la coma siempre separa.
- Comprobante guardado: **nunca** se edita; solo eliminación lógica por admin (quién, cuándo, motivo opcional). Sin borrado físico.
- Acceso solo para emails en `miembros` (activos), comparación sin distinguir mayúsculas.
- Primer admin: variable de entorno `ADMIN_INICIAL_EMAIL`.
- Secretos (service key de Supabase, clave de la cuenta de servicio de Google, `CRON_SECRET`) solo en el servidor.
- Costo cero: planes gratuitos de Supabase y Vercel Hobby (cron máximo 1 vez/día). Sin servicios pagos.
- Nuxt 4 en lugar del Nuxt 3 que nombra la spec: Nuxt 3 ya no tiene soporte a esta fecha; la diferencia es la carpeta `app/`. *(Decisión del plan.)*
- Planilla: reescritura completa en cada sincronización en lugar de agregar/quitar filas sueltas; mismo resultado visible, imposible que quede desfasada. *(Decisión del plan.)*
- Commits terminan con: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

1. **Texto real del reconocedor de voz**: iOS pone mayúscula inicial, "Tab" con mayúscula y punto final ("… tab 8.000."); se espera que se interprete igual. → test en Task 5.
2. **Mes con gastos y sin ingresos**: el % gastos/ingresos debe ser `null` y mostrarse "—", nunca `Infinity`/`NaN`. → test en Task 12.
3. **Email con mayúsculas** en la cuenta de Google (`Juan@Gmail.com`) frente al registrado en minúsculas: debe entrar. → tests en Task 6 y Task 7.
4. **Doble toque en Guardar** (o reintento por red lenta): debe quedar un solo comprobante. → test en Task 9.
5. **"hoy" de noche**: a las 22:30 en Asunción ya es el día siguiente en UTC; la fecha debe ser la de Asunción. → test en Task 3.

---

## Estructura de archivos

```
gastos-familiares/
├─ nuxt.config.ts · vitest.config.ts · vercel.json · package.json · .env.example · README.md
├─ shared/
│  ├─ types.ts            # Clase, Tipo, BorradorComprobante, ComprobanteDetalle, Resumen
│  └─ utils/
│     ├─ montos.ts        # parsearMonto, formatearGs
│     ├─ ruc.ts           # normalizarRuc, calcularDV, formatearRuc
│     ├─ fechas.ts        # hoyEnAsuncion, parsearFecha, formatearFecha
│     ├─ texto.ts         # normalizar (minúsculas, sin tildes, trim)
│     ├─ validacion.ts    # validarComprobante
│     ├─ dictado.ts       # resolverTipo, parsearDictado
│     └─ resumen.ts       # calcularResumen
├─ server/
│  ├─ utils/
│  │  ├─ supabase-admin.ts   # cliente service role
│  │  ├─ auth.ts             # asegurarAdminInicial, requerirMiembro, requerirAdmin
│  │  ├─ planilla.ts         # construirFilas, reconciliarPlanilla (puro + deps)
│  │  ├─ sheets-google.ts    # implementación SheetsApi con googleapis
│  │  ├─ repo-supabase.ts    # implementaciones de repositorios
│  │  └─ crear-comprobante.ts
│  └─ api/
│     ├─ yo.get.ts
│     ├─ comprobantes.post.ts
│     ├─ comprobantes/[id].delete.ts
│     ├─ planilla/sincronizar.post.ts
│     └─ cron/reconciliar.get.ts
├─ app/
│  ├─ app.vue · middleware/auth.global.ts
│  ├─ composables/ useMiembro.ts · useReconocimientoVoz.ts · useTipos.ts
│  └─ pages/ login.vue · no-autorizado.vue · index.vue · nuevo.vue · comprobantes.vue
│            admin/miembros.vue · admin/tipos.vue · admin/configuracion.vue · admin/eliminados.vue
├─ public/ icon-192.png · icon-512.png · apple-touch-icon.png
├─ supabase/
│  ├─ migrations/20261119000000_esquema.sql
│  ├─ seed.sql
│  └─ tests/ rls.test.sql · inmutabilidad.test.sql
└─ test/unit/ *.test.ts
```

## Tipos compartidos (`shared/types.ts`, creado en Task 1, usado por todos)

```ts
export type Clase = 'ingreso' | 'gasto'
export interface Tipo { id: string; clase: Clase; nombre: string; palabras_clave: string[]; activo: boolean }
export interface BorradorComprobante {
  id: string            // UUID generado en el cliente al abrir el formulario (idempotencia)
  clase: Clase
  fecha: string         // 'YYYY-MM-DD'
  tipoId: string
  concepto: string
  contraparte: string   // proveedor (gasto) o pagador (ingreso)
  ruc: string           // base sin DV, solo dígitos
  monto: number
}
export interface ComprobanteDetalle extends BorradorComprobante {
  rucDv: number; tipoNombre: string; creadoPorNombre: string; creadoEn: string
}
export interface ItemResumen { tipoId: string; nombre: string; monto: number; pct: number }
export interface Resumen {
  totalIngresos: number; totalGastos: number; saldo: number
  pctGastosSobreIngresos: number | null
  gastosPorTipo: ItemResumen[]; ingresosPorTipo: ItemResumen[]
}
```

---

### Task 1: Proyecto base y montos

**Files:**
- Create: proyecto Nuxt en `C:\BCKP\PROYECTOS\gastos-familiares` (conservar `docs/`), `vitest.config.ts`, `shared/types.ts`, `shared/utils/texto.ts`, `shared/utils/montos.ts`, `.gitignore`, `.env.example`
- Test: `test/unit/montos.test.ts`

**Interfaces:**
- Produces: `normalizar(s: string): string` (minúsculas, sin tildes, espacios colapsados, trim); `parsearMonto(texto: string): number | null`; `formatearGs(n: number): string`; tipos de `shared/types.ts`.

- [ ] **Step 1:** `git init`, `npx nuxi@latest init .` (TypeScript, npm), instalar `vitest` como dev. `vitest.config.ts` con `environment: 'node'`, `include: ['test/unit/**/*.test.ts']`. Script `"test": "vitest run"`. `.env.example` con: `SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_KEY, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID, CRON_SECRET, ADMIN_INICIAL_EMAIL`.
- [ ] **Step 2: Escribir el test que falla**

```ts
describe('parsearMonto', () => {
  it.each([
    ['8.000', 8000], ['12.000.000', 12000000], ['8000', 8000], ['8 000', 8000],
    ['8 mil', 8000], ['12 millones', 12000000], ['1 millón', 1000000],
    ['Gs. 8.000', 8000], ['₲ 8.000', 8000], ['8.000.', 8000],
  ])('%s → %d', (t, n) => expect(parsearMonto(t)).toBe(n))
  it.each(['0', 'abc', '8,50', '8.5', '', '-500'])('rechaza %s', t => expect(parsearMonto(t)).toBeNull())
})
describe('formatearGs', () => {
  it('usa punto de miles', () => expect(formatearGs(12000000)).toBe('Gs. 12.000.000'))
  it('montos chicos', () => expect(formatearGs(500)).toBe('Gs. 500'))
})
describe('normalizar', () => {
  it('quita tildes y mayúsculas', () => expect(normalizar('  Préstamos  ')).toBe('prestamos'))
})
```

- [ ] **Step 3:** `npm test` → FAIL (módulos inexistentes).
- [ ] **Step 4:** Implementar. Reglas de `parsearMonto`: quitar `gs`, `gs.`, `₲`, punto final y espacios de borde; aceptar `^\d+$`, `^\d{1,3}(\.\d{3})+$`, `^\d{1,3}( \d{3})+$`, `^(\d+)\s*mil$` (×1.000), `^(\d+)\s*(millon|millones)$` sobre texto normalizado (×1.000.000); resultado > 0, si no `null`. `formatearGs` con regex propia (no depender del ICU).
- [ ] **Step 5:** `npm test` → PASS. `npm run dev` levanta la página por defecto.
- [ ] **Step 6:** Commit `feat: proyecto base y utilidades de montos` (incluye `docs/`).

### Task 2: RUC

**Files:** Create `shared/utils/ruc.ts` · Test `test/unit/ruc.test.ts`

**Interfaces:**
- Produces: `normalizarRuc(texto: string): string | null`; `calcularDV(base: string): number`; `formatearRuc(base: string): string`.

- [ ] **Step 1: Test que falla**

```ts
it('DV de 8002147 es 6', () => expect(calcularDV('8002147')).toBe(6))
it('DV de 80012457 es 0 (resto ≤ 1)', () => expect(calcularDV('80012457')).toBe(0))
it('DV de 1234567 es 9', () => expect(calcularDV('1234567')).toBe(9))
it('formatea', () => expect(formatearRuc('8002147')).toBe('8002147-6'))
it.each([['8002147', '8002147'], ['8 002 147', '8002147'], ['8.002.147', '8002147'], ['8002147-6', '8002147']])
  ('normaliza %s', (t, r) => expect(normalizarRuc(t)).toBe(r))
it.each(['1234', '1234567890', 'abc', ''])('rechaza %s', t => expect(normalizarRuc(t)).toBeNull())
```

- [ ] **Step 2:** `npm test -- ruc` → FAIL.
- [ ] **Step 3:** Implementar `calcularDV` (algoritmo DNIT, base máx. 11):

```ts
let total = 0, k = 2
for (const d of [...base].reverse()) { if (k > 11) k = 2; total += Number(d) * k++ }
const resto = total % 11
return resto > 1 ? 11 - resto : 0
```

`normalizarRuc`: si tiene `-` toma lo de antes; deja solo dígitos; longitud 5–9.
- [ ] **Step 4:** Verificar manualmente un RUC real en la consulta pública de RUC de la DNIT y agregarlo como test. `npm test -- ruc` → PASS.
- [ ] **Step 5:** Commit `feat: RUC con dígito verificador`.

### Task 3: Fechas

**Files:** Create `shared/utils/fechas.ts` · Test `test/unit/fechas.test.ts`

**Interfaces:**
- Produces: `hoyEnAsuncion(ahora: Date): string` ('YYYY-MM-DD'); `parsearFecha(texto: string, ahora: Date): string | null`; `formatearFecha(iso: string): string` ('dd/mm/aaaa').

- [ ] **Step 1: Test que falla**

```ts
const ahora = new Date('2026-11-19T15:00:00Z')
it.each([
  ['hoy', '2026-11-19'], ['Hoy', '2026-11-19'], ['ayer', '2026-11-18'],
  ['18/11/2026', '2026-11-18'], ['8/1/2026', '2026-01-08'],
  ['18 de noviembre', '2026-11-18'], ['18 de noviembre de 2026', '2026-11-18'],
  ['18 de noviembre del 2025', '2025-11-18'],
])('%s', (t, r) => expect(parsearFecha(t, ahora)).toBe(r))
it.each(['31/02/2026', 'mañana temprano', '', '18/13/2026'])('rechaza %s', t => expect(parsearFecha(t, ahora)).toBeNull())
it('"hoy" de noche usa la fecha de Asunción', () =>
  expect(parsearFecha('hoy', new Date('2026-11-20T01:30:00Z'))).toBe('2026-11-19'))
it('formatea', () => expect(formatearFecha('2026-11-08')).toBe('08/11/2026'))
```

- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar. `hoyEnAsuncion` con `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion' })`. "ayer" restando un día a esa fecha calendario (no a milisegundos). Meses en español sobre texto `normalizar`-ado; año ausente = año actual de Asunción; validar fecha real.
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: interpretación de fechas`.

### Task 4: Validación de comprobantes

**Files:** Create `shared/utils/validacion.ts` · Test `test/unit/validacion.test.ts`

**Interfaces:**
- Consumes: `normalizarRuc` (Task 2), tipos.
- Produces: `validarComprobante(b: BorradorComprobante, tipos: Tipo[]): string[]` (vacío = válido). La usan el formulario (Task 11) y el servidor (Task 9).

- [ ] **Step 1: Test que falla** (fixture `tipos` con `Gastos hogar` gasto activo, `Viejo` gasto inactivo, `Sueldos` ingreso; `base` válido de gasto):

```ts
it('válido', () => expect(validarComprobante(base, tipos)).toEqual([]))
it('tipo inexistente', () => expect(validarComprobante({ ...base, tipoId: 'x' }, tipos)).toContain('El tipo no está registrado.'))
it('tipo inactivo', () => expect(validarComprobante({ ...base, tipoId: idViejo }, tipos)).toContain('El tipo no está registrado.'))
it('tipo de otra clase', () => expect(validarComprobante({ ...base, tipoId: idSueldos }, tipos)).toContain('El tipo no corresponde a un gasto.'))
it('concepto vacío', () => expect(validarComprobante({ ...base, concepto: '  ' }, tipos)).toContain('Falta el concepto.'))
it('proveedor vacío en gasto', () => expect(validarComprobante({ ...base, contraparte: '' }, tipos)).toContain('Falta el proveedor.'))
it('pagador vacío en ingreso', () => expect(validarComprobante({ ...baseIngreso, contraparte: '' }, tipos)).toContain('Falta el pagador.'))
it('RUC inválido', () => expect(validarComprobante({ ...base, ruc: '12' }, tipos)).toContain('RUC inválido.'))
it.each([0, -5, 1.5, 1e12])('monto %d inválido', m => expect(validarComprobante({ ...base, monto: m }, tipos)).toContain('Monto inválido.'))
it('fecha inválida', () => expect(validarComprobante({ ...base, fecha: '2026-02-31' }, tipos)).toContain('Fecha inválida.'))
```

- [ ] **Step 2:** FAIL. **Step 3:** Implementar (concepto/contraparte ≤ 200 caracteres tras trim; monto entero 1…999.999.999.999). **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: validación de comprobantes`.

### Task 5: Dictado

**Files:** Create `shared/utils/dictado.ts` · Test `test/unit/dictado.test.ts`

**Interfaces:**
- Consumes: `normalizar`, `parsearFecha`, `parsearMonto`, `normalizarRuc`.
- Produces:
  - `resolverTipo(texto: string, clase: Clase, tipos: Tipo[]): { ok: true; tipo: Tipo } | { ok: false; error: string }`
  - `parsearDictado(texto: string, ctx: { separadores: string[]; tipos: Tipo[]; ahora: Date }): { ok: true; borrador: Omit<BorradorComprobante, 'id'> } | { ok: false; errores: string[] }`

- [ ] **Step 1: Test que falla** (tipos sembrados como en Task 6, `separadores: ['tab','tap']`, `ahora = 2026-11-19T15:00Z`):

```ts
it('gasto del ejemplo', () => expect(parsearDictado(
  'gasto tab hoy tab hogar tab almuerzo mediodia tab supermas tab 8002147 tab 8.000', ctx))
  .toEqual({ ok: true, borrador: { clase: 'gasto', fecha: '2026-11-19', tipoId: idHogar,
    concepto: 'almuerzo mediodia', contraparte: 'supermas', ruc: '8002147', monto: 8000 } }))
it('ingreso del ejemplo', () => expect(parsearDictado(
  'ingreso tab 18/11/2026 tab sueldos tab sueldo de noviembre tab CGR tab 80012457 tab 12.000.000', ctx))
  .toMatchObject({ ok: true, borrador: { clase: 'ingreso', fecha: '2026-11-18', tipoId: idSueldos, contraparte: 'CGR', monto: 12000000 } }))
it('estilo iOS: mayúsculas, "Tab" y punto final', () => expect(parsearDictado(
  'Gasto Tab hoy Tab Hogar Tab almuerzo Tab Supermas Tab 8002147 Tab 8.000.', ctx).ok).toBe(true))
it('comas como separador', () => expect(parsearDictado(
  'gasto, hoy, hogar, almuerzo, supermas, 8002147, 8.000', ctx).ok).toBe(true))
it('"tap" como variante', () => expect(parsearDictado(
  'gasto tap hoy tap hogar tap almuerzo tap supermas tap 8002147 tap 8000', ctx).ok).toBe(true))
it('"tabla" dentro del concepto no separa', () => expect(parsearDictado(
  'gasto tab hoy tab hogar tab tabla de picar tab supermas tab 8002147 tab 8000', ctx))
  .toMatchObject({ borrador: { concepto: 'tabla de picar' } }))
it('tipo no registrado', () => expect(parsearDictado(
  'gasto tab hoy tab comida rapida tab x tab y tab 8002147 tab 8000', ctx))
  .toEqual({ ok: false, errores: ['El tipo "comida rapida" no está registrado.'] }))
it('tipo de ingreso en un gasto se rechaza', () => expect(parsearDictado(
  'gasto tab hoy tab sueldos tab x tab y tab 8002147 tab 8000', ctx).ok).toBe(false))
it('cantidad de campos', () => expect(parsearDictado('gasto tab hoy tab hogar', ctx))
  .toEqual({ ok: false, errores: ['Se esperaban 7 campos y se recibieron 3. Orden: gasto · fecha · tipo · concepto · proveedor · RUC · monto.'] }))
it('primera palabra', () => expect(parsearDictado('compra tab hoy tab hogar tab a tab b tab 8002147 tab 1', ctx))
  .toEqual({ ok: false, errores: ["Debe empezar con 'gasto' o 'ingreso'."] }))
it('junta varios errores', () => expect((parsearDictado(
  'gasto tab nunca tab hogar tab a tab b tab 12 tab mucho', ctx) as any).errores).toEqual([
  'No se entendió la fecha "nunca".', 'RUC inválido "12".', 'No se entendió el monto "mucho".']))
it('resolverTipo ambiguo', () => expect(resolverTipo('casa', 'gasto', tiposConDosCasa))
  .toEqual({ ok: false, error: 'El tipo "casa" coincide con varios tipos: Casa A, Casa B. Sé más específico.' }))
```

- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar. Quitar punto/espacios finales del texto completo; reemplazar cada separador como palabra completa (`(?<![\p{L}\p{N}])(sep1|sep2)(?![\p{L}\p{N}])`, flags `giu`, separadores escapados) por `,`; dividir por `,`; recortar. Clase: `gasto|gastos|ingreso|ingresos` normalizado. `resolverTipo`: tipos activos de la clase cuyo `normalizar(nombre)` o alguna `normalizar(palabra_clave)` sea igual a `normalizar(texto)`. Concepto/contraparte conservan el texto original recortado.
- [ ] **Step 4:** PASS. **Step 5:** Commit `feat: interpretación del dictado`.

### Task 6: Base de datos, reglas y semilla

**Files:** Create `supabase/migrations/20261119000000_esquema.sql`, `supabase/seed.sql`, `supabase/tests/rls.test.sql`, `supabase/tests/inmutabilidad.test.sql`

**Prerrequisito:** Supabase CLI y Docker Desktop. Sin Docker: correr los tests contra un proyecto Supabase de desarrollo con `supabase test db --db-url <url>`.

**Interfaces:**
- Produces (esquema que usan Tasks 7–13):
  - `miembros(id uuid pk, email text unique not null check (email = lower(email)), nombre text not null, rol text check in ('admin','miembro') default 'miembro', activo bool default true, creado_en timestamptz default now())`
  - `tipos(id uuid pk, clase text check in ('ingreso','gasto'), nombre text not null, palabras_clave text[] not null default '{}', activo bool default true)` + índice único `(clase, lower(nombre))`
  - `comprobantes(id uuid pk /* sin default: lo da el cliente */, clase, fecha date, tipo_id uuid fk tipos, concepto text, contraparte text, ruc text check (ruc ~ '^\d{5,9}$'), ruc_dv smallint check (ruc_dv between 0 and 9), monto bigint check (monto > 0), creado_por uuid fk miembros default miembro_actual_id(), creado_en timestamptz default now(), eliminado_en timestamptz, eliminado_por uuid fk miembros, motivo_eliminacion text)`
  - `configuracion(clave text pk, valor jsonb not null)` con filas `separadores_dictado = ["tab","tap"]` y `planilla = {"pendiente": false, "ultima_sync": null, "ultimo_error": null}`
  - Funciones: `miembro_actual_id() returns uuid`, `es_miembro() returns bool`, `es_admin() returns bool` (todas por `lower(auth.jwt()->>'email')`, solo activos, `security definer`, `stable`); `eliminar_comprobante(p_id uuid, p_motivo text) returns void` (`security definer`; error `'solo el administrador puede eliminar'` si no es admin; error si ya eliminado).
  - Trigger `proteger_comprobante`: `BEFORE UPDATE` lanza error si cambia cualquier columna salvo `eliminado_en/eliminado_por/motivo_eliminacion`, o si `old.eliminado_en is not null`; `BEFORE DELETE` siempre lanza error.
  - RLS en todas las tablas. `comprobantes`: SELECT `es_miembro()`; INSERT `es_miembro() and creado_por = miembro_actual_id() and eliminado_en is null`; sin políticas UPDATE/DELETE. `tipos`, `miembros`, `configuracion`: SELECT `es_miembro()`; INSERT/UPDATE `es_admin()`; sin DELETE.
- Semilla (`seed.sql`) — tipos de gasto: Gastos hogar `{hogar,gastos hogar}`, Préstamos `{prestamo,prestamos}`, Aportes `{aporte,aportes}`, Diezmos `{diezmo,diezmos}`; de ingreso: Sueldos `{sueldo,sueldos}`, Otros `{otro,otros}`. Las mismas filas de tipos y configuración van también en la migración (producción no corre `seed.sql`); `seed.sql` agrega miembros de prueba.

- [ ] **Step 1: Tests pgTAP que fallan.** Simular usuario con `set local role authenticated; set local request.jwt.claims = '{"email":"..."}'`. Casos:
  - `rls.test.sql`: no-miembro no ve comprobantes (0 filas); miembro ve todos; miembro con email `Ana@Gmail.com` en el JWT y `ana@gmail.com` en la tabla ve comprobantes; miembro inserta con su `creado_por`; inserta con `creado_por` de otro → error; miembro no puede insertar tipos; admin sí; miembro inactivo no ve nada.
  - `inmutabilidad.test.sql`: `update comprobantes set monto = 1` como admin y como service role → error; `delete` → error; `eliminar_comprobante` como miembro → error `'solo el administrador puede eliminar'`; como admin → `eliminado_en`/`eliminado_por` llenos; segunda eliminación → error.
- [ ] **Step 2:** `supabase start` y `supabase test db` → FAIL.
- [ ] **Step 3:** Escribir la migración y la semilla.
- [ ] **Step 4:** `supabase db reset && supabase test db` → todo PASS.
- [ ] **Step 5:** Commit `feat: esquema, reglas de acceso e inmutabilidad`.

### Task 7: Login con Google y membresía

**Files:** Create `server/utils/supabase-admin.ts`, `server/utils/auth.ts`, `server/api/yo.get.ts`, `app/composables/useMiembro.ts`, `app/middleware/auth.global.ts`, `app/pages/login.vue`, `app/pages/no-autorizado.vue` · Modify `nuxt.config.ts` · Test `test/unit/auth.test.ts`

**Interfaces:**
- Consumes: tabla `miembros` (Task 6).
- Produces:
  - `interface RepoMiembros { buscarPorEmail(email: string): Promise<Miembro | null>; hayAdmin(): Promise<boolean>; crear(m: { email: string; nombre: string; rol: 'admin' }): Promise<Miembro> }` con `Miembro = { id: string; email: string; nombre: string; rol: 'admin' | 'miembro'; activo: boolean }`
  - `asegurarAdminInicial(email: string, adminInicial: string | undefined, repo: RepoMiembros): Promise<void>`
  - `requerirMiembro(event): Promise<Miembro>` (401 sin sesión, 403 no miembro/inactivo); `requerirAdmin(event): Promise<Miembro>` (403 si no admin)
  - `GET /api/yo` → `Miembro` o 403
  - `useMiembro(): { miembro: Ref<Miembro | null>; esAdmin: ComputedRef<boolean>; cargar(): Promise<void> }`

- [ ] **Step 1: Test que falla** (repo en memoria):

```ts
it('crea admin inicial si no hay admin y coincide el email (sin importar mayúsculas)', async () => {
  await asegurarAdminInicial('Papa@Gmail.com', 'papa@gmail.com', repo)
  expect(repo.creados).toEqual([{ email: 'papa@gmail.com', nombre: 'papa@gmail.com', rol: 'admin' }])
})
it('no crea si ya hay admin', ...)   // repo.creados queda []
it('no crea si el email no coincide', ...)
it('no crea si ADMIN_INICIAL_EMAIL no está definida', ...)
```

- [ ] **Step 2:** FAIL. **Step 3:** Implementar. Instalar `@nuxtjs/supabase`, `redirect: false` (el middleware propio decide). `login.vue`: botón "Entrar con Google" → `signInWithOAuth({ provider: 'google' })`. Middleware: sin sesión → `/login`; con sesión, `cargar()`; 403 → `signOut()` y `/no-autorizado` ("Tu cuenta de Google no está autorizada. Pide al administrador que te agregue."). Rutas `/admin/*` exigen `esAdmin`.
- [ ] **Step 4:** `npm test` → PASS. Manual con Supabase local + credenciales OAuth de prueba: cuenta autorizada entra; no autorizada ve `/no-autorizado`; `ADMIN_INICIAL_EMAIL` entra como admin la primera vez.
- [ ] **Step 5:** Commit `feat: login con Google y control de miembros`.

### Task 8: Planilla espejo en Google Sheets

**Files:** Create `server/utils/planilla.ts`, `server/utils/sheets-google.ts` · Test `test/unit/planilla.test.ts`

**Interfaces:**
- Consumes: `formatearFecha`, `formatearRuc`, `ComprobanteDetalle`.
- Produces:
  - `interface SheetsApi { asegurarHojas(nombres: string[]): Promise<void>; reemplazarHoja(nombre: string, filas: (string | number)[][]): Promise<void> }`
  - `interface RepoPlanilla { listarVigentes(): Promise<ComprobanteDetalle[]>; guardarEstado(e: { pendiente: boolean; ultima_sync: string | null; ultimo_error: string | null }): Promise<void> }`
  - `construirFilas(cs: ComprobanteDetalle[], clase: Clase): (string | number)[][]` (incluye encabezado)
  - `reconciliarPlanilla(deps: { repo: RepoPlanilla; sheets: SheetsApi; ahora: () => Date }): Promise<{ ok: true } | { ok: false; error: string }>` (nunca lanza)
  - `crearSheetsGoogle(): SheetsApi` (lee `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` con `\n` reemplazados, `GOOGLE_SHEET_ID`)

- [ ] **Step 1: Test que falla:**

```ts
it('encabezado de gastos', () => expect(construirFilas([], 'gasto')[0]).toEqual(
  ['ID', 'Fecha', 'Tipo', 'Concepto', 'Proveedor', 'RUC', 'Monto', 'Cargado por', 'Fecha de carga']))
it('encabezado de ingresos dice Pagador', () => expect(construirFilas([], 'ingreso')[0][4]).toBe('Pagador'))
it('fila de gasto', () => expect(construirFilas([gasto], 'gasto')[1]).toEqual(
  [gasto.id, '19/11/2026', 'Gastos hogar', 'almuerzo mediodia', 'supermas', '8002147-6', 8000, 'Ana', '19/11/2026 12:00']))
it('filtra por clase y ordena por fecha y luego creadoEn', ...)
it('escribe ambas hojas y marca sincronizado', async () => {
  const r = await reconciliarPlanilla(deps)
  expect(r).toEqual({ ok: true })
  expect(sheets.hojas).toEqual(['Ingresos', 'Gastos'])
  expect(repo.estado).toEqual({ pendiente: false, ultima_sync: '2026-11-19T15:00:00.000Z', ultimo_error: null })
})
it('si Sheets falla, marca pendiente y devuelve el error sin lanzar', async () => {
  sheets.fallar = new Error('quota')
  expect(await reconciliarPlanilla(deps)).toEqual({ ok: false, error: 'quota' })
  expect(repo.estado).toMatchObject({ pendiente: true, ultimo_error: 'quota' })
})
```

"Fecha de carga" en hora de Asunción, formato `dd/mm/aaaa HH:mm`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. `sheets-google.ts` con `googleapis`: `asegurarHojas` agrega las hojas faltantes con `batchUpdate addSheet`; `reemplazarHoja` hace `values.clear` de `'<hoja>'!A:I` y `values.update` desde A1 con `valueInputOption: 'RAW'`.
- [ ] **Step 4:** PASS. Manual: script `scripts/probar-sheets.ts` (fuera del build) escribe filas de ejemplo en una planilla de prueba.
- [ ] **Step 5:** Commit `feat: planilla espejo en Google Sheets`.

### Task 9: API para guardar comprobantes

**Files:** Create `server/utils/crear-comprobante.ts`, `server/utils/repo-supabase.ts`, `server/api/comprobantes.post.ts` · Test `test/unit/crear-comprobante.test.ts`

**Interfaces:**
- Consumes: `validarComprobante`, `calcularDV`, `requerirMiembro`, `reconciliarPlanilla`.
- Produces:
  - `interface RepoComprobantes { buscar(id: string): Promise<{ id: string } | null>; insertar(b: BorradorComprobante & { rucDv: number }): Promise<void> }`
  - `crearComprobante(b: BorradorComprobante, deps: { repo: RepoComprobantes; tipos: Tipo[]; sincronizar: () => Promise<{ ok: boolean }> }): Promise<{ estado: 'creado' | 'existente'; planilla: 'ok' | 'pendiente' } | { estado: 'invalido'; errores: string[] }>`
  - `POST /api/comprobantes` body `BorradorComprobante` → 201 `{ planilla }` (creado), 200 `{ planilla }` (existente), 400 `{ errores }`. Inserta con el cliente **del usuario** (`serverSupabaseClient`) para que actúe la RLS; la planilla con service role.
  - `repo-supabase.ts` implementa `RepoComprobantes`, `RepoPlanilla`, `RepoMiembros`.

- [ ] **Step 1: Test que falla:**

```ts
it('inválido no inserta', async () => {
  expect(await crearComprobante({ ...b, monto: 0 }, deps)).toEqual({ estado: 'invalido', errores: ['Monto inválido.'] })
  expect(repo.insertados).toHaveLength(0)
})
it('inserta con DV calculado y sincroniza', async () => {
  expect(await crearComprobante(b, deps)).toEqual({ estado: 'creado', planilla: 'ok' })
  expect(repo.insertados[0].rucDv).toBe(6)
})
it('doble envío del mismo id inserta una sola vez', async () => {
  await crearComprobante(b, deps)
  expect(await crearComprobante(b, deps)).toMatchObject({ estado: 'existente' })
  expect(repo.insertados).toHaveLength(1)
})
it('si la planilla falla igual se guarda', async () => {
  deps.sincronizar = async () => ({ ok: false })
  expect(await crearComprobante(b, deps)).toEqual({ estado: 'creado', planilla: 'pendiente' })
})
it('normaliza RUC y recorta textos antes de guardar', ...)  // ruc '8.002.147' → '8002147', concepto '  a ' → 'a'
```

Una violación de clave única en `insertar` (carrera entre dos envíos) se trata como `existente`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Manual con `curl` y la cookie de sesión: 201, repetir → 200, `monto: 0` → 400, sin sesión → 401.
- [ ] **Step 6:** Commit `feat: API para guardar comprobantes`.

### Task 10: Eliminar, resincronizar y cron

**Files:** Create `server/api/comprobantes/[id].delete.ts`, `server/api/planilla/sincronizar.post.ts`, `server/api/cron/reconciliar.get.ts`, `vercel.json` · Test `test/unit/cron.test.ts`

**Interfaces:**
- Consumes: `requerirAdmin`, `eliminar_comprobante` (RPC con el cliente del usuario), `reconciliarPlanilla`.
- Produces:
  - `DELETE /api/comprobantes/:id` body `{ motivo?: string }` → 200 `{ planilla: 'ok' | 'pendiente' }`; 403 si no admin.
  - `POST /api/planilla/sincronizar` (admin) → `{ ok, error? }`.
  - `GET /api/cron/reconciliar` → exige `Authorization: Bearer ${CRON_SECRET}`, si no 401. Helper `autorizarCron(header: string | undefined, secreto: string | undefined): boolean`.
  - `vercel.json`: `{ "crons": [{ "path": "/api/cron/reconciliar", "schedule": "0 9 * * *" }] }` (09:00 UTC = 06:00 Asunción).

- [ ] **Step 1: Test que falla:** `autorizarCron('Bearer s3', 's3') === true`; `('Bearer otro', 's3') === false`; `(undefined, 's3') === false`; `('Bearer ', undefined) === false`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Manual: como miembro, DELETE → 403; como admin → 200, el comprobante deja de figurar en la planilla; cron sin secreto → 401, con secreto → 200.
- [ ] **Step 6:** Commit `feat: eliminación por admin, resincronización y cron diario`.

### Task 11: Pantalla "Nuevo comprobante" con dictado

**Files:** Create `app/pages/nuevo.vue`, `app/composables/useReconocimientoVoz.ts`, `app/composables/useTipos.ts` · Test `test/unit/voz.test.ts`

**Interfaces:**
- Consumes: `parsearDictado`, `validarComprobante`, `formatearGs`, `formatearRuc`, `POST /api/comprobantes`, tabla `configuracion.separadores_dictado`.
- Produces:
  - `useTipos(): { tipos: Ref<Tipo[]>; cargar(): Promise<void> }` (todos; filtrar activos donde corresponda)
  - `useReconocimientoVoz(): { soportado: boolean; escuchando: Ref<boolean>; iniciar(alTexto: (t: string) => void): void; detener(): void }` (Web Speech API `lang: 'es-419'`; `soportado = false` si no hay `SpeechRecognition`/`webkitSpeechRecognition` **o** si es iOS)
  - `esIOS(ua: string, maxTouchPoints: number): boolean`

- [ ] **Step 1: Test que falla:** `esIOS` es verdadero para UA de iPhone y para iPad que se reporta como Mac (`'Macintosh'` + `maxTouchPoints > 1`), falso para Android Chrome y para Mac de escritorio.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar `esIOS` y el composable. Pantalla:
  - Selector Ingreso/Gasto y formulario (fecha con hoy por defecto, tipo con solo activos de la clase, concepto, proveedor/pagador según clase, RUC con el DV en vivo al lado, monto con vista `Gs.`).
  - Cuadro "Dictar comprobante" (textarea) + botón 🎤 solo si `soportado`. Debajo, ayuda con el formato y el separador actual: *gasto tab fecha tab tipo tab concepto tab proveedor tab RUC tab monto*.
  - Botón "Interpretar": `ok` → llena el formulario; `errores` → lista roja y el formulario queda como estaba.
  - Al salir del campo RUC con un RUC válido y contraparte vacía: buscar el último comprobante con ese RUC (cliente Supabase, `order by creado_en desc limit 1`) y sugerir su contraparte.
  - "Guardar": `validarComprobante` en cliente; botón deshabilitado mientras envía; `id = crypto.randomUUID()` creado al abrir o limpiar el formulario (no al guardar). Éxito: aviso "Guardado" (+ "La planilla se actualizará más tarde" si `pendiente`), limpia y genera un `id` nuevo.
- [ ] **Step 4:** `npm test` → PASS. Manual en Android Chrome (🎤 dicta y llena), en iPhone Safari (no hay 🎤, el dictado del teclado + Interpretar funciona), tipo inexistente → rechazo visible, doble toque → un solo registro.
- [ ] **Step 5:** Commit `feat: carga de comprobantes con dictado`.

### Task 12: Dashboard y listado

**Files:** Create `shared/utils/resumen.ts`, `app/pages/index.vue`, `app/pages/comprobantes.vue` · Test `test/unit/resumen.test.ts`

**Interfaces:**
- Consumes: `ComprobanteDetalle`, `Tipo`, `formatearGs`, `formatearFecha`, `formatearRuc`.
- Produces: `calcularResumen(cs: ComprobanteDetalle[]): Resumen`; `rangoPeriodo(p: { anio: number; mes?: number }): { desde: string; hasta: string }`.

- [ ] **Step 1: Test que falla:**

```ts
it('totales, saldo y porcentaje', () => expect(calcularResumen(datos)).toMatchObject({
  totalIngresos: 8500000, totalGastos: 6200000, saldo: 2300000, pctGastosSobreIngresos: 72.9 }))
it('porcentaje por tipo sobre el total de su clase, 1 decimal, de mayor a menor', () =>
  expect(calcularResumen(datos).gastosPorTipo[0]).toEqual({ tipoId: idHogar, nombre: 'Gastos hogar', monto: 2790000, pct: 45 }))
it('mes sin ingresos: porcentaje null', () =>
  expect(calcularResumen(soloGastos).pctGastosSobreIngresos).toBeNull())
it('sin datos', () => expect(calcularResumen([])).toEqual({ totalIngresos: 0, totalGastos: 0, saldo: 0,
  pctGastosSobreIngresos: null, gastosPorTipo: [], ingresosPorTipo: [] }))
it('rango de febrero 2028 (bisiesto)', () => expect(rangoPeriodo({ anio: 2028, mes: 2 })).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' }))
it('rango de año', () => expect(rangoPeriodo({ anio: 2026 })).toEqual({ desde: '2026-01-01', hasta: '2026-12-31' }))
```

- [ ] **Step 2:** FAIL. **Step 3:** Implementar. Páginas:
  - `index.vue`: selector de mes (por defecto el mes actual de Asunción) con opción "Año completo"; tarjetas de Ingresos, Gastos, Saldo y "Gastos = X % de ingresos" ("—" si `null`); barras por tipo de gasto y por tipo de ingreso; accesos a "+ Nuevo" y "Comprobantes". Consulta vigentes (`eliminado_en is null`) del rango con joins a `tipos` y `miembros`.
  - `comprobantes.vue`: listado del período, filtros por clase, tipo y miembro; cada fila muestra fecha, tipo, concepto, contraparte, RUC con DV, monto y quién cargó. Si es admin, botón "Eliminar" con confirmación y motivo opcional → `DELETE /api/comprobantes/:id`.
- [ ] **Step 4:** PASS + revisión manual con datos de prueba.
- [ ] **Step 5:** Commit `feat: dashboard y listado`.

### Task 13: Administración

**Files:** Create `app/pages/admin/miembros.vue`, `app/pages/admin/tipos.vue`, `app/pages/admin/configuracion.vue`, `app/pages/admin/eliminados.vue`, `shared/utils/separadores.ts` · Test `test/unit/separadores.test.ts`

**Interfaces:**
- Consumes: tablas de Task 6 (escritura directa con el cliente del usuario; la RLS exige admin), `POST /api/planilla/sincronizar`.
- Produces: `parsearSeparadores(texto: string): { ok: true; valor: string[] } | { ok: false; error: string }`.

- [ ] **Step 1: Test que falla:** `'tab, tap'` → `['tab','tap']`; `' Siguiente '` → `['siguiente']`; `''` → error `'Ingresa al menos una palabra.'`; `'tab, 12'` → error `'Solo palabras, sin números ni símbolos.'`; palabras que son nombres o palabras clave de tipos (p. ej. `'hogar'`) → error `'"hogar" ya es un tipo; elige otra palabra.'` (recibe `tipos` como segundo parámetro).
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. Pantallas:
  - Miembros: agregar (email en minúsculas, nombre, rol), cambiar rol, activar/desactivar. Un admin no puede quitarse el rol ni desactivarse a sí mismo.
  - Tipos: por clase; agregar, renombrar, editar palabras clave, activar/desactivar (sin borrar).
  - Configuración: separadores del dictado; estado de la planilla (última sincronización, error si hay) y botón "Resincronizar planilla".
  - Eliminados: comprobantes con `eliminado_en`, con quién, cuándo y motivo.
- [ ] **Step 4:** PASS + manual: un miembro que entra a `/admin/tipos` es redirigido; los cambios del admin se reflejan en la pantalla Nuevo.
- [ ] **Step 5:** Commit `feat: administración`.

### Task 14: App instalable, despliegue y guía de puesta en marcha

**Files:** Modify `nuxt.config.ts` · Create `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`, `README.md`

- [ ] **Step 1:** Instalar `@vite-pwa/nuxt`. Manifest: `name: 'Gastos Familiares'`, `short_name: 'Gastos'`, `lang: 'es'`, `display: 'standalone'`, `start_url: '/'`, íconos 192/512 (uno `maskable`). En `app.head`: `apple-touch-icon`, `apple-mobile-web-app-capable`, `theme-color`. Service worker solo cachea los recursos de la app; las llamadas a `/api` y Supabase van siempre a la red (no hay modo sin conexión).
- [ ] **Step 2:** `npm run build && npm run preview` → Lighthouse en Chrome marca la app como instalable.
- [ ] **Step 3:** `README.md` en español con la puesta en marcha paso a paso: proyecto Supabase (`supabase link`, `supabase db push`); OAuth de Google en Google Cloud (pantalla de consentimiento, cliente web, URL de callback de Supabase) y proveedor Google en Supabase; cuenta de servicio con Sheets API, clave JSON → `GOOGLE_SERVICE_ACCOUNT_EMAIL`/`GOOGLE_PRIVATE_KEY`; planilla compartida con la cuenta de servicio (editor) y con los miembros (lector) → `GOOGLE_SHEET_ID`; proyecto Vercel conectado al repo con todas las variables de `.env.example` y las URLs de redirección de Supabase con el dominio de Vercel; instalación en Android ("Instalar app") y en iPhone (Safari → Compartir → "Agregar a inicio"); aviso de que Supabase gratuito pausa el proyecto tras ~1 semana sin uso.
- [ ] **Step 4:** Desplegar en Vercel siguiendo el README. Verificación de punta a punta en el dominio público: login de admin inicial, alta de un miembro, gasto dictado, aparece en la planilla, el admin elimina, desaparece de la planilla, la app se instala en Android y en iPhone.
- [ ] **Step 5:** Commit `feat: app instalable y guía de despliegue`.
