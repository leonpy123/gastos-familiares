/** ¿Es una clave de Supabase que nunca debe llegar al navegador? (secret nueva o service_role JWT) */
export function esClaveSecreta(clave: string | undefined): boolean {
  if (!clave) return false
  if (clave.startsWith('sb_secret_')) return true
  const partes = clave.split('.')
  if (partes.length !== 3) return false
  try {
    const carga = JSON.parse(Buffer.from(partes[1]!, 'base64url').toString('utf8'))
    return carga?.role === 'service_role'
  } catch {
    return false
  }
}
