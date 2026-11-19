import { describe, it, expect } from 'vitest'
import { calcularResumen, rangoPeriodo } from '../../shared/utils/resumen'
import type { ComprobanteDetalle } from '../../shared/types'

let n = 0
const c = (clase: 'gasto' | 'ingreso', tipoId: string, tipoNombre: string, monto: number): ComprobanteDetalle => ({
  id: String(++n), clase, fecha: '2026-11-10', tipoId, tipoNombre, concepto: 'x', contraparte: 'y',
  ruc: '8002147', rucDv: 6, monto, creadoPorNombre: 'Ana', creadoEn: '2026-11-10T12:00:00Z',
})
const idHogar = 't-hogar'
const datos = [
  c('ingreso', 't-sueldos', 'Sueldos', 8000000), c('ingreso', 't-otros', 'Otros', 500000),
  c('gasto', idHogar, 'Gastos hogar', 2000000), c('gasto', idHogar, 'Gastos hogar', 790000),
  c('gasto', 't-prest', 'Préstamos', 1550000), c('gasto', 't-diez', 'Diezmos', 620000),
  c('gasto', 't-aport', 'Aportes', 1240000),
]
const soloGastos = [c('gasto', idHogar, 'Gastos hogar', 1000)]

describe('calcularResumen', () => {
  it('totales, saldo y porcentaje', () => expect(calcularResumen(datos)).toMatchObject({
    totalIngresos: 8500000, totalGastos: 6200000, saldo: 2300000, pctGastosSobreIngresos: 72.9 }))
  it('porcentaje por tipo sobre el total de su clase, 1 decimal, de mayor a menor', () =>
    expect(calcularResumen(datos).gastosPorTipo[0]).toEqual({ tipoId: idHogar, nombre: 'Gastos hogar', monto: 2790000, pct: 45 }))
  it('orden completo de gastos', () =>
    expect(calcularResumen(datos).gastosPorTipo.map(i => i.pct)).toEqual([45, 25, 20, 10]))
  it('ingresos por tipo', () =>
    expect(calcularResumen(datos).ingresosPorTipo.map(i => [i.nombre, i.pct])).toEqual([['Sueldos', 94.1], ['Otros', 5.9]]))
  it('mes sin ingresos: porcentaje null', () =>
    expect(calcularResumen(soloGastos).pctGastosSobreIngresos).toBeNull())
  it('saldo negativo', () => expect(calcularResumen(soloGastos).saldo).toBe(-1000))
  it('sin datos', () => expect(calcularResumen([])).toEqual({ totalIngresos: 0, totalGastos: 0, saldo: 0,
    pctGastosSobreIngresos: null, gastosPorTipo: [], ingresosPorTipo: [] }))
})

describe('rangoPeriodo', () => {
  it('rango de febrero 2028 (bisiesto)', () => expect(rangoPeriodo({ anio: 2028, mes: 2 })).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' }))
  it('rango de noviembre', () => expect(rangoPeriodo({ anio: 2026, mes: 11 })).toEqual({ desde: '2026-11-01', hasta: '2026-11-30' }))
  it('rango de año', () => expect(rangoPeriodo({ anio: 2026 })).toEqual({ desde: '2026-01-01', hasta: '2026-12-31' }))
})
