import { normalizar } from './texto'

const VALORES: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, primero: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
  setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
}
const IGNORADAS = new Set(['de', 'guaranies', 'guarani', 'gs'])

const fichas = (texto: string) => normalizar(texto).replace(/[.,]/g, ' ').split(' ').filter(Boolean)

/** "ocho mil" → 8000, "un millón quinientos mil" → 1500000, "dos mil veintiséis" → 2026. null si no es un número. */
export function palabrasANumero(texto: string): number | null {
  // Aquí la coma y el punto no separan: "1,5 millones" no es un monto válido y "8.000" es un número.
  const ts = normalizar(texto).replace(/\.$/, '').split(' ').filter(t => t && !IGNORADAS.has(t))
  if (!ts.length) return null
  let total = 0
  let actual = 0
  for (const t of ts) {
    if (t === 'y') continue
    if (/^\d+$/.test(t)) actual += Number(t)
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) actual += Number(t.replace(/\./g, ''))
    else if (t in VALORES) actual += VALORES[t]!
    else if (t === 'mil') actual = (actual || 1) * 1_000
    else if (t === 'millon' || t === 'millones') { total += (actual || 1) * 1_000_000; actual = 0 }
    else return null
  }
  return total + actual
}

/**
 * RUC dictado por grupos: "ocho cero cero veintiuno cuarenta y siete" → "8002147".
 * Cada número dicho aporta sus dígitos, en orden. Si se dijo como un solo número con "mil", se usa ese número.
 */
export function palabrasADigitos(texto: string): string | null {
  const ts = fichas(texto)
  if (ts.some(t => t === 'mil' || t === 'millon' || t === 'millones')) {
    const n = palabrasANumero(texto)
    return n === null ? null : String(n)
  }
  const salida: string[] = []
  let grupo: number | null = null
  let despuesDeY = false
  const cerrar = () => { if (grupo !== null) salida.push(String(grupo)); grupo = null }

  for (const t of ts) {
    if (t === 'y') { despuesDeY = true; continue }
    if (/^\d+$/.test(t)) { cerrar(); salida.push(t); despuesDeY = false; continue }
    if (!(t in VALORES)) return null
    const v = VALORES[t]!
    const g: number | null = grupo
    if (g !== null && g >= 100 && g % 100 === 0 && v < 100) grupo = g + v // "ochocientos dos", "ciento cuarenta"
    else if (g !== null && despuesDeY && g % 100 >= 20 && g % 10 === 0 && v < 10) grupo = g + v // "cuarenta y siete"
    else { cerrar(); grupo = v }
    despuesDeY = false
  }
  cerrar()
  return salida.length ? salida.join('') : null
}
