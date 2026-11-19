export type Clase = 'ingreso' | 'gasto'

export interface Tipo {
  id: string
  clase: Clase
  nombre: string
  palabras_clave: string[]
  activo: boolean
}

export interface BorradorComprobante {
  /** UUID generado en el cliente al abrir el formulario (idempotencia) */
  id: string
  clase: Clase
  /** 'YYYY-MM-DD' */
  fecha: string
  tipoId: string
  concepto: string
  /** proveedor (gasto) o pagador (ingreso) */
  contraparte: string
  /** base sin DV, solo dígitos */
  ruc: string
  monto: number
}

export interface ComprobanteDetalle extends BorradorComprobante {
  rucDv: number
  tipoNombre: string
  creadoPorNombre: string
  creadoEn: string
}

export interface ItemResumen {
  tipoId: string
  nombre: string
  monto: number
  pct: number
}

export interface Resumen {
  totalIngresos: number
  totalGastos: number
  saldo: number
  pctGastosSobreIngresos: number | null
  gastosPorTipo: ItemResumen[]
  ingresosPorTipo: ItemResumen[]
}
