import { describe, it, expect } from 'vitest'
import { palabrasANumero, palabrasADigitos } from '../../shared/utils/numeros'

describe('palabrasANumero (montos y años)', () => {
  it.each([
    ['ocho mil', 8000],
    ['doce millones', 12000000],
    ['un millón quinientos mil', 1500000],
    ['dos millones trescientos mil', 2300000],
    ['mil quinientos', 1500],
    ['trescientos cincuenta mil', 350000],
    ['ochenta y cinco mil', 85000],
    ['cien mil', 100000],
    ['ciento veinte mil', 120000],
    ['veintidós mil', 22000],
    ['quinientos', 500],
    ['ocho mil guaraníes', 8000],
    ['dos mil veintiséis', 2026],
    ['8 mil quinientos', 8500],
  ])('%s → %d', (t, n) => expect(palabrasANumero(t)).toBe(n))
  it.each(['', 'mucho', 'ocho manzanas'])('rechaza %s', t => expect(palabrasANumero(t)).toBeNull())
})

describe('palabrasADigitos (RUC dictado por grupos)', () => {
  it.each([
    ['ocho cero cero veintiuno cuarenta y siete', '8002147'],
    ['ochenta cero doce cuatro cincuenta y siete', '80012457'],
    ['ocho cero cero dos uno cuatro siete', '8002147'],
    ['ochocientos dos ciento cuarenta y siete', '802147'],
    ['800 veintiuno 47', '80021 47'.replace(' ', '')],
  ])('%s → %s', (t, d) => expect(palabrasADigitos(t)).toBe(d))
  it('rechaza palabras que no son números', () => expect(palabrasADigitos('ocho perros')).toBeNull())
})
