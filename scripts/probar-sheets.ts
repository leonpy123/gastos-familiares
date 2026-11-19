// Prueba manual de la conexión con Google Sheets (no forma parte del build).
// Uso: npx tsx --env-file=.env scripts/probar-sheets.ts
import { crearSheetsGoogle } from '../server/utils/sheets-google'
import { construirFilas } from '../server/utils/planilla'
import type { ComprobanteDetalle } from '../shared/types'

const ejemplo: ComprobanteDetalle = {
  id: 'prueba-1', clase: 'gasto', fecha: '2026-11-19', tipoId: 'x', tipoNombre: 'Gastos hogar',
  concepto: 'Prueba de conexión', contraparte: 'Supermas', ruc: '8002147', rucDv: 6, monto: 8000,
  creadoPorNombre: 'Script', creadoEn: new Date().toISOString(),
}

const sheets = crearSheetsGoogle()
await sheets.asegurarHojas(['Ingresos', 'Gastos'])
await sheets.reemplazarHoja('Gastos', construirFilas([ejemplo], 'gasto'))
await sheets.reemplazarHoja('Ingresos', construirFilas([], 'ingreso'))
console.log('Listo: revisa la planilla.')
