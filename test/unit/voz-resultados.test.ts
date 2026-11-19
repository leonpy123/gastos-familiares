import { describe, it, expect } from 'vitest'
import { textoNuevo, textoProvisorio } from '../../shared/utils/voz'

// Forma de SpeechRecognitionEvent.results: lista acumulada desde que empezó la escucha.
const r = (transcript: string, isFinal = true) => Object.assign([{ transcript }], { isFinal })

describe('textoNuevo', () => {
  it('toma solo los resultados a partir de resultIndex (no repite lo ya agregado)', () => {
    const resultados = [r('gasto siguiente hoy'), r(' siguiente hogar siguiente almuerzo')]
    expect(textoNuevo(resultados, 1)).toBe('siguiente hogar siguiente almuerzo')
  })
  it('ignora resultados provisorios', () => {
    expect(textoNuevo([r('gasto'), r('siguien', false)], 0)).toBe('gasto')
  })
  it('junta varios resultados nuevos', () => {
    expect(textoNuevo([r('gasto'), r('siguiente hoy')], 0)).toBe('gasto siguiente hoy')
  })
  it('nada nuevo', () => expect(textoNuevo([r('gasto')], 1)).toBe(''))
})

describe('textoProvisorio', () => {
  it('lo que todavía no es definitivo', () =>
    expect(textoProvisorio([r('gasto'), r('siguiente ho', false)], 0)).toBe('siguiente ho'))
  it('sin provisorios', () => expect(textoProvisorio([r('gasto')], 0)).toBe(''))
})
