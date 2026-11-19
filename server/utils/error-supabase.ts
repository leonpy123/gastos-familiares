interface ErrorPostgrest {
  message?: string
  code?: string
  details?: string | null
  hint?: string | null
  status?: number
}

/** Convierte un error de Supabase en un Error con todo el detalle, para que quede legible en los registros. */
export function errorSupabase(e: unknown, contexto: string): Error {
  if (e instanceof Error) return new Error(`${contexto}: ${e.message}`, { cause: e })
  const p = (e ?? {}) as ErrorPostgrest
  const datos = [p.code ? `code ${p.code}` : '', p.status ? `HTTP ${p.status}` : ''].filter(Boolean).join(', ')
  const partes = [
    `${contexto}: ${p.message || '(sin mensaje)'}`,
    datos ? `[${datos}]` : '',
    p.details ? `details: ${p.details}` : '',
    p.hint ? `hint: ${p.hint}` : '',
  ].filter(Boolean)
  const error = new Error(partes.join(' '))
  console.error(error.message)
  return error
}
