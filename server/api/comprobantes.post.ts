import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import type { BorradorComprobante } from '../../shared/types'
import { requerirMiembro } from '../utils/auth'
import { crearComprobante } from '../utils/crear-comprobante'
import { crearRepoComprobantes, listarTipos } from '../utils/repo-supabase'
import { sincronizarPlanilla } from '../utils/sincronizar'

export default defineEventHandler(async (event) => {
  await requerirMiembro(event)
  const entrada = await readBody<BorradorComprobante>(event)
  const db = await serverSupabaseClient(event)

  const resultado = await crearComprobante(entrada ?? ({} as BorradorComprobante), {
    repo: crearRepoComprobantes(db),
    tipos: await listarTipos(db),
    sincronizar: () => sincronizarPlanilla(serverSupabaseServiceRole(event)),
  })

  if (resultado.estado === 'invalido') {
    setResponseStatus(event, 400)
    return { errores: resultado.errores }
  }
  setResponseStatus(event, resultado.estado === 'creado' ? 201 : 200)
  return { planilla: resultado.planilla }
})
