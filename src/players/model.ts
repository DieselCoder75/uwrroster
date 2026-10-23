export const POSITIONS = ['GK', 'DEF', 'ATT'] as const
export type Position = (typeof POSITIONS)[number]

export type CaptainRole = 'captain' | 'viceCaptain' | null

export type Player = {
  id: string
  /** Shirt number; null when the player has none yet. */
  number: number | null
  firstName: string
  lastName: string
  mainPosition: Position
  /** Other positions the player can also play (never includes mainPosition). */
  otherPositions: Position[]
  /** Locked players only ever play their main position. */
  locked: boolean
  captain: CaptainRole
  active: boolean
}

export type PlayerInput = Omit<Player, 'id'>

export function playablePositions(p: Pick<Player, 'mainPosition' | 'otherPositions' | 'locked'>): Position[] {
  if (p.locked) return [p.mainPosition]
  return POSITIONS.filter((pos) => pos === p.mainPosition || p.otherPositions.includes(pos))
}

export function fullName(p: Pick<Player, 'firstName' | 'lastName'>): string {
  return `${p.firstName} ${p.lastName}`.trim()
}

/** Cleans up form input before saving: trims names, drops the main position from the extras. */
export function normalizePlayer(input: PlayerInput): PlayerInput {
  return {
    ...input,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    otherPositions: input.locked
      ? []
      : POSITIONS.filter((pos) => pos !== input.mainPosition && input.otherPositions.includes(pos)),
  }
}

export function validatePlayer(input: PlayerInput): 'number' | 'name' | null {
  if (input.number !== null && (!Number.isInteger(input.number) || input.number < 0 || input.number > 999)) {
    return 'number'
  }
  if (!input.firstName.trim()) return 'name'
  return null
}

export function sortPlayers(players: Player[]): Player[] {
  // Numbered players first, by number; then the rest by name.
  const num = (p: Player) => p.number ?? Number.POSITIVE_INFINITY
  return [...players].sort((a, b) => num(a) - num(b) || fullName(a).localeCompare(fullName(b), 'fi'))
}

export function matchesSearch(p: Player, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return String(p.number) === q || fullName(p).toLowerCase().includes(q)
}

/** Numbers that appear more than once (nulls ignored). */
export function duplicateNumbers(numbers: (number | null)[]): Set<number> {
  const seen = new Set<number>()
  const dupes = new Set<number>()
  for (const n of numbers) {
    if (n === null) continue
    if (seen.has(n)) dupes.add(n)
    seen.add(n)
  }
  return dupes
}
