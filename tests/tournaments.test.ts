import { describe, expect, it } from 'vitest'
import type { Player } from '../src/players/model'
import {
  emptyLineup,
  fitIssue,
  gameLineups,
  gameTitle,
  moveProblem,
  movePlayer,
  pruneLineup,
  substitutionsIn,
  tournamentLoad,
  plannedPeriods,
  slotLimit,
  slotOf,
  sortGames,
  sortTournaments,
  squadNumberClashes,
  summarize,
  tournamentNumber,
  type Game,
  type Lineup,
  type Tournament,
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

describe('periods and substitutions', () => {
  const four = (p: string) => [1, 2, 3, 4].map((i) => p + i)
  const first = lineup({ GK: four('g'), DEF: four('d'), ATT: four('a'), SUB: ['s1', 's2', 's3'] })
  const squad = [...four('g'), ...four('d'), ...four('a'), 's1', 's2', 's3', 'x']

  it('plays the second period like the first until it is changed', () => {
    const { second, secondSame } = gameLineups({ lineup: first, lineup2: null }, squad)
    expect(secondSame).toBe(true)
    expect(second).toEqual(first)
  })

  it('keeps the second period to the starting 15', () => {
    const lineup2 = lineup({ ...first, GK: ['x', 'g2', 'g3', 'g4'], SUB: ['g1', 's2', 's3'] })
    const { second } = gameLineups({ lineup: first, lineup2 }, squad)
    expect(second.GK).toEqual(['g2', 'g3', 'g4'])
  })

  it('counts the players who come in at the break', () => {
    const second = lineup({ GK: ['s1', 'g2', 'g3', 'g4'], DEF: ['g1', 'd2', 'd3', 'd4'], ATT: four('a'), SUB: ['d1', 's2', 's3'] })
    // g1 only changes position; s1 comes in for d1.
    expect(substitutionsIn(first, second)).toEqual(['s1'])
    expect(substitutionsIn(second, first)).toEqual(['d1'])
  })

  it('allows at most 15 players in a game', () => {
    expect(moveProblem(first, 'x', 'SUB', 1, [])).toBe('gameFull')
    expect(moveProblem(first, 'g1', 'DEF', 1, [])).toBeNull()
    expect(moveProblem(first, 'x', null, 1, [])).toBeNull()
  })

  it('only lets the starting 15 play the second period', () => {
    const starting15 = squad.filter((id) => id !== 'x')
    expect(moveProblem(first, 'x', 'ATT', 2, starting15)).toBe('notInGame')
    expect(moveProblem(first, 's1', 'ATT', 2, starting15)).toBeNull()
  })
})

describe('playing load', () => {
  const four = (p: string) => [1, 2, 3, 4].map((i) => p + i)
  const squad = [...four('g'), ...four('d'), ...four('a'), 's1', 's2', 's3', 'x']
  const first = lineup({ GK: four('g'), DEF: four('d'), ATT: four('a'), SUB: ['s1', 's2', 's3'] })
  const game = (id: string, l: Lineup, l2: Lineup | null) => ({ id, lineup: l, lineup2: l2 }) as Game

  it('counts periods in the water, not on the bench', () => {
    const second = lineup({ ...first, GK: ['s1', 'g2', 'g3', 'g4'], SUB: ['g1', 's2', 's3'] })
    const games = [game('A', first, second), game('B', first, null), game('C', lineup({}), null)]
    const load = tournamentLoad(games, squad)
    expect(load.get('g1')?.periods).toBe(3)
    expect(load.get('s1')?.periods).toBe(1)
    expect(load.get('s2')?.periods).toBe(0)
    expect(load.get('x')?.byGame.A).toEqual([null, null])
    expect(load.get('g1')?.byGame.A).toEqual(['GK', 'SUB'])
    expect(plannedPeriods(games, squad)).toBe(4)
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

describe('tournament order', () => {
  it('lists coming tournaments soonest first, then past ones, then undated', () => {
    const tour = (name: string, startDate: string, endDate = startDate) => ({ name, startDate, endDate }) as Tournament
    const sorted = sortTournaments(
      [
        tour('old', '2026-03-01'),
        tour('mm', '2027-05-05', '2027-05-22'),
        tour('none', ''),
        tour('camp', '2027-01-23', '2027-01-24'),
        tour('older', '2025-06-01'),
        tour('ongoing', '2026-10-24', '2026-10-26'),
      ],
      '2026-10-25',
    )
    expect(sorted.map((x) => x.name)).toEqual(['ongoing', 'camp', 'mm', 'old', 'older', 'none'])
  })
})

describe('game order', () => {
  it('sorts by date, then time', () => {
    const g = (id: string, date: string, time: string) => ({ id, date, time }) as Game
    const sorted = sortGames([g('d2', '2027-02-28', '13:00'), g('late', '2027-02-27', '17:30'), g('early', '2027-02-27', '10:00')])
    expect(sorted.map((x) => x.id)).toEqual(['early', 'late', 'd2'])
  })

  it('puts the latest added last when the time is missing or the same', () => {
    const g = (id: string, date: string, time: string, createdAt: number) => ({ id, date, time, createdAt }) as Game
    const sorted = sortGames([
      g('sameLater', '2027-02-27', '10:00', 5),
      g('noTimeOld', '2027-02-27', '', 1),
      g('sameEarlier', '2027-02-27', '10:00', 2),
      g('noDate', '', '', 0),
      g('noTimeNew', '2027-02-27', '', 9),
    ])
    expect(sorted.map((x) => x.id)).toEqual(['sameEarlier', 'sameLater', 'noTimeOld', 'noTimeNew', 'noDate'])
  })
})

describe('game title', () => {
  it('names the team in blue first and the team in white second', () => {
    expect(gameTitle({ opponent: 'Germany', cap: 'blue' })).toBe('Finland vs Germany')
    expect(gameTitle({ opponent: 'Denmark', cap: 'white' })).toBe('Denmark vs Finland')
  })

  it('shows only the opponent while the cap colour is not known', () => {
    expect(gameTitle({ opponent: 'Norway', cap: null })).toBe('vs Norway')
  })
})
