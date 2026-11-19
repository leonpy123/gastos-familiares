import { esIOS } from '#shared/utils/plataforma'
import { textoNuevo } from '#shared/utils/voz'

/**
 * Micrófono con la Web Speech API (Android / Chrome). En iPhone no se usa: allí se dicta
 * con el micrófono del teclado, que es más confiable.
 */
export function useReconocimientoVoz() {
  const soportado = ref(false)
  const escuchando = ref(false)
  let reconocedor: any = null

  const clase = () => (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

  onMounted(() => {
    soportado.value = !!clase() && !esIOS(navigator.userAgent, navigator.maxTouchPoints)
  })

  function iniciar(alTexto: (texto: string) => void) {
    const SR = clase()
    if (!SR) return
    reconocedor = new SR()
    reconocedor.lang = 'es-419'
    reconocedor.continuous = true
    reconocedor.interimResults = false
    reconocedor.onresult = (e: any) => {
      // e.results es acumulado: solo se agrega lo nuevo (desde e.resultIndex), si no el texto se repite.
      const texto = textoNuevo(e.results, e.resultIndex)
      if (texto) alTexto(texto)
    }
    reconocedor.onend = () => { escuchando.value = false }
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
