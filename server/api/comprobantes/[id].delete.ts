import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { requerirAdmin } from '../../utils/auth'
import { sincronizarPlanilla } from '../../utils/sincronizar'

export default defineEventHandler(async (event) => {
  await requerirAdmin(event)
  const id = getRouterParam(event, 'id')
  const cuerpo = await readBody<{ motivo?: string } | null>(event).catch(() => null)
  const motivo = typeof cuerpo?.motivo === 'string' ? cuerpo.motivo.slice(0, 500) : null

  const db = await serverSupabaseClient(event)
  const { error } = await db.rpc('eliminar_comprobante', { p_id: id, p_motivo: motivo })
  if (error) {
    const m = error.message ?? ''
    if (m.includes('solo el administrador')) throw createError({ statusCode: 403, statusMessage: 'Solo el administrador' })
    if (m.includes('ya está eliminado')) throw createError({ statusCode: 409, statusMessage: 'El comprobante ya está eliminado' })
    if (m.includes('inexistente') || error.code === '22P02') throw createError({ statusCode: 404, statusMessage: 'Comprobante inexistente' })
    throw error
  }

  const sync = await sincronizarPlanilla(serverSupabaseServiceRole(event))
  return { planilla: sync.ok ? 'ok' : 'pendiente' }
})
