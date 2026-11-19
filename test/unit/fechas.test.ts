import { describe, it, expect } from 'vitest'
import { parsearFecha, formatearFecha, hoyEnAsuncion } from '../../shared/utils/fechas'

const ahora = new Date('2026-11-19T15:00:00Z')

describe('parsearFecha', () => {
  it.each([
    ['hoy', '2026-11-19'], ['Hoy', '2026-11-19'], ['ayer', '2026-11-18'],
    ['18/11/2026', '2026-11-18'], ['8/1/2026', '2026-01-08'],
    ['18 de noviembre', '2026-11-18'], ['18 de noviembre de 2026', '2026-11-18'],
    ['18 de noviembre del 2025', '2025-11-18'],
  ])('%s', (t, r) => expect(parsearFecha(t, ahora)).toBe(r))
  it.each(['31/02/2026', 'mañana temprano', '', '18/13/2026'])('rechaza %s', t => expect(parsearFecha(t, ahora)).toBeNull())
  it('"hoy" de noche usa la fecha de Asunción', () =>
    expect(parsearFecha('hoy', new Date('2026-11-20T01:30:00Z'))).toBe('2026-11-19'))
  it('"ayer" cruza mes', () => expect(parsearFecha('ayer', new Date('2026-12-01T15:00:00Z'))).toBe('2026-11-30'))
})

describe('hoyEnAsuncion', () => {
  it('devuelve YYYY-MM-DD', () => expect(hoyEnAsuncion(ahora)).toBe('2026-11-19'))
})

describe('formatearFecha', () => {
  it('formatea', () => expect(formatearFecha('2026-11-08')).toBe('08/11/2026'))
})
