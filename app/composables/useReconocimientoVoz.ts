import { esIOS } from '#shared/utils/plataforma'
import { textoNuevo, textoProvisorio } from '#shared/utils/voz'

interface Oyentes {
  /** Texto nuevo y definitivo, para agregar al dictado. */
  alFinal: (texto: string) => void
  /** Lo que se está reconociendo ahora (provisorio), para mostrar en vivo. */
  alProvisorio?: (texto: string) => void
  /** Se detuvo la escucha (por el botón o porque el navegador la cortó). */
  alTerminar?: () => void
}

/**
 * Micrófono con la Web Speech API (Chrome/Edge en PC y Android). En iPhone no se usa: allí se dicta
 * con el micrófono del teclado, que escribe en el cuadro a medida que se habla.
 */
export function useReconocimientoVoz() {
  const soportado = ref(false)
  const escuchando = ref(false)
  let reconocedor: any = null

  const clase = () => (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

  onMounted(() => {
    soportado.value = !!clase() && !esIOS(navigator.userAgent, navigator.maxTouchPoints)
  })

  function iniciar(oyentes: Oyentes) {
    const SR = clase()
    if (!SR) return
    reconocedor = new SR()
    reconocedor.lang = 'es-419'
    reconocedor.continuous = true
    reconocedor.interimResults = true
    reconocedor.onresult = (e: any) => {
      // e.results es acumulado: solo se agrega lo nuevo (desde e.resultIndex), si no el texto se repite.
      const final = textoNuevo(e.results, e.resultIndex)
      if (final) oyentes.alFinal(final)
      oyentes.alProvisorio?.(textoProvisorio(e.results, e.resultIndex))
    }
    const terminar = () => {
      escuchando.value = false
      oyentes.alProvisorio?.('')
      oyentes.alTerminar?.()
    }
    reconocedor.onend = terminar
    reconocedor.onerror = () => { escuchando.value = false }
    reconocedor.start()
    escuchando.value = true
  }

  function detener() {
    reconocedor?.stop()
  }

  onBeforeUnmount(detener)

  return { soportado, escuchando, iniciar, detener }
}
