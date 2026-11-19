import type { SupabaseClient } from '@supabase/supabase-js'
import { reconciliarPlanilla, type SheetsApi } from './planilla'
import { crearRepoPlanilla } from './repo-supabase'
import { crearSheetsGoogle } from './sheets-google'

/** Reescribe la planilla desde la base (cliente service role). Nunca lanza. */
export async function sincronizarPlanilla(dbServicio: SupabaseClient): Promise<{ ok: boolean; error?: string }> {
  const repo = crearRepoPlanilla(dbServicio)
  let sheets: SheetsApi
  try {
    sheets = crearSheetsGoogle()
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    await repo.guardarEstado({ pendiente: true, ultimo_error: error }).catch(() => {})
    return { ok: false, error }
  }
  return reconciliarPlanilla({ repo, sheets, ahora: () => new Date() })
}
