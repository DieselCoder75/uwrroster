import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { POSITIONS, fullName, normalizePlayer, sortPlayers, type Player, type PlayerInput, type Position } from './model'
import type { RosterEntry } from './websiteRoster'

const playersCol = collection(db, 'players')

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

export function usePlayers(): PlayersState {
  const [state, setState] = useState<PlayersState>({ status: 'loading' })
  useEffect(
    () =>
      onSnapshot(
        playersCol,
        (snap) => setState({ status: 'ready', players: sortPlayers(snap.docs.map((d) => fromDoc(d.id, d.data()))) }),
        (e) => setState({ status: 'error', message: e.message }),
      ),
    [],
  )
  return state
}

export async function savePlayer(id: string | null, input: PlayerInput): Promise<void> {
  const data = { ...normalizePlayer(input), updatedAt: serverTimestamp() }
  if (id) await setDoc(doc(playersCol, id), data, { merge: true })
  else await addDoc(playersCol, { ...data, createdAt: serverTimestamp() })
}

export function deletePlayer(id: string): Promise<void> {
  return deleteDoc(doc(playersCol, id))
}

/** Roster entries not yet in the pool, matched by name so re-running the import never duplicates. */
export function missingFromPool(roster: RosterEntry[], existing: Player[]): RosterEntry[] {
  const have = new Set(existing.map((p) => fullName(p).toLowerCase()))
  return roster.filter((r) => !have.has(fullName(r).toLowerCase()))
}

export async function importRoster(entries: RosterEntry[]): Promise<void> {
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
    batch.set(doc(playersCol), { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  }
  await batch.commit()
}
