import { describe, it, expect } from 'vitest'
import { analizarDictadoParcial } from '../../shared/utils/dictado'
import type { Tipo } from '../../shared/types'

const tipos: Tipo[] = [
  { id: 't-hogar', clase: 'gasto', nombre: 'Gastos hogar', palabras_clave: ['hogar'], activo: true },
  { id: 't-prest', clase: 'gasto', nombre: 'Préstamos', palabras_clave: ['prestamo'], activo: true },
  { id: 't-viejo', clase: 'gasto', nombre: 'Viejo', palabras_clave: [], activo: false },
  { id: 't-sueldos', clase: 'ingreso', nombre: 'Sueldos', palabras_clave: ['sueldo'], activo: true },
]
const ctx = { separadores: ['siguiente'], tipos, ahora: new Date('2026-11-19T15:00:00Z') }
const p = (t: string) => analizarDictadoParcial(t, ctx)

describe('analizarDictadoParcial', () => {
  it('vacío: está en la clase', () => expect(p('')).toMatchObject({ campoActual: 'clase', clase: null }))
  it('diciendo la clase', () => expect(p('gas')).toMatchObject({ campoActual: 'clase', clase: null }))
  it('después del separador pasa a la fecha', () => expect(p('gasto siguiente')).toMatchObject({ campoActual: 'fecha', clase: 'gasto' }))
  it('fecha reconocida mientras sigue en el campo', () => expect(p('gasto siguiente hoy')).toMatchObject({ campoActual: 'fecha', fecha: '2026-11-19' }))
  it('en el tipo muestra todos los tipos activos de la clase', () =>
    expect(p('gasto siguiente hoy siguiente').sugerenciasTipo.map(t => t.id)).toEqual(['t-hogar', 't-prest']))
  it('filtra las sugerencias por lo que va diciendo', () =>
    expect(p('gasto siguiente hoy siguiente ho').sugerenciasTipo.map(t => t.id)).toEqual(['t-hogar']))
  it('reconoce el tipo', () => expect(p('gasto siguiente hoy siguiente hogar')).toMatchObject({ campoActual: 'tipo', tipoId: 't-hogar' }))
  it('fuera del campo tipo no hay sugerencias', () =>
    expect(p('gasto siguiente hoy siguiente hogar siguiente alm').sugerenciasTipo).toEqual([]))
  it('concepto y proveedor en vivo', () => expect(p('gasto siguiente hoy siguiente hogar siguiente almuerzo siguiente super'))
    .toMatchObject({ campoActual: 'contraparte', concepto: 'almuerzo', contraparte: 'super' }))
  it('RUC parcial en palabras', () => expect(p('gasto siguiente hoy siguiente hogar siguiente a siguiente b siguiente ocho cero cero'))
    .toMatchObject({ campoActual: 'ruc', ruc: '800' }))
  it('completo', () => expect(p('gasto siguiente hoy siguiente hogar siguiente almuerzo siguiente supermas siguiente 8002147 siguiente ocho mil'))
    .toMatchObject({ campoActual: 'monto', ruc: '8002147', monto: 8000 }))
  it('ingreso usa los tipos de ingreso', () =>
    expect(p('ingreso siguiente hoy siguiente').sugerenciasTipo.map(t => t.id)).toEqual(['t-sueldos']))
})
