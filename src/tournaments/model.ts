import { duplicateNumbers, playablePositions, type Player, type Position } from '../players/model'
import type { CampPool } from './camp'

/** Default squad: 12 in the game (4 per position) and 3 substitutes. Special tournaments allow more. */
export const DEFAULT_SQUAD_SIZE = 15
export const PER_POSITION = 4

export type Slot = Position | 'SUB'
export const SLOTS: Slot[] = ['GK', 'DEF', 'ATT', 'SUB']

export type Lineup = Record<Slot, string[]>
export const emptyLineup = (): Lineup => ({ GK: [], DEF: [], ATT: [], SUB: [] })

export type Cap = 'blue' | 'white'

/** A tournament has games with lineups; a camp splits its players into pools and sides instead. */
export type EventKind = 'tournament' | 'camp'

export type Tournament = {
  id: string
  kind: EventKind
  name: string
  location: string
  startDate: string // YYYY-MM-DD
  endDate: string
  squadSize: number
  /** Player ids available for this tournament. */
  squad: string[]
  /** Shirt numbers used in this tournament when they differ from the player's usual number. */
  numbers: Record<string, number>
  /** Camps only: the pools, each split into two sides. */
  pools: CampPool[]
}

export type TournamentInput = Omit<Tournament, 'id'>

/** Who made a change: the coach's email and their name when the sign-in gives one. */
export type Editor = { email: string; name: string }

/** One version of a game's lineup. Coaches can keep several and pick the one in use. */
export type LineupVersion = {
  id: string
  /** 1, 2, 3… in the order the versions were made. */
  index: number
  name: string
  lineup: Lineup
  lineup2: Lineup | null
  createdBy: Editor | null
  /** Milliseconds; 0 when not known. */
  createdAt: number
  updatedBy: Editor | null
  updatedAt: number
}

export type Game = {
  id: string
  opponent: string
  date: string // YYYY-MM-DD
  time: string // HH:MM
  cap: Cap | null
  /** Free text such as "Match 6" or "Semi-final". */
  label: string
  /** Starting lineup of the version in use: the game's 15 (12 in the game and 3 substitutes) for the first period. */
  lineup: Lineup
  /** Second-period lineup of the version in use, picked from the same 15. Null means the same as the first period. */
  lineup2: Lineup | null
  /** All lineup versions, oldest first. Always at least one. */
  versions: LineupVersion[]
  /** The version the game uses: its status, the playing load and copying to other games follow it. */
  activeVersion: string
  /** When the game was added, in milliseconds; orders games that share a time. */
  createdAt: number
}

export type GameInput = Omit<Game, 'id'>

/** Id of the first version of every game, including games from before versions. */
export const FIRST_VERSION = 'v1'

/** "#2 Strong lineup", or just "#2" without a name. */
export function versionLabel(v: Pick<LineupVersion, 'index' | 'name'>): string {
  return v.name ? `#${v.index} ${v.name}` : `#${v.index}`
}

/** The version with this id, or the one in use when there is none. */
export function findVersion(game: Pick<Game, 'versions' | 'activeVersion'>, id: string | null): LineupVersion {
  const { versions } = game
  return versions.find((v) => v.id === id) ?? versions.find((v) => v.id === game.activeVersion) ?? versions[0]
}

export function nextVersionIndex(versions: Pick<LineupVersion, 'index'>[]): number {
  return versions.reduce((max, v) => Math.max(max, v.index), 0) + 1
}

/** The signed-in coach as an editor, from the app's auth state. */
export function editorOf(auth: { status: string; email?: string; user?: { displayName: string | null } }): Editor | null {
  return auth.status === 'coach' && auth.email ? { email: auth.email, name: auth.user?.displayName ?? '' } : null
}

/** A name to show for a coach: their own name, else the part of the email before the @. */
export function editorName(editor: Editor | null): string {
  if (!editor) return ''
  return editor.name.trim() || editor.email.split('@')[0]
}

/** Our team's name in game titles. */
export const OUR_TEAM = 'Finland'

/** The two teams by cap colour, or null while our cap colour is not known. */
export function gameTeams(game: Pick<Game, 'opponent' | 'cap'>): { blue: string; white: string } | null {
  if (game.cap === 'blue') return { blue: OUR_TEAM, white: game.opponent }
  if (game.cap === 'white') return { blue: game.opponent, white: OUR_TEAM }
  return null
}

/**
 * The game's name as it is announced: the team in blue caps first, white second, e.g. "Finland vs Germany"
 * or "Denmark vs Finland". Without a cap colour it is just "vs Denmark".
 */
export function gameTitle(game: Pick<Game, 'opponent' | 'cap'>): string {
  const teams = gameTeams(game)
  return teams ? `${teams.blue} vs ${teams.white}` : `vs ${game.opponent}`
}

export function tournamentNumber(tour: Pick<Tournament, 'numbers'>, player: Pick<Player, 'id' | 'number'>): number | null {
  return tour.numbers[player.id] ?? player.number
}

/** Numbers worn by more than one squad player in this tournament. */
export function squadNumberClashes(tour: Pick<Tournament, 'numbers' | 'squad'>, players: Player[]): Set<number> {
  const inSquad = players.filter((p) => tour.squad.includes(p.id))
  return duplicateNumbers(inSquad.map((p) => tournamentNumber(tour, p)))
}

/** Where a player sits in the lineup, or null when not picked. */
export function slotOf(lineup: Lineup, playerId: string): Slot | null {
  return SLOTS.find((s) => lineup[s].includes(playerId)) ?? null
}

/** Moves a player to a slot (or out of the lineup with null), keeping every other player's order. */
export function movePlayer(lineup: Lineup, playerId: string, to: Slot | null, index?: number): Lineup {
  const next = emptyLineup()
  for (const s of SLOTS) next[s] = lineup[s].filter((id) => id !== playerId)
  if (to) {
    const list = next[to]
    const at = index === undefined ? list.length : Math.max(0, Math.min(index, list.length))
    list.splice(at, 0, playerId)
  }
  return next
}

/** Drops players that are no longer in the squad (e.g. removed after the lineup was made). */
export function pruneLineup(lineup: Lineup, squad: string[]): Lineup {
  const keep = new Set(squad)
  const next = emptyLineup()
  for (const s of SLOTS) next[s] = lineup[s].filter((id) => keep.has(id))
  return next
}

export type FitIssue = 'locked' | 'notPlayable' | null

/** Whether a player fits a slot. Substitutes fit anyone. */
export function fitIssue(player: Player, slot: Slot): FitIssue {
  if (slot === 'SUB') return null
  if (playablePositions(player).includes(slot)) return null
  return player.locked ? 'locked' : 'notPlayable'
}

/** Every game lineup is 15: 4 + 4 + 4 in the game and 3 substitutes, whatever the tournament squad size. */
export const GAME_SUBS = 3

export function slotLimit(slot: Slot): number {
  return slot === 'SUB' ? GAME_SUBS : PER_POSITION
}

/** At most 15 players can play in a game: the 12 who start and 3 substitutes. */
export const GAME_SIZE = PER_POSITION * 3 + GAME_SUBS

export type Period = 1 | 2
export const PERIODS: Period[] = [1, 2]

export function lineupIds(lineup: Lineup): string[] {
  return SLOTS.flatMap((s) => lineup[s])
}

export function fieldIds(lineup: Lineup): string[] {
  return [...lineup.GK, ...lineup.DEF, ...lineup.ATT]
}

/** Both periods' lineups with players outside the squad dropped. The second period only uses the starting 15. */
export function gameLineups(game: Pick<Game, 'lineup' | 'lineup2'>, squad: string[]): { first: Lineup; second: Lineup; secondSame: boolean } {
  const first = pruneLineup(game.lineup, squad)
  if (!game.lineup2) return { first, second: first, secondSame: true }
  return { first, second: pruneLineup(game.lineup2, lineupIds(first)), secondSame: false }
}

/** Players who start the second period in the water but didn't start the first: the substitutions made at the break. */
export function substitutionsIn(first: Lineup, second: Lineup): string[] {
  const starters = new Set(fieldIds(first))
  return fieldIds(second).filter((id) => !starters.has(id))
}

/** Why a move would break the game's rules, or null when it is fine. */
export function moveProblem(lineup: Lineup, playerId: string, to: Slot | null, period: Period, starting15: string[]): 'gameFull' | 'notInGame' | null {
  if (to === null) return null
  if (period === 2) return starting15.includes(playerId) ? null : 'notInGame'
  const placed = lineupIds(lineup)
  return !placed.includes(playerId) && placed.length >= GAME_SIZE ? 'gameFull' : null
}

export type LineupSummary = { inGame: number; subs: number; complete: boolean }

export function summarize(lineup: Lineup): LineupSummary {
  const inGame = lineup.GK.length + lineup.DEF.length + lineup.ATT.length
  const complete =
    lineup.GK.length === PER_POSITION &&
    lineup.DEF.length === PER_POSITION &&
    lineup.ATT.length === PER_POSITION &&
    lineup.SUB.length === GAME_SUBS
  return { inGame, subs: lineup.SUB.length, complete }
}

/** By date and time; games without a date or time go after the timed ones, and ties keep the order they were added in. */
export function sortGames(games: Game[]): Game[] {
  const key = (g: Game) => `${g.date || '9999-99-99'} ${g.time || '99:99'}`
  return [...games].sort((a, b) => key(a).localeCompare(key(b)) || a.createdAt - b.createdAt)
}

/**
 * Coming and ongoing tournaments first, soonest first; then past ones, most recent first; undated ones at the end.
 * `today` is YYYY-MM-DD.
 */
export function sortTournaments(list: Tournament[], today: string): Tournament[] {
  const group = (x: Tournament) => (!x.startDate ? 2 : (x.endDate || x.startDate) >= today ? 0 : 1)
  return [...list].sort((a, b) => {
    const ga = group(a)
    const gb = group(b)
    if (ga !== gb) return ga - gb
    const byDate = ga === 0 ? a.startDate.localeCompare(b.startDate) : b.startDate.localeCompare(a.startDate)
    return byDate || a.name.localeCompare(b.name)
  })
}

/** Where a player is in each period of one game: a position, the bench ('SUB'), or null when not among the game's 15. */
export type PeriodUse = [Slot | null, Slot | null]

export type PlayerLoad = {
  /** Periods played in the water (GK, DEF or ATT) across the tournament. */
  periods: number
  byGame: Record<string, PeriodUse>
}

/** How many periods each squad player plays across the tournament's games, and where. */
export function tournamentLoad(games: Game[], squad: string[]): Map<string, PlayerLoad> {
  const load = new Map<string, PlayerLoad>(squad.map((id) => [id, { periods: 0, byGame: {} }]))
  for (const g of games) {
    const { first, second } = gameLineups(g, squad)
    for (const [id, l] of load) {
      const use: PeriodUse = [slotOf(first, id), slotOf(second, id)]
      l.byGame[g.id] = use
      l.periods += use.filter((s) => s !== null && s !== 'SUB').length
    }
  }
  return load
}

/** Periods with a lineup so far: a game counts once it has anyone in it. */
export function plannedPeriods(games: Game[], squad: string[]): number {
  return games.filter((g) => lineupIds(gameLineups(g, squad).first).length > 0).length * PERIODS.length
}
