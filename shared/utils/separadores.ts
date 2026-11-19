import type { Tipo } from '../types'
import { normalizar } from './texto'

const RESERVADAS = ['gasto', 'gastos', 'ingreso', 'ingresos', 'hoy', 'ayer', 'de', 'del', 'mil', 'millon', 'millones']

/** Valida la lista de palabras separadoras que escribe el admin ("tab, tap"). */
export function parsearSeparadores(
  texto: string,
  tipos: Tipo[],
): { ok: true; valor: string[] } | { ok: false; error: string } {
  const palabras = [...new Set(texto.split(',').map(p => p.trim().toLowerCase()).filter(Boolean))]
  if (!palabras.length) return { ok: false, error: 'Ingresa al menos una palabra.' }

  const deTipos = new Set(tipos.flatMap(t => [t.nombre, ...t.palabras_clave].map(normalizar)))
  for (const p of palabras) {
    if (!/^\p{L}+( \p{L}+)*$/u.test(p)) return { ok: false, error: 'Solo palabras, sin números ni símbolos.' }
    if (RESERVADAS.includes(normalizar(p))) return { ok: false, error: `"${p}" se usa en el dictado; elige otra palabra.` }
    if (deTipos.has(normalizar(p))) return { ok: false, error: `"${p}" ya es un tipo; elige otra palabra.` }
  }
  return { ok: true, valor: palabras }
}
