import type { Tipo } from '../../shared/types'
import { aTipo } from '../../shared/utils/mapeo'

/** Todos los tipos (activos e inactivos); filtrar activos donde corresponda. */
export function useTipos() {
  const tipos = useState<Tipo[]>('tipos', () => [])
  const supabase = useSupabaseClient()

  async function cargar() {
    const { data, error } = await supabase.from('tipos').select('id, clase, nombre, palabras_clave, activo').order('nombre')
    if (error) throw error
    tipos.value = (data ?? []).map(aTipo)
  }

  return { tipos, cargar }
}

/** Palabras separadoras del dictado configuradas por el admin. */
export function useSeparadores() {
  const separadores = useState<string[]>('separadores', () => ['tab', 'tap'])
  const supabase = useSupabaseClient()

  async function cargar() {
    const { data, error } = await supabase.from('configuracion').select('valor').eq('clave', 'separadores_dictado').maybeSingle()
    if (error) throw error
    if (Array.isArray(data?.valor)) separadores.value = data.valor as string[]
  }

  return { separadores, cargar }
}
