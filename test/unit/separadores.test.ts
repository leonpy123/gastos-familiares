import { describe, it, expect } from 'vitest'
import { parsearSeparadores } from '../../shared/utils/separadores'
import type { Tipo } from '../../shared/types'

const tipos: Tipo[] = [
  { id: '1', clase: 'gasto', nombre: 'Gastos hogar', palabras_clave: ['hogar'], activo: true },
  { id: '2', clase: 'ingreso', nombre: 'Sueldos', palabras_clave: ['sueldo'], activo: true },
]

describe('parsearSeparadores', () => {
  it('lista separada por comas', () => expect(parsearSeparadores('tab, tap', tipos)).toEqual({ ok: true, valor: ['tab', 'tap'] }))
  it('normaliza', () => expect(parsearSeparadores(' Siguiente ', tipos)).toEqual({ ok: true, valor: ['siguiente'] }))
  it('quita repetidos', () => expect(parsearSeparadores('tab, Tab', tipos)).toEqual({ ok: true, valor: ['tab'] }))
  it('vacío', () => expect(parsearSeparadores('', tipos)).toEqual({ ok: false, error: 'Ingresa al menos una palabra.' }))
  it('números o símbolos', () => expect(parsearSeparadores('tab, 12', tipos)).toEqual({ ok: false, error: 'Solo palabras, sin números ni símbolos.' }))
  it('palabra clave de un tipo', () => expect(parsearSeparadores('hogar', tipos)).toEqual({ ok: false, error: '"hogar" ya es un tipo; elige otra palabra.' }))
  it('nombre de un tipo', () => expect(parsearSeparadores('sueldos', tipos)).toEqual({ ok: false, error: '"sueldos" ya es un tipo; elige otra palabra.' }))
  it.each(['gasto', 'ingreso', 'hoy', 'ayer'])('palabra reservada del dictado %s', p =>
    expect(parsearSeparadores(p, tipos)).toEqual({ ok: false, error: `"${p}" se usa en el dictado; elige otra palabra.` }))
})
