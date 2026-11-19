import { describe, it, expect } from 'vitest'
import { parsearMonto, formatearGs } from '../../shared/utils/montos'
import { normalizar } from '../../shared/utils/texto'

describe('parsearMonto', () => {
  it.each([
    ['8.000', 8000], ['12.000.000', 12000000], ['8000', 8000], ['8 000', 8000],
    ['8 mil', 8000], ['12 millones', 12000000], ['1 millón', 1000000],
    ['Gs. 8.000', 8000], ['₲ 8.000', 8000], ['8.000.', 8000],
  ])('%s → %d', (t, n) => expect(parsearMonto(t)).toBe(n))
  it.each(['0', 'abc', '8,50', '8.5', '', '-500'])('rechaza %s', t => expect(parsearMonto(t)).toBeNull())
})

describe('formatearGs', () => {
  it('usa punto de miles', () => expect(formatearGs(12000000)).toBe('Gs. 12.000.000'))
  it('montos chicos', () => expect(formatearGs(500)).toBe('Gs. 500'))
})

describe('normalizar', () => {
  it('quita tildes y mayúsculas', () => expect(normalizar('  Préstamos  ')).toBe('prestamos'))
})
