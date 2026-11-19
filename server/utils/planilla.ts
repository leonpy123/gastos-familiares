import type { Clase, ComprobanteDetalle } from '../../shared/types'
import { formatearFecha, formatearFechaHora } from '../../shared/utils/fechas'
import { formatearRuc } from '../../shared/utils/ruc'

export const HOJAS: Record<Clase, string> = { ingreso: 'Ingresos', gasto: 'Gastos' }

export interface SheetsApi {
  asegurarHojas(nombres: string[]): Promise<void>
  reemplazarHoja(nombre: string, filas: (string | number)[][]): Promise<void>
}

export interface EstadoPlanilla {
  pendiente: boolean
  ultima_sync: string | null
  ultimo_error: string | null
}

export interface RepoPlanilla {
  listarVigentes(): Promise<ComprobanteDetalle[]>
  /** Actualiza solo los campos dados (los demás se conservan). */
  guardarEstado(e: Partial<EstadoPlanilla>): Promise<void>
}

/** Filas de una hoja (encabezado incluido), ordenadas por fecha y luego por momento de carga. */
export function construirFilas(cs: ComprobanteDetalle[], clase: Clase): (string | number)[][] {
  const encabezado = ['ID', 'Fecha', 'Tipo', 'Concepto', clase === 'gasto' ? 'Proveedor' : 'Pagador',
    'RUC', 'Monto', 'Cargado por', 'Fecha de carga']
  const filas = cs
    .filter(c => c.clase === clase)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || Date.parse(a.creadoEn) - Date.parse(b.creadoEn))
    .map(c => [c.id, formatearFecha(c.fecha), c.tipoNombre, c.concepto, c.contraparte,
      formatearRuc(c.ruc), c.monto, c.creadoPorNombre, formatearFechaHora(c.creadoEn)])
  return [encabezado, ...filas]
}

const INTENTOS = 3
const huella = (cs: ComprobanteDetalle[]) => cs.map(c => c.id).sort().join('|')

/** Reescribe ambas hojas desde la base. Nunca lanza: devuelve el resultado y deja registrado el estado. */
export async function reconciliarPlanilla(deps: {
  repo: RepoPlanilla
  sheets: SheetsApi
  ahora: () => Date
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await deps.sheets.asegurarHojas([HOJAS.ingreso, HOJAS.gasto])
    let vigentes = await deps.repo.listarVigentes()
    for (let intento = 1; ; intento++) {
      await deps.sheets.reemplazarHoja(HOJAS.ingreso, construirFilas(vigentes, 'ingreso'))
      await deps.sheets.reemplazarHoja(HOJAS.gasto, construirFilas(vigentes, 'gasto'))
      // Otro guardado simultáneo pudo escribir una versión anterior encima: si la base ya no
      // coincide con lo escrito, se vuelve a escribir con lo actual.
      const actuales = await deps.repo.listarVigentes()
      if (huella(actuales) === huella(vigentes)) break
      if (intento >= INTENTOS) throw new Error('los datos cambiaron mientras se actualizaba la planilla')
      vigentes = actuales
    }
    await deps.repo.guardarEstado({ pendiente: false, ultima_sync: deps.ahora().toISOString(), ultimo_error: null })
    return { ok: true }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    try {
      await deps.repo.guardarEstado({ pendiente: true, ultimo_error: error })
    } catch { /* si la base tampoco responde, el cron reintentará */ }
    return { ok: false, error }
  }
}
