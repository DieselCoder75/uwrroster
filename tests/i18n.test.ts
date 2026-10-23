import { describe, expect, it } from 'vitest'
import { en } from '../src/i18n/en'
import { fi } from '../src/i18n/fi'
import { detectLang, translate } from '../src/i18n'

describe('i18n', () => {
  it('has the same keys in Finnish and English', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fi).sort())
  })

  it('uses the same placeholders in both languages', () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort()
    for (const key of Object.keys(fi) as (keyof typeof fi)[]) {
      expect(vars(en[key]), key).toEqual(vars(fi[key]))
    }
  })

  it('fills placeholders', () => {
    expect(translate('en', 'login.sent', { email: 'a@b.fi' })).toContain('a@b.fi')
  })

  it('defaults to Finnish unless saved or browser language is English', () => {
    expect(detectLang(null, 'fi-FI')).toBe('fi')
    expect(detectLang(null, 'sv-SE')).toBe('fi')
    expect(detectLang(null, 'en-GB')).toBe('en')
    expect(detectLang('fi', 'en-US')).toBe('fi')
  })
})
