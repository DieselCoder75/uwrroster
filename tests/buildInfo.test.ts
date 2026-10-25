import { describe, expect, it } from 'vitest'
import { prFromSubject } from '../build-info'

describe('prFromSubject', () => {
  it('reads a merge commit', () => {
    expect(prFromSubject('Merge pull request #19 from DieselCoder75/claude/project-thread-ybmp1y')).toBe(19)
  })
  it('reads a squash merge', () => {
    expect(prFromSubject('Show the release in the footer (#20)')).toBe(20)
  })
  it('is null for other commits', () => {
    expect(prFromSubject('Fix logic and usability bugs')).toBeNull()
    expect(prFromSubject('Merge 1a2b into 3c4d')).toBeNull()
  })
})
