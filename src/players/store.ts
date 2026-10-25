import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { POSITIONS, fullName, normalizePlayer, sortPlayers, type Player, type PlayerInput, type Position } from './model'
import type { RosterEntry } from './websiteRoster'

const playersCol = (teamId: string) => collection(db, 'teams', teamId, 'players')

function fromDoc(id: string, d: Record<string, unknown>): Player {
  const pos = (v: unknown): v is Position => POSITIONS.includes(v as Position)
  return {
    id,
    number: typeof d.number === 'number' ? d.number : null,
    firstName: String(d.firstName ?? ''),
    lastName: String(d.lastName ?? ''),
    mainPosition: pos(d.mainPosition) ? d.mainPosition : 'ATT',
    otherPositions: Array.isArray(d.otherPositions) ? d.otherPositions.filter(pos) : [],
    locked: d.locked === true,
    captain: d.captain === 'captain' || d.captain === 'viceCaptain' ? d.captain : null,
    active: d.active !== false,
  }
}

export type PlayersState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; players: Player[] }

export function usePlayers(teamId: string): PlayersState {
  const [state, setState] = useState<PlayersState>({ status: 'loading' })
  useEffect(
    () =>
      onSnapshot(
        playersCol(teamId),
        (snap) => setState({ status: 'ready', players: sortPlayers(snap.docs.map((d) => fromDoc(d.id, d.data()))) }),
        (e) => setState({ status: 'error', message: e.message }),
      ),
    [teamId],
  )
  return state
}

export async function savePlayer(teamId: string, id: string | null, input: PlayerInput): Promise<void> {
  const data = { ...normalizePlayer(input), updatedAt: serverTimestamp() }
  if (id) await setDoc(doc(playersCol(teamId), id), data, { merge: true })
  else await addDoc(playersCol(teamId), { ...data, createdAt: serverTimestamp() })
}

export function deletePlayer(teamId: string, id: string): Promise<void> {
  return deleteDoc(doc(playersCol(teamId), id))
}

/** Roster entries not yet in the pool, matched by name so re-running the import never duplicates. */
export function missingFromPool(roster: RosterEntry[], existing: Player[]): RosterEntry[] {
  const have = new Set(existing.map((p) => fullName(p).toLowerCase()))
  return roster.filter((r) => !have.has(fullName(r).toLowerCase()))
}

export async function importRoster(teamId: string, entries: RosterEntry[]): Promise<void> {
  const batch = writeBatch(db)
  for (const r of entries) {
    const input: PlayerInput = {
      number: r.number,
      firstName: r.firstName,
      lastName: r.lastName,
      mainPosition: r.position,
      otherPositions: [],
      locked: false,
      captain: r.captain,
      active: true,
    }
    batch.set(doc(playersCol(teamId)), { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  }
  await batch.commit()
}
