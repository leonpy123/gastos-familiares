import { serverSupabaseServiceRole } from '#supabase/server'
import { requerirAdmin } from '../../utils/auth'
import { sincronizarPlanilla } from '../../utils/sincronizar'

export default defineEventHandler(async (event) => {
  await requerirAdmin(event)
  return await sincronizarPlanilla(serverSupabaseServiceRole(event))
})
