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

/** Pools with players outside the camp dropped, and each player on one side only within a pool. */
export function prunePools(pools: CampPool[], squad: string[]): CampPool[] {
  const keep = new Set(squad)
  return pools.map((p) => {
    const seen = new Set<string>()
    const take = (ids: string[]) =>
      ids.filter((id) => {
        if (!keep.has(id) || seen.has(id)) return false
        seen.add(id)
        return true
      })
    return { ...p, blue: take(p.blue), white: take(p.white) }
  })
}

/** Every camp player plays in every pool: this is their side in one pool, or null while not split there. */
export function sideOf(pool: CampPool, playerId: string): Side | null {
  if (pool.blue.includes(playerId)) return 'blue'
  return pool.white.includes(playerId) ? 'white' : null
}

/** Players not yet on a side in this pool, in the camp's order. */
export function unplaced(pool: CampPool, squad: string[]): string[] {
  return squad.filter((id) => sideOf(pool, id) === null)
}

/** Moves a player to a side in one pool, or off both sides with null. Other pools and the input are unchanged. */
export function movePoolPlayer(pools: CampPool[], poolId: string, playerId: string, side: Side | null): CampPool[] {
  return pools.map((p) => {
    if (p.id !== poolId) return p
    const next = { ...p, blue: p.blue.filter((id) => id !== playerId), white: p.white.filter((id) => id !== playerId) }
    if (side) next[side] = [...next[side], playerId]
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

/** The side of a pool that needs this player most: fewest of their main position, then fewest players. */
export function bestSide(pool: CampPool, player: Pick<Player, 'mainPosition'>, byId: Map<string, Pick<Player, 'mainPosition'>>): Side {
  const b = { blue: sideBalance(pool.blue, byId), white: sideBalance(pool.white, byId) }
  const need = (side: Side) => [b[side][player.mainPosition], b[side].total]
  const [bp, bt] = need('blue')
  const [wp, wt] = need('white')
  return wp < bp || (wp === bp && wt < bt) ? 'white' : 'blue'
}

/** A repeatable shuffle, so each pool mixes the players differently but the same pool always the same way. */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Splits the players not yet on a side in each pool, evenly by main position. Each pool mixes the players
 * differently, so players get different teammates from pool to pool.
 */
export function splitEvenly(pools: CampPool[], squad: string[], byId: Map<string, Pick<Player, 'mainPosition'>>): CampPool[] {
  return pools.map((pool) => {
    const rest = seededShuffle(
      unplaced(pool, squad).filter((id) => byId.has(id)),
      pool.id,
    )
    // Goal keepers first: there are the fewest of them, so they spread most evenly.
    rest.sort((a, b) => POSITIONS.indexOf(byId.get(a)!.mainPosition) - POSITIONS.indexOf(byId.get(b)!.mainPosition))
    let next = pool
    for (const id of rest) {
      const side = bestSide(next, byId.get(id)!, byId)
      next = { ...next, [side]: [...next[side], id] }
    }
    return next
  })
}
