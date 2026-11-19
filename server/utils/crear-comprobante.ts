import type { BorradorComprobante, Tipo } from '../../shared/types'
import { validarComprobante } from '../../shared/utils/validacion'
import { calcularDV, normalizarRuc } from '../../shared/utils/ruc'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface RepoComprobantes {
  buscar(id: string): Promise<{ id: string } | null>
  /** 'duplicado' si ya existe un comprobante con ese id (violación de clave única). */
  insertar(c: BorradorComprobante & { rucDv: number }): Promise<'insertado' | 'duplicado'>
}

export type ResultadoCreacion =
  | { estado: 'creado' | 'existente'; planilla: 'ok' | 'pendiente' }
  | { estado: 'invalido'; errores: string[] }

export async function crearComprobante(
  entrada: BorradorComprobante,
  deps: { repo: RepoComprobantes; tipos: Tipo[]; sincronizar: () => Promise<{ ok: boolean }> },
): Promise<ResultadoCreacion> {
  const errores: string[] = []
  if (typeof entrada?.id !== 'string' || !UUID.test(entrada.id)) errores.push('Identificador inválido.')
  errores.push(...validarComprobante(entrada, deps.tipos))
  if (errores.length) return { estado: 'invalido', errores }

  if (await deps.repo.buscar(entrada.id)) return { estado: 'existente', planilla: 'ok' }

  const ruc = normalizarRuc(entrada.ruc)!
  const limpio = {
    id: entrada.id,
    clase: entrada.clase,
    fecha: entrada.fecha,
    tipoId: entrada.tipoId,
    concepto: entrada.concepto.trim(),
    contraparte: entrada.contraparte.trim(),
    ruc,
    rucDv: calcularDV(ruc),
    monto: entrada.monto,
  }
  if (await deps.repo.insertar(limpio) === 'duplicado') return { estado: 'existente', planilla: 'ok' }

  const sync = await deps.sincronizar()
  return { estado: 'creado', planilla: sync.ok ? 'ok' : 'pendiente' }
}
