import { describe, expect, it } from 'vitest'
import { daysUntil, todayIso } from '../src/lib/dates'

describe('days until a tournament', () => {
  it('counts whole days, also across a daylight-saving change', () => {
    expect(daysUntil('2027-02-27', '2027-02-26')).toBe(1)
    expect(daysUntil('2027-05-05', '2027-03-01')).toBe(65)
    expect(daysUntil('2027-01-23', '2027-01-23')).toBe(0)
    expect(daysUntil('2027-01-22', '2027-01-23')).toBe(-1)
  })

  it('formats today as YYYY-MM-DD', () => {
    expect(todayIso(new Date(2027, 1, 5))).toBe('2027-02-05')
  })
})
