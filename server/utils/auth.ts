import type { H3Event } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { Miembro } from './miembros'
import { crearRepoMiembros } from './repo-supabase'

export async function emailDeSesion(event: H3Event): Promise<string> {
  const usuario = await serverSupabaseUser(event)
  const email = typeof usuario?.email === 'string' ? usuario.email : null
  if (!email) throw createError({ statusCode: 401, statusMessage: 'Sin sesión' })
  return email
}

/** Exige sesión de un miembro activo. 401 sin sesión, 403 si la cuenta no está autorizada. */
export async function requerirMiembro(event: H3Event): Promise<Miembro> {
  const email = await emailDeSesion(event)
  const miembro = await crearRepoMiembros(serverSupabaseServiceRole(event)).buscarPorEmail(email)
  if (!miembro || !miembro.activo) throw createError({ statusCode: 403, statusMessage: 'Cuenta no autorizada' })
  return miembro
}

/** Exige un administrador activo. */
export async function requerirAdmin(event: H3Event): Promise<Miembro> {
  const miembro = await requerirMiembro(event)
  if (miembro.rol !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Solo el administrador' })
  return miembro
}
