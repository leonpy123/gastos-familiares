import { describe, it, expect } from 'vitest'
import { autorizarCron } from '../../server/utils/cron'

describe('autorizarCron', () => {
  it('acepta el secreto correcto', () => expect(autorizarCron('Bearer s3', 's3')).toBe(true))
  it('rechaza otro secreto', () => expect(autorizarCron('Bearer otro', 's3')).toBe(false))
  it('rechaza sin encabezado', () => expect(autorizarCron(undefined, 's3')).toBe(false))
  it('rechaza si el secreto no está configurado', () => expect(autorizarCron('Bearer ', undefined)).toBe(false))
  it('rechaza secreto vacío configurado', () => expect(autorizarCron('Bearer ', '')).toBe(false))
})
