import { describe, expect, it } from 'vitest'
import { fitWidth, photoWarnings } from '../src/teams/heroImage'
import { pickTeam, teamRole, withMember, type Team } from '../src/teams/model'

const team = (id: string, name: string, members: string[] = [], coaches: string[] = []): Team => ({ id, name, gameName: 'Finland', members, coaches })

describe('team members', () => {
  const t = team('a', 'A', ['c@x.fi', 'v@x.fi'], ['c@x.fi'])

  it('tells coaches from viewers', () => {
    expect(teamRole(t, 'c@x.fi')).toBe('coach')
    expect(teamRole(t, 'v@x.fi')).toBe('viewer')
    expect(teamRole(t, 'n@x.fi')).toBeNull()
  })

  it('keeps coaches a subset of members when roles change', () => {
    expect(withMember(t, 'v@x.fi', 'coach')).toEqual({ members: ['c@x.fi', 'v@x.fi'], coaches: ['c@x.fi', 'v@x.fi'] })
    expect(withMember(t, 'c@x.fi', 'viewer')).toEqual({ members: ['c@x.fi', 'v@x.fi'], coaches: [] })
    expect(withMember(t, 'c@x.fi', null)).toEqual({ members: ['v@x.fi'], coaches: [] })
    expect(withMember(t, 'n@x.fi', 'viewer').members).toContain('n@x.fi')
  })

  it('opens the saved team, else the first', () => {
    const teams = [team('a', 'A'), team('b', 'B')]
    expect(pickTeam(teams, 'b')?.id).toBe('b')
    expect(pickTeam(teams, 'gone')?.id).toBe('a')
    expect(pickTeam([], null)).toBeNull()
  })
})

describe('team photos', () => {
  it('shrinks to the width without stretching small photos', () => {
    expect(fitWidth(4000, 3000, 1920)).toEqual({ width: 1920, height: 1440 })
    expect(fitWidth(800, 600, 1920)).toEqual({ width: 800, height: 600 })
  })

  it('warns about small and portrait photos', () => {
    expect(photoWarnings(3000, 1500)).toEqual([])
    expect(photoWarnings(1000, 600)).toEqual(['small'])
    expect(photoWarnings(2000, 3000)).toEqual(['portrait'])
  })
})
