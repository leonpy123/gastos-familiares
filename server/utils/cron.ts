import { createHash, timingSafeEqual } from 'node:crypto'

const huella = (s: string) => createHash('sha256').update(s).digest()

/** Vercel Cron envía "Authorization: Bearer <CRON_SECRET>". */
export function autorizarCron(encabezado: string | undefined, secreto: string | undefined): boolean {
  if (!secreto || !encabezado) return false
  return timingSafeEqual(huella(encabezado), huella(`Bearer ${secreto}`))
}
