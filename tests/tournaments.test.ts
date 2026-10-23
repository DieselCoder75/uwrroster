import { describe, expect, it } from 'vitest'
import type { Player } from '../src/players/model'
import {
  emptyLineup,
  fitIssue,
  movePlayer,
  pruneLineup,
  slotLimit,
  slotOf,
  sortGames,
  squadNumberClashes,
  summarize,
  tournamentNumber,
  type Game,
  type Lineup,
} from '../src/tournaments/model'

const player = (id: string, over: Partial<Player> = {}): Player => ({
  id,
  number: null,
  firstName: id,
  lastName: '',
  mainPosition: 'DEF',
  otherPositions: [],
  locked: false,
  captain: null,
  active: true,
  ...over,
})

const lineup = (over: Partial<Lineup>): Lineup => ({ ...emptyLineup(), ...over })

describe('lineup moves', () => {
  it('moves a player between slots and out again', () => {
    let l = lineup({ DEF: ['a', 'b'] })
    l = movePlayer(l, 'a', 'ATT')
    expect(l).toEqual(lineup({ DEF: ['b'], ATT: ['a'] }))
    expect(slotOf(l, 'a')).toBe('ATT')
    l = movePlayer(l, 'a', null)
    expect(slotOf(l, 'a')).toBeNull()
    expect(l.DEF).toEqual(['b'])
  })

  it('inserts at an index and does not mutate the input', () => {
    const before = lineup({ GK: ['x', 'y'] })
    const after = movePlayer(before, 'z', 'GK', 1)
    expect(after.GK).toEqual(['x', 'z', 'y'])
    expect(before.GK).toEqual(['x', 'y'])
  })

  it('drops players who left the squad', () => {
    expect(pruneLineup(lineup({ GK: ['a', 'gone'], SUB: ['gone'] }), ['a'])).toEqual(lineup({ GK: ['a'] }))
  })
})

describe('position fit', () => {
  it('accepts main and other positions, and anyone on the bench', () => {
    const p = player('p', { mainPosition: 'DEF', otherPositions: ['ATT'] })
    expect(fitIssue(p, 'DEF')).toBeNull()
    expect(fitIssue(p, 'ATT')).toBeNull()
    expect(fitIssue(p, 'SUB')).toBeNull()
    expect(fitIssue(p, 'GK')).toBe('notPlayable')
  })

  it('flags a locked player outside their main position', () => {
    const p = player('p', { mainPosition: 'GK', locked: true, otherPositions: ['DEF'] })
    expect(fitIssue(p, 'GK')).toBeNull()
    expect(fitIssue(p, 'DEF')).toBe('locked')
  })
})

describe('lineup summary', () => {
  it('has room for 4 per position and 3 substitutes, whatever the squad size', () => {
    expect(slotLimit('GK')).toBe(4)
    expect(slotLimit('SUB')).toBe(3)
  })

  it('is complete only with exactly 4+4+4 and 3 substitutes', () => {
    const four = (p: string) => [1, 2, 3, 4].map((i) => p + i)
    const full = lineup({ GK: four('g'), DEF: four('d'), ATT: four('a'), SUB: ['s1', 's2', 's3'] })
    expect(summarize(full)).toEqual({ inGame: 12, subs: 3, complete: true })
    expect(summarize({ ...full, SUB: ['s1', 's2', 's3', 's4'] }).complete).toBe(false)
    expect(summarize({ ...full, SUB: ['s1', 's2'] }).complete).toBe(false)
    expect(summarize({ ...full, GK: ['g1'] })).toMatchObject({ inGame: 9, complete: false })
  })
})

describe('tournament numbers', () => {
  const players = [player('kuura', { number: 3 }), player('kira', { number: 3 }), player('heli', { number: 6 })]

  it('flags squad players sharing a number', () => {
    expect([...squadNumberClashes({ squad: ['kuura', 'kira', 'heli'], numbers: {} }, players)]).toEqual([3])
  })

  it('ignores players outside the squad', () => {
    expect(squadNumberClashes({ squad: ['kira', 'heli'], numbers: {} }, players).size).toBe(0)
  })

  it('uses tournament-only numbers', () => {
    const tour = { squad: ['kuura', 'kira', 'heli'], numbers: { kuura: 30 } }
    expect(tournamentNumber(tour, players[0])).toBe(30)
    expect(tournamentNumber(tour, players[1])).toBe(3)
    expect(squadNumberClashes(tour, players).size).toBe(0)
  })
})

describe('game order', () => {
  it('sorts by date, then time', () => {
    const g = (id: string, date: string, time: string) => ({ id, date, time }) as Game
    const sorted = sortGames([g('d2', '2027-02-28', '13:00'), g('late', '2027-02-27', '17:30'), g('early', '2027-02-27', '10:00')])
    expect(sorted.map((x) => x.id)).toEqual(['early', 'late', 'd2'])
  })
})
