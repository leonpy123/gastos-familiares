import type { SupabaseClient } from '@supabase/supabase-js'
import type { ComprobanteDetalle, Tipo } from '../../shared/types'
import { aDetalle, aTipo, SELECT_DETALLE, type FilaDetalle } from '../../shared/utils/mapeo'
import type { Miembro, RepoMiembros } from './miembros'
import type { RepoComprobantes } from './crear-comprobante'
import type { EstadoPlanilla, RepoPlanilla } from './planilla'

const COLUMNAS_MIEMBRO = 'id, email, nombre, rol, activo'
const PAGINA = 1000 // máximo de filas que Supabase devuelve por consulta

export function crearRepoMiembros(db: SupabaseClient): RepoMiembros {
  return {
    async buscarPorEmail(email) {
      const { data, error } = await db.from('miembros').select(COLUMNAS_MIEMBRO)
        .eq('email', email.trim().toLowerCase()).maybeSingle()
      if (error) throw error
      return (data as Miembro | null) ?? null
    },
    async hayAdmin() {
      const { count, error } = await db.from('miembros').select('id', { count: 'exact', head: true })
        .eq('rol', 'admin').eq('activo', true)
      if (error) throw error
      return (count ?? 0) > 0
    },
    async crear(m) {
      const { data, error } = await db.from('miembros').insert(m).select(COLUMNAS_MIEMBRO).single()
      if (error) throw error
      return data as Miembro
    },
  }
}

export async function listarTipos(db: SupabaseClient): Promise<Tipo[]> {
  const { data, error } = await db.from('tipos').select('id, clase, nombre, palabras_clave, activo')
  if (error) throw error
  return (data ?? []).map(aTipo)
}

/** Usa el cliente del usuario: la RLS decide quién puede insertar y fija creado_por. */
export function crearRepoComprobantes(db: SupabaseClient): RepoComprobantes {
  return {
    async buscar(id) {
      const { data, error } = await db.from('comprobantes').select('id').eq('id', id).maybeSingle()
      if (error) throw error
      return data
    },
    async insertar(c) {
      const { error } = await db.from('comprobantes').insert({
        id: c.id, clase: c.clase, fecha: c.fecha, tipo_id: c.tipoId, concepto: c.concepto,
        contraparte: c.contraparte, ruc: c.ruc, ruc_dv: c.rucDv, monto: c.monto,
      })
      if (error?.code === '23505') return 'duplicado'
      if (error) throw error
      return 'insertado'
    },
  }
}

/** Usa el cliente service role (lectura completa y estado de la planilla). */
export function crearRepoPlanilla(db: SupabaseClient): RepoPlanilla {
  return {
    async listarVigentes() {
      const todos: ComprobanteDetalle[] = []
      for (let desde = 0; ; desde += PAGINA) {
        const { data, error } = await db.from('comprobantes').select(SELECT_DETALLE)
          .is('eliminado_en', null).order('creado_en').order('id').range(desde, desde + PAGINA - 1)
        if (error) throw error
        const filas = (data ?? []) as unknown as FilaDetalle[]
        todos.push(...filas.map(aDetalle))
        if (filas.length < PAGINA) return todos
      }
    },
    async guardarEstado(cambios: Partial<EstadoPlanilla>) {
      const { data, error } = await db.from('configuracion').select('valor').eq('clave', 'planilla').maybeSingle()
      if (error) throw error
      const valor = { pendiente: false, ultima_sync: null, ultimo_error: null, ...(data?.valor ?? {}), ...cambios }
      const { error: e2 } = await db.from('configuracion').upsert({ clave: 'planilla', valor })
      if (e2) throw e2
    },
  }
}
