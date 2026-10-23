import { describe, expect, it } from 'vitest'
import {
  duplicateNumbers,
  matchesSearch,
  normalizePlayer,
  playablePositions,
  sortPlayers,
  validatePlayer,
  type Player,
  type PlayerInput,
} from '../src/players/model'
import { missingFromPool } from '../src/players/store'
import { WEBSITE_ROSTER } from '../src/players/websiteRoster'

const base: PlayerInput = {
  number: 6,
  firstName: 'Heli',
  lastName: 'Koskinen',
  mainPosition: 'DEF',
  otherPositions: [],
  locked: false,
  captain: null,
  active: true,
}
const player = (over: Partial<Player>): Player => ({ id: Math.random().toString(), ...base, ...over })

describe('player model', () => {
  it('lists playable positions in a fixed order', () => {
    expect(playablePositions({ mainPosition: 'ATT', otherPositions: ['GK'], locked: false })).toEqual(['GK', 'ATT'])
  })

  it('limits a locked player to the main position', () => {
    expect(playablePositions({ mainPosition: 'ATT', otherPositions: ['GK', 'DEF'], locked: true })).toEqual(['ATT'])
    expect(normalizePlayer({ ...base, locked: true, otherPositions: ['ATT'] }).otherPositions).toEqual([])
  })

  it('drops the main position from other positions and trims names', () => {
    const p = normalizePlayer({ ...base, firstName: ' Heli ', otherPositions: ['DEF', 'ATT'] })
    expect(p.firstName).toBe('Heli')
    expect(p.otherPositions).toEqual(['ATT'])
  })

  it('validates number and name', () => {
    expect(validatePlayer(base)).toBeNull()
    expect(validatePlayer({ ...base, number: null })).toBeNull()
    expect(validatePlayer({ ...base, number: 1.5 })).toBe('number')
    expect(validatePlayer({ ...base, number: Number.NaN })).toBe('number')
    expect(validatePlayer({ ...base, firstName: '  ' })).toBe('name')
  })

  it('sorts by number, with unnumbered players last by name', () => {
    const sorted = sortPlayers([
      player({ number: null, firstName: 'Ida' }),
      player({ number: 42 }),
      player({ number: null, firstName: 'Abby' }),
      player({ number: 3 }),
    ])
    expect(sorted.map((p) => p.number ?? p.firstName)).toEqual([3, 42, 'Abby', 'Ida'])
  })

  it('searches by exact number or part of the name', () => {
    const p = player({ number: 42, firstName: 'Nuppu', lastName: 'Uusitalo' })
    expect(matchesSearch(p, '42')).toBe(true)
    expect(matchesSearch(p, '4')).toBe(false)
    expect(matchesSearch(p, 'uusi')).toBe(true)
  })

  it('finds repeated numbers, ignoring missing ones', () => {
    expect([...duplicateNumbers([7, 7, 8, null, null])]).toEqual([7])
  })
})

describe('website roster import', () => {
  it('has the 38 players from the website with unique numbers', () => {
    expect(WEBSITE_ROSTER).toHaveLength(38)
    const numbers = WEBSITE_ROSTER.flatMap((r) => (r.number === null ? [] : [r.number]))
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  it('only imports players not already in the pool, matching by name', () => {
    const existing = [player({ firstName: 'heli', lastName: 'koskinen' })]
    const missing = missingFromPool(WEBSITE_ROSTER, existing)
    expect(missing).toHaveLength(37)
    expect(missing.some((r) => r.lastName === 'Koskinen' && r.firstName === 'Heli')).toBe(false)
  })
})
