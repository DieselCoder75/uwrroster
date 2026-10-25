import { POSITIONS, type Player, type Position } from '../players/model'

// Camps: instead of games, the camp's players are split into pools, and in each pool into two sides.

export type Side = 'blue' | 'white'
export const SIDES: Side[] = ['blue', 'white']

export type CampPool = {
  id: string
  /** Optional name; shown as "Pool 1", "Pool 2"… when empty. */
  name: string
  blue: string[]
  white: string[]
}

export const DEFAULT_POOLS = 2
/** A new camp's default number of players; camps are usually bigger than a tournament squad. */
export const CAMP_SIZE = 30
export const MAX_POOLS = 10

export type PoolSpot = { pool: string; side: Side }

/** A new pool's id: short and random, unique enough within one camp. */
export const newPoolId = () => Math.random().toString(36).slice(2, 10)

export const emptyPool = (id = newPoolId()): CampPool => ({ id, name: '', blue: [], white: [] })

/** Pools with players outside the camp dropped, and each player in one place only (the first one found). */
export function prunePools(pools: CampPool[], squad: string[]): CampPool[] {
  const keep = new Set(squad)
  const seen = new Set<string>()
  const take = (ids: string[]) =>
    ids.filter((id) => {
      if (!keep.has(id) || seen.has(id)) return false
      seen.add(id)
      return true
    })
  return pools.map((p) => ({ ...p, blue: take(p.blue), white: take(p.white) }))
}

export function spotOf(pools: CampPool[], playerId: string): PoolSpot | null {
  for (const p of pools) for (const side of SIDES) if (p[side].includes(playerId)) return { pool: p.id, side }
  return null
}

/** Players not yet in any pool, in the camp's order. */
export function unplaced(pools: CampPool[], squad: string[]): string[] {
  return squad.filter((id) => spotOf(pools, id) === null)
}

/** Moves a player to a pool side, or out of the pools with null. Does not change the input. */
export function movePoolPlayer(pools: CampPool[], playerId: string, to: PoolSpot | null): CampPool[] {
  return pools.map((p) => {
    const next = { ...p, blue: p.blue.filter((id) => id !== playerId), white: p.white.filter((id) => id !== playerId) }
    if (to && to.pool === p.id) next[to.side] = [...next[to.side], playerId]
    return next
  })
}

export const otherSide = (side: Side): Side => (side === 'blue' ? 'white' : 'blue')

/** Changes the number of pools: new ones are empty, players in removed pools are freed. */
export function resizePools(pools: CampPool[], count: number): CampPool[] {
  const n = Math.max(1, Math.min(MAX_POOLS, count))
  const kept = pools.slice(0, n)
  while (kept.length < n) kept.push(emptyPool())
  return kept
}

export type Balance = Record<Position, number> & { total: number }

/** How many players of each main position a side has. */
export function sideBalance(ids: string[], byId: Map<string, Pick<Player, 'mainPosition'>>): Balance {
  const b: Balance = { GK: 0, DEF: 0, ATT: 0, total: 0 }
  for (const id of ids) {
    const p = byId.get(id)
    if (!p) continue
    b[p.mainPosition] += 1
    b.total += 1
  }
  return b
}

/** Goal keepers first, then defenders and attackers, each by number. */
export function sortSide<T extends Pick<Player, 'id' | 'mainPosition' | 'number'>>(players: T[]): T[] {
  const order = (p: T) => POSITIONS.indexOf(p.mainPosition)
  return [...players].sort((a, b) => order(a) - order(b) || (a.number ?? 999) - (b.number ?? 999))
}

/** The side that needs this player most: fewest of their main position, then fewest players. Pools are tried in order. */
export function bestSpot(pools: CampPool[], player: Pick<Player, 'mainPosition'>, byId: Map<string, Pick<Player, 'mainPosition'>>): PoolSpot | null {
  let best: { spot: PoolSpot; pos: number; total: number } | null = null
  for (const p of pools) {
    for (const side of SIDES) {
      const b = sideBalance(p[side], byId)
      const pos = b[player.mainPosition]
      if (!best || pos < best.pos || (pos === best.pos && b.total < best.total)) {
        best = { spot: { pool: p.id, side }, pos, total: b.total }
      }
    }
  }
  return best?.spot ?? null
}

/** Places every player not yet in a pool, evenly by main position across all pools and sides. */
export function splitEvenly(pools: CampPool[], squad: string[], byId: Map<string, Pick<Player, 'mainPosition'>>): CampPool[] {
  const rest = unplaced(pools, squad).filter((id) => byId.has(id))
  // Goal keepers first: there are the fewest of them, so they spread most evenly.
  rest.sort((a, b) => POSITIONS.indexOf(byId.get(a)!.mainPosition) - POSITIONS.indexOf(byId.get(b)!.mainPosition))
  let next = pools
  for (const id of rest) {
    const spot = bestSpot(next, byId.get(id)!, byId)
    if (spot) next = movePoolPlayer(next, id, spot)
  }
  return next
}
