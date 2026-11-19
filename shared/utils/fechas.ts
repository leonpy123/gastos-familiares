import { normalizar } from './texto'

export const ZONA = 'America/Asuncion'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre']

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (a: number, m: number, d: number) => `${a}-${pad(m)}-${pad(d)}`

/** Fecha calendario actual en Asunción, 'YYYY-MM-DD'. */
export function hoyEnAsuncion(ahora: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora)
}

function esFechaReal(a: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1) return false
  const dt = new Date(Date.UTC(a, m - 1, d))
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

function restarDia(fechaIso: string): string {
  const [a, m, d] = fechaIso.split('-').map(Number)
  const dt = new Date(Date.UTC(a!, m! - 1, d! - 1))
  return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

/** "hoy", "ayer", "18/11/2026", "18 de noviembre [de|del 2026]" → 'YYYY-MM-DD', o null. */
export function parsearFecha(texto: string, ahora: Date): string | null {
  const t = normalizar(texto).replace(/\.$/, '')
  const hoy = hoyEnAsuncion(ahora)
  if (t === 'hoy') return hoy
  if (t === 'ayer') return restarDia(hoy)

  const anioActual = Number(hoy.slice(0, 4))
  let a: number, m: number, d: number
  let r: RegExpMatchArray | null
  if ((r = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    d = Number(r[1]); m = Number(r[2]); a = Number(r[3])
  } else if ((r = t.match(/^(\d{1,2}) de ([a-z]+)(?: (?:de|del) (\d{4}))?$/))) {
    d = Number(r[1]); m = MESES.indexOf(r[2]!) + 1; a = r[3] ? Number(r[3]) : anioActual
  } else {
    return null
  }
  return esFechaReal(a, m, d) ? iso(a, m, d) : null
}

/** '2026-11-08' → '08/11/2026' */
export function formatearFecha(fechaIso: string): string {
  const [a, m, d] = fechaIso.split('-')
  return `${d}/${m}/${a}`
}

/** ¿Es 'YYYY-MM-DD' una fecha real? */
export function esFechaIsoValida(fechaIso: string): boolean {
  const r = fechaIso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return !!r && esFechaReal(Number(r[1]), Number(r[2]), Number(r[3]))
}
