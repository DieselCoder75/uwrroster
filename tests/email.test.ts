import { describe, expect, it } from 'vitest'
import { isValidEmail, normalizeEmail } from '../src/lib/email'

describe('email', () => {
  it('normalizes case and whitespace', () => {
    expect(normalizeEmail('  Coach@Example.FI ')).toBe('coach@example.fi')
  })

  it('validates', () => {
    expect(isValidEmail('coach@example.fi')).toBe(true)
    expect(isValidEmail('coach@example')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})
