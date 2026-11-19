import { serverSupabaseServiceRole } from '#supabase/server'
import { autorizarCron } from '../../utils/cron'
import { sincronizarPlanilla } from '../../utils/sincronizar'

export default defineEventHandler(async (event) => {
  if (!autorizarCron(getHeader(event, 'authorization'), process.env.CRON_SECRET)) {
    throw createError({ statusCode: 401, statusMessage: 'No autorizado' })
  }
  return await sincronizarPlanilla(serverSupabaseServiceRole(event))
})
