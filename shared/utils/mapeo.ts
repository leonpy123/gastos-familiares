import type { Clase, ComprobanteDetalle, Tipo } from '../types'

/** Columnas para leer comprobantes con el nombre del tipo y de quien lo cargó. */
export const SELECT_DETALLE =
  'id, clase, fecha, tipo_id, concepto, contraparte, ruc, ruc_dv, monto, creado_en, ' +
  'tipo:tipos(nombre), creador:miembros!comprobantes_creado_por_fkey(nombre)'

export interface FilaDetalle {
  id: string
  clase: Clase
  fecha: string
  tipo_id: string
  concepto: string
  contraparte: string
  ruc: string
  ruc_dv: number
  monto: number | string
  creado_en: string
  tipo: { nombre: string } | null
  creador: { nombre: string } | null
}

export function aDetalle(f: FilaDetalle): ComprobanteDetalle {
  return {
    id: f.id,
    clase: f.clase,
    fecha: f.fecha,
    tipoId: f.tipo_id,
    tipoNombre: f.tipo?.nombre ?? '',
    concepto: f.concepto,
    contraparte: f.contraparte,
    ruc: f.ruc,
    rucDv: f.ruc_dv,
    monto: Number(f.monto),
    creadoPorNombre: f.creador?.nombre ?? '',
    creadoEn: f.creado_en,
  }
}

export function aTipo(f: { id: string; clase: Clase; nombre: string; palabras_clave: string[] | null; activo: boolean }): Tipo {
  return { id: f.id, clase: f.clase, nombre: f.nombre, palabras_clave: f.palabras_clave ?? [], activo: f.activo }
}
