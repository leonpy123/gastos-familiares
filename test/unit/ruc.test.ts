import { describe, it, expect } from 'vitest'
import { calcularDV, formatearRuc, normalizarRuc } from '../../shared/utils/ruc'

describe('calcularDV', () => {
  it('DV de 8002147 es 6', () => expect(calcularDV('8002147')).toBe(6))
  it('DV de 80012457 es 0 (resto ≤ 1)', () => expect(calcularDV('80012457')).toBe(0))
  it('DV de 1234567 es 9', () => expect(calcularDV('1234567')).toBe(9))
})

describe('formatearRuc', () => {
  it('formatea', () => expect(formatearRuc('8002147')).toBe('8002147-6'))
})

describe('normalizarRuc', () => {
  it.each([['8002147', '8002147'], ['8 002 147', '8002147'], ['8.002.147', '8002147'], ['8002147-6', '8002147']])
    ('normaliza %s', (t, r) => expect(normalizarRuc(t)).toBe(r))
  it.each(['1234', '1234567890', 'abc', ''])('rechaza %s', t => expect(normalizarRuc(t)).toBeNull())
})
