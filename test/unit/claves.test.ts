import { describe, it, expect } from 'vitest'
import { esClaveSecreta } from '../../shared/utils/claves'

const jwt = (rol: string) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: rol })).toString('base64url')}.firma`

describe('esClaveSecreta', () => {
  it('clave secreta nueva', () => expect(esClaveSecreta('sb_secret_abc123')).toBe(true))
  it('service_role (JWT)', () => expect(esClaveSecreta(jwt('service_role'))).toBe(true))
  it('publishable', () => expect(esClaveSecreta('sb_publishable_abc123')).toBe(false))
  it('anon (JWT)', () => expect(esClaveSecreta(jwt('anon'))).toBe(false))
  it('vacía o rara', () => {
    expect(esClaveSecreta('')).toBe(false)
    expect(esClaveSecreta(undefined)).toBe(false)
    expect(esClaveSecreta('eyJ.no-es-base64.x')).toBe(false)
  })
})
