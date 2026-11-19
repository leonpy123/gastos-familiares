import type { BorradorComprobante, Clase, Tipo } from '../types'
import { normalizar } from './texto'
import { parsearFecha } from './fechas'
import { parsearMonto } from './montos'
import { normalizarRuc } from './ruc'
import { palabrasADigitos } from './numeros'

export const CAMPOS_DICTADO = 7

export type ResultadoTipo = { ok: true; tipo: Tipo } | { ok: false; error: string }
export type ResultadoDictado =
  | { ok: true; borrador: Omit<BorradorComprobante, 'id'> }
  | { ok: false; errores: string[] }

/** Busca un tipo activo de la clase por nombre o palabra clave (sin distinguir mayúsculas ni tildes). */
export function resolverTipo(texto: string, clase: Clase, tipos: Tipo[]): ResultadoTipo {
  const buscado = normalizar(texto)
  const encontrados = tipos.filter(t =>
    t.activo && t.clase === clase &&
    (normalizar(t.nombre) === buscado || t.palabras_clave.some(p => normalizar(p) === buscado)))
  if (encontrados.length === 1) return { ok: true, tipo: encontrados[0]! }
  if (encontrados.length === 0) return { ok: false, error: `El tipo "${texto}" no está registrado.` }
  return {
    ok: false,
    error: `El tipo "${texto}" coincide con varios tipos: ${encontrados.map(t => t.nombre).join(', ')}. Sé más específico.`,
  }
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Quita espacios y la puntuación que el dictado agrega en las pausas (". , ; :") a ambos lados del campo. */
const limpiarCampo = (c: string) => c.replace(/^[\s.,;:]+|[\s.,;:]+$/g, '')

/**
 * Si el texto trae la palabra separadora, solo ella separa (las comas dentro de un campo se conservan).
 * Si no la trae, separan las comas.
 */
function dividirCampos(texto: string, separadores: string[]): string[] {
  const palabras = separadores.map(s => s.trim()).filter(Boolean).map(escapar)
  if (palabras.length) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${palabras.join('|')})(?![\\p{L}\\p{N}])`, 'iu')
    if (re.test(texto)) return aplicarEliminar(texto.split(new RegExp(re.source, 'giu')))
  }
  return aplicarEliminar(texto.split(','))
}

/** Palabra para corregir mientras se dicta. */
export const PALABRA_ELIMINAR = 'eliminar'
const RE_ELIMINAR = new RegExp(`(?<![\\p{L}\\p{N}])${PALABRA_ELIMINAR}(?![\\p{L}\\p{N}])`, 'iu')

/**
 * "eliminar" dentro de un campo borra lo dicho antes en ese campo.
 * Si el campo todavía estaba vacío (se dijo justo después del separador), vuelve al campo anterior y lo borra.
 */
function aplicarEliminar(crudos: string[]): string[] {
  const campos: string[] = []
  for (const crudo of crudos) {
    const partes = crudo.split(new RegExp(RE_ELIMINAR.source, 'giu'))
    let actual = partes[0] ?? ''
    for (const siguiente of partes.slice(1)) {
      if (!limpiarCampo(actual)) campos.pop() // campo vacío: retroceder al anterior
      actual = siguiente
    }
    campos.push(limpiarCampo(actual))
  }
  return campos
}

function parsearClase(texto: string): Clase | null {
  const t = normalizar(texto)
  if (t === 'gasto' || t === 'gastos') return 'gasto'
  if (t === 'ingreso' || t === 'ingresos') return 'ingreso'
  return null
}

export const CAMPOS = ['clase', 'fecha', 'tipo', 'concepto', 'contraparte', 'ruc', 'monto'] as const
export type CampoDictado = typeof CAMPOS[number]

export interface DictadoParcial {
  /** Campo que se está dictando ahora (el último que empezó). */
  campoActual: CampoDictado
  clase: Clase | null
  fecha: string | null
  tipoId: string | null
  /** Solo mientras se dicta el tipo: tipos activos de la clase que empiezan con lo dicho. */
  sugerenciasTipo: Tipo[]
  concepto: string
  contraparte: string
  /** Dígitos reconocidos hasta ahora (puede estar incompleto). */
  ruc: string
  monto: number | null
}

/** Lo que se puede saber de un dictado a medio decir, para ir llenando el formulario en vivo. */
export function analizarDictadoParcial(
  texto: string,
  ctx: { separadores: string[]; tipos: Tipo[]; ahora: Date },
): DictadoParcial {
  const campos = texto.trim() ? dividirCampos(texto, ctx.separadores) : ['']
  const indice = Math.min(campos.length, CAMPOS.length) - 1
  const campo = (i: number) => campos[i] ?? ''
  const clase = parsearClase(campo(0))
  const campoActual = CAMPOS[indice]!

  let tipoId: string | null = null
  let sugerenciasTipo: Tipo[] = []
  if (clase && campos.length > 2) {
    const tipo = resolverTipo(campo(2), clase, ctx.tipos)
    if (tipo.ok) tipoId = tipo.tipo.id
    if (campoActual === 'tipo') {
      const dicho = normalizar(campo(2))
      sugerenciasTipo = ctx.tipos.filter(t => t.activo && t.clase === clase &&
        [t.nombre, ...t.palabras_clave].some(p => normalizar(p).startsWith(dicho)))
    }
  }

  const tRuc = campo(5)
  const ruc = /\p{L}/u.test(tRuc) ? (palabrasADigitos(tRuc) ?? '') : tRuc.replace(/\D/g, '')

  return {
    campoActual,
    clase,
    fecha: campos.length > 1 ? parsearFecha(campo(1), ctx.ahora) : null,
    tipoId,
    sugerenciasTipo,
    concepto: campo(3),
    contraparte: campo(4),
    ruc,
    monto: campos.length > 6 ? parsearMonto(campo(6)) : null,
  }
}

/** Interpreta "gasto tab hoy tab hogar tab concepto tab proveedor tab RUC tab monto". */
export function parsearDictado(
  texto: string,
  ctx: { separadores: string[]; tipos: Tipo[]; ahora: Date },
): ResultadoDictado {
  const campos = dividirCampos(texto, ctx.separadores)
  if (campos.length === 1) {
    const nombres = ctx.separadores.map(s => `«${s.trim()}»`).filter(s => s !== '«»').join(' o ')
    return {
      ok: false,
      errores: [`No encontré la palabra separadora (${nombres}) entre los campos. Llegó: "${texto.trim()}".`],
    }
  }
  const clase = parsearClase(campos[0] ?? '')
  if (!clase) return { ok: false, errores: [`Debe empezar con "gasto" o "ingreso" (llegó: "${campos[0]}").`] }

  if (campos.length !== CAMPOS_DICTADO) {
    const contraparte = clase === 'gasto' ? 'proveedor' : 'pagador'
    return {
      ok: false,
      errores: [`Se esperaban ${CAMPOS_DICTADO} campos y se recibieron ${campos.length}. Orden: ${clase} · fecha · tipo · concepto · ${contraparte} · RUC · monto. Llegó: "${texto.trim()}".`],
    }
  }

  const [, tFecha, tTipo, concepto, contraparte, tRuc, tMonto] = campos as [string, string, string, string, string, string, string]
  const errores: string[] = []

  const fecha = parsearFecha(tFecha, ctx.ahora)
  if (!fecha) errores.push(`No se entendió la fecha "${tFecha}".`)

  const tipo = resolverTipo(tTipo, clase, ctx.tipos)
  if (!tipo.ok) errores.push(tipo.error)

  const ruc = normalizarRuc(tRuc)
  if (!ruc) errores.push(`RUC inválido "${tRuc}".`)

  const monto = parsearMonto(tMonto)
  if (!monto) errores.push(`No se entendió el monto "${tMonto}".`)

  if (errores.length || !fecha || !tipo.ok || !ruc || !monto) return { ok: false, errores }
  return { ok: true, borrador: { clase, fecha, tipoId: tipo.tipo.id, concepto, contraparte, ruc, monto } }
}
