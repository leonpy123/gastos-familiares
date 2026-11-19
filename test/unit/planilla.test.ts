import { describe, it, expect, beforeEach } from 'vitest'
import { construirFilas, reconciliarPlanilla, type RepoPlanilla, type SheetsApi } from '../../server/utils/planilla'
import type { ComprobanteDetalle } from '../../shared/types'

const gasto: ComprobanteDetalle = {
  id: 'g1', clase: 'gasto', fecha: '2026-11-19', tipoId: 't-hogar', tipoNombre: 'Gastos hogar',
  concepto: 'almuerzo mediodia', contraparte: 'supermas', ruc: '8002147', rucDv: 6, monto: 8000,
  creadoPorNombre: 'Ana', creadoEn: '2026-11-19T15:00:00Z',
}
const ingreso: ComprobanteDetalle = {
  ...gasto, id: 'i1', clase: 'ingreso', tipoId: 't-sueldos', tipoNombre: 'Sueldos',
  concepto: 'sueldo', contraparte: 'CGR', ruc: '80012457', rucDv: 0, monto: 12000000,
}

describe('construirFilas', () => {
  it('encabezado de gastos', () => expect(construirFilas([], 'gasto')[0]).toEqual(
    ['ID', 'Fecha', 'Tipo', 'Concepto', 'Proveedor', 'RUC', 'Monto', 'Cargado por', 'Fecha de carga']))
  it('encabezado de ingresos dice Pagador', () => expect(construirFilas([], 'ingreso')[0]![4]).toBe('Pagador'))
  it('fila de gasto', () => expect(construirFilas([gasto], 'gasto')[1]).toEqual(
    ['g1', '19/11/2026', 'Gastos hogar', 'almuerzo mediodia', 'supermas', '8002147-6', 8000, 'Ana', '19/11/2026 12:00']))
  it('filtra por clase y ordena por fecha y luego creadoEn', () => {
    const a = { ...gasto, id: 'a', fecha: '2026-11-20', creadoEn: '2026-11-20T10:00:00Z' }
    const b = { ...gasto, id: 'b', fecha: '2026-11-18', creadoEn: '2026-11-21T10:00:00Z' }
    const c = { ...gasto, id: 'c', fecha: '2026-11-20', creadoEn: '2026-11-20T09:00:00Z' }
    const filas = construirFilas([a, ingreso, b, c], 'gasto')
    expect(filas.slice(1).map(f => f[0])).toEqual(['b', 'c', 'a'])
  })
})

describe('reconciliarPlanilla', () => {
  let sheets: SheetsApi & { hojas: string[]; escritas: Record<string, (string | number)[][]>; fallar: Error | null }
  let repo: RepoPlanilla & { estado: unknown }
  let deps: Parameters<typeof reconciliarPlanilla>[0]

  beforeEach(() => {
    sheets = {
      hojas: [], escritas: {}, fallar: null,
      async asegurarHojas(n) { if (this.fallar) throw this.fallar; this.hojas = n },
      async reemplazarHoja(n, f) { if (this.fallar) throw this.fallar; this.escritas[n] = f },
    }
    repo = {
      estado: null,
      async listarVigentes() { return [gasto, ingreso] },
      async guardarEstado(e) { this.estado = e },
    }
    deps = { repo, sheets, ahora: () => new Date('2026-11-19T15:00:00.000Z') }
  })

  it('escribe ambas hojas y marca sincronizado', async () => {
    const r = await reconciliarPlanilla(deps)
    expect(r).toEqual({ ok: true })
    expect(sheets.hojas).toEqual(['Ingresos', 'Gastos'])
    expect(sheets.escritas['Gastos']).toHaveLength(2)
    expect(sheets.escritas['Ingresos']![1]![0]).toBe('i1')
    expect(repo.estado).toEqual({ pendiente: false, ultima_sync: '2026-11-19T15:00:00.000Z', ultimo_error: null })
  })

  it('si Sheets falla, marca pendiente y devuelve el error sin lanzar', async () => {
    sheets.fallar = new Error('quota')
    expect(await reconciliarPlanilla(deps)).toEqual({ ok: false, error: 'quota' })
    expect(repo.estado).toMatchObject({ pendiente: true, ultimo_error: 'quota' })
  })

  it('si la base falla tampoco lanza', async () => {
    repo.listarVigentes = async () => { throw new Error('db caída') }
    expect(await reconciliarPlanilla(deps)).toEqual({ ok: false, error: 'db caída' })
  })
})
