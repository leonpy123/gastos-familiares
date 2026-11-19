import { describe, it, expect } from 'vitest'
import { validarComprobante } from '../../shared/utils/validacion'
import type { BorradorComprobante, Tipo } from '../../shared/types'

const idHogar = 't-hogar', idViejo = 't-viejo', idSueldos = 't-sueldos'
const tipos: Tipo[] = [
  { id: idHogar, clase: 'gasto', nombre: 'Gastos hogar', palabras_clave: ['hogar'], activo: true },
  { id: idViejo, clase: 'gasto', nombre: 'Viejo', palabras_clave: [], activo: false },
  { id: idSueldos, clase: 'ingreso', nombre: 'Sueldos', palabras_clave: ['sueldos'], activo: true },
]
const base: BorradorComprobante = {
  id: 'c1', clase: 'gasto', fecha: '2026-11-19', tipoId: idHogar, concepto: 'almuerzo',
  contraparte: 'supermas', ruc: '8002147', monto: 8000,
}
const baseIngreso: BorradorComprobante = { ...base, clase: 'ingreso', tipoId: idSueldos, contraparte: 'CGR' }

describe('validarComprobante', () => {
  it('válido', () => expect(validarComprobante(base, tipos)).toEqual([]))
  it('ingreso válido', () => expect(validarComprobante(baseIngreso, tipos)).toEqual([]))
  it('tipo inexistente', () => expect(validarComprobante({ ...base, tipoId: 'x' }, tipos)).toContain('El tipo no está registrado.'))
  it('tipo inactivo', () => expect(validarComprobante({ ...base, tipoId: idViejo }, tipos)).toContain('El tipo no está registrado.'))
  it('tipo de otra clase', () => expect(validarComprobante({ ...base, tipoId: idSueldos }, tipos)).toContain('El tipo no corresponde a un gasto.'))
  it('concepto vacío', () => expect(validarComprobante({ ...base, concepto: '  ' }, tipos)).toContain('Falta el concepto.'))
  it('concepto muy largo', () => expect(validarComprobante({ ...base, concepto: 'a'.repeat(201) }, tipos)).toContain('El concepto es demasiado largo.'))
  it('proveedor vacío en gasto', () => expect(validarComprobante({ ...base, contraparte: '' }, tipos)).toContain('Falta el proveedor.'))
  it('pagador vacío en ingreso', () => expect(validarComprobante({ ...baseIngreso, contraparte: '' }, tipos)).toContain('Falta el pagador.'))
  it('RUC inválido', () => expect(validarComprobante({ ...base, ruc: '12' }, tipos)).toContain('RUC inválido.'))
  it.each([0, -5, 1.5, 1e12])('monto %d inválido', m => expect(validarComprobante({ ...base, monto: m }, tipos)).toContain('Monto inválido.'))
  it('fecha inválida', () => expect(validarComprobante({ ...base, fecha: '2026-02-31' }, tipos)).toContain('Fecha inválida.'))
  it('clase inválida', () => expect(validarComprobante({ ...base, clase: 'otro' as any }, tipos)).toContain('Clase inválida.'))
})
