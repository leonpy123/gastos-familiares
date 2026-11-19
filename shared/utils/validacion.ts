import type { BorradorComprobante, Tipo } from '../types'
import { normalizarRuc } from './ruc'
import { esFechaIsoValida } from './fechas'

export const LARGO_MAXIMO_TEXTO = 200
export const MONTO_MAXIMO = 999_999_999_999

/** Devuelve la lista de errores (vacía si el comprobante es válido). */
export function validarComprobante(b: BorradorComprobante, tipos: Tipo[]): string[] {
  const errores: string[] = []
  if (b.clase !== 'gasto' && b.clase !== 'ingreso') {
    errores.push('Clase inválida.')
    return errores
  }
  if (typeof b.fecha !== 'string' || !esFechaIsoValida(b.fecha)) errores.push('Fecha inválida.')

  const tipo = tipos.find(t => t.id === b.tipoId && t.activo)
  if (!tipo) errores.push('El tipo no está registrado.')
  else if (tipo.clase !== b.clase) errores.push(`El tipo no corresponde a ${b.clase === 'gasto' ? 'un gasto' : 'un ingreso'}.`)

  const concepto = (b.concepto ?? '').trim()
  if (!concepto) errores.push('Falta el concepto.')
  else if (concepto.length > LARGO_MAXIMO_TEXTO) errores.push('El concepto es demasiado largo.')

  const contraparte = (b.contraparte ?? '').trim()
  const nombre = b.clase === 'gasto' ? 'proveedor' : 'pagador'
  if (!contraparte) errores.push(`Falta el ${nombre}.`)
  else if (contraparte.length > LARGO_MAXIMO_TEXTO) errores.push(`El ${nombre} es demasiado largo.`)

  if (typeof b.ruc !== 'string' || normalizarRuc(b.ruc) === null) errores.push('RUC inválido.')

  if (typeof b.monto !== 'number' || !Number.isInteger(b.monto) || b.monto < 1 || b.monto > MONTO_MAXIMO) {
    errores.push('Monto inválido.')
  }
  return errores
}
