import { esIOS } from '../../shared/utils/plataforma'

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
      const texto = Array.from(e.results as ArrayLike<any>).map(r => r[0].transcript).join(' ').trim()
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
