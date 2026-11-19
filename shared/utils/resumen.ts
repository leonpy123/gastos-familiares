import type { Clase, ComprobanteDetalle, ItemResumen, Resumen } from '../types'

const unDecimal = (x: number) => Math.round(x * 10) / 10

function porTipo(cs: ComprobanteDetalle[], clase: Clase, total: number): ItemResumen[] {
  const grupos = new Map<string, ItemResumen>()
  for (const c of cs) {
    if (c.clase !== clase) continue
    const g = grupos.get(c.tipoId) ?? { tipoId: c.tipoId, nombre: c.tipoNombre, monto: 0, pct: 0 }
    g.monto += c.monto
    grupos.set(c.tipoId, g)
  }
  return [...grupos.values()]
    .map(g => ({ ...g, pct: total ? unDecimal((g.monto / total) * 100) : 0 }))
    .sort((a, b) => b.monto - a.monto || a.nombre.localeCompare(b.nombre))
}

/** Totales y porcentajes de un conjunto de comprobantes vigentes. */
export function calcularResumen(cs: ComprobanteDetalle[]): Resumen {
  const totalIngresos = cs.filter(c => c.clase === 'ingreso').reduce((s, c) => s + c.monto, 0)
  const totalGastos = cs.filter(c => c.clase === 'gasto').reduce((s, c) => s + c.monto, 0)
  return {
    totalIngresos,
    totalGastos,
    saldo: totalIngresos - totalGastos,
    pctGastosSobreIngresos: totalIngresos > 0 ? unDecimal((totalGastos / totalIngresos) * 100) : null,
    gastosPorTipo: porTipo(cs, 'gasto', totalGastos),
    ingresosPorTipo: porTipo(cs, 'ingreso', totalIngresos),
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Primer y último día de un mes o de un año, 'YYYY-MM-DD'. */
export function rangoPeriodo(p: { anio: number; mes?: number }): { desde: string; hasta: string } {
  if (!p.mes) return { desde: `${p.anio}-01-01`, hasta: `${p.anio}-12-31` }
  const ultimo = new Date(Date.UTC(p.anio, p.mes, 0)).getUTCDate()
  return { desde: `${p.anio}-${pad(p.mes)}-01`, hasta: `${p.anio}-${pad(p.mes)}-${pad(ultimo)}` }
}
