import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase'
import {
  DEFAULT_SQUAD_SIZE,
  SLOTS,
  emptyLineup,
  sortGames,
  sortTournaments,
  type Game,
  type GameInput,
  type Lineup,
  type Period,
  type Tournament,
  type TournamentInput,
} from './model'

const tournamentsCol = collection(db, 'tournaments')
const gamesCol = (tid: string) => collection(db, 'tournaments', tid, 'games')

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

function tournamentFromDoc(id: string, d: Record<string, unknown>): Tournament {
  return {
    id,
    name: str(d.name),
    location: str(d.location),
    startDate: str(d.startDate),
    endDate: str(d.endDate),
    squadSize: typeof d.squadSize === 'number' ? d.squadSize : DEFAULT_SQUAD_SIZE,
    squad: ids(d.squad),
    numbers: numberMap(d.numbers),
  }
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

function gameFromDoc(id: string, d: Record<string, unknown>): Game {
  return {
    id,
    opponent: str(d.opponent),
    date: str(d.date),
    time: str(d.time),
    cap: d.cap === 'blue' || d.cap === 'white' ? d.cap : null,
    label: str(d.label),
    lineup: lineupFrom(d.lineup),
    lineup2: d.lineup2 ? lineupFrom(d.lineup2) : null,
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
        (snap) => set({ status: 'ready', data: sortTournaments(snap.docs.map((d) => tournamentFromDoc(d.id, d.data()))) }),
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
        (snap) => set({ status: 'ready', data: sortGames(snap.docs.map((d) => gameFromDoc(d.id, d.data()))) }),
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

/** Deletes a tournament and its games (Firestore doesn't remove subcollections on its own). */
export async function deleteTournament(tid: string): Promise<void> {
  const games = await getDocs(gamesCol(tid))
  const batch = writeBatch(db)
  games.forEach((g) => batch.delete(g.ref))
  batch.delete(doc(tournamentsCol, tid))
  await batch.commit()
}

export async function saveGame(tid: string, id: string | null, input: Omit<GameInput, 'lineup' | 'lineup2'>): Promise<void> {
  const data = { ...input, opponent: input.opponent.trim(), label: input.label.trim(), updatedAt: serverTimestamp() }
  if (id) await setDoc(doc(gamesCol(tid), id), data, { merge: true })
  else await addDoc(gamesCol(tid), { ...data, lineup: emptyLineup(), lineup2: null, createdAt: serverTimestamp() })
}

/** Saves one period's lineup. A null second period follows the first. */
export function saveLineup(tid: string, gid: string, period: Period, lineup: Lineup | null): Promise<void> {
  const field = period === 1 ? 'lineup' : 'lineup2'
  return updateDoc(doc(gamesCol(tid), gid), { [field]: lineup, updatedAt: serverTimestamp() })
}

/** Replaces both periods at once, e.g. when copying another game. */
export function saveLineups(tid: string, gid: string, lineup: Lineup, lineup2: Lineup | null): Promise<void> {
  return updateDoc(doc(gamesCol(tid), gid), { lineup, lineup2, updatedAt: serverTimestamp() })
}

export function deleteGame(tid: string, gid: string): Promise<void> {
  return deleteDoc(doc(gamesCol(tid), gid))
}
