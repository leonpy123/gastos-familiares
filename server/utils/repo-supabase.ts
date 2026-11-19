import type { SupabaseClient } from '@supabase/supabase-js'
import type { Miembro, RepoMiembros } from './miembros'

const COLUMNAS_MIEMBRO = 'id, email, nombre, rol, activo'

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
