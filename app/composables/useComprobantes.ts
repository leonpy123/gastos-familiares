import type { ComprobanteDetalle } from '../../shared/types'
import { aDetalle, SELECT_DETALLE, type FilaDetalle } from '../../shared/utils/mapeo'
import { hoyEnAsuncion } from '../../shared/utils/fechas'

const PAGINA = 1000

export interface Periodo { anio: number; mes?: number }

/** Período elegido en el dashboard, compartido con el listado. Por defecto, el mes actual de Asunción. */
export function usePeriodo() {
  return useState<Periodo>('periodo', () => {
    const [a, m] = hoyEnAsuncion(new Date()).split('-').map(Number)
    return { anio: a!, mes: m! }
  })
}

/** Comprobantes vigentes (no eliminados) entre dos fechas, paginando de a 1000. */
export async function cargarComprobantes(desde: string, hasta: string): Promise<ComprobanteDetalle[]> {
  const supabase = useSupabaseClient()
  const todos: ComprobanteDetalle[] = []
  for (let i = 0; ; i += PAGINA) {
    const { data, error } = await supabase.from('comprobantes').select(SELECT_DETALLE)
      .is('eliminado_en', null).gte('fecha', desde).lte('fecha', hasta)
      .order('fecha', { ascending: false }).order('creado_en', { ascending: false })
      .range(i, i + PAGINA - 1)
    if (error) throw error
    const filas = (data ?? []) as unknown as FilaDetalle[]
    todos.push(...filas.map(aDetalle))
    if (filas.length < PAGINA) return todos
  }
}

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto',
  'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
