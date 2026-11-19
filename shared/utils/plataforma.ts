/** iPhone/iPad (incluido el iPad que se reporta como Mac, detectable por la pantalla táctil). */
export function esIOS(ua: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/.test(ua)) return true
  return /Macintosh/.test(ua) && maxTouchPoints > 1
}
