import { serverSupabaseServiceRole } from '#supabase/server'
import { asegurarAdminInicial } from '../utils/miembros'
import { crearRepoMiembros } from '../utils/repo-supabase'
import { emailDeSesion, requerirMiembro } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const email = await emailDeSesion(event)
  const repo = crearRepoMiembros(serverSupabaseServiceRole(event))
  await asegurarAdminInicial(email, useRuntimeConfig(event).adminInicialEmail, repo)
  return await requerirMiembro(event)
})
