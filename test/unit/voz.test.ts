import { describe, it, expect } from 'vitest'
import { esIOS } from '../../shared/utils/plataforma'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
const IPAD_COMO_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'

describe('esIOS', () => {
  it('iPhone', () => expect(esIOS(IPHONE, 5)).toBe(true))
  it('iPad que se reporta como Mac', () => expect(esIOS(IPAD_COMO_MAC, 5)).toBe(true))
  it('Android Chrome', () => expect(esIOS(ANDROID, 5)).toBe(false))
  it('Mac de escritorio', () => expect(esIOS(IPAD_COMO_MAC, 0)).toBe(false))
})
