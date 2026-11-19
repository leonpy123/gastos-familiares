import { describe, it, expect } from 'vitest'
import { errorSupabase } from '../../server/utils/error-supabase'

describe('errorSupabase', () => {
  it('convierte el error de PostgREST en un Error con todo el detalle', () => {
    const e = errorSupabase({ message: 'permission denied for table miembros', code: '42501', details: null, hint: 'GRANT SELECT', status: 403 }, 'buscar miembro')
    expect(e).toBeInstanceOf(Error)
    expect(e.message).toBe('buscar miembro: permission denied for table miembros [code 42501, HTTP 403] hint: GRANT SELECT')
  })
  it('un error sin mensaje igual dice algo útil', () => {
    expect(errorSupabase({ message: '', code: '', details: '', hint: '', status: 401 }, 'buscar miembro').message)
      .toBe('buscar miembro: (sin mensaje) [HTTP 401]')
  })
  it('acepta un Error común', () => {
    expect(errorSupabase(new Error('fetch failed'), 'x').message).toBe('x: fetch failed')
  })
})
