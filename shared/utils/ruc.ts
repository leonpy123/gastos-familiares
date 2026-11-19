import { palabrasADigitos } from './numeros'

/** Dígito verificador del RUC paraguayo (módulo 11, base máxima 11, algoritmo DNIT). */
export function calcularDV(base: string): number {
  let total = 0
  let k = 2
  for (const d of [...base].reverse()) {
    if (k > 11) k = 2
    total += Number(d) * k++
  }
  const resto = total % 11
  return resto > 1 ? 11 - resto : 0
}

/** Deja solo los dígitos de la base (descarta un "-DV" final). Devuelve null si no tiene 5 a 9 dígitos. */
export function normalizarRuc(texto: string): string | null {
  const base = texto.split('-')[0] ?? ''
  // Dictado en palabras: "ocho cero cero veintiuno cuarenta y siete" → "8002147"
  const digitos = /\p{L}/u.test(base) ? (palabrasADigitos(base) ?? '') : base.replace(/\D/g, '')
  return /^\d{5,9}$/.test(digitos) ? digitos : null
}

/** "8002147" → "8002147-6" */
export function formatearRuc(base: string): string {
  return `${base}-${calcularDV(base)}`
}
