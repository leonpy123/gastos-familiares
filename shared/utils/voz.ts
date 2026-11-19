/** Un resultado de la Web Speech API: lista de alternativas + si ya es definitivo. */
export type ResultadoVoz = ArrayLike<{ transcript: string }> & { isFinal: boolean }

/**
 * Texto nuevo de un evento de reconocimiento continuo. `results` trae todo lo reconocido desde
 * que empezó la escucha; solo lo que está desde `resultIndex` es nuevo, y solo se toma lo definitivo.
 */
export function textoNuevo(results: ArrayLike<ResultadoVoz>, resultIndex: number): string {
  return Array.from(results)
    .slice(resultIndex)
    .filter(r => r.isFinal)
    .map(r => r[0]?.transcript.trim() ?? '')
    .filter(Boolean)
    .join(' ')
}

/** Lo reconocido que todavía no es definitivo (se muestra en vivo mientras se habla). */
export function textoProvisorio(results: ArrayLike<ResultadoVoz>, resultIndex: number): string {
  return Array.from(results)
    .slice(resultIndex)
    .filter(r => !r.isFinal)
    .map(r => r[0]?.transcript.trim() ?? '')
    .filter(Boolean)
    .join(' ')
}
