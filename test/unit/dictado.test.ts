import { describe, it, expect } from 'vitest'
import { parsearDictado, resolverTipo } from '../../shared/utils/dictado'
import type { Tipo } from '../../shared/types'

const idHogar = 't-hogar', idSueldos = 't-sueldos'
const tipos: Tipo[] = [
  { id: idHogar, clase: 'gasto', nombre: 'Gastos hogar', palabras_clave: ['hogar', 'gastos hogar'], activo: true },
  { id: 't-prestamos', clase: 'gasto', nombre: 'Préstamos', palabras_clave: ['prestamo', 'prestamos'], activo: true },
  { id: 't-viejo', clase: 'gasto', nombre: 'Viejo', palabras_clave: ['viejo'], activo: false },
  { id: idSueldos, clase: 'ingreso', nombre: 'Sueldos', palabras_clave: ['sueldo', 'sueldos'], activo: true },
]
const ctx = { separadores: ['tab', 'tap'], tipos, ahora: new Date('2026-11-19T15:00:00Z') }

describe('parsearDictado', () => {
  it('gasto del ejemplo', () => expect(parsearDictado(
    'gasto tab hoy tab hogar tab almuerzo mediodia tab supermas tab 8002147 tab 8.000', ctx))
    .toEqual({ ok: true, borrador: { clase: 'gasto', fecha: '2026-11-19', tipoId: idHogar,
      concepto: 'almuerzo mediodia', contraparte: 'supermas', ruc: '8002147', monto: 8000 } }))
  it('ingreso del ejemplo', () => expect(parsearDictado(
    'ingreso tab 18/11/2026 tab sueldos tab sueldo de noviembre tab CGR tab 80012457 tab 12.000.000', ctx))
    .toMatchObject({ ok: true, borrador: { clase: 'ingreso', fecha: '2026-11-18', tipoId: idSueldos, contraparte: 'CGR', monto: 12000000 } }))
  it('estilo iOS: mayúsculas, "Tab" y punto final', () => expect(parsearDictado(
    'Gasto Tab hoy Tab Hogar Tab almuerzo Tab Supermas Tab 8002147 Tab 8.000.', ctx).ok).toBe(true))
  it('comas como separador', () => expect(parsearDictado(
    'gasto, hoy, hogar, almuerzo, supermas, 8002147, 8.000', ctx).ok).toBe(true))
  it('"tap" como variante', () => expect(parsearDictado(
    'gasto tap hoy tap hogar tap almuerzo tap supermas tap 8002147 tap 8000', ctx).ok).toBe(true))
  it('"tabla" dentro del concepto no separa', () => expect(parsearDictado(
    'gasto tab hoy tab hogar tab tabla de picar tab supermas tab 8002147 tab 8000', ctx))
    .toMatchObject({ borrador: { concepto: 'tabla de picar' } }))
  it('tipo con tilde dictado sin tilde', () => expect(parsearDictado(
    'gasto tab hoy tab préstamos tab cuota tab banco tab 8002147 tab 8000', ctx))
    .toMatchObject({ borrador: { tipoId: 't-prestamos' } }))
  it('tipo no registrado', () => expect(parsearDictado(
    'gasto tab hoy tab comida rapida tab x tab y tab 8002147 tab 8000', ctx))
    .toEqual({ ok: false, errores: ['El tipo "comida rapida" no está registrado.'] }))
  it('tipo inactivo se rechaza', () => expect(parsearDictado(
    'gasto tab hoy tab viejo tab x tab y tab 8002147 tab 8000', ctx).ok).toBe(false))
  it('tipo de ingreso en un gasto se rechaza', () => expect(parsearDictado(
    'gasto tab hoy tab sueldos tab x tab y tab 8002147 tab 8000', ctx).ok).toBe(false))
  it('cantidad de campos', () => expect(parsearDictado('gasto tab hoy tab hogar', ctx))
    .toEqual({ ok: false, errores: ['Se esperaban 7 campos y se recibieron 3. Orden: gasto · fecha · tipo · concepto · proveedor · RUC · monto.'] }))
  it('cantidad de campos en ingreso dice pagador', () => expect(parsearDictado('ingreso tab hoy', ctx))
    .toEqual({ ok: false, errores: ['Se esperaban 7 campos y se recibieron 2. Orden: ingreso · fecha · tipo · concepto · pagador · RUC · monto.'] }))
  it('primera palabra', () => expect(parsearDictado('compra tab hoy tab hogar tab a tab b tab 8002147 tab 1', ctx))
    .toEqual({ ok: false, errores: ["Debe empezar con 'gasto' o 'ingreso'."] }))
  it('iOS con punto en cada pausa', () => expect(parsearDictado(
    'Gasto. Tab hoy. Tab hogar. Tab almuerzo. Tab Supermas. Tab 8002147. Tab 8.000.', ctx))
    .toEqual({ ok: true, borrador: { clase: 'gasto', fecha: '2026-11-19', tipoId: idHogar,
      concepto: 'almuerzo', contraparte: 'Supermas', ruc: '8002147', monto: 8000 } }))
  it('iOS con coma en cada pausa', () => expect(parsearDictado(
    'Gasto, tab, hoy, tab, hogar, tab, almuerzo, tab, supermas, tab, 8002147, tab, 8.000', ctx))
    .toMatchObject({ ok: true, borrador: { concepto: 'almuerzo', contraparte: 'supermas', monto: 8000 } }))
  it('punto y coma o dos puntos junto al separador', () => expect(parsearDictado(
    'gasto; tab hoy: tab hogar tab almuerzo tab supermas tab 8002147 tab 8000', ctx).ok).toBe(true))
  it('con palabra separadora, la coma dentro de un campo se conserva', () => expect(parsearDictado(
    'gasto tab hoy tab hogar tab pan, leche tab super tab 8002147 tab 8000', ctx))
    .toMatchObject({ ok: true, borrador: { concepto: 'pan, leche' } }))
  it('monto con coma decimal da error de monto, no de cantidad de campos', () => expect(parsearDictado(
    'gasto tab hoy tab hogar tab pan tab super tab 8002147 tab 1,5 millones', ctx))
    .toEqual({ ok: false, errores: ['No se entendió el monto "1,5 millones".'] }))
  it('junta varios errores', () => expect((parsearDictado(
    'gasto tab nunca tab hogar tab a tab b tab 12 tab mucho', ctx) as any).errores).toEqual([
    'No se entendió la fecha "nunca".', 'RUC inválido "12".', 'No se entendió el monto "mucho".']))
})

describe('resolverTipo', () => {
  const tiposConDosCasa: Tipo[] = [
    { id: 'a', clase: 'gasto', nombre: 'Casa A', palabras_clave: ['casa'], activo: true },
    { id: 'b', clase: 'gasto', nombre: 'Casa B', palabras_clave: ['casa'], activo: true },
  ]
  it('ambiguo', () => expect(resolverTipo('casa', 'gasto', tiposConDosCasa))
    .toEqual({ ok: false, error: 'El tipo "casa" coincide con varios tipos: Casa A, Casa B. Sé más específico.' }))
  it('por nombre', () => expect(resolverTipo('Gastos Hogar', 'gasto', tipos)).toMatchObject({ ok: true, tipo: { id: idHogar } }))
})
