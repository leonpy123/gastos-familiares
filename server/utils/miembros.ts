export interface Miembro {
  id: string
  email: string
  nombre: string
  rol: 'admin' | 'miembro'
  activo: boolean
}

export interface RepoMiembros {
  buscarPorEmail(email: string): Promise<Miembro | null>
  hayAdmin(): Promise<boolean>
  crear(m: { email: string; nombre: string; rol: 'admin' }): Promise<Miembro>
}

/**
 * Si todavía no hay ningún admin y quien entra es el email configurado en
 * ADMIN_INICIAL_EMAIL, lo registra como primer administrador.
 */
export async function asegurarAdminInicial(
  email: string,
  adminInicial: string | undefined,
  repo: RepoMiembros,
): Promise<void> {
  const objetivo = adminInicial?.trim().toLowerCase()
  const actual = email.trim().toLowerCase()
  if (!objetivo || actual !== objetivo) return
  if (await repo.hayAdmin()) return
  if (await repo.buscarPorEmail(actual)) return
  await repo.crear({ email: actual, nombre: actual, rol: 'admin' })
}
