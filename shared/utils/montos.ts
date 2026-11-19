import { normalizar } from './texto'
import { palabrasANumero } from './numeros'

const MAXIMO = 999_999_999_999

/** Interpreta un monto en guaraníes ("8.000", "8 mil", "Gs. 12.000.000"). Devuelve null si no es un entero > 0. */
export function parsearMonto(texto: string): number | null {
  let t = normalizar(texto)
    .replace(/^(gs\.?|₲)\s*/, '')
    .replace(/\.$/, '')
    .trim()

  let valor: number | null = null
  let m: RegExpMatchArray | null
  if (/^\d+$/.test(t)) valor = Number(t)
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) valor = Number(t.replace(/\./g, ''))
  else if (/^\d{1,3}( \d{3})+$/.test(t)) valor = Number(t.replace(/ /g, ''))
  else if ((m = t.match(/^(\d+)\s*mil$/))) valor = Number(m[1]) * 1_000
  else if ((m = t.match(/^(\d+)\s*(millon|millones)$/))) valor = Number(m[1]) * 1_000_000
  else if (/[a-z]/.test(t)) valor = palabrasANumero(t) // "ocho mil", "un millón quinientos mil"

  if (valor === null || !Number.isSafeInteger(valor) || valor <= 0 || valor > MAXIMO) return null
  return valor
}

/** 12000000 → "Gs. 12.000.000" */
export function formatearGs(n: number): string {
  const signo = n < 0 ? '-' : ''
  const digitos = String(Math.abs(Math.trunc(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${signo}Gs. ${digitos}`
}
