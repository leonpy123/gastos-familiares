import { describe, it, expect } from 'vitest'
import { aDetalle } from '../../shared/utils/mapeo'

describe('aDetalle', () => {
  it('convierte la fila de Supabase (bigint como texto) al tipo de la app', () => {
    expect(aDetalle({
      id: 'c1', clase: 'gasto', fecha: '2026-11-19', tipo_id: 't1', concepto: 'pan', contraparte: 'x',
      ruc: '8002147', ruc_dv: 6, monto: '12000000', creado_en: '2026-11-19T15:00:00Z',
      tipo: { nombre: 'Gastos hogar' }, creador: { nombre: 'Ana' },
    })).toEqual({
      id: 'c1', clase: 'gasto', fecha: '2026-11-19', tipoId: 't1', tipoNombre: 'Gastos hogar', concepto: 'pan',
      contraparte: 'x', ruc: '8002147', rucDv: 6, monto: 12000000, creadoPorNombre: 'Ana', creadoEn: '2026-11-19T15:00:00Z',
    })
  })
})
