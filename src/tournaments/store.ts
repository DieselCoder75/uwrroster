import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { todayIso } from '../lib/dates'
import {
  DEFAULT_SQUAD_SIZE,
  FIRST_VERSION,
  SLOTS,
  emptyLineup,
  findVersion,
  nextVersionIndex,
  sortGames,
  sortTournaments,
  type Editor,
  type Game,
  type GameInput,
  type Lineup,
  type LineupVersion,
  type Tournament,
  type TournamentInput,
} from './model'
import { DEFAULT_POOLS, emptyPool, type CampPool } from './camp'

const tournamentsCol = collection(db, 'tournaments')
const gamesCol = (tid: string) => collection(db, 'tournaments', tid, 'games')

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

function tournamentFromDoc(id: string, d: Record<string, unknown>): Tournament {
  const kind = d.kind === 'camp' ? 'camp' : 'tournament'
  return {
    id,
    kind,
    name: str(d.name),
    location: str(d.location),
    startDate: str(d.startDate),
    endDate: str(d.endDate),
    squadSize: typeof d.squadSize === 'number' ? d.squadSize : DEFAULT_SQUAD_SIZE,
    squad: ids(d.squad),
    numbers: numberMap(d.numbers),
    pools: poolsFrom(d.pools, kind),
  }
}

function poolsFrom(v: unknown, kind: string): CampPool[] {
  const list = Array.isArray(v)
    ? v
        .filter((x) => x && typeof x === 'object')
        .map((x: Record<string, unknown>, i): CampPool => ({ id: str(x.id) || `p${i + 1}`, name: str(x.name), blue: ids(x.blue), white: ids(x.white) }))
    : []
  // A camp always has at least one pool to split players into.
  if (kind === 'camp' && list.length === 0) return Array.from({ length: DEFAULT_POOLS }, (_, i) => emptyPool(`p${i + 1}`))
  return list
}

function numberMap(v: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, n] of Object.entries((v ?? {}) as Record<string, unknown>)) if (typeof n === 'number') out[k] = n
  return out
}

function lineupFrom(v: unknown): Lineup {
  const raw = (v ?? {}) as Record<string, unknown>
  const lineup = emptyLineup()
  for (const s of SLOTS) lineup[s] = ids(raw[s])
  return lineup
}

const millis = (v: unknown) => (v instanceof Timestamp ? v.toMillis() : 0)

function editorFrom(v: unknown): Editor | null {
  const raw = (v ?? {}) as Record<string, unknown>
  return typeof raw.email === 'string' ? { email: raw.email, name: str(raw.name) } : null
}

function versionsFrom(d: Record<string, unknown>, gameCreatedAt: number): LineupVersion[] {
  const raw = d.versions && typeof d.versions === 'object' ? (d.versions as Record<string, unknown>) : {}
  const list = Object.entries(raw)
    .filter(([, v]) => v && typeof v === 'object')
    .map(([id, v]): LineupVersion => {
      const x = v as Record<string, unknown>
      return {
        id,
        index: typeof x.index === 'number' ? x.index : 0,
        name: str(x.name),
        lineup: lineupFrom(x.lineup),
        lineup2: x.lineup2 ? lineupFrom(x.lineup2) : null,
        createdBy: editorFrom(x.createdBy),
        createdAt: millis(x.createdAt),
        updatedBy: editorFrom(x.updatedBy),
        updatedAt: millis(x.updatedAt),
      }
    })
  if (list.length > 0) return list.sort((a, b) => a.index - b.index)
  // Games from before versions: their lineup is the first version.
  return [
    {
      id: FIRST_VERSION,
      index: 1,
      name: '',
      lineup: lineupFrom(d.lineup),
      lineup2: d.lineup2 ? lineupFrom(d.lineup2) : null,
      createdBy: null,
      createdAt: gameCreatedAt,
      updatedBy: null,
      updatedAt: 0,
    },
  ]
}

function gameFromDoc(id: string, d: Record<string, unknown>): Game {
  const createdAt = millis(d.createdAt)
  const versions = versionsFrom(d, createdAt)
  const activeVersion = str(d.activeVersion)
  const active = findVersion({ versions, activeVersion }, null)
  return {
    id,
    opponent: str(d.opponent),
    date: str(d.date),
    time: str(d.time),
    cap: d.cap === 'blue' || d.cap === 'white' ? d.cap : null,
    label: str(d.label),
    lineup: active.lineup,
    lineup2: active.lineup2,
    versions,
    activeVersion,
    createdAt,
  }
}

export type Loadable<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T }

function useSnapshot<T>(subscribe: (set: (s: Loadable<T>) => void) => () => void, deps: unknown[]): Loadable<T> {
  const [state, setState] = useState<Loadable<T>>({ status: 'loading' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => subscribe(setState), deps)
  return state
}

export function useTournaments(): Loadable<Tournament[]> {
  return useSnapshot(
    (set) =>
      onSnapshot(
        tournamentsCol,
        (snap) => set({ status: 'ready', data: sortTournaments(snap.docs.map((d) => tournamentFromDoc(d.id, d.data())), todayIso()) }),
        (e) => set({ status: 'error', message: e.message }),
      ),
    [],
  )
}

export function useTournament(tid: string): Loadable<Tournament | null> {
  return useSnapshot(
    (set) =>
      onSnapshot(
        doc(tournamentsCol, tid),
        (snap) => set({ status: 'ready', data: snap.exists() ? tournamentFromDoc(snap.id, snap.data()) : null }),
        (e) => set({ status: 'error', message: e.message }),
      ),
    [tid],
  )
}

export function useGames(tid: string): Loadable<Game[]> {
  return useSnapshot(
    (set) =>
      onSnapshot(
        gamesCol(tid),
        (snap) =>
          // A game added a moment ago has no server time yet; the estimate keeps it last.
          set({ status: 'ready', data: sortGames(snap.docs.map((d) => gameFromDoc(d.id, d.data({ serverTimestamps: 'estimate' })))) }),
        (e) => set({ status: 'error', message: e.message }),
      ),
    [tid],
  )
}

/** Returns the tournament id straight away (also offline) and the write to wait for. */
export function saveTournament(id: string | null, input: TournamentInput): { id: string; saved: Promise<void> } {
  const data = { ...input, name: input.name.trim(), location: input.location.trim(), updatedAt: serverTimestamp() }
  if (id) return { id, saved: setDoc(doc(tournamentsCol, id), data, { merge: true }) }
  const ref = doc(tournamentsCol)
  return { id: ref.id, saved: setDoc(ref, { ...data, createdAt: serverTimestamp() }) }
}

export function saveSquad(tid: string, squad: string[], numbers: Record<string, number>): Promise<void> {
  return updateDoc(doc(tournamentsCol, tid), { squad, numbers, updatedAt: serverTimestamp() })
}

export function savePools(tid: string, pools: CampPool[]): Promise<void> {
  return updateDoc(doc(tournamentsCol, tid), { pools, updatedAt: serverTimestamp() })
}

/** Deletes a tournament and its games (Firestore doesn't remove subcollections on its own). */
export async function deleteTournament(tid: string): Promise<void> {
  const games = await getDocs(gamesCol(tid))
  const batch = writeBatch(db)
  games.forEach((g) => batch.delete(g.ref))
  batch.delete(doc(tournamentsCol, tid))
  await batch.commit()
}

/** A version as stored. `by` is who is saving it now; null keeps the last editor as it was. */
function versionData(v: LineupVersion, by: Editor | null) {
  return {
    index: v.index,
    name: v.name.trim(),
    lineup: v.lineup,
    lineup2: v.lineup2,
    createdBy: v.createdBy,
    createdAt: v.createdAt ? Timestamp.fromMillis(v.createdAt) : serverTimestamp(),
    updatedBy: by ?? v.updatedBy,
    updatedAt: by ? serverTimestamp() : v.updatedAt ? Timestamp.fromMillis(v.updatedAt) : null,
  }
}

/**
 * Applies changes to a game. The top-level lineup always mirrors the version in use, and a game from before
 * versions gets its lineup stored as the first version on its first change.
 */
function updateGame(tid: string, game: Game, changes: Record<string, unknown>, active: LineupVersion): Promise<void> {
  const data: Record<string, unknown> = {}
  if (!game.activeVersion) {
    const first = game.versions[0]
    data[`versions.${first.id}`] = versionData(first, null)
  }
  return updateDoc(doc(gamesCol(tid), game.id), {
    ...data,
    ...changes,
    activeVersion: active.id,
    lineup: active.lineup,
    lineup2: active.lineup2,
    updatedAt: serverTimestamp(),
  })
}

export async function saveGame(
  tid: string,
  id: string | null,
  input: Omit<GameInput, 'lineup' | 'lineup2' | 'versions' | 'activeVersion' | 'createdAt'>,
  by: Editor | null,
): Promise<void> {
  const data = { ...input, opponent: input.opponent.trim(), label: input.label.trim(), updatedAt: serverTimestamp() }
  if (id) {
    await setDoc(doc(gamesCol(tid), id), data, { merge: true })
    return
  }
  const first: LineupVersion = {
    id: FIRST_VERSION,
    index: 1,
    name: '',
    lineup: emptyLineup(),
    lineup2: null,
    createdBy: by,
    createdAt: 0,
    updatedBy: null,
    updatedAt: 0,
  }
  await addDoc(gamesCol(tid), {
    ...data,
    lineup: first.lineup,
    lineup2: first.lineup2,
    versions: { [first.id]: versionData(first, by) },
    activeVersion: first.id,
    createdAt: serverTimestamp(),
  })
}

/** Saves a changed version: its lineups or its name. A null second period follows the first. */
export function saveVersion(tid: string, game: Game, version: LineupVersion, by: Editor | null): Promise<void> {
  const active = findVersion(game, null)
  return updateGame(tid, game, { [`versions.${version.id}`]: versionData(version, by) }, active.id === version.id ? version : active)
}

/** Adds a version, copied from `base` or empty, and puts it in use. Returns its id straight away (also offline). */
export function createVersion(
  tid: string,
  game: Game,
  base: LineupVersion | null,
  name: string,
  by: Editor | null,
): { id: string; saved: Promise<void> } {
  // Firestore's own ids are letters and digits only, so they are safe in a field path.
  const id = doc(gamesCol(tid)).id
  const version: LineupVersion = {
    id,
    index: nextVersionIndex(game.versions),
    name,
    lineup: base?.lineup ?? emptyLineup(),
    lineup2: base?.lineup2 ?? null,
    createdBy: by,
    createdAt: 0,
    updatedBy: null,
    updatedAt: 0,
  }
  return { id, saved: updateGame(tid, game, { [`versions.${id}`]: versionData(version, by) }, version) }
}

export function setActiveVersion(tid: string, game: Game, version: LineupVersion): Promise<void> {
  return updateGame(tid, game, {}, version)
}

/** Removes a version that is not in use. */
export function deleteVersion(tid: string, game: Game, version: LineupVersion): Promise<void> {
  return updateGame(tid, game, { [`versions.${version.id}`]: deleteField() }, findVersion(game, null))
}

export function deleteGame(tid: string, gid: string): Promise<void> {
  return deleteDoc(doc(gamesCol(tid), gid))
}
