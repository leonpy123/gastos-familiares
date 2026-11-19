# Gastos Familiares — Diseño

Fecha: 2026-11-19
Estado: borrador para aprobación

## 1. Intención y por qué

Una app web instalable en el celular (PWA) para que **todos los integrantes de una familia** registren sus comprobantes de **ingresos y gastos** en un único libro familiar compartido, vean un **dashboard** con totales y porcentajes, y tengan una **planilla de Google Sheets siempre al día** con los mismos datos. La carga debe ser rápida desde el teléfono, incluyendo **dictado por voz**. Contexto: Paraguay (RUC paraguayo, montos en guaraníes).

Los registros son de confianza: una vez guardados no se modifican; solo el administrador puede eliminarlos (y se vuelven a cargar si hubo error).

## 2. Objetivos

- Instalable en Android y iPhone como app (PWA), publicada en Vercel.
- Login con cuenta de Google; solo acceden los miembros autorizados de la familia.
- Carga de ingresos y gastos por formulario o por dictado, con revisión antes de guardar.
- Dashboard con resumen y porcentajes.
- Planilla de Google Sheets sincronizada automáticamente (espejo de la app).
- Costo cero en planes gratuitos al tamaño de una familia.

## 3. No-objetivos (v1)

- Uso sin conexión (cargar sin señal). Requiere conexión.
- Varias familias / multi-tenant. Una sola familia por despliegue.
- Adjuntar foto o PDF del comprobante (confirmado: no por ahora).
- Importar datos anteriores: se empieza de cero (confirmado).
- Uso para declaración de IRP. Más adelante se trabajará una integración aparte con Marangatu (DNIT); para eso probablemente harán falta campos como número de factura, timbrado e IVA, que v1 no captura. Los comprobantes de v1 no tendrán esos datos.
- Presupuestos, metas, recordatorios, multimoneda.
- Edición de comprobantes guardados (por diseño, ver §6).

## 4. Anti-objetivos (sería un fracaso aunque "funcione")

- Que la plata "desaparezca" sin rastro: toda eliminación queda registrada.
- Que la planilla y la app digan cosas distintas.
- Que el dictado guarde algo mal sin que el usuario lo vea antes.
- Que aparezcan costos mensuales o se pida tarjeta.
- Que alguien fuera de la familia pueda entrar con solo tener el enlace.

## 5. Usuarios, acceso y roles

- Login exclusivamente con Google.
- **Lista de miembros autorizados** (por email). Una cuenta de Google que no está en la lista es rechazada tras el login.
- Roles:
  - **Miembro**: ve todo (todos los comprobantes y el dashboard), carga ingresos y gastos.
  - **Admin**: todo lo del miembro + eliminar comprobantes, administrar miembros, administrar tipos de ingreso/gasto, configurar la palabra separadora del dictado.
- El primer admin se define por variable de entorno (email) en el despliegue. *(Decisión mía.)*
- Puede haber más de un admin. *(Decisión mía.)*

## 6. Datos

### Comprobante de ingreso
fecha · tipo de ingreso · concepto · pagador · RUC · monto

### Comprobante de gasto
fecha · tipo de gasto · concepto · proveedor · RUC · monto

### Reglas de campos
- **Fecha**: dd/mm/aaaa; zona horaria America/Asuncion. Puede ser futura o pasada. *(Sin restricción: decisión mía.)*
- **Tipo**: obligatorio, debe existir en la lista de tipos del admin (activos) para esa clase (ingreso o gasto). **Si no existe, se rechaza.**
- **Concepto**: texto libre, obligatorio.
- **Proveedor / Pagador**: texto libre, obligatorio. *(Decisión mía.)*
- **RUC**: se ingresa/dicta **sin dígito verificador** (solo dígitos). La app calcula el DV (algoritmo módulo 11 del RUC paraguayo) y lo guarda y muestra como `8002147-X`. Obligatorio. *(Obligatoriedad: decisión mía.)* Si el RUC ya fue usado antes, al cargarlo se sugiere el proveedor/pagador previo.
- **Monto**: guaraníes, entero > 0, sin decimales. "8.000" y "12.000.000" usan punto como separador de miles.
- Metadatos automáticos: creado por (miembro), fecha/hora de creación.

### Tipos
- Dos listas administradas por el admin: **tipos de ingreso** y **tipos de gasto**.
- Iniciales de gasto: Gastos hogar, Préstamos, Aportes, Diezmos. Iniciales de ingreso: Sueldos, Otros. *(Ingresos iniciales: decisión mía.)*
- Cada tipo tiene **palabras clave** para el dictado (p. ej. *Gastos hogar* ← "hogar").
- Un tipo usado no se borra: se **desactiva** (deja de aceptarse en cargas nuevas, sigue en el historial).

### Inmutabilidad y eliminación
- Antes de guardar: se puede corregir cualquier campo en la pantalla de revisión.
- Después de guardar: **nadie puede editar**. Impuesto en la base de datos (sin permiso de UPDATE sobre datos del comprobante), no solo en la UI.
- Solo el admin elimina. La eliminación es **lógica**: queda registrado quién, cuándo y (opcional) un motivo. Los eliminados no cuentan en el dashboard ni aparecen en la planilla, pero el admin puede verlos en un historial.

## 7. Dictado por voz

### Formato
Campos en orden fijo, separados por la **palabra separadora** (por defecto **"tab"**, configurable por el admin) o por coma:

- Gasto: `gasto tab <fecha> tab <tipo> tab <concepto> tab <proveedor> tab <RUC> tab <monto>`
  Ej.: *gasto tab hoy tab hogar tab almuerzo mediodía tab supermas tab 8002147 tab 8.000*
- Ingreso: `ingreso tab <fecha> tab <tipo> tab <concepto> tab <pagador> tab <RUC> tab <monto>`
  Ej.: *ingreso tab 18/11/2026 tab sueldos tab sueldo de noviembre tab CGR tab 80012457 tab 12.000.000*

### Interpretación
- Primera palabra: "gasto"/"gastos" o "ingreso"/"ingresos".
- Separador: insensible a mayúsculas; acepta variantes comunes de reconocimiento ("tab", "tap", "Tab") y ",".
- Fecha: "hoy", "ayer", o dd/mm/aaaa (también "18 de noviembre" si es simple de soportar; opcional).
- Tipo: coincidencia por palabra clave o por nombre, ignorando mayúsculas y tildes. Sin coincidencia → **rechazo** con mensaje ("El tipo 'X' no está registrado"). Coincidencia ambigua → rechazo pidiendo ser más específico.
- RUC: se toman solo dígitos (el reconocimiento puede insertar espacios o puntos).
- Monto: se toman solo dígitos; el reconocimiento puede escribir "8000", "8.000" u "8 mil" (soportar "mil" y "millones" si es simple; deseable).
- Cantidad de campos incorrecta → rechazo indicando qué falta.

### Captura
- **Android (Chrome)**: botón 🎤 en la app que usa Web Speech API (es-ES/es-419) y vuelca el texto al cuadro de dictado.
- **iPhone**: el cuadro de dictado es un campo de texto; el usuario usa el micrófono del teclado de iOS. (La Web Speech API en iOS, especialmente en modo app instalada, no es confiable; no depender de ella.) El botón 🎤 se oculta si el navegador no lo soporta.
- Siempre: el texto se interpreta → se llena el formulario → **pantalla de revisión** → el usuario corrige si hace falta → Guardar.

## 8. Dashboard

- Período: un mes a la vez (selector de mes) y vista de año completo.
- Tarjetas: total ingresos, total gastos, saldo, % gastos sobre ingresos.
- Distribución de gastos por tipo (monto y %), y de ingresos por tipo.
- Listado de comprobantes del período (filtrable por clase, tipo y miembro), mostrando quién cargó cada uno.
- Opcional/deseable: comparación con el mes anterior.

## 9. Google Sheets (espejo siempre al día)

- Una planilla familiar en Google Drive con dos hojas: **Ingresos** y **Gastos**. Columnas: ID, fecha, tipo, concepto, proveedor/pagador, RUC (con DV), monto, cargado por, fecha de carga.
- La app escribe mediante una **cuenta de servicio de Google**; la planilla se comparte con esa cuenta (editor) y con los miembros (lectura). *(Decisión mía.)*
- Al guardar un comprobante: se agrega su fila. Al eliminarlo: se quita su fila (por ID).
- La app es la **fuente de verdad**: si la planilla fue editada a mano o una escritura falló, una **reconciliación** reescribe ambas hojas desde la base. Se dispara: (a) en cada guardado si hay pendientes, (b) diariamente con Vercel Cron (el plan gratuito permite una ejecución diaria), (c) con un botón "Resincronizar" para el admin.
- Si Sheets falla al guardar, el comprobante **igual se guarda** en la app y queda marcado pendiente de sincronizar.
- Para análisis propios en Sheets, se recomienda otra hoja/archivo que lea de estas (las dos hojas espejo se sobrescriben).

## 10. Enfoques considerados

| Enfoque | A favor | En contra |
|---|---|---|
| **A. Nuxt (Vue) en Vercel + Supabase (Postgres + Auth Google)** — **elegido** | Vue ya conocido; SQL para totales/porcentajes; reglas (solo admin elimina, inmutabilidad) impuestas con Row Level Security; sin tarjeta; gratis al tamaño de una familia | Sin modo sin conexión en v1; Supabase gratuito pausa proyectos tras ~1 semana sin actividad (uso diario lo evita) |
| B. Vue + Firebase (Auth + Firestore + Cloud Functions) | Funciona sin conexión | Agregaciones del dashboard más trabajosas en NoSQL; Cloud Functions exige plan con tarjeta |
| C. Google Sheets como base de datos (Apps Script) | Muy simple | Lento y frágil con varios usuarios; contradice "la planilla es un espejo" |

Elegido **A** por costo (sin tarjeta) y porque el valor principal está en el dashboard y la planilla sincronizada.

## 11. Arquitectura (decidido)

- **Frontend + servidor**: Nuxt 3 (Vue 3), desplegado en Vercel. PWA (manifest, ícono, instalable en Android e iOS).
- **Base de datos y login**: Supabase (PostgreSQL, Supabase Auth con proveedor Google). Row Level Security:
  - SELECT: cualquier miembro autorizado.
  - INSERT: cualquier miembro autorizado (creado_por = usuario actual).
  - UPDATE de datos del comprobante: nadie. Eliminación lógica: solo admin.
  - Tipos, miembros, configuración: escritura solo admin.
- **Sincronización Sheets**: rutas de servidor de Nuxt (en Vercel) con la cuenta de servicio; credenciales en variables de entorno, nunca en el cliente.
- **Idioma de la UI**: español. Formato de número `12.000.000`, fecha `dd/mm/aaaa`.

## 12. Queda a criterio del constructor

- Librería de UI/componentes y de gráficos.
- Esquema exacto de tablas y nombres.
- Estructura de pantallas y navegación (mínimo: Inicio/Dashboard, Nuevo comprobante con dictado, Listado, Administración).
- Estrategia de tests y detalles del parser de dictado más allá de las reglas de §7.
- Diseño visual e ícono de la app.
