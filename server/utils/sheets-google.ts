import { auth, sheets as crearSheets } from '@googleapis/sheets'
import type { SheetsApi } from './planilla'

/** Implementación real de SheetsApi con la cuenta de servicio de Google. */
export function crearSheetsGoogle(): SheetsApi {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const clave = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const spreadsheetId = process.env.GOOGLE_SHEET_ID
  if (!email || !clave || !spreadsheetId) {
    throw new Error('Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY o GOOGLE_SHEET_ID')
  }

  const cliente = new auth.JWT({ email, key: clave, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
  const api = crearSheets({ version: 'v4', auth: cliente })

  return {
    async asegurarHojas(nombres) {
      const { data } = await api.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' })
      const existentes = new Set((data.sheets ?? []).map(s => s.properties?.title))
      const faltan = nombres.filter(n => !existentes.has(n))
      if (!faltan.length) return
      await api.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: faltan.map(title => ({ addSheet: { properties: { title } } })) },
      })
    },
    async reemplazarHoja(nombre, filas) {
      await api.spreadsheets.values.clear({ spreadsheetId, range: `'${nombre}'!A:I` })
      await api.spreadsheets.values.update({
        spreadsheetId,
        range: `'${nombre}'!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: filas },
      })
    },
  }
}
